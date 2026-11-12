// Quiet chrome pass on a fresh unpinned profile: greet, retire, hint wakes, pin persists,
// hint never covers text/links/targets at 320 and 390.
const pp=require('puppeteer-core'),assert=require('node:assert/strict'),{spawn}=require('child_process');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{let server,b;try{
 const url=process.env.URL||'http://127.0.0.1:8835';
 if(!process.env.URL){server=spawn('python3',['-m','http.server','8835'],{stdio:'ignore'});await sleep(400)}
 b=await pp.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 const op=(p,sel)=>p.$eval(sel,e=>getComputedStyle(e).opacity);
 for(const motion of ['reduce','no-preference']){
  const c=await b.createBrowserContext(),p=await c.newPage();await p.setViewport({width:390,height:844});
  await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:motion}]);
  await p.evaluateOnNewDocument(()=>{new MutationObserver(()=>{const n=document.querySelector('.places');if(n&&n.classList.contains('chrome-on'))window.__sawOn=true}).observe(document,{subtree:true,childList:true,attributes:true})});
  await p.goto(url,{waitUntil:'domcontentloaded'});await p.waitForSelector('.places.chrome',{timeout:45000});
  assert(await p.evaluate(()=>window.__sawOn===true),'greets');
  await sleep(3500);assert.equal(await op(p,'.places'),'0','retires');
  assert(await p.$eval('.chrome-hint',e=>!e.hidden),'hint shows');
  if(motion==='reduce')assert.equal(await p.$eval('.places',e=>getComputedStyle(e).transitionDuration),'0s','reduced motion');
  await p.$eval('.chrome-hint',e=>e.click());await sleep(400);assert.equal(await op(p,'.places'),'1','hint wakes');
  await p.$eval('#pin-controls',e=>e.click());await p.reload({waitUntil:'domcontentloaded'});await p.waitForSelector('.places.chrome',{timeout:45000});await sleep(3500);
  assert.equal(await op(p,'.places'),'1','pin persists');await c.close();
 }
 for(const w of [320,390]){
  const c=await b.createBrowserContext(),p=await c.newPage();await p.setViewport({width:w,height:844});
  await p.goto(url,{waitUntil:'domcontentloaded'});await p.waitForSelector('.places.chrome',{timeout:45000});await sleep(3600);
  const hits=await p.evaluate(()=>{const h=document.querySelector('.chrome-hint').getBoundingClientRect(),bad=[];
   const inter=r=>!(r.right<h.left||r.left>h.right||r.bottom<h.top||r.top>h.bottom);
   for(const el of document.querySelectorAll('a,p,h1,h2,span,button,.biome-card')){if(el.classList.contains('chrome-hint'))continue;const cr=el.closest('.chrome');if(cr&&!cr.classList.contains('chrome-on'))continue;
    const r=el.getBoundingClientRect();if(r.width&&r.height&&getComputedStyle(el).display!=='none'&&inter(r))bad.push(el.tagName+'.'+el.className)}return bad});
  assert.deepEqual(hits,[],'hint overlap at '+w+': '+hits.join(','));await c.close();
 }
 console.log('quiet chrome pass OK');
}finally{await b?.close();server?.kill()}})().catch(e=>{console.error(e);process.exit(1)});
