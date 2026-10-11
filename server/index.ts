import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { geminiConfig, designRoute } from './gemini';

try { process.loadEnvFile('.env'); } catch { /* Environment can be injected by the host. */ }
const route=designRoute(process.env);
const html=await readFile(new URL('../dist/index.html',import.meta.url));
const server=createServer((req,res)=> {
  void route(req,res,()=> {
    if(req.method!=='GET' || req.url?.startsWith('/api/')) {res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});res.end(html);
  });
});
server.requestTimeout=geminiConfig(process.env).timeoutMs+30000;
server.listen(Number(process.env.PORT??3000),'127.0.0.1',()=>console.log(`FRAME available at http://localhost:${process.env.PORT??3000}`));
