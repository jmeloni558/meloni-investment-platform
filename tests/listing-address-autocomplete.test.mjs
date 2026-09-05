import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../listing-address-autocomplete.js',import.meta.url),'utf8');
function harness({signedIn=false,fail=false}={}){
  const instances=[],notes=[];
  function input(id,kind){
    return {id,value:'',placeholder:'Full address',dataset:{ptListingAddress:kind},handlers:{},attrs:{},
      closest:()=>null,insertAdjacentElement:(_where,n)=>notes.push(n),
      setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k];},
      addEventListener(k,fn){this.handlers[k]=fn;},dispatchEvent(e){this.handlers[e.type]?.(e);}};
  }
  const inputs=[input('ptSpecificAddress','specific'),input('ptAreaAddress','area')];
  const original={address:'Original analysis'},window={state:original};
  let calls=0;
  window.PropertyThesisAddressRecognition={loadGoogle:async()=>{if(fail)throw Error('offline');},
    showSuggestions(){},hideSuggestions(){},makeMobileSuggestionRoom(){},resetMobileSuggestionRoom(){}};
  const document={readyState:'complete',body:{classList:{add(){},remove(){}}},head:{appendChild(){}},
    querySelectorAll:()=>inputs,createElement:()=>({setAttribute(){}})};
  const context={window,document,cloudUser:signedIn?{id:'test'}:null,
    cloudClient:{functions:{invoke(){calls++;}}},Event:class{constructor(type){this.type=type;}},
    MutationObserver:class{observe(){}},setTimeout,
    google:{maps:{places:{Autocomplete:class{
      constructor(input,options){this.input=input;this.options=options;instances.push(this);}
      addListener(_event,fn){this.select=fn;}getPlace(){return this.place;}
    }}}}};
  vm.runInNewContext(source,context);
  return {window,inputs,instances,notes,get calls(){return calls;}};
}
for(const signedIn of [false,true])test(`${signedIn?'signed-in':'guest'} selection is US-wide, isolated and never submits`,async()=>{
  const h=harness({signedIn});
  for(const input of h.inputs)await input.handlers.focus();
  assert.equal(h.instances.length,2);
  for(const instance of h.instances){
    assert.equal(instance.options.componentRestrictions.country,'us');
    assert.equal(instance.options.strictBounds,false);
    assert.equal(instance.options.fields.join(','),'formatted_address');
  }
  h.inputs[0].value='123 Main St Apt 4B, Boston MA';h.inputs[0].handlers.input();
  h.instances[0].place={formatted_address:'123 Main St, Boston, MA, USA'};
  h.instances[0].select();
  assert.equal(h.inputs[0].value,'123 Main St #4B, Boston, MA, USA');
  assert.equal(h.inputs[1].value,'');
  h.instances[1].place={formatted_address:'456 Oak St, Seattle, WA, USA'};
  h.instances[1].select();
  assert.equal(h.inputs[1].value,'456 Oak St, Seattle, WA, USA');
  assert.equal(h.window.state.address,'Original analysis');assert.equal(h.calls,0);
  let prevented=false;
  h.inputs[0].handlers.keydown({key:'Enter',preventDefault(){prevented=true;}});
  assert.equal(prevented,true);
  h.window.PropertyThesisListingAddresses.attachAll();
  assert.equal(h.notes.length,2);
});
test('Google failure leaves manual entry intact and does not consume searches',async()=>{
  const h=harness({fail:true});h.inputs[0].value='Manual test address';
  await h.inputs[0].handlers.focus();
  assert.equal(h.inputs[0].value,'Manual test address');
  assert.equal(h.inputs[0].dataset.ptListingAutocomplete,'manual');
  assert.match(h.notes[0].textContent,/enter the full address manually/);
  assert.equal(h.calls,0);
});
test('unit preservation avoids duplicates and preserves ordinary addresses',()=>{
  const preserve=harness().window.PropertyThesisListingAddresses.preserveUnit;
  assert.equal(preserve('123 Main St, Boston','123 Main St'),'123 Main St, Boston');
  assert.equal(preserve('123 Main St #4, Boston','123 Main St unit 4'),'123 Main St #4, Boston');
});
