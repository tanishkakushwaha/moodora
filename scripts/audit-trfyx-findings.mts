process.env.NEXT_PUBLIC_TESTING_TRFYX_WEBSITE_ID = 'offline_testing_fixture';
process.env.NEXT_PUBLIC_TESTING_TRFYX_DOMAIN = 'testing.trfyx.com';
import assert from 'node:assert/strict';
const entry = new URL('../src/lib/trfyx.ts', import.meta.url).href;
function install(cookie='moodora_analytics_consent=granted') {
  const values=new Map<string,string>();
  const target=Object.assign(new EventTarget(), {location:{hostname:'testing.trfyx.com',protocol:'https:'},localStorage:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}},trfyx:undefined as undefined|((...args:unknown[])=>void)});
  const doc={cookie};
  Object.defineProperty(globalThis,'window',{value:target,configurable:true});
  Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
  return {values,target,doc};
}
const results:unknown[]=[];
{
 const helper=await import(entry+'?case=failed-response');
 const {target,values}=install();let calls=0;
 target.trfyx=(...args)=>{calls++;(args[2] as (r:{status:number})=>void)({status:500});};
 await helper.trackCheckoutStarted('cs_failure_repeat','monthly');
 await helper.trackCheckoutStarted('cs_failure_repeat','monthly');
 assert.equal(calls,2);assert.equal(values.has('moodora:checkout-started:cs_failure_repeat'),false);
 results.push({id:'F01',classification:'FIXED_LOCALLY_RETESTED',scenario:'explicit HTTP 500 callback then retry',expected:'failure not recorded as accepted delivery',actual:'no sent marker; later retry allowed',calls});
}
{
 const helper=await import(entry+'?case=cookie-security-error');install();
 Object.defineProperty(globalThis,'document',{value:{get cookie(){throw new DOMException('Cookies unavailable','SecurityError');}},configurable:true});
 let error='';try{await helper.trackCheckoutStarted('cs_cookie_failure','monthly');}catch(e){error=e instanceof Error?e.name:String(e);}
 assert.equal(error,'');
 results.push({id:'F02',classification:'FIXED_LOCALLY_RETESTED',scenario:'cookie getter raises SecurityError',expected:'analytics failure must not reject checkout navigation helper',actual:'helper resolves without emitting; cookie exception is isolated'});
}
{
 let sends=0;
 for(const browser of ['a','b']){
  const helper=await import(entry+'?case=browser-'+browser);const {target}=install();
  target.trfyx=(...args)=>{sends++;(args[2] as (r:{status:number})=>void)({status:202});};
  await helper.trackCheckoutStarted('cs_shared_across_browsers','yearly');
 }
 assert.equal(sends,2);
 results.push({id:'L01',classification:'CONFIRMED_LOCAL_LIMITATION',scenario:'same Stripe Session in two independent browser/storage contexts',actual:'two sends for one Stripe Session',sends,scope:'does not prove Trfyx stores two; global counting rule still needed'});
}
{
 const helper=await import(entry+'?case=cross-tab-choice');const {target:tabA,doc}=install();const tabB=new EventTarget();
 let notificationsA=0,notificationsB=0;
 tabA.addEventListener('moodora:analytics-choice',()=>{notificationsA++;});
 tabB.addEventListener('moodora:analytics-choice',()=>{notificationsB++;});
 helper.saveAnalyticsChoice('denied');
 assert.equal(notificationsA,1);assert.equal(notificationsB,0);assert.ok(doc.cookie.startsWith('moodora_analytics_consent=denied;'));
 results.push({id:'R01',classification:'NOTIFICATION_GAP_REPRODUCED_LIVE_IMPACT_UNVERIFIED',scenario:'decline analytics in tab A with tab B already mounted',actual:'only tab A receives preference notification',notificationsA,notificationsB,scope:'full React/browser running-tracker behavior still needs verification'});
}
for(const result of results)console.log(JSON.stringify(result));
console.log('Diagnostics reproduced the stated behaviors; this is not an acceptance-test PASS or a live Trfyx test. No network, database, real customers or provider state used.');
