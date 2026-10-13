import {sha256,verifyArtifact,type GenerationRunStart} from './artifacts';
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  runTransaction,
  writeBatch,
  serverTimestamp,
  type Firestore,
  type DocumentData,
  query, orderBy,
} from "firebase/firestore";
import { initializeFrameFirebase } from "../auth/firebase";
import { runProjectOperation } from "./operations";
import { encodeSnapshot, decodeSnapshot,splitJson } from "./codec";
import {
  ProjectDataError,
  ProjectCancelledError,
  type ProjectRepository,
  type ProjectSummary,
  type ProjectWrite,
} from "./types";

function summary(id: string, data: DocumentData): ProjectSummary {
  return {
    id,
    title: data.title,
    initialPrompt: data.initialPrompt,
    projectType: data.projectType,
    favorite: data.favorite,
    status: data.status,
    revision: data.revision,
    createdAt: data.createdAt?.toMillis?.() ?? 0,
    updatedAt: data.updatedAt?.toMillis?.() ?? 0,
  };
}
export class FirestoreProjects implements ProjectRepository {
  constructor(
    private db: Firestore,
    private user: () => { uid: string } | null,
  ) {}
  currentUid() {
    return this.user()?.uid ?? null;
  }
  private scope(id?: string) {
    const uid = this.currentUid();
    if (!uid)
      throw new ProjectDataError(
        "Sign in before accessing projects.",
        "unauthenticated",
      );
    if (id && !/^[A-Za-z0-9_-]{1,128}$/.test(id))
      throw new ProjectDataError("Invalid project ID.", "not-found");
    const projects = collection(this.db, "users", uid, "projects");
    return { uid, projects, ref: id ? doc(projects, id) : undefined };
  }
  private assertOwner(uid: string) {
    if (this.currentUid() !== uid) throw new ProjectCancelledError();
  }
  private perform<T>(operation: string, uid: string, work: () => Promise<T>) {
    return runProjectOperation(operation, uid, () => this.currentUid(), work);
  }
  async list() {
    const { uid, projects } = this.scope();
    const result = await this.perform("list", uid, () =>
      getDocsFromServer(query(projects,orderBy("updatedAt","desc"))),
    );
    this.assertOwner(uid);
    return result.docs.map((item) => summary(item.id, item.data()));
  }
  async load(id: string) {
    const { uid, ref } = this.scope(id);
    const result = await this.perform("read-project", uid, () =>
      getDocFromServer(ref!),
    );
    if (!result.exists() || result.data().status === "deleting")
      throw new ProjectDataError("Project not found.", "not-found");
    const data = result.data();
    const revision = doc(ref!, "revisions", data.snapshotId);
    const chunks = await this.perform("read-chunks", uid, () =>
      getDocsFromServer(collection(revision, "chunks")),
    );
    this.assertOwner(uid);
    const read = (kind: string, count: number) => {
      const parts = chunks.docs
        .map((d) => d.data())
        .filter((d) => d.kind === kind)
        .sort((a, b) => a.index - b.index);
      if (
        parts.length !== count ||
        parts.some((p, i) => p.index !== i || typeof p.data !== "string")
      )
        throw new ProjectDataError(
          "The saved project is incomplete. Reload or contact support; your current work is retained.",
        );
      return parts.map((p) => p.data as string);
    };
    const designParts=read("design",data.designDocument.chunkCount);
    const storedDesign=JSON.parse(designParts.join(""));
    if(storedDesign.generationArtifact&&!storedDesign.generationArtifact.designMd){storedDesign.generationArtifact.designMd=JSON.parse(read("design-md",data.designMdDocument.chunkCount).join(""));}
    const snapshot=decodeSnapshot(
        id,
        [JSON.stringify(storedDesign)],
        read("conversation", data.conversationHistory.chunkCount),
      );
    const revisionData=await this.perform("read-revision",uid,()=>getDocFromServer(revision));
    if(revisionData.data()?.designJsonManifest){const expected=revisionData.data()!.designJsonManifest;if(await sha256(read("design",data.designDocument.chunkCount).join(""))!==expected.hash)throw new ProjectDataError("The saved design checksum does not match.");}
    if(snapshot.generationArtifact){await verifyArtifact(snapshot.generationArtifact);const md=read("design-md",data.designMdDocument.chunkCount).join("");if(JSON.parse(md)!==snapshot.generationArtifact.designMd)throw new ProjectDataError("The saved Markdown does not match its revision.");}
    if(data.generationStatus==="generating"&&data.currentGenerationRunId){
      const run=await this.perform("read-generation",uid,()=>getDocFromServer(doc(ref!,"generationRuns",data.currentGenerationRunId)));
      if(run.exists()&&Date.now()-(run.data().startedAt?.toMillis?.()??Date.now())>930000){await this.failGeneration({projectId:id,generationRunId:data.currentGenerationRunId,idempotencyKey:run.data().idempotencyKey,originalPrompt:run.data().originalPrompt},{code:"INTERRUPTED",message:"Generation ended without a saved result. The last saved design is preserved; submit a new request to retry."});}
    }
    this.assertOwner(uid);return {...summary(id,data),snapshot};
  }
  async save(write: ProjectWrite) {
    const { uid, ref } = this.scope(write.snapshot.projectId);
    if (
      typeof write.initialPrompt !== "string" ||
      write.initialPrompt.length > 50000
    )
      throw new ProjectDataError(
        "The initial prompt exceeds the 50,000 character cloud-save limit. Shorten it before retrying.",
      );
    if (!Number.isInteger(write.expectedRevision) || write.expectedRevision < 0)
      throw new ProjectDataError(
        "Invalid project revision. Reload the cloud project before saving.",
      );
    const artifact=write.snapshot.generationArtifact;
    if(artifact)await verifyArtifact(artifact);
    const encoded = encodeSnapshot(write.snapshot);
    const md=artifact?splitJson(artifact.designMd):[];
    const designHash=await sha256(encoded.design.join(""));
    const designBytes=new TextEncoder().encode(encoded.design.join("" )).length;
    if (
      new TextEncoder().encode(
        [...encoded.design, ...encoded.conversation,...md].join(""),
      ).length > 6_000_000
    )
      throw new ProjectDataError(
        "This project exceeds the 6 MB atomic save limit. Reduce its size before saving.",
      );
    await this.perform("save-transaction", uid, () =>
      runTransaction(this.db, async (transaction) => {
        this.assertOwner(uid);
        const existing = await transaction.get(ref!);
        this.assertOwner(uid);
        const old = existing.data();
        const runRef=artifact?doc(ref!,"generationRuns",artifact.generationRunId):undefined;
        const run=runRef?await transaction.get(runRef):undefined;
        if(artifact&&run?.exists()&&(run.data().originalPrompt!==artifact.originalPrompt||run.data().idempotencyKey!==artifact.idempotencyKey))throw new ProjectDataError('The generation artifact does not match its reserved request. Your pending work is preserved.');
        if (old?.snapshotId === write.writeId) return; // Retry an uncertain acknowledgement safely.
        if (
          (old?.revision ?? 0) !== write.expectedRevision ||
          old?.status === "deleting"
        )
          throw new ProjectDataError("Concurrent project update.", "conflict");
        const revision = doc(ref!, "revisions", write.writeId);
        transaction.set(revision, {
          createdAt: serverTimestamp(),
          revision: write.expectedRevision + 1,
          ...(artifact?{userId:uid,revisionId:write.writeId,generationRunId:artifact.generationRunId,originalPrompt:artifact.originalPrompt,designMdHash:artifact.designMdHash,designMd:{encoding:"frame-json-v1",chunkCount:md.length},designJsonManifest:{schemaVersion:1,chunkCount:encoded.design.length,byteLength:designBytes,hash:designHash,storage:"chunks"},screenIds:write.snapshot.screens.map(s=>s.id),status:artifact.status,validationSummary:artifact.validationSummary}:{}),
        });
        for (const kind of ["design", "conversation"] as const) {
          encoded[kind].forEach((data, index) =>
            transaction.set(doc(revision, "chunks", `${kind}-${index}`), {
              kind,
              index,
              data,
              ...(artifact?{userId:uid,artifactType:kind==="design"?"design-json":"conversation-history",byteLength:new TextEncoder().encode(data).length,checksum:null,createdAt:serverTimestamp()}:{}),
            }),
          );
        }
        if(artifact){md.forEach((data,index)=>transaction.set(doc(revision,"chunks",`design-md-${index}`),{kind:"design-md",index,data,userId:uid,artifactType:"design-md",byteLength:new TextEncoder().encode(data).length,checksum:null,createdAt:serverTimestamp()}));
          if(runRef&&run?.exists()&&run.data().status==="generating"){transaction.update(runRef,{status:artifact.status,currentStage:"complete",revisionId:write.writeId,attemptCounts:artifact.attemptCounts,...(artifact.cost?{cost:artifact.cost}:{}),warnings:artifact.warnings,error:null,updatedAt:serverTimestamp(),completedAt:serverTimestamp()});}
        }
        transaction.set(ref!, {
          ...(old?.generationStatus==="generating"?{userId:uid,generationStatus:"generating",currentGenerationRunId:old.currentGenerationRunId}:{}),
          ...(artifact?{userId:uid,productType:write.snapshot.productType,generationStatus:old?.generationStatus==="generating"&&old.currentGenerationRunId!==artifact.generationRunId?"generating":artifact.status,currentRevisionId:write.writeId,currentGenerationRunId:old?.generationStatus==="generating"&&old.currentGenerationRunId!==artifact.generationRunId?old.currentGenerationRunId:artifact.generationRunId,schemaVersion:1,designMdDocument:{encoding:"frame-json-v1",chunkCount:md.length},designJsonSnapshotId:write.writeId}:{}),
          title: write.snapshot.projectName || "Untitled project",
          initialPrompt: old?.initialPrompt || write.initialPrompt,
          projectType: write.snapshot.productType,
          designDocument: {
            encoding: "frame-json-v1",
            chunkCount: encoded.design.length,
          },
          conversationHistory: {
            encoding: "frame-json-v1",
            chunkCount: encoded.conversation.length,
          },
          snapshotId: write.writeId,
          revision: write.expectedRevision + 1,
          status: encoded.status,
          favorite: write.favorite,
          createdAt: old?.createdAt ?? serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }),
    );
    this.assertOwner(uid);
    const saved = await this.perform("save-acknowledgement", uid, () =>
      getDocFromServer(ref!),
    );
    this.assertOwner(uid);
    if (!saved.exists())
      throw new ProjectDataError("Project not found.", "not-found");
    const data = saved.data();
    if (data.snapshotId !== write.writeId)
      throw new ProjectDataError("Concurrent project update.", "conflict");
    return summary(ref!.id, data);
  }
  async startGeneration(input:GenerationRunStart){
    const {uid,ref}=this.scope(input.projectId);
    if(!/^[A-Za-z0-9_-]{1,128}$/.test(input.generationRunId)||input.idempotencyKey!==input.generationRunId||input.originalPrompt.length>20000)throw new ProjectDataError("Invalid generation identity.");
    await this.perform("start-generation",uid,()=>runTransaction(this.db,async tx=>{
      const project=await tx.get(ref!),runRef=doc(ref!,"generationRuns",input.generationRunId),run=await tx.get(runRef);
      this.assertOwner(uid);
      if(!project.exists()||project.data().status==="deleting")throw new ProjectDataError("Project not found.","not-found");
      if(run.exists())throw new ProjectDataError("This generation request already exists. Reopen the project before retrying.","duplicate-generation");
      if(project.data().generationStatus==="generating")throw new ProjectDataError("Another generation is active for this project. Reopen or cancel it before retrying.","generation-active");
      tx.set(runRef,{userId:uid,projectId:input.projectId,idempotencyKey:input.idempotencyKey,originalPrompt:input.originalPrompt,status:"generating",currentStage:"analysis",revisionId:null,attemptCounts:{},warnings:[],error:null,startedAt:serverTimestamp(),updatedAt:serverTimestamp(),completedAt:null});
      tx.update(ref!,{userId:uid,generationStatus:"generating",currentGenerationRunId:input.generationRunId,updatedAt:serverTimestamp()});
    }));
  }
  async updateGeneration(input:GenerationRunStart,stage:import('../../shared/generationProgress').GenerationStage,cost?:import('../../shared/generationCost').GenerationCost){
    const {uid,ref}=this.scope(input.projectId);await this.perform("generation-progress",uid,()=>runTransaction(this.db,async tx=>{const runRef=doc(ref!,"generationRuns",input.generationRunId),run=await tx.get(runRef);this.assertOwner(uid);if(run.exists()&&run.data().status==="generating")tx.update(runRef,{currentStage:stage,...(cost?{cost}:{}),updatedAt:serverTimestamp()});}));
  }
  async failGeneration(input:GenerationRunStart,error:{code:string;message:string;cost?:import('../../shared/generationCost').GenerationCost}){
    const {uid,ref}=this.scope(input.projectId);
    await this.perform("fail-generation",uid,()=>runTransaction(this.db,async tx=>{
      const project=await tx.get(ref!),runRef=doc(ref!,"generationRuns",input.generationRunId),run=await tx.get(runRef);this.assertOwner(uid);
      if(!run.exists()||run.data().status!=="generating")return;
      tx.update(runRef,{status:"failed",...(error.cost?{cost:error.cost}:{}),currentStage:"complete",error:{code:error.code.slice(0,100),stage:"generation",message:error.message.slice(0,2000),diagnostics:{}},updatedAt:serverTimestamp(),completedAt:serverTimestamp()});
      if(project.exists()&&project.data().currentGenerationRunId===input.generationRunId)tx.update(ref!,{generationStatus:"failed",updatedAt:serverTimestamp()});
    }));
  }
  async remove(id: string, expectedRevision: number) {
    const { uid, ref } = this.scope(id);
    const marked = await this.perform("delete-transaction", uid, () =>
      runTransaction(this.db, async (transaction) => {
        this.assertOwner(uid);
        const current = await transaction.get(ref!);
        this.assertOwner(uid);
        if (!current.exists()) return false;
        if (current.data().revision !== expectedRevision)
          throw new ProjectDataError("Concurrent project update.", "conflict");
        transaction.update(ref!, {
          status: "deleting",
          updatedAt: serverTimestamp(),
        });
        return true;
      }),
    );
    if (!marked) return;
    // Firestore deleting a parent does not delete its subcollections.
    const revisions = await this.perform("delete-revisions", uid, () =>
      getDocsFromServer(collection(ref!, "revisions")),
    );
    for (const revision of revisions.docs) {
      const chunks = await this.perform("delete-read-chunks", uid, () =>
        getDocsFromServer(collection(revision.ref, "chunks")),
      );
      this.assertOwner(uid);
      await this.perform("delete-chunks", uid, () => {
        const batch = writeBatch(this.db);
        chunks.docs.forEach((chunk) => batch.delete(chunk.ref));
        batch.delete(revision.ref);
        return batch.commit();
      });
    }
    const runs=await this.perform("delete-runs",uid,()=>getDocsFromServer(collection(ref!,"generationRuns")));
    for(let start=0;start<runs.docs.length;start+=400){this.assertOwner(uid);await this.perform("delete-runs-batch",uid,()=>{const batch=writeBatch(this.db);runs.docs.slice(start,start+400).forEach(run=>batch.delete(run.ref));return batch.commit();});}
    this.assertOwner(uid);
    await this.perform("delete-root", uid, async () => {
      const current = await getDocFromServer(ref!);
      this.assertOwner(uid);
      if (!current.exists()) return;
      const batch = writeBatch(this.db);
      batch.delete(ref!);
      await batch.commit();
    });
  }
}
let instance: FirestoreProjects | undefined;
export function firestoreProjects() {
  if (!instance) {
    const app = initializeFrameFirebase();
    const auth = getAuth(app);
    instance = new FirestoreProjects(getFirestore(app), () => auth.currentUser);
  }
  return instance;
}
