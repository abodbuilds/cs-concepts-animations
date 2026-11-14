import './build.mjs';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const port=Number(process.env.LAB_PORT||5163);
if(!Number.isInteger(port)||port<0||port>65535)throw new Error('LAB_PORT must be a valid port number.');
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end('Method not allowed');return;}
  if(!['/','/index.html'].includes(path)){res.writeHead(404);res.end('Not found');return;}
  try{
    const body=await readFile(new URL('dist/index.html',import.meta.url));
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Length':body.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(500);res.end('Build the app before serving it.');}
});
server.on('error',error=>{
  console.error(error.code==='EADDRINUSE'?`Port ${port} is in use. Set LAB_PORT to choose another port.`:`Could not start the local server (${error.code}). You can still open webapp/dist/index.html directly.`);
  process.exitCode=1;
});
server.listen(port,'127.0.0.1',()=>console.log(`CS Concept Lab: http://127.0.0.1:${server.address().port}`));
