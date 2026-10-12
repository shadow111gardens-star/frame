import {generationStage} from '../shared/generationProgress';
import {contentRequirements,missingContent,restoreContentRepair} from './contentRequirements';
import {verifyFirebaseIdentity} from './firebaseIdentity';
import {generateDesignMd,validateDesignMd,hashArtifact} from './designDocument';
import {generationArtifactSchema,type GenerationArtifact} from '../shared/generationArtifact';
import {DEFAULT_GENERATION_TIMEOUT_MS,timeoutSetting} from '../shared/generationTiming';
import {inspectStructure,qualityReviewSchema} from '../shared/designQuality';
import {buildDesignInstructions,buildVisualReviewInstructions} from "./designInstructions";
import type { IncomingMessage, ServerResponse } from 'node:http';
import { responseJsonSchema, responseSchema, validateApp,validateGeneratedFonts } from '../shared/design';
import {analyzeDesignPrompt} from './designKnowledge/analysis';
import {editAnalysis,selectDesignGuidance} from './designKnowledge/selection';
import { previewConfig } from '../shared/product';
import {planDesign,validatePlannedDesign,validatePlannedScreens,applyPlannedInsets,completePlannedSystem,resolvedPlanNavigation,designPlanSchema,type DesignPlan} from './designPlanning';
import {parseGeminiJson,GeminiError,generateGeminiText} from './geminiResponse';
import {mergeScreenEdit} from '../shared/editScope';
import {resolveRequirements} from './designRequirements';
import {designPolicy} from '../shared/designPolicy';
import {randomUUID} from 'node:crypto';
import {DesignValidationError,safeIssuePath,validationDiagnostic,validationForRepair} from './designDiagnostics';
import {targetedRepair} from './designRepair';
import {screenNameKey} from './screenRequirements';

function parseDesignOutput(text:string,stage:'design draft'|'design',productType:string,protectedApp?:import('../shared/design').DesignApp,affected?:Set<string>,existing?:import('../shared/design').DesignApp,plan?:DesignPlan,onRestored?:(fields:string[])=>void) {
  const parsed=responseSchema.safeParse(parseGeminiJson(text,stage));
  if(!parsed.success)throw new DesignValidationError(`Gemini returned an invalid ${stage}: ${parsed.error.issues.slice(0,4).map(issue=>`${safeIssuePath(issue.path)} (${issue.code})`).join(', ')}. Your original prompt and existing design are preserved.`,'DESIGN_SCHEMA',{reason:'SCHEMA',issues:parsed.error.issues.slice(0,12).map(issue=>({path:safeIssuePath(issue.path),code:issue.code}))});
  const result=parsed.data;
  if(plan){
    for(const screen of result.app.screens){const expected=plan.screens.find(s=>s.id===screen.id&&screenNameKey(s.name)===screenNameKey(screen.name));if(expected)screen.name=expected.name;}
    validatePlannedScreens(result.app,plan);
    const restored=completePlannedSystem(result.app,plan);if(restored.length)onRestored?.(restored);
  }
  if(protectedApp&&affected){
    // A quality pass may revise the unpublished affected layout, never unrelated user data.
    result.app={...result.app,name:protectedApp.name,productType:protectedApp.productType,designSystem:structuredClone(protectedApp.designSystem),screens:protectedApp.screens.map(original=>{
      const updated=result.app.screens.find(s=>s.id===original.id);
      if(!affected.has(original.id)||!updated)return structuredClone(original);
      const originals=new Set(original.components.map(c=>c.id));
      return {...updated,id:original.id,name:original.name,width:original.width,height:Math.max(original.height,updated.height),components:[...original.components.map(c=>{const next=updated.components.find(n=>n.id===c.id&&n.type===c.type);if(!next)return structuredClone(c);
        // A changed literal is a local correction. Remove a stale unchanged link that would mask it.
        const styles={...next.styles};
        for(const property of ['background','color','borderColor','font','paddingX','paddingY','gap','margin','radius'] as const){
          const token=`${property}Token` as 'backgroundToken';const oldLink=c.styles[token],link=styles[token];
          if(link!==undefined&&link===oldLink&&styles[property]!==undefined&&styles[property]!==c.styles[property]){
            const effective=property==='font'?protectedApp.designSystem.typography[link as 'font']:['paddingX','paddingY','gap','margin','radius'].includes(property)?(property==='radius'?protectedApp.designSystem.radii:protectedApp.designSystem.spacing)[Number(link)]:protectedApp.designSystem.colors[link];
            if(styles[property]!==effective)delete styles[token];
          }
        }
        return {...next,styles};}),...updated.components.filter(c=>!originals.has(c.id))]};
    })};
  }
  try {result.app=validateApp(result.app);validateGeneratedFonts(result.app,existing??protectedApp);if(result.app.productType!==productType)throw new Error('Product type changed');}
  catch(error) {
    const reasons=['Screen width does not match product type','Duplicate screen ID','Duplicate component ID','Missing child component','Missing navigation target','Invalid section anchor target','Cyclic component tree','Multiple component parents','Product type changed','Missing spacing or radius token','Missing color token','Missing text style token','Unsupported component capability','Unsupported font capability','Unsupported icon capability'];
    const reason=error instanceof Error&&reasons.includes(error.message)?error.message:'Invalid component relationships';
    const missingNavigation=reason==='Missing navigation target'&&plan?resolvedPlanNavigation(result.app,plan).filter(edge=>!edge.actionComponentIds.length):undefined;
    throw new DesignValidationError(`Gemini returned an invalid ${stage}: ${reason}. Your original prompt and existing design are preserved.`,'DESIGN_RELATIONSHIPS',{reason:reason==='Invalid component relationships'?'RELATIONSHIPS':reason.toUpperCase().replace(/ /g,'_'),...(missingNavigation?.length?{missingNavigation,missingEdgeIndexes:missingNavigation.map(edge=>edge.index)}:{})});
  }
  return result;
}

export function geminiConfig(env: Record<string,string|undefined>) {
  return {key:env.GEMINI_API_KEY,model:env.GEMINI_MODEL?.trim()||'gemini-3.1-flash-lite',timeoutMs:timeoutSetting(env.GEMINI_GENERATION_TIMEOUT_MS,DEFAULT_GENERATION_TIMEOUT_MS),attemptTimeoutMs:timeoutSetting(env.GEMINI_ATTEMPT_TIMEOUT_MS,180000)};
}
export function designRoute(env: Record<string,string|undefined>,identity=verifyFirebaseIdentity) {
  return async (req:IncomingMessage,res:ServerResponse,next:()=>void) => {
    if(req.url?.split('?')[0] !== '/api/design') return next();
    let streaming=false;
    const send = (status:number,data:unknown) => {if(streaming){if(!res.destroyed&&!res.writableEnded)res.end(JSON.stringify({event:'result',httpStatus:status,data})+'\n');return;}if(res.destroyed||res.writableEnded)return;res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
    if(req.method !== 'POST') return send(405,{error:'Use POST.'});
    if(req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) return send(403,{error:'Origin is not allowed.'});
    const {key,model,timeoutMs,attemptTimeoutMs}=geminiConfig(env);
    if(!key||!model)return send(503,{error:'Configure GEMINI_API_KEY and GEMINI_MODEL on the server, then restart.',code:'CONFIGURATION',retryable:false});
    // Every stage uses the official Google adapter; no provider-selection path exists.
    res.setHeader('X-FRAME-Provider','gemini');
    res.setHeader('X-FRAME-Model',model);
    const requestId=randomUUID();res.setHeader('X-FRAME-RequestId',requestId);
    let currentStage='request';
    let generationRunId=randomUUID(),idempotencyKey=generationRunId,projectId:string|null=null;
    let repairUsed=false;
    const repairsByStage=new Set<string>();
    const attemptCounts:Record<string,number>={};
    const diagnostic=(event:string,error?:unknown)=>console.info('[FRAME design validation]',JSON.stringify({requestId,event,stage:currentStage,...(error?validationDiagnostic(error):{}),repairUsed,repairAttempts:repairsByStage.size}));
    const controller=new AbortController();
    const disconnected=()=>{if(!res.writableEnded&&!controller.signal.aborted){console.info('[FRAME generation]',{event:'cancelled',source:'client_disconnect'});controller.abort(new DOMException('Client disconnected.','AbortError'));}};
    req.on('aborted',disconnected);res.on('close',disconnected);
    try {
      let body = ''; for await (const chunk of req) {body += chunk; if(Buffer.byteLength(body)>2_000_000) return send(413,{error:'Design request is too large.'});}
      let input; try {input=JSON.parse(body);} catch {return send(400,{error:'Invalid request JSON.'});}
      if(typeof input.prompt !== 'string' || !input.prompt.trim() || input.prompt.length>20000) return send(400,{error:'Enter a prompt of up to 20,000 characters.'});
      for(const field of ['projectId','generationRunId','idempotencyKey'])if(input[field]!==undefined&&(typeof input[field]!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(input[field])))return send(400,{error:'Invalid generation identity.'});
      generationRunId=input.generationRunId??generationRunId;idempotencyKey=input.idempotencyKey??generationRunId;projectId=input.projectId??null;
      if(input.mode !== 'generate' && input.mode !== 'modify') return send(400,{error:'Invalid generation mode.'});
      if(input.editScope!==undefined&&!['screen','project'].includes(input.editScope))return send(400,{error:'Invalid edit scope.',code:'EDIT_SCOPE',retryable:false});
      if(input.productType!==undefined && !['website','mobile_app'].includes(input.productType)) return send(400,{error:'Select Web or App.',retryable:false});
      let current:import('../shared/design').DesignApp|undefined;
      if(input.mode==='modify') {try {current=validateApp(input.app);} catch {return send(400,{error:'Current design is invalid.'});}}
      if(current && input.productType && input.productType!==current.productType) return send(400,{error:'Existing designs must retain their product type.',retryable:false});
      const editScope=input.editScope??designPolicy.redesign.defaultScope;
      const activeScreen=current?(input.activeScreen??current.screens[0].id):undefined;
      if(current&&!current.screens.some(s=>s.id===activeScreen))return send(400,{error:'Select an existing screen to redesign.',code:'EDIT_SCOPE',retryable:false});
      const positiveScopeInstruction=input.prompt.replace(/\b(?:do not|don't|never|avoid|without|keep)\b[^.!?;\n]*/gi,'');
      if(current&&editScope==='screen'&&!input.qualityReview&&/\b(?:all screens|every screen|entire project|whole project|project-wide|add (?:a |an |new )?(?:screen|page)|create (?:a |an |new )?(?:screen|page))\b/i.test(positiveScopeInstruction))return send(422,{error:'This instruction affects the project. Select Entire project in the AI Designer, then resend. Your prompt and existing design are preserved.',code:'EDIT_SCOPE',retryable:false});
      if(!current)resolveRequirements(input.prompt,[]); // Reject contradictory exact counts before spending an API call.
      const review=input.qualityReview===undefined?undefined:qualityReviewSchema.safeParse(input.qualityReview);
      if(review&&!review.success)return send(400,{error:'Invalid rendered quality evidence.',retryable:false});
      if(review&&!current)return send(400,{error:'Rendered review requires an existing candidate.',retryable:false});
      const qualityReview=review?.success?review.data:undefined;
      if(qualityReview&&[...qualityReview.issues,...qualityReview.screenshots,...(qualityReview.screenIds??[]).map(screenId=>({screenId}))].some(i=>!current!.screens.some(s=>s.id===i.screenId)))return send(400,{error:'Quality evidence references an unknown screen.',retryable:false});
      if(input.timeoutMs!==undefined&&(!Number.isInteger(input.timeoutMs)||input.timeoutMs<1000||input.timeoutMs>900000))return send(400,{error:'Invalid generation timeout.',code:'CONFIGURATION',retryable:false});
      await identity(req.headers.authorization,env.FIREBASE_PROJECT_ID??'frame-44bbd');
      const deadline=Date.now()+Math.min(timeoutMs,input.timeoutMs===undefined?timeoutMs:Math.max(1000,input.timeoutMs-5000));
      streaming=req.headers.accept==='application/x-ndjson';
      if(streaming){res.writeHead(200,{'Content-Type':'application/x-ndjson','Cache-Control':'no-store','X-Accel-Buffering':'no'});}
      let stage=0;const stages=current?[qualityReview?'rendered-review':'modification']:['analysis','planning','draft','review'];
      const generateAt=async(body:unknown,name:string)=>{currentStage=name;attemptCounts[name]=(attemptCounts[name]??0)+1;if(streaming&&!res.destroyed&&!res.writableEnded)res.write(JSON.stringify({event:'stage',stage:generationStage(name)})+'\n');try{return await generateGeminiText(body,{key,model,deadline,attemptTimeoutMs,signal:controller.signal,stage:name});}catch(error){if(error instanceof GeminiError&&!error.stage)error.stage=name;throw error;}};
      const generate=(body:unknown)=>generateAt(body,stages[stage++]??'generation');
      const promptAnalysis=current?editAnalysis(input.prompt,current):await analyzeDesignPrompt(input.prompt,generate,input.productType);
      const productType=promptAnalysis.productType;
      const selectedGuidance=selectDesignGuidance(input.prompt,promptAnalysis,input.mode);
      const config=previewConfig(productType);
      let designPlan=input.mode==='generate'?await planDesign(input.prompt,productType,(body,name)=>{
        if(name==='planning-repair'){repairsByStage.add(name);repairUsed=true;return generateAt(body,name);}
        return generate(body);
      },{promptAnalysis,selectedGuidance}):undefined;
      let artifact:GenerationArtifact|undefined;
      if(input.generationArtifact!==undefined){artifact=generationArtifactSchema.parse(input.generationArtifact);validateDesignMd(artifact.designMd);if(hashArtifact(artifact.designMd)!==artifact.designMdHash)throw new GeminiError('DESIGN.md checksum does not match.','DESIGN_MD');}
      if(qualityReview&&artifact?.approvedPlan){designPlan=designPlanSchema.parse(artifact.approvedPlan);validateDesignMd(artifact.designMd,designPlan);}
      if(designPlan&&input.mode==='generate'){const document=await generateDesignMd(input.prompt,designPlan,generateAt);artifact={version:1,approvedPlan:designPlan,generationRunId,idempotencyKey,originalPrompt:input.prompt,designMd:document.designMd,designMdHash:document.designMdHash,status:'complete',warnings:[],validationSummary:{schema:'valid',screens:'valid',navigation:'valid',tokens:'valid',render:'pending',measuredScreenIds:[]},attemptCounts:{'design-md':document.attempts}};}
      if(artifact&&current&&!qualityReview)artifact={...artifact,approvedPlan:undefined,generationRunId,idempotencyKey,originalPrompt:input.prompt,status:'complete',warnings:[],validationSummary:{...artifact.validationSummary,render:'pending',measuredScreenIds:[]}};
      const designMd=artifact?.designMd;
      const canonicalRequirements=designPlan?contentRequirements(artifact?.originalPrompt??input.prompt,designPlan):[];
      const navigationFor=(app?:import('../shared/design').DesignApp)=>resolvedPlanNavigation(app,designPlan);
      const validateOutput=(candidateText:string,name:string)=>{
        currentStage=name;
        const result=parseDesignOutput(candidateText,name==='draft'?'design draft':'design',productType,qualityReview?current:undefined,qualityReview?new Set(qualityReview.screenIds??[...qualityReview.issues.map(i=>i.screenId),...qualityReview.screenshots.map(i=>i.screenId)]):undefined,current,designPlan,fields=>console.info('[FRAME design validation]',JSON.stringify({requestId,event:'canonical_plan_fields_restored',stage:currentStage,fields})));
        if(designPlan){applyPlannedInsets(result.app,designPlan);validatePlannedDesign(result.app,designPlan);}
        diagnostic('validation_passed');return result;
      };
      const validateOrRepair=async(candidateText:string,name:string)=>{
        try{return validateOutput(candidateText,name);}catch(error){
          diagnostic('validation_failed',error);
          const recoverable=error instanceof GeminiError&&['MALFORMED_JSON','EMPTY_RESPONSE','DESIGN_SCHEMA','DESIGN_RELATIONSHIPS','DESIGN_CONSISTENCY','REQUIREMENT_SCREEN'].includes(error.code);
          // One attempt per validation stage: a recovered draft cannot consume final
          // review's recovery. A failed repair still stops immediately, with no loop.
          if(!recoverable||repairsByStage.has(name)||[...repairsByStage].filter(stage=>!['planning-repair','design-md-repair'].includes(stage)).length>=(input.mode==='generate'?2:1)||controller.signal.aborted||Date.now()>=deadline){if(error instanceof GeminiError&&!error.stage)error.stage=name;throw error;}
          repairsByStage.add(name);
          repairUsed=true;
          let readableCandidate:unknown;try{readableCandidate=parseGeminiJson(candidateText,name);}catch{/* Malformed output requires full recovery. */}
          const readable=responseSchema.safeParse(readableCandidate);
          const targeted=targetedRepair(readableCandidate,error,designPlan);
          const fixed=await generateAt({systemInstruction:{parts:[{text:buildDesignInstructions(productType,input.mode)+'\nBOUNDED VALIDATION REPAIR: Return the complete response JSON, repairing only the listed validation defects. Preserve product type, exact planned screen names and navigation, useful IDs and valid design content. For validation.missingScreens, restore only those screens with their supplied id, expectedName and requiredContent. Keep every valid existing screen and link byte-for-byte. When necessary, add only missing incoming navigation actions allowed by repairScope; do not delete links to the missing destination. Return the complete app for revalidation. Copy every supplied designPlan.designSystem field exactly, including all colors, textStyles, typography, spacing and radii. For missingEdgeIndexes, inspect those entries in designPlan.journey.edges: locate the source/destination screens by their exact names, and ensure a useful existing or new action component in the source screen sets targetScreenId to the destination screen ID (not its name). Restore exactly the missing approved edges in validation.missingNavigation, using their fromScreenId, toScreenId and action. Never invent return links or peer tabs absent from the approved journey. Preserve working links and unrelated components, including on the source screen. If a suitable visible existing action cannot be linked, add a dedicated visible Button and any necessary label/icon children within existing bounds. Do not reveal hidden subtrees, replace containers or recompose valid content. When repairScope is supplied, change only its authorized screens and designSystem when authorized; preserve every other screen byte-for-byte. Use componentIds and validation paths to fix only defective components or their necessary layout ancestors. resolvedNavigation supplies actual screen IDs. Navigation actions must be visible supported clickable surfaces, never hidden/decorative elements or input fields. Do not remove requirements, relax quality, change the schema or add unrelated content.'}]},contents:[{role:'user',parts:[{text:JSON.stringify({mode:'validation-repair',prompt:input.prompt,productType,designMd,canonicalRequirements,designPlan,promptAnalysis,selectedGuidance,currentDesign:current,activeScreen,editScope,qualityReview:qualityReview?{issues:qualityReview.issues,screenIds:qualityReview.screenIds}:undefined,invalidResponse:readableCandidate??candidateText,repairScope:targeted?.scope,resolvedNavigation:navigationFor(readable.success?readable.data.app:undefined),validation:validationForRepair(error)})}]}],generationConfig:{responseMimeType:'application/json',responseJsonSchema}},name+'-repair');
          try{return validateOutput(targeted?JSON.stringify(targeted.restore(parseGeminiJson(fixed,name+'-repair'))):fixed,name+'-repair');}catch(repairError){diagnostic('repair_failed',repairError);if(repairError instanceof GeminiError&&!repairError.stage)repairError.stage=name+'-repair';throw repairError;}
        }
      };
      let text=await generate({systemInstruction:{parts:[{text:buildDesignInstructions(productType,input.mode)+(current&&!qualityReview?`\nAUTHORIZED EDIT SCOPE: ${editScope}. ${editScope==='screen'?'Redesign only screen '+activeScreen+'. Keep all unrelated screens and shared design settings exactly unchanged. New/remove/recompose components only inside that screen.':'The user explicitly selected project scope; apply only the requested project-wide changes.'}`:'')+(qualityReview?'\nRENDERED QUALITY CORRECTION: The currentDesign is an unpublished generated candidate. Review actual attached rendered captures against the original prompt: hierarchy, composition, typography, spacing, readability, product-specific visual identity and responsive intent. Improve weak compositions, not merely geometry. Fix measured defects contextually. If already deliberate and polished, return it unchanged. Captures may be downscaled and sampled; do not claim all screens or breakpoints were visually verified. When no capture exists, use measurements only and never claim image-based verification. Preserve screen IDs, designSystem and all screens outside qualityReview.screenIds (or named issues/captures when screenIds is absent). Preserve useful component IDs; limit all corrections to that authorized review scope. Use the original user prompt for product intent. Warnings about whitespace, contrast or overlaps require contextual judgment; do not add filler, remove intentional layers or indiscriminately pack empty states. Return the complete app.':'' )}]},contents:[{role:'user',parts:[{text:JSON.stringify({mode:input.mode,prompt:input.prompt,productType,viewport:{width:config.viewportWidth,height:config.viewportHeight},promptAnalysis,selectedGuidance,designMd,canonicalRequirements,designPlan,resolvedNavigation:navigationFor(),currentDesign:current,activeScreen,editScope,policyVersion:designPolicy.version,qualityReview:qualityReview?{issues:qualityReview.issues,visualReview:qualityReview.visualReview,screenIds:qualityReview.screenIds}:undefined})},...(qualityReview?.screenshots??[]).flatMap(image=>[{text:'Rendered screen '+image.screenId},{inlineData:{mimeType:'image/jpeg',data:image.data}}])]}],generationConfig:{responseMimeType:'application/json',responseJsonSchema}});
      if(designPlan&&!qualityReview) {
        const candidate=await validateOrRepair(text,'draft');
        text=await generate({systemInstruction:{parts:[{text:buildVisualReviewInstructions(productType)}]},contents:[{role:'user',parts:[{text:JSON.stringify({mode:'review',prompt:input.prompt,productType,promptAnalysis,selectedGuidance,designMd,canonicalRequirements,designPlan,candidateDesign:candidate.app,resolvedNavigation:navigationFor(candidate.app),structuralQuality:inspectStructure(candidate.app)})}]}],generationConfig:{responseMimeType:'application/json',responseJsonSchema}});
      }
      const result=await validateOrRepair(text,qualityReview?'rendered-review':designPlan?'review':'modification');
      if(designPlan&&artifact){
        let missing=missingContent(result.app,canonicalRequirements);
        let repairWarning:string|undefined;
        if(missing.length){
          try{
          const repaired=await generateAt({systemInstruction:{parts:[{text:buildDesignInstructions(productType,'generate')+'\nTARGETED CONTENT REPAIR: Add only the listed missing content/actions inside their stable screen IDs, using fresh component IDs. Preserve all existing components, screens, navigation and design tokens unchanged. Keep additions within safe bounds and use actual supported editable types. Return complete response JSON.'}]},contents:[{role:'user',parts:[{text:JSON.stringify({originalPrompt:input.prompt,designMd,designPlan,canonicalRequirements,missingRequirements:missing,candidateDesign:result.app})}]}],generationConfig:{responseMimeType:'application/json',responseJsonSchema}},'content-repair');
          const fixed=responseSchema.safeParse(parseGeminiJson(repaired,'content-repair'));
          if(fixed.success){const merged=restoreContentRepair(result.app,fixed.data.app,missing);try{validateApp(merged);validatePlannedDesign(merged,designPlan);result.app=merged;}catch{/* Preserve the valid candidate; report unmet noncritical requirements. */}}
          }catch(error){
            if(controller.signal.aborted||error instanceof GeminiError&&['TIMEOUT','CANCELLED','AUTHENTICATION','BILLING'].includes(error.code))throw error;
            repairWarning='The noncritical content repair did not complete. The validated candidate is preserved; review the listed missing requirements.';
          }
          artifact.attemptCounts['content-repair']=1;missing=missingContent(result.app,canonicalRequirements);
        }
        artifact.warnings=missing.map(r=>'Missing '+r.kind+' "'+r.text+'" on '+r.screenName+' ('+r.screenId+').');
        if(repairWarning)artifact.warnings.push(repairWarning);
        artifact.status=artifact.warnings.length?'partial':'complete';
      }
      if(current&&!qualityReview&&editScope==='screen'){
        if(result.app.screens.some(s=>!current.screens.some(original=>original.id===s.id)))return send(422,{error:'Adding screens requires Entire project scope in the AI Designer. Select it and resend. Your prompt and existing design are preserved.',code:'EDIT_SCOPE',retryable:false});
        try{result.app=mergeScreenEdit(current,result.app,[activeScreen!]);}catch{return send(502,{error:'The redesign violated the selected screen boundary or navigation relationships. Your existing design is unchanged.',code:'EDIT_SCOPE',retryable:false});}
      }
      if(artifact){artifact.attemptCounts={...artifact.attemptCounts,...attemptCounts};}
      send(200,{...result,status:artifact?.status??'complete',projectId,generationRunId,revisionId:null,designMd:designMd??null,designMdDownloadName:designMd?'DESIGN.md':null,designJson:result.app,generationArtifact:artifact,validation:artifact?.validationSummary,warnings:artifact?.warnings??[],error:null});
    } catch(e) {
      diagnostic('request_failed',e);
      if(e instanceof GeminiError)return send(e.status,{status:'failed',projectId,generationRunId,revisionId:null,designMd:null,designJson:null,warnings:[],error:e.message,errorDetails:{code:e.code,stage:e.stage??currentStage,message:e.message,diagnostics:validationForRepair(e)},code:e.code,retryable:e.retryable,upstreamStatus:e.upstreamStatus,stage:e.stage??currentStage,retryAfterMs:e.retryAfterMs,reason:e instanceof DesignValidationError?e.details.reason:undefined,missingNavigation:e instanceof DesignValidationError?e.details.missingNavigation:undefined,missingScreens:e instanceof DesignValidationError?e.details.missingScreens:undefined,requestId});
      const message='Design generation failed. Your prompt and existing design are preserved.';
      send(502,{error:message,retryable:false});
    } finally {req.removeListener('aborted',disconnected);res.removeListener('close',disconnected);}
  };
}
