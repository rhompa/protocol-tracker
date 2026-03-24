"use client";
import { useState, useEffect, useCallback, useRef } from "react";

const CATEGORIES = [
  { id: "supplement", label: "Supplement", icon: "\u25CB", color: "#7c8c6e" },
  { id: "peptide", label: "Peptide", icon: "\u25C7", color: "#9b7e5e" },
  { id: "injection", label: "Injection", icon: "\u25B3", color: "#c4956a" },
  { id: "medication", label: "Medication", icon: "\u25A1", color: "#8b7d9b" },
];
const TIME_SLOTS = [
  { id: "morning_empty", label: "Morning \u2014 Empty Stomach", short: "AM Empty", hour: 6 },
  { id: "morning_food", label: "Morning \u2014 With Food", short: "AM Food", hour: 8 },
  { id: "midday", label: "Midday", short: "Midday", hour: 12 },
  { id: "afternoon", label: "Afternoon", short: "PM", hour: 15 },
  { id: "evening", label: "Evening", short: "Evening", hour: 18 },
  { id: "night", label: "Night \u2014 Before Bed", short: "Night", hour: 21 },
];
const FREQS = [
  { id: "daily", label: "Daily" },{ id: "eod", label: "Every Other Day" },
  { id: "2x_week", label: "2x per week" },{ id: "3x_week", label: "3x per week" },
  { id: "weekly", label: "Weekly" },{ id: "biweekly", label: "Every 2 weeks" },
  { id: "monthly", label: "Monthly" },{ id: "as_needed", label: "As needed" },
];
const UNITS=["mg","mcg","ml","IU","g","drops","capsules","tablets","sprays","patches"];
const INJ_SITES=["Abdomen (SubQ)","Glute (IM)","Deltoid (IM)","Thigh (IM)","Thigh (SubQ)","Love Handle (SubQ)","Other"];
const DAYNAMES=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const PASSWORD=process.env.NEXT_PUBLIC_ACCESS_PASSWORD||"protocol2026";
const COOLDOWN=7;
const Fd="'Cormorant Garamond',Georgia,serif";
const Fb="'DM Sans','Helvetica Neue',sans-serif";
const P={bg:"#faf9f7",card:"#fff",bdr:"#ebe8e4",bdrL:"#f2f0ed",tx:"#1a1a1a",txM:"#6b6560",txL:"#a8a29e",txF:"#d4d0cc",ac:"#9b7e5e",acS:"#c4b5a0",acBg:"#f5f0ea",ok:"#7c8c6e",okBg:"#f0f3ed",okBdr:"#d4ddc9",bad:"#c07a5f",badBg:"#faf0ec",warn:"#d4a84b",warnBg:"#fdf8ec"};

const ZONES={
  Abdomen:[{id:"ab_lu",label:"L Upper",side:"L"},{id:"ab_ru",label:"R Upper",side:"R"},{id:"ab_lm",label:"L Mid",side:"L"},{id:"ab_rm",label:"R Mid",side:"R"},{id:"ab_ll",label:"L Lower",side:"L"},{id:"ab_rl",label:"R Lower",side:"R"}],
  Thigh:[{id:"th_lu",label:"L Upper",side:"L"},{id:"th_ru",label:"R Upper",side:"R"},{id:"th_lm",label:"L Mid",side:"L"},{id:"th_rm",label:"R Mid",side:"R"},{id:"th_ll",label:"L Lower",side:"L"},{id:"th_rl",label:"R Lower",side:"R"}],
  Deltoid:[{id:"de_l",label:"Left",side:"L"},{id:"de_r",label:"Right",side:"R"}],
  Glute:[{id:"gl_l",label:"Left",side:"L"},{id:"gl_r",label:"Right",side:"R"}],
};
const ZONE_POS={ab_lu:{x:38,y:38},ab_ru:{x:62,y:38},ab_lm:{x:36,y:46},ab_rm:{x:64,y:46},ab_ll:{x:38,y:54},ab_rl:{x:62,y:54},th_lu:{x:38,y:68},th_ru:{x:62,y:68},th_lm:{x:37,y:75},th_rm:{x:63,y:75},th_ll:{x:37,y:82},th_rl:{x:63,y:82},de_l:{x:22,y:26},de_r:{x:78,y:26},gl_l:{x:38,y:60},gl_r:{x:62,y:60}};

function dk(d){if(!d)d=new Date();return d.toISOString().split("T")[0];}
function wd(d){const x=(d||new Date()).getDay();return x===0?6:x-1;}
function daysBetween(a,b){const d1=new Date(a);d1.setHours(0,0,0,0);const d2=new Date(b);d2.setHours(0,0,0,0);return Math.round((d2-d1)/864e5);}

function shouldTakeOnDate(item,date){
  const t=wd(date);const today=dk(date);
  if(item.frequency==="daily")return true;
  if(item.frequency==="as_needed")return true;
  if(item.frequency==="eod"){const s=new Date(item.startDate||"2025-01-01");s.setHours(0,0,0,0);const d=new Date(date);d.setHours(0,0,0,0);return Math.abs(daysBetween(s,d))%2===0;}
  if(item.scheduledDays&&item.scheduledDays.length>0)return item.scheduledDays.includes(t);
  if(item.frequency==="weekly")return t===0;
  if(item.frequency==="biweekly"){const s=new Date(item.startDate||"2025-01-01");return Math.floor((date-s)/604800000)%2===0&&t===0;}
  return true;
}
function shouldTake(item){return shouldTakeOnDate(item,new Date());}
function isAct(item){const t=dk();if(item.startDate&&t<item.startDate)return false;if(item.endDate&&t>item.endDate)return false;return item.active!==false;}
function isActOnDate(item,date){const t=dk(date);if(item.startDate&&t<item.startDate)return false;if(item.endDate&&t>item.endDate)return false;return item.active!==false;}
function isInj(item){return item.category==="injection"||item.category==="peptide";}

function useStore(user,key,def){
  const fk="proto_"+user+"_"+key;
  const[data,setData]=useState(def);const[ready,setReady]=useState(false);
  useEffect(()=>{try{const s=localStorage.getItem(fk);if(s)setData(JSON.parse(s));}catch(e){}setReady(true);},[fk]);
  const save=useCallback((v)=>{setData(v);try{localStorage.setItem(fk,JSON.stringify(v));}catch(e){}},[fk]);
  return[data,save,ready];
}

function Card({children,style,onClick,active}){return<div onClick={onClick} style={{background:P.card,borderRadius:14,border:"1px solid "+(active?P.okBdr:P.bdr),padding:18,transition:"all .25s",cursor:onClick?"pointer":"default",boxShadow:"0 1px 3px rgba(0,0,0,.02)",...(style||{})}}>{children}</div>;}
function Btn({children,onClick,v,style,disabled}){const vr=v||"primary";let bg=P.tx,co=P.bg,bd="none";if(vr==="secondary"){bg="transparent";co=P.tx;bd="1px solid "+P.bdr;}else if(vr==="bad"){bg="transparent";co=P.bad;bd="1px solid rgba(192,122,95,.3)";}return<button onClick={onClick} disabled={disabled} style={{padding:"11px 22px",borderRadius:10,fontSize:13,fontWeight:600,fontFamily:Fb,cursor:disabled?"not-allowed":"pointer",transition:"all .2s",border:bd,background:bg,color:co,opacity:disabled?.4:1,...(style||{})}}>{children}</button>;}
function Pill({on,label,onClick,color}){return<button onClick={onClick} style={{padding:"7px 16px",borderRadius:100,fontSize:12,fontWeight:600,fontFamily:Fb,cursor:"pointer",border:"none",background:on?(color?color+"18":P.acBg):"transparent",color:on?(color||P.ac):P.txL,outline:on?"1.5px solid "+(color||P.acS):"1px solid transparent"}}>{label}</button>;}
function Inp({label,value,onChange,type,placeholder,style}){return<div style={{marginBottom:18,...(style||{})}}>{label&&<label style={{display:"block",fontSize:11,fontWeight:600,color:P.txM,textTransform:"uppercase",letterSpacing:1.5,marginBottom:7,fontFamily:Fb}}>{label}</label>}<input type={type||"text"} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder||""} style={{width:"100%",padding:"11px 14px",background:P.bg,border:"1px solid "+P.bdr,borderRadius:10,color:P.tx,fontSize:14,fontFamily:Fb,outline:"none",boxSizing:"border-box"}}/></div>;}
function Sel({label,value,onChange,options}){return<div style={{marginBottom:18}}>{label&&<label style={{display:"block",fontSize:11,fontWeight:600,color:P.txM,textTransform:"uppercase",letterSpacing:1.5,marginBottom:7,fontFamily:Fb}}>{label}</label>}<select value={value} onChange={e=>onChange(e.target.value)} style={{width:"100%",padding:"11px 14px",background:P.bg,border:"1px solid "+P.bdr,borderRadius:10,color:P.tx,fontSize:14,fontFamily:Fb,outline:"none",boxSizing:"border-box",WebkitAppearance:"none"}}><option value="">Select...</option>{options.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}</select></div>;}
function Sep({label}){return<div style={{display:"flex",alignItems:"center",gap:14,margin:"26px 0 20px"}}><div style={{flex:1,height:1,background:P.bdr}}/>{label&&<span style={{fontSize:10,fontWeight:700,color:P.txL,textTransform:"uppercase",letterSpacing:2,fontFamily:Fb}}>{label}</span>}<div style={{flex:1,height:1,background:P.bdr}}/></div>;}
function Empty({icon,title,sub,action,onAction}){return<div style={{textAlign:"center",padding:"50px 24px"}}><div style={{fontSize:36,marginBottom:14,opacity:.25}}>{icon}</div><h3 style={{fontFamily:Fd,color:P.tx,fontSize:22,fontWeight:400,marginBottom:6,fontStyle:"italic"}}>{title}</h3><p style={{color:P.txL,fontSize:13,marginBottom:22,fontFamily:Fb,lineHeight:1.5}}>{sub}</p>{action&&<Btn onClick={onAction}>{action}</Btn>}</div>;}
function Modal({open,onClose,title,children}){if(!open)return null;return<div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}><div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.12)",backdropFilter:"blur(3px)"}}/><div style={{position:"relative",width:"100%",maxWidth:500,maxHeight:"88vh",overflow:"auto",background:P.card,borderRadius:"22px 22px 0 0",border:"1px solid "+P.bdr,borderBottom:"none",padding:"28px 24px"}}><div style={{width:36,height:4,background:P.txF,borderRadius:2,margin:"0 auto 20px"}}/><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}><h2 style={{fontFamily:Fd,color:P.tx,fontSize:24,margin:0,fontWeight:400,fontStyle:"italic"}}>{title}</h2><button onClick={onClose} style={{background:P.bg,border:"1px solid "+P.bdr,color:P.txL,width:32,height:32,borderRadius:8,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{"\u2715"}</button></div>{children}</div></div>;}
function Nav({tab,setTab}){const tabs=[{id:"today",l:"Today"},{id:"protocol",l:"Protocol"},{id:"stats",l:"Insights"},{id:"reorder",l:"Supply"},{id:"settings",l:"Settings"}];return<div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:100,background:"rgba(250,249,247,.92)",borderTop:"1px solid "+P.bdr,backdropFilter:"blur(20px)",display:"flex",justifyContent:"space-around",padding:"6px 0 max(6px,env(safe-area-inset-bottom))"}}>{tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{background:"none",border:"none",cursor:"pointer",padding:"8px 14px",fontFamily:Fb,fontSize:11,fontWeight:tab===t.id?700:500,color:tab===t.id?P.tx:P.txL,position:"relative"}}>{t.l}{tab===t.id&&<div style={{position:"absolute",top:-1,left:"25%",right:"25%",height:2,background:P.tx,borderRadius:1}}/>}</button>)}</div>;}

function LoginGate({onAuth}){
  const[name,setName]=useState("");const[pw,setPw]=useState("");const[err,setErr]=useState(false);
  function go(){if(pw===PASSWORD&&name.trim()){sessionStorage.setItem("proto_user",name.trim());sessionStorage.setItem("proto_auth","1");onAuth(name.trim());}else{setErr(true);setTimeout(()=>setErr(false),1500);}}
  return<div style={{minHeight:"100vh",background:P.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
    <div style={{width:"100%",maxWidth:360,textAlign:"center"}}>
      <h1 style={{fontFamily:Fd,fontSize:36,fontWeight:400,fontStyle:"italic",color:P.tx,marginBottom:4}}>Protocol</h1>
      <p style={{color:P.txL,fontSize:13,marginBottom:36,fontFamily:Fb}}>Track your protocol with precision</p>
      <Card style={{padding:28}}>
        <Inp label="Your Name" value={name} onChange={setName} placeholder="Enter your name"/>
        <Inp label="Password" value={pw} onChange={setPw} type="password" placeholder="Enter password"/>
        {err&&<p style={{color:P.bad,fontSize:12,margin:"0 0 14px",fontStyle:"italic"}}>Incorrect password</p>}
        <Btn onClick={go} disabled={!name.trim()||!pw} style={{width:"100%",marginTop:4}}>Enter</Btn>
      </Card>
    </div>
  </div>;
}

function SiteMap({open,onClose,item,siteLogs,onSelect}){
  const[view,setView]=useState("front");
  if(!open||!item)return null;
  function zStat(zid){
    const allLogs=Object.values(siteLogs).flatMap(day=>Object.values(day).filter(e=>e&&e.zone===zid));
    if(allLogs.length===0)return"fresh";
    const latest=allLogs.sort((a,b)=>new Date(b.ts)-new Date(a.ts))[0];
    const days=Math.floor((new Date()-new Date(latest.ts))/864e5);
    if(days>=COOLDOWN)return"fresh";if(days>=3)return"warm";return"hot";
  }
  function sCol(s){return s==="hot"?P.bad:s==="warm"?P.warn:P.ok;}
  function sBg(s){return s==="hot"?P.badBg:s==="warm"?P.warnBg:P.okBg;}
  const frontAreas=["Abdomen","Thigh","Deltoid"];const backAreas=["Glute","Deltoid"];
  const areas=view==="front"?frontAreas:backAreas;
  const allZones=areas.flatMap(a=>(ZONES[a]||[]).map(z=>({...z,area:a})));
  return(
    <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.15)",backdropFilter:"blur(3px)"}}/>
      <div style={{position:"relative",width:"100%",maxWidth:500,maxHeight:"92vh",overflow:"auto",background:P.card,borderRadius:"22px 22px 0 0",border:"1px solid "+P.bdr,borderBottom:"none",padding:24}}>
        <div style={{width:36,height:4,background:P.txF,borderRadius:2,margin:"0 auto 16px"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <h2 style={{fontFamily:Fd,color:P.tx,fontSize:22,margin:0,fontWeight:400,fontStyle:"italic"}}>Where did you inject?</h2>
          <button onClick={onClose} style={{background:P.bg,border:"1px solid "+P.bdr,color:P.txL,width:32,height:32,borderRadius:8,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{"\u2715"}</button>
        </div>
        <p style={{fontFamily:Fb,fontSize:13,color:P.txL,margin:"0 0 14px"}}>{item.name} {item.dose} {item.unit}</p>
        <div style={{display:"flex",gap:14,marginBottom:14,justifyContent:"center"}}>
          {[{c:P.ok,l:"Ready"},{c:P.warn,l:"<7 days"},{c:P.bad,l:"<3 days"}].map(x=><div key={x.l} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:8,height:8,borderRadius:"50%",background:x.c}}/><span style={{fontSize:10,color:P.txL,fontFamily:Fb}}>{x.l}</span></div>)}
        </div>
        <div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:18}}>
          <Pill label="Front" on={view==="front"} onClick={()=>setView("front")}/>
          <Pill label="Back" on={view==="back"} onClick={()=>setView("back")}/>
        </div>
        <div style={{position:"relative",width:"100%",maxWidth:260,margin:"0 auto"}}>
          <svg viewBox="0 0 100 180" style={{width:"100%"}} xmlns="http://www.w3.org/2000/svg">
            <g fill="none" stroke={P.bdr} strokeWidth="1.2">
              <ellipse cx="50" cy="14" rx="9" ry="11"/>
              <line x1="45" y1="25" x2="45" y2="30"/><line x1="55" y1="25" x2="55" y2="30"/>
              <path d="M45 30 Q35 28 22 34"/><path d="M55 30 Q65 28 78 34"/>
              <path d="M30 34 L28 62 L35 65 L50 67 L65 65 L72 62 L78 34" fill={P.bdrL}/>
              <path d="M22 34 L18 55 L16 70 L20 72 L24 58 L30 34" fill={P.bdrL}/>
              <path d="M78 34 L82 55 L84 70 L80 72 L76 58 L70 34" fill={P.bdrL}/>
              <path d="M35 65 L33 95 L32 120 L30 150 L35 152 L40 120 L42 95 L50 67" fill={P.bdrL}/>
              <path d="M65 65 L67 95 L68 120 L70 150 L65 152 L60 120 L58 95 L50 67" fill={P.bdrL}/>
              {view==="back"&&<line x1="50" y1="30" x2="50" y2="65" strokeDasharray="2 2"/>}
            </g>
            {allZones.map(z=>{const pos=ZONE_POS[z.id];if(!pos)return null;const st=zStat(z.id);const col=sCol(st);return<g key={z.id} onClick={()=>onSelect(z.id,z.area+" "+z.label)} style={{cursor:"pointer"}}><circle cx={pos.x} cy={pos.y} r="5" fill={col+"30"} stroke={col} strokeWidth="1.5"/><circle cx={pos.x} cy={pos.y} r="2" fill={col}/></g>;})}
          </svg>
        </div>
        <div style={{marginTop:18}}>
          {areas.map(area=>{const azones=ZONES[area]||[];return<div key={area} style={{marginBottom:12}}><div style={{fontSize:10,fontWeight:700,color:P.txL,textTransform:"uppercase",letterSpacing:1.5,fontFamily:Fb,marginBottom:6}}>{area}</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{azones.map(z=>{const st=zStat(z.id);return<button key={z.id} onClick={()=>onSelect(z.id,area+" "+z.label)} style={{padding:"8px 14px",borderRadius:10,fontSize:12,fontWeight:600,fontFamily:Fb,cursor:"pointer",border:"1px solid "+sCol(st)+"40",background:sBg(st),color:sCol(st)}}>{z.label}</button>;})}</div></div>;})}
        </div>
        <div style={{marginTop:14,textAlign:"center"}}><Btn v="secondary" onClick={onClose} style={{fontSize:12}}>Cancel</Btn></div>
      </div>
    </div>
  );
}

function InjDetail({open,onClose,item,siteLogs,logs,onUncheck}){
  if(!open||!item)return null;
  const today=dk();const tl=logs[today]||{};const ts=tl[item.id];
  const sl=siteLogs[today]&&siteLogs[today][item.id];
  return(
    <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.15)",backdropFilter:"blur(3px)"}}/>
      <div style={{position:"relative",width:"100%",maxWidth:500,background:P.card,borderRadius:"22px 22px 0 0",border:"1px solid "+P.bdr,borderBottom:"none",padding:24}}>
        <div style={{width:36,height:4,background:P.txF,borderRadius:2,margin:"0 auto 16px"}}/>
        <h2 style={{fontFamily:Fd,color:P.tx,fontSize:22,margin:"0 0 16px",fontWeight:400,fontStyle:"italic"}}>{item.name}</h2>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid "+P.bdrL}}>
            <span style={{fontSize:13,color:P.txL,fontFamily:Fb}}>Dose</span>
            <span style={{fontSize:13,fontWeight:600,color:P.tx,fontFamily:Fb}}>{item.dose} {item.unit}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid "+P.bdrL}}>
            <span style={{fontSize:13,color:P.txL,fontFamily:Fb}}>Taken at</span>
            <span style={{fontSize:13,fontWeight:600,color:P.tx,fontFamily:Fb}}>{ts?new Date(ts).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"\u2014"}</span>
          </div>
          {sl&&<div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid "+P.bdrL}}>
            <span style={{fontSize:13,color:P.txL,fontFamily:Fb}}>Site</span>
            <span style={{fontSize:13,fontWeight:600,color:P.tx,fontFamily:Fb}}>{sl.zoneLabel}</span>
          </div>}
          {item.instructions&&<div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid "+P.bdrL}}>
            <span style={{fontSize:13,color:P.txL,fontFamily:Fb}}>Notes</span>
            <span style={{fontSize:13,color:P.tx,fontFamily:Fb}}>{item.instructions}</span>
          </div>}
        </div>
        <div style={{display:"flex",gap:10,marginTop:20}}>
          <Btn v="bad" onClick={()=>{onUncheck(item.id);onClose();}} style={{flex:1,fontSize:12}}>Uncheck</Btn>
          <Btn v="secondary" onClick={onClose} style={{flex:1,fontSize:12}}>Close</Btn>
        </div>
      </div>
    </div>
  );
}

function DayDetail({open,onClose,date,items,logs,siteLogs}){
  if(!open||!date)return null;
  const k=dk(date);const dl=logs[k]||{};const sl=siteLogs[k]||{};
  const scheduled=items.filter(i=>isActOnDate(i,date)&&shouldTakeOnDate(i,date));
  const taken=scheduled.filter(i=>dl[i.id]);const missed=scheduled.filter(i=>!dl[i.id]);
  const label=date.toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"});
  return(
    <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.15)",backdropFilter:"blur(3px)"}}/>
      <div style={{position:"relative",width:"100%",maxWidth:500,maxHeight:"85vh",overflow:"auto",background:P.card,borderRadius:"22px 22px 0 0",border:"1px solid "+P.bdr,borderBottom:"none",padding:24}}>
        <div style={{width:36,height:4,background:P.txF,borderRadius:2,margin:"0 auto 16px"}}/>
        <h2 style={{fontFamily:Fd,color:P.tx,fontSize:22,margin:"0 0 4px",fontWeight:400,fontStyle:"italic"}}>{label}</h2>
        <p style={{fontFamily:Fb,fontSize:13,color:P.txL,margin:"0 0 18px"}}>{taken.length}/{scheduled.length} completed</p>
        {taken.length>0&&<div style={{marginBottom:18}}>
          <div style={{fontSize:10,fontWeight:700,color:P.ok,textTransform:"uppercase",letterSpacing:1.5,fontFamily:Fb,marginBottom:8}}>Taken</div>
          {taken.map(item=>{const cat=CATEGORIES.find(c=>c.id===item.category);const site=sl[item.id];
            return<div key={item.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid "+P.bdrL}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:cat?cat.color:P.ac,flexShrink:0}}/>
              <div style={{flex:1}}><div style={{fontFamily:Fb,fontWeight:600,fontSize:13,color:P.tx}}>{item.name}</div><div style={{fontSize:11,color:P.txL,fontFamily:Fb}}>{item.dose} {item.unit}{site?" \u00b7 "+site.zoneLabel:""}{dl[item.id]?" \u00b7 "+new Date(dl[item.id]).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):""}</div></div>
            </div>;})}
        </div>}
        {missed.length>0&&<div style={{marginBottom:18}}>
          <div style={{fontSize:10,fontWeight:700,color:P.bad,textTransform:"uppercase",letterSpacing:1.5,fontFamily:Fb,marginBottom:8}}>Missed</div>
          {missed.map(item=>{const cat=CATEGORIES.find(c=>c.id===item.category);
            return<div key={item.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid "+P.bdrL}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:P.txF,flexShrink:0}}/>
              <div style={{flex:1}}><div style={{fontFamily:Fb,fontWeight:600,fontSize:13,color:P.txL}}>{item.name}</div><div style={{fontSize:11,color:P.txF,fontFamily:Fb}}>{item.dose} {item.unit}</div></div>
            </div>;})}
        </div>}
        {scheduled.length===0&&<p style={{fontFamily:Fb,fontSize:13,color:P.txL,textAlign:"center",padding:20}}>Nothing scheduled for this day</p>}
        <div style={{textAlign:"center",marginTop:8}}><Btn v="secondary" onClick={onClose} style={{fontSize:12}}>Close</Btn></div>
      </div>
    </div>
  );
}

function ItemForm({item,onSave,onClose,onDelete}){
  const[f,sf]=useState(item||{id:Date.now().toString(),category:"supplement",name:"",dose:"",unit:"mg",frequency:"daily",timeSlot:"morning_food",scheduledDays:[],injectionSite:"",instructions:"",supplierName:"",supplierUrl:"",quantityPerOrder:"",daysSupplyPerOrder:"",currentStock:"",startDate:dk(),endDate:"",active:true});
  function u(k,v){sf(p=>({...p,[k]:v}));}const ii=isInj(f);
  return<div>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:22}}>{CATEGORIES.map(c=><Pill key={c.id} label={c.icon+"  "+c.label} on={f.category===c.id} color={c.color} onClick={()=>u("category",c.id)}/>)}</div>
    <Inp label="Name" value={f.name} onChange={v=>u("name",v)} placeholder="Vitamin D3, BPC-157, Test Cypionate..."/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Inp label="Dose" value={f.dose} onChange={v=>u("dose",v)} placeholder="5000"/><Sel label="Unit" value={f.unit} onChange={v=>u("unit",v)} options={UNITS}/></div>
    <Sel label="Frequency" value={f.frequency} onChange={v=>u("frequency",v)} options={FREQS.map(x=>({value:x.id,label:x.label}))}/>
    {(f.frequency==="2x_week"||f.frequency==="3x_week")&&<div style={{marginBottom:18}}><label style={{display:"block",fontSize:11,fontWeight:600,color:P.txM,textTransform:"uppercase",letterSpacing:1.5,marginBottom:8,fontFamily:Fb}}>Schedule</label><div style={{display:"flex",gap:6}}>{DAYNAMES.map((d,i)=><Pill key={d} label={d} on={(f.scheduledDays||[]).includes(i)} onClick={()=>{const days=f.scheduledDays||[];u("scheduledDays",days.includes(i)?days.filter(x=>x!==i):[...days,i]);}}/>)}</div></div>}
    {f.frequency==="eod"&&<p style={{fontSize:12,color:P.txL,fontFamily:Fb,marginTop:-10,marginBottom:16}}>Alternates starting from your start date below</p>}
    <Sel label="Time of Day" value={f.timeSlot} onChange={v=>u("timeSlot",v)} options={TIME_SLOTS.map(t=>({value:t.id,label:t.label}))}/>
    {ii&&<Sel label="Default Injection Area" value={f.injectionSite} onChange={v=>u("injectionSite",v)} options={INJ_SITES}/>}
    <Inp label="Notes" value={f.instructions} onChange={v=>u("instructions",v)} placeholder="Take with fat, rotate sites..."/>
    <Sep label="Supply Tracking"/>
    <Inp label="Supplier" value={f.supplierName} onChange={v=>u("supplierName",v)} placeholder="Peptide Sciences, iHerb..."/>
    <Inp label="Supplier URL" value={f.supplierUrl} onChange={v=>u("supplierUrl",v)} placeholder="https://..."/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Inp label="Qty per Order" value={f.quantityPerOrder} onChange={v=>u("quantityPerOrder",v)} placeholder="90 caps"/><Inp label="Days Supply" value={f.daysSupplyPerOrder} onChange={v=>u("daysSupplyPerOrder",v)} placeholder="90"/></div>
    <Inp label="Current Stock (days)" value={f.currentStock} onChange={v=>u("currentStock",v)} placeholder="30" type="number"/>
    <Sep label="Duration"/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Inp label="Start Date" value={f.startDate} onChange={v=>u("startDate",v)} type="date"/><Inp label="End Date" value={f.endDate} onChange={v=>u("endDate",v)} type="date"/></div>
    <div style={{display:"flex",gap:12,marginTop:24}}>{item&&<Btn v="bad" onClick={()=>{onDelete(f.id);onClose();}}>Remove</Btn>}<Btn onClick={()=>{onSave(f);onClose();}} disabled={!f.name} style={{flex:1}}>Save</Btn></div>
  </div>;
}

function TodayView({items,logs,setLogs,siteLogs,setSiteLogs}){
  const today=dk();const todayItems=items.filter(i=>isAct(i)&&shouldTake(i));
  const tl=logs[today]||{};const done=todayItems.filter(i=>tl[i.id]).length;const total=todayItems.length;
  const pct=total>0?Math.round(done/total*100):0;
  const grouped={};TIME_SLOTS.forEach(ts=>{grouped[ts.id]=todayItems.filter(i=>i.timeSlot===ts.id);});
  const[smItem,setSmItem]=useState(null);
  const[detailItem,setDetailItem]=useState(null);
  function tap(item){
    if(isInj(item)&&tl[item.id]){setDetailItem(item);return;}
    if(isInj(item)&&!tl[item.id]){setSmItem(item);return;}
    const n={...logs};n[today]={...(logs[today]||{})};if(tl[item.id])delete n[today][item.id];else n[today][item.id]=new Date().toISOString();setLogs(n);
  }
  function uncheck(id){const n={...logs};n[today]={...(logs[today]||{})};delete n[today][id];setLogs(n);}
  function onZone(zid,zlabel){
    const now=new Date().toISOString();
    const nl={...logs};nl[today]={...(logs[today]||{}),[smItem.id]:now};setLogs(nl);
    const ns={...siteLogs};ns[today]={...(ns[today]||{}),[smItem.id]:{zone:zid,zoneLabel:zlabel,ts:now}};setSiteLogs(ns);
    setSmItem(null);
  }
  function lastSite(id){
    const all=Object.values(siteLogs).flatMap(day=>{const e=day[id];return e?[e]:[];}).sort((a,b)=>new Date(b.ts)-new Date(a.ts));
    return all[0]?all[0].zoneLabel:null;
  }
  const ch=new Date().getHours();const cs=TIME_SLOTS.reduce((b,ts)=>ch>=ts.hour?ts.id:b,"morning_empty");
  if(total===0)return<Empty icon={"\u25CB"} title="Nothing scheduled" sub="Add your protocol items to begin tracking"/>;
  return<div>
    <div style={{textAlign:"center",marginBottom:32}}>
      <div style={{position:"relative",width:130,height:130,margin:"0 auto 12px"}}>
        <svg width="130" height="130" viewBox="0 0 130 130"><circle cx="65" cy="65" r="56" fill="none" stroke={P.bdrL} strokeWidth="5"/><circle cx="65" cy="65" r="56" fill="none" stroke={pct===100?P.ok:P.ac} strokeWidth="5" strokeDasharray={String(2*Math.PI*56)} strokeDashoffset={String(2*Math.PI*56*(1-pct/100))} strokeLinecap="round" transform="rotate(-90 65 65)" style={{transition:"all .6s cubic-bezier(.4,0,.2,1)"}}/></svg>
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><span style={{fontFamily:Fd,fontSize:38,fontWeight:400,color:pct===100?P.ok:P.tx,fontStyle:"italic"}}>{pct}</span><span style={{fontSize:10,color:P.txL,fontFamily:Fb,letterSpacing:1.5,textTransform:"uppercase",marginTop:-4}}>percent</span></div>
      </div>
      <p style={{fontFamily:Fb,fontSize:13,color:P.txL}}>{done} of {total} completed</p>
    </div>
    {TIME_SLOTS.map(ts=>{const si=grouped[ts.id];if(!si||!si.length)return null;const cur=cs===ts.id;const allDone=si.every(i=>tl[i.id]);
      return<div key={ts.id} style={{marginBottom:24}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,padding:"0 2px"}}>{cur&&<div style={{width:5,height:5,borderRadius:"50%",background:P.ac}}/>}<span style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,fontFamily:Fb,color:cur?P.ac:P.txL}}>{ts.short}</span>{allDone&&<span style={{marginLeft:"auto",fontSize:11,color:P.ok,fontFamily:Fb,fontWeight:600}}>Complete</span>}</div>
        {si.map(item=>{const chk=!!tl[item.id];const cat=CATEGORIES.find(c=>c.id===item.category);const ls=isInj(item)?lastSite(item.id):null;
          return<Card key={item.id} onClick={()=>tap(item)} active={chk} style={{marginBottom:8,padding:"14px 16px",background:chk?P.okBg:P.card}}>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:24,height:24,borderRadius:7,flexShrink:0,border:"1.5px solid "+(chk?P.ok:P.bdr),background:chk?P.ok:"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .25s"}}>{chk&&<svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6L5 8.5L9.5 3.5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:Fb,fontWeight:600,fontSize:14,color:P.tx,opacity:chk?.5:1}}>{item.name}</div>
                <div style={{fontSize:12,color:P.txL,fontFamily:Fb,marginTop:2}}>{item.dose} {item.unit}{item.instructions?" \u00b7 "+item.instructions:""}{chk&&ls?" \u00b7 "+ls:""}{!chk&&isInj(item)?" \u00b7 tap to log site":""}</div>
              </div>
              <div style={{width:8,height:8,borderRadius:"50%",flexShrink:0,background:cat?cat.color:P.ac,opacity:chk?.3:.6}}/>
              {chk&&<span style={{fontSize:10,color:P.txL,fontFamily:Fb,flexShrink:0}}>{new Date(tl[item.id]).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>}
            </div>
          </Card>;})}
      </div>;})}
    <SiteMap open={!!smItem} onClose={()=>setSmItem(null)} item={smItem} siteLogs={siteLogs} onSelect={onZone}/>
    <InjDetail open={!!detailItem} onClose={()=>setDetailItem(null)} item={detailItem} siteLogs={siteLogs} logs={logs} onUncheck={uncheck}/>
  </div>;
}

function ProtocolView({items,onAdd,onEdit}){const[fil,setFil]=useState("all");const list=fil==="all"?items:items.filter(i=>i.category===fil);return<div><div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:22}}><Pill label="All" on={fil==="all"} onClick={()=>setFil("all")}/>{CATEGORIES.map(c=><Pill key={c.id} label={c.label} on={fil===c.id} color={c.color} onClick={()=>setFil(c.id)}/>)}</div>{list.length===0?<Empty icon={"\u25C7"} title="Build your protocol" sub="Add supplements, peptides, injections, and medications" action="Add first item" onAction={onAdd}/>:<div>{list.map(item=>{const cat=CATEGORIES.find(c=>c.id===item.category);return<Card key={item.id} onClick={()=>onEdit(item)} style={{marginBottom:10,opacity:isAct(item)?1:.4}}><div style={{display:"flex",alignItems:"center",gap:14}}><div style={{width:38,height:38,borderRadius:10,flexShrink:0,background:(cat?cat.color:"#999")+"10",border:"1px solid "+(cat?cat.color:"#999")+"25",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:Fb,fontSize:14,color:cat?cat.color:"#999",fontWeight:600}}>{cat?cat.icon:"?"}</div><div style={{flex:1}}><div style={{fontFamily:Fb,fontWeight:600,fontSize:14,color:P.tx}}>{item.name}</div><div style={{fontSize:12,color:P.txL,fontFamily:Fb,marginTop:2}}>{item.dose} {item.unit} {"\u00b7"} {(FREQS.find(x=>x.id===item.frequency)||{}).label} {"\u00b7"} {(TIME_SLOTS.find(t=>t.id===item.timeSlot)||{}).short}</div></div><span style={{color:P.txF,fontSize:16}}>{"\u203a"}</span></div></Card>;})}<div style={{textAlign:"center",marginTop:24}}><Btn onClick={onAdd}>Add item</Btn></div></div>}</div>;}

function StatsView({items,logs,siteLogs}){
  const[dayModal,setDayModal]=useState(null);
  let streak=0;const d=new Date();d.setDate(d.getDate()-1);
  while(streak<365){const k=dk(d);const dl=logs[k]||{};const di=items.filter(i=>isActOnDate(i,d)&&shouldTakeOnDate(i,d));if(!di.length||!di.every(i=>dl[i.id]))break;streak++;d.setDate(d.getDate()-1);}
  const tl2=logs[dk()]||{};const ta=items.filter(i=>isAct(i)&&shouldTake(i));if(ta.length>0&&ta.every(i=>tl2[i.id]))streak++;
  const last7=Array.from({length:7},(_,i)=>{const dd=new Date();dd.setDate(dd.getDate()-(6-i));const k=dk(dd);const dl=logs[k]||{};const sc=items.filter(it=>isActOnDate(it,dd)&&shouldTakeOnDate(it,dd));const dc=sc.filter(it=>dl[it.id]).length;return{date:dd,pct:sc.length>0?Math.round(dc/sc.length*100):0,total:sc.length,done:dc};});
  const avg=Math.round(last7.reduce((s,x)=>s+x.pct,0)/7);
  return<div>
    <Card style={{textAlign:"center",marginBottom:16,padding:28}}><div style={{fontFamily:Fd,fontSize:52,fontWeight:400,color:streak>0?P.ac:P.txF,fontStyle:"italic",lineHeight:1}}>{streak}</div><div style={{fontSize:11,fontWeight:600,color:P.txL,textTransform:"uppercase",letterSpacing:1.5,fontFamily:Fb,marginTop:6}}>day streak</div></Card>
    <Card style={{marginBottom:16,padding:22}}>
      <div style={{fontSize:11,fontWeight:700,color:P.txM,textTransform:"uppercase",letterSpacing:1.5,fontFamily:Fb,marginBottom:18}}>Last 7 days</div>
      <div style={{display:"flex",alignItems:"flex-end",gap:10,height:90}}>{last7.map((dd,i)=><div key={i} onClick={()=>setDayModal(dd.date)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6,cursor:"pointer"}}>
        <span style={{fontSize:10,color:P.txL,fontFamily:Fb}}>{dd.done}/{dd.total}</span>
        <div style={{width:"100%",borderRadius:5,height:Math.max(4,dd.pct*.65),background:dd.pct===100?P.ok:dd.pct>0?P.acS:P.bdrL,transition:"height .4s"}}/>
        <span style={{fontSize:10,color:P.txL,fontFamily:Fb}}>{dd.date.toLocaleDateString(undefined,{weekday:"narrow"})}</span>
      </div>)}</div>
      <div style={{textAlign:"center",marginTop:16,paddingTop:14,borderTop:"1px solid "+P.bdrL}}><span style={{fontSize:12,color:P.txL,fontFamily:Fb}}>Average </span><span style={{fontSize:14,fontWeight:700,color:avg>=80?P.ok:P.ac,fontFamily:Fb}}>{avg}%</span></div>
      <p style={{textAlign:"center",fontSize:11,color:P.txF,fontFamily:Fb,marginTop:8}}>Tap a day to see details</p>
    </Card>
    <Card style={{padding:22}}>
      <div style={{fontSize:11,fontWeight:700,color:P.txM,textTransform:"uppercase",letterSpacing:1.5,fontFamily:Fb,marginBottom:16}}>By category</div>
      {CATEGORIES.map(cat=>{const ci=items.filter(i=>i.category===cat.id&&isAct(i));if(!ci.length)return null;const cl=logs[dk()]||{};const cd=ci.filter(i=>cl[i.id]).length;return<div key={cat.id} style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}><div style={{width:28,height:28,borderRadius:7,background:cat.color+"10",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:cat.color,fontFamily:Fb}}>{cat.icon}</div><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:13,fontWeight:600,color:P.tx,fontFamily:Fb}}>{cat.label}</span><span style={{fontSize:12,color:P.txL,fontFamily:Fb}}>{cd}/{ci.length}</span></div><div style={{height:3,background:P.bdrL,borderRadius:2}}><div style={{height:3,borderRadius:2,background:cat.color,width:(ci.length>0?cd/ci.length*100:0)+"%",transition:"width .4s"}}/></div></div></div>;})}
    </Card>
    {items.length===0&&<Empty icon={"\u25B3"} title="No data yet" sub="Start tracking to see insights"/>}
    <DayDetail open={!!dayModal} onClose={()=>setDayModal(null)} date={dayModal} items={items} logs={logs} siteLogs={siteLogs}/>
  </div>;
}

function ReorderView({items,logs}){const ri=items.filter(i=>i.currentStock&&i.daysSupplyPerOrder&&isAct(i)).map(item=>{const stock=parseInt(item.currentStock)||0;const dl=Object.keys(logs).filter(k=>logs[k][item.id]).length;const eff=Math.max(0,stock-dl);return{...item,eff,urg:eff<=7?"urgent":eff<=14?"soon":"ok"};}).sort((a,b)=>a.eff-b.eff);const urgent=ri.filter(i=>i.urg!=="ok");
  return<div>
    {urgent.length>0&&<Card style={{marginBottom:18,borderColor:"rgba(192,122,95,.25)",background:P.badBg,padding:16}}><div style={{fontFamily:Fb,fontWeight:700,fontSize:13,color:P.bad,marginBottom:3}}>{urgent.length} item{urgent.length>1?"s":""} running low</div><div style={{fontSize:12,color:P.txL,fontFamily:Fb}}>Review stock and reorder soon</div></Card>}
    {ri.length===0?<Empty icon={"\u25A1"} title="No stock tracked" sub="Add supply info to enable reorder alerts"/>:ri.map(item=>{const cat=CATEGORIES.find(c=>c.id===item.category);const bgC=item.urg==="urgent"?P.badBg:item.urg==="soon"?P.acBg:P.okBg;const fgC=item.urg==="urgent"?P.bad:item.urg==="soon"?P.ac:P.ok;return<Card key={item.id} style={{marginBottom:10}}><div style={{display:"flex",alignItems:"center",gap:14}}><div style={{width:32,height:32,borderRadius:8,background:(cat?cat.color:"#999")+"10",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:cat?cat.color:"#999",fontFamily:Fb}}>{cat?cat.icon:"?"}</div><div style={{flex:1}}><div style={{fontFamily:Fb,fontWeight:600,fontSize:14,color:P.tx}}>{item.name}</div><div style={{fontSize:12,color:P.txL,fontFamily:Fb,marginTop:2}}>{item.dose} {item.unit}</div></div><div style={{padding:"5px 12px",borderRadius:8,fontSize:12,fontWeight:700,fontFamily:Fb,background:bgC,color:fgC}}>{item.eff}d</div></div>{item.supplierName&&<div style={{marginTop:10,paddingTop:10,borderTop:"1px solid "+P.bdrL,fontSize:12,fontFamily:Fb}}>{item.supplierUrl?<a href={item.supplierUrl} target="_blank" rel="noopener noreferrer" style={{color:P.ac,textDecoration:"none",fontWeight:500}}>{item.supplierName} {"\u2197"}</a>:<span style={{color:P.txL}}>{item.supplierName}</span>}</div>}</Card>;})}
  </div>;
}

function SettingsView({items,setItems,logs,setLogs,siteLogs,setSiteLogs,username,onLogout}){const[cr,setCr]=useState(false);const ir=useRef(null);function exp(){const blob=new Blob([JSON.stringify({items,logs,siteLogs,at:new Date().toISOString()},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="protocol-"+dk()+".json";a.click();}function imp(e){const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=ev=>{try{const d=JSON.parse(ev.target.result);if(d.items)setItems(d.items);if(d.logs)setLogs(d.logs);if(d.siteLogs)setSiteLogs(d.siteLogs);}catch(e){}};r.readAsText(file);}
  return<div>
    <Card style={{marginBottom:16,padding:22}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:11,fontWeight:700,color:P.txM,textTransform:"uppercase",letterSpacing:1.5,fontFamily:Fb}}>Logged in as</div><div style={{fontSize:15,fontWeight:600,color:P.tx,fontFamily:Fb,marginTop:4}}>{username}</div></div><Btn v="secondary" onClick={onLogout} style={{fontSize:11,padding:"8px 16px"}}>Logout</Btn></div></Card>
    <Card style={{marginBottom:16,padding:22}}><div style={{fontSize:11,fontWeight:700,color:P.txM,textTransform:"uppercase",letterSpacing:1.5,fontFamily:Fb,marginBottom:16}}>Data</div><div style={{display:"flex",gap:10}}><Btn v="secondary" onClick={exp} style={{flex:1,fontSize:12}}>Export</Btn><Btn v="secondary" onClick={()=>ir.current&&ir.current.click()} style={{flex:1,fontSize:12}}>Import</Btn><input ref={ir} type="file" accept=".json" style={{display:"none"}} onChange={imp}/></div></Card>
    <Card style={{marginBottom:16,padding:22}}><div style={{fontSize:11,fontWeight:700,color:P.txM,textTransform:"uppercase",letterSpacing:1.5,fontFamily:Fb,marginBottom:14}}>Summary</div>{CATEGORIES.map(c=>{const n=items.filter(i=>i.category===c.id).length;return n>0?<div key={c.id} style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:13,color:P.tx,fontFamily:Fb}}>{c.icon}{"  "}{c.label}s</span><span style={{fontSize:13,fontWeight:700,color:c.color,fontFamily:Fb}}>{n}</span></div>:null;})}<div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid "+P.bdrL,paddingTop:10,marginTop:10}}><span style={{fontSize:13,fontWeight:700,color:P.tx,fontFamily:Fb}}>Total</span><span style={{fontSize:13,fontWeight:700,color:P.ac,fontFamily:Fb}}>{items.length}</span></div></Card>
    <Card style={{padding:22}}><div style={{fontSize:11,fontWeight:700,color:P.bad,textTransform:"uppercase",letterSpacing:1.5,fontFamily:Fb,marginBottom:14}}>Reset</div>{!cr?<Btn v="bad" onClick={()=>setCr(true)} style={{width:"100%",fontSize:12}}>Erase all data</Btn>:<div style={{display:"flex",gap:10}}><Btn v="secondary" onClick={()=>setCr(false)} style={{flex:1,fontSize:12}}>Cancel</Btn><Btn onClick={()=>{setItems([]);setLogs({});setSiteLogs({});setCr(false);}} style={{flex:1,fontSize:12,background:P.bad,color:"#fff",border:"none"}}>Confirm</Btn></div>}</Card>
    <p style={{textAlign:"center",marginTop:28,fontSize:10,color:P.txF,fontFamily:Fb,letterSpacing:1}}>PROTOCOL v1.2</p>
  </div>;
}

export default function Page(){
  const[authed,setAuthed]=useState(false);const[username,setUsername]=useState("");
  const[tab,setTab]=useState("today");const[modal,setModal]=useState(null);const[editItem,setEditItem]=useState(null);
  useEffect(()=>{const u=sessionStorage.getItem("proto_user");const a=sessionStorage.getItem("proto_auth");if(u&&a==="1"){setUsername(u);setAuthed(true);}},[]);
  if(!authed)return<LoginGate onAuth={n=>{setUsername(n);setAuthed(true);}}/>;
  return<AppInner username={username} tab={tab} setTab={setTab} modal={modal} setModal={setModal} editItem={editItem} setEditItem={setEditItem} onLogout={()=>{sessionStorage.removeItem("proto_user");sessionStorage.removeItem("proto_auth");setAuthed(false);setUsername("");setTab("today");}}/>;
}

function AppInner({username,tab,setTab,modal,setModal,editItem,setEditItem,onLogout}){
  const[items,setItems,iOk]=useStore(username,"items",[]);
  const[logs,setLogs,lOk]=useStore(username,"logs",{});
  const[siteLogs,setSiteLogs,sOk]=useStore(username,"sites",{});
  function save(item){const ex=items.find(i=>i.id===item.id);setItems(ex?items.map(i=>i.id===item.id?item:i):[...items,item]);}
  function del(id){setItems(items.filter(i=>i.id!==id));}const loaded=iOk&&lOk&&sOk;
  const titles={today:"Today",protocol:"Protocol",stats:"Insights",reorder:"Supply",settings:"Settings"};
  return<div style={{minHeight:"100vh",background:P.bg,paddingBottom:76,maxWidth:480,margin:"0 auto"}}>
    <div style={{padding:"24px 22px 0",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
      <div><h1 style={{fontFamily:Fd,fontSize:30,margin:0,color:P.tx,fontWeight:400,fontStyle:"italic",lineHeight:1.1}}>{titles[tab]}</h1><p style={{fontSize:12,color:P.txL,margin:"5px 0 0",fontFamily:Fb,letterSpacing:.3}}>{new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"})}</p></div>
      {(tab==="today"||tab==="protocol")&&<button onClick={()=>{setEditItem(null);setModal("add");}} style={{width:38,height:38,borderRadius:10,border:"1px solid "+P.bdr,background:P.card,color:P.tx,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 3px rgba(0,0,0,.03)"}}>+</button>}
    </div>
    <div style={{padding:"22px 22px 0"}}>
      {!loaded?<div style={{textAlign:"center",padding:"60px 0"}}><div style={{width:28,height:28,border:"2px solid "+P.bdrL,borderTopColor:P.ac,borderRadius:"50%",margin:"0 auto",animation:"spin .8s linear infinite"}}/><style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style></div>:
      <div>
        {tab==="today"&&<TodayView items={items} logs={logs} setLogs={setLogs} siteLogs={siteLogs} setSiteLogs={setSiteLogs}/>}
        {tab==="protocol"&&<ProtocolView items={items} onAdd={()=>{setEditItem(null);setModal("add");}} onEdit={i=>{setEditItem(i);setModal("add");}}/>}
        {tab==="stats"&&<StatsView items={items} logs={logs} siteLogs={siteLogs}/>}
        {tab==="reorder"&&<ReorderView items={items} logs={logs}/>}
        {tab==="settings"&&<SettingsView items={items} setItems={setItems} logs={logs} setLogs={setLogs} siteLogs={siteLogs} setSiteLogs={setSiteLogs} username={username} onLogout={onLogout}/>}
      </div>}
    </div>
    <Nav tab={tab} setTab={setTab}/>
    <Modal open={modal==="add"} onClose={()=>setModal(null)} title={editItem?"Edit Item":"New Item"}><ItemForm item={editItem} onSave={save} onClose={()=>setModal(null)} onDelete={del}/></Modal>
  </div>;
}
