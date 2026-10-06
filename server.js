import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { createWorkflow, WorkflowError } from './server/workflow.js';
try {process.loadEnvFile('.env');}catch(e){if(e.code!=='ENOENT')throw e;}
const port=Number(process.env.PORT||3000),root=resolve('public');
const workflow=await createWorkflow({file:process.env.WORKFLOW_DATA_FILE||'data/projects.json',key:process.env.ANTHROPIC_API_KEY||'',model:process.env.ANTHROPIC_MODEL||'claude-sonnet-5-5',dryRun:process.env.WORKFLOW_MODE==='dry-run'||!process.env.ANTHROPIC_API_KEY,delay:Number(process.env.WORKFLOW_STEP_DELAY_MS||3000)});
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.txt':'text/plain'};
function json(res,status,body){res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'}).end(JSON.stringify(body));}
async function body(req){if(!req.headers['content-type']?.startsWith('application/json'))throw new WorkflowError('Send application/json',415);const chunks=[];let size=0;for await(const chunk of req){chunks.push(chunk);size+=chunk.length;if(size>24000)throw new WorkflowError('Request too large',413);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new WorkflowError('Invalid JSON');}}
const server=http.createServer(async(req,res)=>{try{
  if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host)){json(res,403,{error:'Local host required'});return;}
  const url=new URL(req.url,`http://127.0.0.1:${port}`);
  if(url.pathname.startsWith('/api/')){if(req.headers.origin&&!['http://127.0.0.1:'+port,'http://localhost:'+port].includes(req.headers.origin)){json(res,403,{error:'Same-origin requests only'});return;}
    if(req.method==='GET'&&url.pathname==='/api/projects'){json(res,200,await workflow.snapshot());return;}
    if(req.method==='POST'&&url.pathname==='/api/projects'){json(res,201,await workflow.create(await body(req)));return;}
    const match=url.pathname.match(/^\/api\/projects\/([\w-]+)\/(approve|revise|retry|answer)$/);if(req.method==='POST'&&match){json(res,200,await workflow.act(match[1],match[2],await body(req)));return;}json(res,404,{error:'API route not found'});return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
  const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!path.startsWith(root+'/')){res.writeHead(403).end();return;}const data=await readFile(path);res.writeHead(200,{'content-type':types[extname(path)]||'application/octet-stream','cache-control':'no-cache'});res.end(req.method==='HEAD'?undefined:data);
}catch(e){if(req.url.startsWith('/api/'))json(res,e.status||500,{error:e.status?e.message:'The local server could not save or process the request.'});else res.writeHead(404).end('Not found');}});
server.listen(port,'127.0.0.1',()=>console.log(`Crew & Crop: http://127.0.0.1:${port}`));
