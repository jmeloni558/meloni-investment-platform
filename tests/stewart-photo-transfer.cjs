// Exercise the real DOM adapter and transfer UI, with a local in-memory Stewart gallery.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const matches=vm.runInNewContext(fs.readFileSync('operations/portal-import/propertythesis/photo-worker.js','utf8')+';sameAddress',{chrome:{runtime:{onMessage:{addListener(){}}}}});
 assert(matches('7210 Brightwaters Court, New Port Richey, FL 34652','7210 BRIGHTWATERS CT NEW PORT RICHEY FL 34652'));assert(!matches('12 A St Unit 1','12 A St Unit 10'));assert(!matches('12 A St','12 A St Unit 1'));
 const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{const page=await browser.newPage();
 await page.route('http://localhost/**',r=>r.fulfill(r.request().url().endsWith('.mjs')?{contentType:'text/javascript',body:fs.readFileSync('stewart-photo-transfer.mjs','utf8')}:{contentType:'text/html',body:'<div id="PhotoAndFileLink"><a>Photos/Files</a></div><div hidden id="divCaseFileManager"><input type=file><div class="photoContainer"></div><a>Save and Exit</a></div>'}));
 await page.goto('http://localhost/order');
 await page.evaluate(()=>{const manager=document.querySelector('#divCaseFileManager'),box=manager.querySelector('.photoContainer');window.fileCount=0;
 window.chrome={runtime:{onMessage:{addListener(fn){window.handle=fn}}}};
 const saved=new Map();const render=()=>{box.replaceChildren();for(const [name,item] of saved){const panel=document.createElement('div');panel.className='photoPanel';panel.innerHTML='<h3></h3><select class="photoAndFileLabel"><option></option><option>Kitchen</option></select>';panel.querySelector('h3').textContent=name;const sel=panel.querySelector('select');sel.value=item.label;
 function radio(){if(!sel.value||panel.querySelector('input'))return;const r=document.createElement('input');r.type='radio';r.value='false';r.checked=item.no;r.onclick=()=>item.no=r.checked;panel.append(r)}
 sel.onchange=()=>{item.label=sel.value;radio()};radio();box.append(panel)}};
 document.querySelector('#PhotoAndFileLink a').onclick=()=>{manager.hidden=false;render()};manager.querySelector('a').onclick=()=>manager.hidden=true;manager.querySelector('input').onchange=e=>{window.fileCount++;const f=e.target.files[0];saved.set(f.name,{label:'',no:false});render()};
 window.addEventListener('message',e=>{const m=e.data;if(m?.kind!=='pt-photos')return;const reply=response=>window.postMessage({kind:'pt-photo-result',id:m.id,response},location.origin);if(m.op==='find')return reply({ok:true,value:{id:1,url:location.href}});window.handle({...m,kind:'pt-gallery'},null,reply)});
 });
 await page.addScriptTag({path:'operations/portal-import/propertythesis/photo-gallery.js'});
 for(let run=0;run<2;run++){const result=page.evaluate(async()=>{const {reviewTransfer}=await import('/transfer.mjs');const c=document.createElement('canvas');c.width=500;c.height=400;const photo=await new Promise(r=>c.toBlob(r,'image/jpeg'));let status;await reviewTransfer({address:'12 A St',items:[{name:'001-kitchen.jpg',description:'Kitchen'}],no:true,guard(){},read:()=>photo,progress:s=>status=s});return status});await page.getByRole('button',{name:'Upload to Stewart'}).click();assert.match(await result,/1 photos verified.*No/)}
 assert.equal(await page.evaluate(()=>window.fileCount),1);console.log('PASS: address and unit guards, upright JPEG review, transfer, save/reopen, labels, Repair No, duplicate retry.');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
