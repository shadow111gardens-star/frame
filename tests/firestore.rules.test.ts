import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";
import { FirestoreProjects } from "../src/projects/firestore";
import { projectFixture } from "./projectFixture";
import {designMdFixture} from './designMdFixture';
import {planFixture} from './planFixture';
import {fixture} from './fixture';
import {hashArtifact} from '../server/designDocument';
import type {GenerationArtifact} from '../shared/generationArtifact';
import {getDocs,collection} from 'firebase/firestore';
import {pricingConfig,requestCost} from '../server/generationCost';
import {summarizeCost} from '../shared/generationCost';

test('shared catalog and compact index are authenticated read-only, including selected Markdown chunks',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async()=>{
 const [host,port]=process.env.FIRESTORE_EMULATOR_HOST!.split(':'),env=await initializeTestEnvironment({projectId:'demo-frame',firestore:{host,port:Number(port),rules:await readFile('firestore.rules','utf8')}});
 try{
  const paths=[['designReferenceCatalog','style'],['designReferenceCatalogIndex','style'],['designReferenceCatalog','style','markdownChunks','part']];
  await env.withSecurityRulesDisabled(async context=>{for(const p of paths)await setDoc(doc(context.firestore() as unknown as Firestore,p.join('/')),{slug:'style',text:'Source'});});
  const auth=env.authenticatedContext('catalog-user').firestore() as unknown as Firestore,anonymous=env.unauthenticatedContext().firestore() as unknown as Firestore;
  for(const p of paths){await assertSucceeds(getDoc(doc(auth,p.join('/'))));await assertFails(getDoc(doc(anonymous,p.join('/'))));await assertFails(setDoc(doc(auth,p.join('/')),{slug:'changed'}));await assertFails(updateDoc(doc(auth,p.join('/')),{text:'Changed'}));await assertFails(deleteDoc(doc(auth,p.join('/'))));}
  await assertSucceeds(getDocs(collection(auth,'designReferenceCatalogIndex')));await assertFails(getDocs(collection(anonymous,'designReferenceCatalogIndex')));
  await assertFails(setDoc(doc(auth,'designReferenceCatalog','new-style'),{slug:'new-style'}));await assertFails(setDoc(doc(auth,'designReferenceCatalogIndex','new-style'),{slug:'new-style'}));
 }finally{await env.cleanup();}
});

test(
  "Firestore emulator enforces ownership, field validation, atomic revisions, and repository lifecycle",
  { skip: !process.env.FIRESTORE_EMULATOR_HOST },
  async () => {
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(":");
    const env = await initializeTestEnvironment({
      projectId: "demo-frame",
      firestore: {
        host,
        port: Number(port),
        rules: await readFile("firestore.rules", "utf8"),
      },
    });
    try {
      await env.clearFirestore();
      const a = env
        .authenticatedContext("UID-A")
        .firestore() as unknown as Firestore;
      const b = env
        .authenticatedContext("UID-B")
        .firestore() as unknown as Firestore;
      const anonymous = env
        .unauthenticatedContext()
        .firestore() as unknown as Firestore;
      const repoA = new FirestoreProjects(a, () => ({ uid: "UID-A" }));
      const repoB = new FirestoreProjects(b, () => ({ uid: "UID-B" }));
      const snapshot = projectFixture();
      const first = await repoA.save({
        snapshot,
        initialPrompt: "Original prompt",
        favorite: false,
        expectedRevision: 0,
        writeId: "revision-one",
      });
      assert.equal(first.revision, 1);
      assert.ok(first.createdAt > 0);
      const loaded = await repoA.load(snapshot.projectId);
      assert.deepEqual(loaded.snapshot, snapshot);
      const root = doc(a, "users", "UID-A", "projects", snapshot.projectId);
      const bAttack = doc(b, "users", "UID-A", "projects", snapshot.projectId);
      await assertFails(getDoc(bAttack));
      await assertFails(updateDoc(bAttack, { title: "Stolen" }));
      await assertFails(deleteDoc(bAttack));
      await assertFails(
        setDoc(doc(b, "users", "UID-A", "projects", "forged"), {
          title: "Forged",
        }),
      );
      await assertFails(
        getDoc(
          doc(anonymous, "users", "UID-A", "projects", snapshot.projectId),
        ),
      );
      await assertFails(
        getDoc(
          doc(
            b,
            "users",
            "UID-A",
            "projects",
            snapshot.projectId,
            "revisions",
            "revision-one",
            "chunks",
            "design-0",
          ),
        ),
      );
      assert.deepEqual(await repoB.list(), []);
      await assert.rejects(() => repoB.load(snapshot.projectId));
      const copied = await repoB.save({
        snapshot,
        initialPrompt: "User B project",
        favorite: false,
        expectedRevision: 0,
        writeId: "b-first",
      });
      assert.equal(copied.id, snapshot.projectId);
      await assertFails(
        getDoc(doc(a, "users", "UID-B", "projects", snapshot.projectId)),
      );
      assert.equal(
        (await repoA.load(snapshot.projectId)).initialPrompt,
        "Original prompt",
      );
      await assertFails(
        updateDoc(root, { extraOwner: "UID-B", updatedAt: serverTimestamp() }),
      );
      await assertFails(
        updateDoc(root, {
          createdAt: serverTimestamp(),
          revision: 2,
          updatedAt: serverTimestamp(),
        }),
      );
      await assertFails(
        updateDoc(root, {
          revision: 2,
          initialPrompt: "Overwrite prompt",
          updatedAt: serverTimestamp(),
        }),
      );
      const changed = { ...snapshot, projectName: "Renamed" };
      const second = await repoA.save({
        snapshot: changed,
        initialPrompt: "Original prompt",
        favorite: true,
        expectedRevision: 1,
        writeId: "revision-two",
      });
      assert.equal(second.createdAt, first.createdAt);
      assert.equal(second.revision, 2);
      assert.equal(second.favorite, true);
      const retry = await repoA.save({
        snapshot: changed,
        initialPrompt: "Original prompt",
        favorite: true,
        expectedRevision: 1,
        writeId: "revision-two",
      });
      assert.equal(retry.revision, 2);
      await assert.rejects(() =>
        repoA.save({
          snapshot,
          initialPrompt: "Original prompt",
          favorite: false,
          expectedRevision: 1,
          writeId: "stale-write",
        }),
      );
      await assertFails(
        setDoc(
          doc(
            a,
            "users",
            "UID-A",
            "projects",
            snapshot.projectId,
            "revisions",
            "orphan",
            "chunks",
            "design-0",
          ),
          { kind: "design", index: 0, data: "{}" },
        ),
      );
      await assertSucceeds(getDoc(root));
      await repoA.remove(snapshot.projectId, 2);
      await repoA.remove(snapshot.projectId, 2);
      assert.deepEqual(await repoA.list(), []);
      assert.equal((await repoB.list()).length, 1);
      await assertFails(getDoc(doc(a, "unrelated", "secret")));
    } finally {
      await env.cleanup();
    }
  },
);

test('fixed-flow run, Markdown and matching immutable revision survive reopen with UID isolation and idempotency', {skip:!process.env.FIRESTORE_EMULATOR_HOST},async()=>{
  const [host,port]=process.env.FIRESTORE_EMULATOR_HOST!.split(':');
  const env=await initializeTestEnvironment({projectId:'demo-frame',firestore:{host,port:Number(port),rules:await readFile('firestore.rules','utf8')}});
  try{
    await env.clearFirestore();
    const a=env.authenticatedContext('UID-A').firestore() as unknown as Firestore,b=env.authenticatedContext('UID-B').firestore() as unknown as Firestore;
    const repo=new FirestoreProjects(a,()=>({uid:'UID-A'})),snapshot=projectFixture(),path=['users','UID-A','projects',snapshot.projectId] as const;
    await repo.save({snapshot,initialPrompt:'Original',favorite:false,expectedRevision:0,writeId:'legacy-revision'});
    const run={projectId:snapshot.projectId,generationRunId:'run-one',idempotencyKey:'run-one',originalPrompt:'Generate exactly two screens.'};
    await repo.startGeneration(run);await assert.rejects(repo.startGeneration(run),/already exists/);
    await assert.rejects(repo.startGeneration({...run,generationRunId:'other-run',idempotencyKey:'other-run'}),/Another generation/);
    await repo.updateGeneration(run,'design-md');
    assert.equal((await getDoc(doc(a,...path,'generationRuns','run-one'))).data()?.currentStage,'design-md');
    const md=designMdFixture(planFixture(fixture()),run.originalPrompt).designMd;
    const pricing=pricingConfig({},'gemini-3.1-flash-lite'),cost=summarizeCost([requestCost({}, {usageMetadata:{promptTokenCount:1000,candidatesTokenCount:500,totalTokenCount:1500}},'specification','gemini-3.1-flash-lite',200,10,pricing)],pricing);
    const artifact:GenerationArtifact={version:1,...run,designMd:md,designMdHash:hashArtifact(md),status:'complete',warnings:[],attemptCounts:{'design-md':1},validationSummary:{schema:'valid',screens:'valid',navigation:'valid',tokens:'valid',render:'measured',measuredScreenIds:['home','profile']}};
    snapshot.generationArtifact=artifact;
    artifact.styleReference={slug:'linear.app',sourceUrl:'https://github.com/VoltAgent/awesome-design-md/blob/'+ 'a'.repeat(40)+'/design-md/linear.app/DESIGN.md',contentHash:'b'.repeat(64),referenceInputBytes:1200,estimatedInputTokens:300,measuredAddedInputTokens:null,specificationInputTokens:1000};
    artifact.cost=cost;await repo.updateGeneration(run,'design-json',cost);
    assert.deepEqual((await getDoc(doc(a,...path,'generationRuns','run-one'))).data()?.cost,cost);
    const write={snapshot,initialPrompt:'Original',favorite:false,expectedRevision:1,writeId:'generation-run-one'};
    const saved=await repo.save(write);assert.equal(saved.revision,2);assert.equal((await repo.save(write)).revision,2);
    assert.deepEqual((await new FirestoreProjects(a,()=>({uid:'UID-A'})).load(snapshot.projectId)).snapshot,snapshot);
    const recorded=(await getDoc(doc(a,...path,'generationRuns','run-one'))).data()!;assert.equal(recorded.status,'complete');assert.equal(recorded.revisionId,'generation-run-one');
    for(const tail of [['generationRuns','run-one'],['revisions','generation-run-one'],['revisions','generation-run-one','chunks','design-md-0']]){
      await assertFails(getDoc(doc(b,...path,...tail)));await assertFails(updateDoc(doc(b,...path,...tail),{userId:'UID-B'}));
    }
    await assertFails(updateDoc(doc(a,...path,'revisions','generation-run-one'),{designMdHash:'0'.repeat(64)}));
    const failed={...run,generationRunId:'run-failed',idempotencyKey:'run-failed'};await repo.startGeneration(failed);await repo.failGeneration(failed,{code:'RENDER_QUALITY',message:'Unsafe candidate preserved.',cost});
    assert.deepEqual((await getDoc(doc(a,...path,'generationRuns','run-failed'))).data()?.cost,cost);
    assert.equal((await getDoc(doc(a,...path))).data()?.snapshotId,'generation-run-one');assert.deepEqual((await repo.load(snapshot.projectId)).snapshot,snapshot);
    await assertFails(updateDoc(doc(a,...path),{userId:'UID-B',updatedAt:serverTimestamp()}));
    const racing=await Promise.allSettled(['race-a','race-b'].map(id=>repo.startGeneration({...run,generationRunId:id,idempotencyKey:id})));
    assert.equal(racing.filter(result=>result.status==='fulfilled').length,1,'Only one simultaneous submission reserves the project');
    const winner=racing[0].status==='fulfilled'?'race-a':'race-b';await repo.failGeneration({...run,generationRunId:winner,idempotencyKey:winner},{code:'CANCELLED',message:'Cancelled without changing saved output.'});
    await env.withSecurityRulesDisabled(async context=>{await updateDoc(doc(context.firestore() as unknown as Firestore,...path,'revisions','generation-run-one','chunks','design-md-0'),{data:JSON.stringify(md+' corrupted')});});
    await assert.rejects(repo.load(snapshot.projectId),/checksum/);
    await repo.remove(snapshot.projectId,2);assert.equal((await getDoc(doc(a,...path,'generationRuns','run-one'))).exists(),false);
  }finally{await env.cleanup();}
});
