import {detectProductType} from '../server/productDetection';
import {geminiConfig} from '../server/gemini';
import assert from 'node:assert/strict';

// Optional live verification. No credentials or design fixtures are printed.
try {process.loadEnvFile('.env');} catch { /* Host environment may supply configuration. */ }
const {key,model}=geminiConfig(process.env);
if(!key || !model) throw new Error('Configure GEMINI_API_KEY and GEMINI_MODEL.');
const cases=[
  ['Create a modern SaaS landing page for an AI product.','website'],
  ['Create a modern fitness tracking mobile app.','mobile_app'],
  ['Build an iOS food delivery app with Home, Search, Orders and Profile.','mobile_app'],
  ['Create an ecommerce website with Home, Products, Cart and Checkout.','website'],
  ['Advertise my phone app with a public page visitors can open in their browser.','website'],
  ['An application commuters install on their phones to find nearby stops.','mobile_app'],
] as const;
for(const [prompt,expected] of cases) {
  const actual=await detectProductType(prompt,async body=>{
    const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
    if(!response.ok)throw new Error(`Live intent check failed (${response.status}).`);
    const data=await response.json();return data.candidates?.[0]?.content?.parts.map((part:{text?:string})=>part.text??'').join('');
  });
  assert.equal(actual,expected,prompt);console.log(`${actual}: ${prompt}`);
}
