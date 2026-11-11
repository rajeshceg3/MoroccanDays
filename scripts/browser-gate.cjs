const fs=require('fs'),assert=require('node:assert'),pp=require('puppeteer-core'),{spawn}=require('child_process');
(async()=>{let server,b;try{
 if(!process.env.URL){server=spawn('python3',['-m','http.server','8834'],{stdio:'ignore'});await new Promise(r=>setTimeout(r,350))}
 b=await pp.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.setViewport({width:390,height:844});await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 await p.evaluateOnNewDocument(()=>{const c=AudioNode.prototype.connect;AudioNode.prototype.connect=function(d,...a){const r=c.call(this,d,...a);if(d instanceof AudioDestinationNode){if(!this.context.__tee)this.context.__tee=this.context.createMediaStreamDestination();window.__tee=this.context.__tee;c.call(this,this.context.__tee)}return r}});
 await p.goto(process.env.URL||'http://127.0.0.1:8834',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.moroccoSound,{timeout:45000});assert.equal(await p.evaluate(()=>window.moroccoSound.state.ctx),null);
 await p.click('#sound');await p.waitForFunction(()=>window.moroccoSound.state.ctx.state==='running');const dir=process.env.AUDIO_OUT||'verification/audio';fs.mkdirSync(dir,{recursive:true});
 for(const [i,z] of [190,95,0,-105,-190].entries()){
  await p.click('[data-z="'+z+'"]');await new Promise(r=>setTimeout(r,2500));assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const bounds=await p.$eval('#sound',e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}});assert(bounds.left>=0&&bounds.right<=390&&bounds.bottom<=844&&bounds.height>=44);
  const bytes=await p.evaluate(async()=>{const chunks=[],r=new MediaRecorder(window.__tee.stream);r.ondataavailable=e=>chunks.push(e.data);const done=new Promise(ok=>r.onstop=ok);r.start();await new Promise(ok=>setTimeout(ok,3000));r.stop();await done;return [...new Uint8Array(await new Blob(chunks,{type:r.mimeType}).arrayBuffer())]});fs.writeFileSync(dir+'/morocco-app-'+i+'.webm',Buffer.from(bytes));await p.screenshot({path:dir+'/390-'+i+'.png'});
 }
 await p.click('#sound');await p.waitForFunction(()=>window.moroccoSound.state.ctx===null);await p.click('#sound');await p.waitForFunction(()=>window.moroccoSound.state.ctx.state==='running');await p.click('#sound');assert.deepEqual(errors,[]);console.log('PASS five biomes, silent start, opt-in, close/replay, sound button bounds, no errors');
}finally{await b?.close();server?.kill()}})().catch(e=>{console.error(e);process.exit(1)});
