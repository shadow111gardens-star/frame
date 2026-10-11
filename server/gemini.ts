import {DEFAULT_GENERATION_TIMEOUT_MS,timeoutSetting} from '../shared/generationTiming';
import {inspectStructure,qualityReviewSchema} from '../shared/designQuality';
import {buildDesignInstructions,buildVisualReviewInstructions} from "./designInstructions";
import type { IncomingMessage, ServerResponse } from 'node:http';
import { responseJsonSchema, responseSchema, validateApp,validateGeneratedFonts } from '../shared/design';
import {analyzeDesignPrompt} from './designKnowledge/analysis';
import {editAnalysis,selectDesignGuidance} from './designKnowledge/selection';
import { previewConfig } from '../shared/product';
import {planDesign,validatePlannedDesign,applyPlannedInsets} from './designPlanning';
import {parseGeminiJson,GeminiError,generateGeminiText} from './geminiResponse';
import {mergeScreenEdit} from '../shared/editScope';
import {resolveRequirements} from './designRequirements';
import {designPolicy} from '../shared/designPolicy';

function parseDesignOutput(text:string,stage:'design draft'|'design',productType:string,protectedApp?:import('../shared/design').DesignApp,affected?:Set<string>,existing?:import('../shared/design').DesignApp) {
  const parsed=responseSchema.safeParse(parseGeminiJson(text,stage));
  if(!parsed.success)throw new GeminiError(`Gemini returned an invalid ${stage}: ${parsed.error.issues.slice(0,4).map(issue=>`${issue.path.join('.')||'response'} (${issue.code})`).join(', ')}. Your original prompt and existing design are preserved.`,'DESIGN_SCHEMA');
  const result=parsed.data;
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
    throw new GeminiError(`Gemini returned an invalid ${stage}: ${reason}. Your original prompt and existing design are preserved.`,'DESIGN_RELATIONSHIPS');
  }
  return result;
}

export function geminiConfig(env: Record<string,string|undefined>) {
  return {key:env.GEMINI_API_KEY,model:env.GEMINI_MODEL,timeoutMs:timeoutSetting(env.GEMINI_GENERATION_TIMEOUT_MS,DEFAULT_GENERATION_TIMEOUT_MS),attemptTimeoutMs:timeoutSetting(env.GEMINI_ATTEMPT_TIMEOUT_MS,180000)};
}
export function designRoute(env: Record<string,string|undefined>) {
  return async (req:IncomingMessage,res:ServerResponse,next:()=>void) => {
    if(req.url?.split('?')[0] !== '/api/design') return next();
    const send = (status:number,data:unknown) => {if(res.destroyed||res.writableEnded)return;res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
    if(req.method !== 'POST') return send(405,{error:'Use POST.'});
    if(req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) return send(403,{error:'Origin is not allowed.'});
    const {key,model,timeoutMs,attemptTimeoutMs}=geminiConfig(env);
    if(!key||!model)return send(503,{error:'Configure GEMINI_API_KEY and GEMINI_MODEL on the server, then restart.',code:'CONFIGURATION',retryable:false});
    // Every stage uses the official Google adapter; no provider-selection path exists.
    res.setHeader('X-FRAME-Provider','gemini');
    res.setHeader('X-FRAME-Model',model);
    const controller=new AbortController();
    const disconnected=()=>{if(!res.writableEnded&&!controller.signal.aborted){console.info('[FRAME generation]',{event:'cancelled',source:'client_disconnect'});controller.abort(new DOMException('Client disconnected.','AbortError'));}};
    req.on('aborted',disconnected);res.on('close',disconnected);
    try {
      let body = ''; for await (const chunk of req) {body += chunk; if(Buffer.byteLength(body)>2_000_000) return send(413,{error:'Design request is too large.'});}
      let input; try {input=JSON.parse(body);} catch {return send(400,{error:'Invalid request JSON.'});}
      if(typeof input.prompt !== 'string' || !input.prompt.trim() || input.prompt.length>20000) return send(400,{error:'Enter a prompt of up to 20,000 characters.'});
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
      const deadline=Date.now()+Math.min(timeoutMs,input.timeoutMs===undefined?timeoutMs:Math.max(1000,input.timeoutMs-5000));
      let stage=0;const stages=current?[qualityReview?'rendered-review':'modification']:['analysis','planning','draft','review'];
      const generate=(body:unknown)=>generateGeminiText(body,{key,model,deadline,attemptTimeoutMs,signal:controller.signal,stage:stages[stage++]??'generation'});
      const promptAnalysis=current?editAnalysis(input.prompt,current):await analyzeDesignPrompt(input.prompt,generate,input.productType);
      const productType=promptAnalysis.productType;
      const selectedGuidance=selectDesignGuidance(input.prompt,promptAnalysis,input.mode);
      const config=previewConfig(productType);
      const designPlan=input.mode==='generate'?await planDesign(input.prompt,productType,generate,{promptAnalysis,selectedGuidance}):undefined;
      let text=await generate({systemInstruction:{parts:[{text:buildDesignInstructions(productType,input.mode)+(current&&!qualityReview?`\nAUTHORIZED EDIT SCOPE: ${editScope}. ${editScope==='screen'?'Redesign only screen '+activeScreen+'. Keep all unrelated screens and shared design settings exactly unchanged. New/remove/recompose components only inside that screen.':'The user explicitly selected project scope; apply only the requested project-wide changes.'}`:'')+(qualityReview?'\nRENDERED QUALITY CORRECTION: The currentDesign is an unpublished generated candidate. Review actual attached rendered captures against the original prompt: hierarchy, composition, typography, spacing, readability, product-specific visual identity and responsive intent. Improve weak compositions, not merely geometry. Fix measured defects contextually. If already deliberate and polished, return it unchanged. Captures may be downscaled and sampled; do not claim all screens or breakpoints were visually verified. When no capture exists, use measurements only and never claim image-based verification. Preserve screen IDs, designSystem and all screens outside qualityReview.screenIds (or named issues/captures when screenIds is absent). Preserve useful component IDs; limit all corrections to that authorized review scope. Use the original user prompt for product intent. Warnings about whitespace, contrast or overlaps require contextual judgment; do not add filler, remove intentional layers or indiscriminately pack empty states. Return the complete app.':'' )}]},contents:[{role:'user',parts:[{text:JSON.stringify({mode:input.mode,prompt:input.prompt,productType,viewport:{width:config.viewportWidth,height:config.viewportHeight},promptAnalysis,selectedGuidance,designPlan,currentDesign:current,activeScreen,editScope,policyVersion:designPolicy.version,qualityReview:qualityReview?{issues:qualityReview.issues,visualReview:qualityReview.visualReview,screenIds:qualityReview.screenIds}:undefined})},...(qualityReview?.screenshots??[]).flatMap(image=>[{text:'Rendered screen '+image.screenId},{inlineData:{mimeType:'image/jpeg',data:image.data}}])]}],generationConfig:{responseMimeType:'application/json',responseJsonSchema}});
      if(designPlan) {
        const candidate=parseDesignOutput(text,'design draft',productType);
        text=await generate({systemInstruction:{parts:[{text:buildVisualReviewInstructions(productType)}]},contents:[{role:'user',parts:[{text:JSON.stringify({mode:'review',prompt:input.prompt,productType,promptAnalysis,selectedGuidance,designPlan,candidateDesign:candidate.app,structuralQuality:inspectStructure(candidate.app)})}]}],generationConfig:{responseMimeType:'application/json',responseJsonSchema}});
      }
      let result;
      try {result=parseDesignOutput(text,'design',productType,qualityReview?current:undefined,qualityReview?new Set(qualityReview.screenIds??[...qualityReview.issues.map(i=>i.screenId),...qualityReview.screenshots.map(i=>i.screenId)]):undefined,current);if(designPlan){applyPlannedInsets(result.app,designPlan);validatePlannedDesign(result.app,designPlan);}} catch(error) {if(error instanceof GeminiError)throw error;return send(502,{error:'Gemini returned an invalid design, changed the product type, or did not follow the planned screens and design system. Your existing design is unchanged.',code:'DESIGN_CONSISTENCY',retryable:false});}
      if(current&&!qualityReview&&editScope==='screen'){
        if(result.app.screens.some(s=>!current.screens.some(original=>original.id===s.id)))return send(422,{error:'Adding screens requires Entire project scope in the AI Designer. Select it and resend. Your prompt and existing design are preserved.',code:'EDIT_SCOPE',retryable:false});
        try{result.app=mergeScreenEdit(current,result.app,[activeScreen!]);}catch{return send(502,{error:'The redesign violated the selected screen boundary or navigation relationships. Your existing design is unchanged.',code:'EDIT_SCOPE',retryable:false});}
      }
      send(200,result);
    } catch(e) {
      if(e instanceof GeminiError)return send(e.status,{error:e.message,code:e.code,retryable:e.retryable,upstreamStatus:e.upstreamStatus,stage:e.stage,retryAfterMs:e.retryAfterMs});
      const message='Design generation failed. Your prompt and existing design are preserved.';
      send(502,{error:message,retryable:false});
    } finally {req.removeListener('aborted',disconnected);res.removeListener('close',disconnected);}
  };
}
