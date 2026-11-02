// يولّد قيماً مرجعية من منطق الويب (www/app.js) لاختبارات التطابق في test/web_parity_test.dart.
// الاستخدام: TZ=Asia/Gaza node tool/gen_web_golden.js > test/fixtures/web_golden.json
const path=require('path');const WWW=path.join(__dirname,'..','..','www');
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync(path.join(WWW,'app.js'),'utf8');
function extract(name){
  const re=new RegExp('(?:^|\\n)\\s*(function '+name+'\\s*\\(|const '+name+'\\s*=)');
  const m=re.exec(src); if(!m) throw new Error('no '+name);
  let i=m.index+m[0].length;
  if(m[1].startsWith('const')){ // until ;\n at depth 0
    let d=0; for(;i<src.length;i++){const c=src[i]; if('({['.includes(c))d++; else if(')}]'.includes(c))d--; else if(c===';'&&d===0) break;}
    return src.slice(m.index,i+1);
  }
  let j=src.indexOf('{',i); let d=0;
  for(;j<src.length;j++){const c=src[j]; if(c==='{')d++; else if(c==='}'){d--; if(d===0)break;}}
  return src.slice(m.index,j+1);
}
const names=['dateKey','addDays','today','dayNumber','hashStr','rng','pick','shuffle','dayRec','markActive','arDays','arMins','isActive','stats','weekStart','buildDaily','latestLevels','subjectPlan','studentClass','lowStreak','clampQuiet','slotOn','remindTime','whenLabel','gtext','reminderCopy','arCount2','missCopy','planNotifications','dueCards','WHEN_TIME','DAY_NAMES','MISS_OFFSETS','xpForLevel','levelInfo'];
let code=fs.readFileSync(path.join(WWW,'data.js'),'utf8')+'\n';
code+='let S; const save=()=>{};\n';
for(const n of names){ code+=extract(n)+'\n'; }

const FIXED=new Date(2026,10,2,10,0,0).getTime();
const RealDate=Date;
class FakeDate extends RealDate{constructor(...a){ if(a.length===0) super(FIXED); else super(...a);} static now(){return FIXED;}}
const ctx={Date:FakeDate,Math,JSON,Object,Array,String,Number,Set,console,isFinite};
vm.createContext(ctx);
vm.runInContext(code+'\nthis.api={hashStr,rng,buildDaily,stats,planNotifications,levelInfo,setS:s=>{S=s},getS:()=>S,arDays,arMins};',ctx);
const A=ctx.api;
const out={};
// hash + rng
out.hash=['', 'a', 'سارة', '2026-11-02:0:سارة'].map(s=>A.hashStr(s));
const r=A.rng(A.hashStr('2026-11-02:0:سارة')); out.rng=[r(),r(),r(),r(),r()];
const base=()=>({settings:{},profile:{name:'سارة',grade:'إعدادي',cls:8,subjects:['الرياضيات','العلوم','اللغة العربية'],minutes:45,goal:'',when:'بعد العصر',lastLesson:{}},xp:0,history:{},daily:null,cards:[],assess:[{date:'2026-10-01',away:2,levels:{'الرياضيات':4,'العلوم':2,'اللغة العربية':3}}],bookChats:{},reminders:{on:true,time:'',lead:10,days:[0,1,2,3,4,6],miss:true,showName:true,shared:false,pausedUntil:''},notif:{pauses:0,ignored:0}});
function addActive(S,keys){keys.forEach(k=>{S.history[k]=Object.assign({ch:1,focus:0,sessions:0,mood:null,gameXp:0,reflected:false,active:true,reviews:0,cardsAdded:0},S.history[k]||{});});}
function days(endKey,n,skip){const res=[];const d=new RealDate(endKey+'T12:00:00');for(let i=0;i<n;i++){const x=new RealDate(d);x.setDate(x.getDate()-i);const k=x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); if(!(skip||[]).includes(k)) res.push(k);}return res;}
const scen={};
function run(name,S,rer){A.setS(S);A.buildDaily(rer||0);scen[name]={list:S.daily.list.map(c=>({type:c.type,text:c.text,subject:c.subject,minutes:c.minutes,xp:c.xp})),stats:(()=>{const s=A.stats();return {streak:s.streak,best:s.bestStreak,freezes:s.freezes,activeDays:s.activeDays,stage:s.stage,gap:s.gapDays,reentry:s.reentry,struggling:s.struggling,weekDays:s.weekDays};})()};}
run('fresh0',base(),0);
run('fresh1',base(),1);
{const S=base(); addActive(S,days('2026-11-01',12)); S.history['2026-11-02']={mood:3}; S.profile.lastLesson={'العلوم':'الخلية'}; run('stage3bonus',S,0);}
{const S=base(); S.history['2026-11-02']={mood:5}; run('anxious',S,0);}
{const S=base(); S.profile.cls=2; S.profile.grade='ابتدائي'; addActive(S,days('2026-11-01',4)); S.history['2026-11-02']={mood:0}; run('youngLow',S,0);}
{const S=base(); addActive(S,days('2026-10-20',8)); run('reentry',S,0);}
{const S=base(); addActive(S,days('2026-11-01',20,['2026-10-25','2026-10-18','2026-10-19'])); run('freezes',S,0);}
{const S=base(); addActive(S,days('2026-11-01',25)); days('2026-11-01',7).forEach(k=>{S.history[k].given=5;S.history[k].ch=1;}); run('struggling',S,0);}
out.scen=scen;
// reminders
function plan(S){A.setS(S); return A.planNotifications().map(p=>({id:p.id,at:new RealDate(p.at).toString().slice(0,21),title:p.title,body:p.body,kind:p.kind}));}
{const S=base(); out.planFresh=plan(S);}
{const S=base(); S.reminders.time='21:25'; S.reminders.lead=0; S.profile.g='f'; S.reminders.showName=false; addActive(S,['2026-11-02']); out.planLate=plan(S);}
{const S=base(); S.reminders.time='07:05'; S.reminders.lead=30; S.reminders.pausedUntil='2026-11-05'; out.planEarlyPaused=plan(S);}
out.levels=[0,99,100,299,300,599,600,1000,5000].map(x=>{const l=A.levelInfo(x);return [l.level,l.title,l.pct,l.toNext];});
out.ar=[1,2,3,10,11,25].map(n=>[A.arDays(n),A.arMins(n)]);
process.stdout.write(JSON.stringify(out,null,1));
