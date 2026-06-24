// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const SB_URL="https://qkxenqexxdvpjnagsudk.supabase.co";
const SB_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFreGVucWV4eGR2cGpuYWdzdWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNzI4ODksImV4cCI6MjA5Njc0ODg4OX0.hSo4lkK_-RjDWVPQKHbVfM0AfVlDPQxMZbTtvyLHiik";
const sb=supabase.createClient(SB_URL,SB_KEY);
let _token=null;
function getHDR(){return{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+(_token||SB_KEY)};}
async function sbGet(t,p){const r=await fetch(SB_URL+"/rest/v1/"+t+"?"+(p||""),{headers:getHDR()});return r.json();}
async function sbPost(t,b){const r=await fetch(SB_URL+"/rest/v1/"+t,{method:"POST",headers:{...getHDR(),"Prefer":"return=representation"},body:JSON.stringify(b)});return r.json();}
async function sbPatch(t,p,b){const r=await fetch(SB_URL+"/rest/v1/"+t+"?"+p,{method:"PATCH",headers:{...getHDR(),"Prefer":"return=representation"},body:JSON.stringify(b)});return r.json();}

// ─── DATA ─────────────────────────────────────────────────────────────────────
const GROUPS={
  A:["México","Sudáfrica","Corea del Sur","Rep. Checa"],
  B:["Canadá","Bosnia y Herc.","Catar","Suiza"],
  C:["Brasil","Marruecos","Haití","Escocia"],
  D:["Estados Unidos","Paraguay","Australia","Turquía"],
  E:["Alemania","Curazao","Costa de Marfil","Ecuador"],
  F:["Países Bajos","Japón","Suecia","Túnez"],
  G:["Bélgica","Egipto","Irán","Nueva Zelanda"],
  H:["España","Cabo Verde","Arabia Saudí","Uruguay"],
  I:["Francia","Senegal","Irak","Noruega"],
  J:["Argentina","Argelia","Austria","Jordania"],
  K:["Portugal","RD Congo","Uzbekistán","Colombia"],
  L:["Inglaterra","Croacia","Ghana","Panamá"]
};
const GM={
  A:[["México","Sudáfrica"],["Corea del Sur","Rep. Checa"],["Rep. Checa","Sudáfrica"],["México","Corea del Sur"],["Rep. Checa","México"],["Sudáfrica","Corea del Sur"]],
  B:[["Canadá","Bosnia y Herc."],["Catar","Suiza"],["Suiza","Bosnia y Herc."],["Canadá","Catar"],["Suiza","Canadá"],["Bosnia y Herc.","Catar"]],
  C:[["Brasil","Marruecos"],["Haití","Escocia"],["Escocia","Marruecos"],["Brasil","Haití"],["Escocia","Brasil"],["Marruecos","Haití"]],
  D:[["Estados Unidos","Paraguay"],["Australia","Turquía"],["Estados Unidos","Australia"],["Turquía","Paraguay"],["Turquía","Estados Unidos"],["Paraguay","Australia"]],
  E:[["Alemania","Curazao"],["Costa de Marfil","Ecuador"],["Alemania","Costa de Marfil"],["Ecuador","Curazao"],["Curazao","Costa de Marfil"],["Ecuador","Alemania"]],
  F:[["Países Bajos","Japón"],["Suecia","Túnez"],["Países Bajos","Suecia"],["Túnez","Japón"],["Japón","Suecia"],["Túnez","Países Bajos"]],
  G:[["Bélgica","Egipto"],["Irán","Nueva Zelanda"],["Bélgica","Irán"],["Nueva Zelanda","Egipto"],["Egipto","Irán"],["Nueva Zelanda","Bélgica"]],
  H:[["España","Cabo Verde"],["Arabia Saudí","Uruguay"],["España","Arabia Saudí"],["Uruguay","Cabo Verde"],["Cabo Verde","Arabia Saudí"],["Uruguay","España"]],
  I:[["Francia","Senegal"],["Irak","Noruega"],["Francia","Irak"],["Noruega","Senegal"],["Noruega","Francia"],["Senegal","Irak"]],
  J:[["Argentina","Argelia"],["Austria","Jordania"],["Argentina","Austria"],["Jordania","Argelia"],["Argelia","Austria"],["Jordania","Argentina"]],
  K:[["Portugal","RD Congo"],["Uzbekistán","Colombia"],["Portugal","Uzbekistán"],["Colombia","RD Congo"],["Colombia","Portugal"],["RD Congo","Uzbekistán"]],
  L:[["Inglaterra","Croacia"],["Ghana","Panamá"],["Inglaterra","Ghana"],["Panamá","Croacia"],["Panamá","Inglaterra"],["Croacia","Ghana"]]
};
const ALL_TEAMS=Object.values(GROUPS).flat();
const TOTAL_MATCHES=Object.values(GM).flat().length;
const FLAGS={"México":"🇲🇽","Sudáfrica":"🇿🇦","Corea del Sur":"🇰🇷","Rep. Checa":"🇨🇿","Canadá":"🇨🇦","Bosnia y Herc.":"🇧🇦","Catar":"🇶🇦","Suiza":"🇨🇭","Brasil":"🇧🇷","Marruecos":"🇲🇦","Haití":"🇭🇹","Escocia":"🏴󠁧󠁢󠁳󠁣󠁴󠁿","Estados Unidos":"🇺🇸","Paraguay":"🇵🇾","Australia":"🇦🇺","Turquía":"🇹🇷","Alemania":"🇩🇪","Curazao":"🇨🇼","Costa de Marfil":"🇨🇮","Ecuador":"🇪🇨","Países Bajos":"🇳🇱","Japón":"🇯🇵","Suecia":"🇸🇪","Túnez":"🇹🇳","Bélgica":"🇧🇪","Egipto":"🇪🇬","Irán":"🇮🇷","Nueva Zelanda":"🇳🇿","España":"🇪🇸","Cabo Verde":"🇨🇻","Arabia Saudí":"🇸🇦","Uruguay":"🇺🇾","Francia":"🇫🇷","Senegal":"🇸🇳","Irak":"🇮🇶","Noruega":"🇳🇴","Argentina":"🇦🇷","Argelia":"🇩🇿","Austria":"🇦🇹","Jordania":"🇯🇴","Portugal":"🇵🇹","RD Congo":"🇨🇩","Uzbekistán":"🇺🇿","Colombia":"🇨🇴","Inglaterra":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","Croacia":"🇭🇷","Ghana":"🇬🇭","Panamá":"🇵🇦"};
const fl=t=>FLAGS[t]||"🏳️";

// ─── HORARIOS CEST (UTC+2) — bloqueo 1h antes ─────────────────────────────────
const MATCH_TIMES={
  "A_México_Sudáfrica":"2026-06-11T21:00",
  "A_Corea del Sur_Rep. Checa":"2026-06-12T04:00",
  "A_México_Corea del Sur":"2026-06-19T03:00",
  "A_Rep. Checa_Sudáfrica":"2026-06-18T18:00",
  "A_Sudáfrica_Corea del Sur":"2026-06-25T03:00",
  "A_Rep. Checa_México":"2026-06-25T03:00",
  "B_Canadá_Bosnia y Herc.":"2026-06-12T21:00",
  "B_Catar_Suiza":"2026-06-13T21:00",
  "B_Suiza_Bosnia y Herc.":"2026-06-18T21:00",
  "B_Canadá_Catar":"2026-06-19T00:00",
  "B_Bosnia y Herc._Catar":"2026-06-24T21:00",
  "B_Suiza_Canadá":"2026-06-24T21:00",
  "C_Haití_Escocia":"2026-06-14T03:00",
  "C_Brasil_Marruecos":"2026-06-14T00:00",
  "C_Brasil_Haití":"2026-06-20T03:00",
  "C_Escocia_Marruecos":"2026-06-20T00:00",
  "C_Escocia_Brasil":"2026-06-25T00:00",
  "C_Marruecos_Haití":"2026-06-25T00:00",
  "D_Estados Unidos_Paraguay":"2026-06-13T03:00",
  "D_Australia_Turquía":"2026-06-14T06:00",
  "D_Estados Unidos_Australia":"2026-06-19T21:00",
  "D_Turquía_Paraguay":"2026-06-20T05:00",
  "D_Paraguay_Australia":"2026-06-26T04:00",
  "D_Turquía_Estados Unidos":"2026-06-26T04:00",
  "E_Costa de Marfil_Ecuador":"2026-06-15T01:00",
  "E_Alemania_Curazao":"2026-06-14T19:00",
  "E_Alemania_Costa de Marfil":"2026-06-20T22:00",
  "E_Ecuador_Curazao":"2026-06-21T02:00",
  "E_Curazao_Costa de Marfil":"2026-06-25T22:00",
  "E_Ecuador_Alemania":"2026-06-25T22:00",
  "F_Países Bajos_Japón":"2026-06-14T22:00",
  "F_Suecia_Túnez":"2026-06-15T04:00",
  "F_Países Bajos_Suecia":"2026-06-20T19:00",
  "F_Túnez_Japón":"2026-06-21T06:00",
  "F_Japón_Suecia":"2026-06-26T01:00",
  "F_Túnez_Países Bajos":"2026-06-26T01:00",
  "G_Irán_Nueva Zelanda":"2026-06-16T03:00",
  "G_Bélgica_Egipto":"2026-06-15T21:00",
  "G_Bélgica_Irán":"2026-06-21T21:00",
  "G_Nueva Zelanda_Egipto":"2026-06-22T03:00",
  "G_Egipto_Irán":"2026-06-27T05:00",
  "G_Nueva Zelanda_Bélgica":"2026-06-27T05:00",
  "H_España_Cabo Verde":"2026-06-15T18:00",
  "H_Arabia Saudí_Uruguay":"2026-06-16T00:00",
  "H_España_Arabia Saudí":"2026-06-21T18:00",
  "H_Uruguay_Cabo Verde":"2026-06-22T00:00",
  "H_Cabo Verde_Arabia Saudí":"2026-06-27T02:00",
  "H_Uruguay_España":"2026-06-27T02:00",
  "I_Francia_Senegal":"2026-06-16T21:00",
  "I_Irak_Noruega":"2026-06-17T00:00",
  "I_Francia_Irak":"2026-06-22T23:00",
  "I_Noruega_Senegal":"2026-06-23T02:00",
  "I_Senegal_Irak":"2026-06-26T21:00",
  "I_Noruega_Francia":"2026-06-26T21:00",
  "J_Argentina_Argelia":"2026-06-17T03:00",
  "J_Austria_Jordania":"2026-06-17T06:00",
  "J_Argentina_Austria":"2026-06-22T19:00",
  "J_Jordania_Argelia":"2026-06-23T05:00",
  "J_Argelia_Austria":"2026-06-28T04:00",
  "J_Jordania_Argentina":"2026-06-28T04:00",
  "K_Portugal_RD Congo":"2026-06-17T19:00",
  "K_Uzbekistán_Colombia":"2026-06-18T04:00",
  "K_Portugal_Uzbekistán":"2026-06-23T19:00",
  "K_Colombia_RD Congo":"2026-06-24T04:00",
  "K_Colombia_Portugal":"2026-06-28T01:30",
  "K_RD Congo_Uzbekistán":"2026-06-28T01:30",
  "L_Inglaterra_Croacia":"2026-06-17T22:00",
  "L_Ghana_Panamá":"2026-06-18T01:00",
  "L_Panamá_Croacia":"2026-06-24T01:00",
  "L_Inglaterra_Ghana":"2026-06-23T22:00",
  "L_Panamá_Inglaterra":"2026-06-27T23:00",
  "L_Croacia_Ghana":"2026-06-27T23:00"
};
function fmtTime(key){
  const t=MATCH_TIMES[key];
  if(!t)return"";
  const [date,time]=t.split("T");
  const [y,m,d]=date.split("-");
  const days=["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
  const dt=new Date(Date.UTC(+y,+m-1,+d));
  return days[dt.getUTCDay()]+" "+d+"/"+m+" "+time;
}

// ─── CANAL TV (España) ─────────────────────────────────────────────────────
const LA1_MATCHES = new Set([
  "A_México_Sudáfrica",
  "B_Canadá_Bosnia y Herc.",
  "C_Brasil_Marruecos",
  "E_Alemania_Curazao",
  "H_España_Cabo Verde",
  "I_Francia_Senegal",
  "L_Inglaterra_Croacia",
  "B_Suiza_Bosnia y Herc.",
  "D_Estados Unidos_Australia",
  "F_Países Bajos_Suecia",
  "H_España_Arabia Saudí",
  "J_Argentina_Austria",
  "L_Inglaterra_Ghana",
  "C_Escocia_Brasil",
  "E_Ecuador_Alemania",
  "H_Uruguay_España",
  "K_Colombia_Portugal"
]);
function tvChannel(key){
  return LA1_MATCHES.has(key) ? "📺 La 1" : "🟣 DAZN";
}

function isLocked(key){
  const t=MATCH_TIMES[key];
  if(!t)return false;
  const kickoff=new Date(t+":00+02:00");
  return Date.now()>=kickoff.getTime()-60*60*1000;
}

// ─── STATE ────────────────────────────────────────────────────────────────────
let S={
  user:null,userId:null,players:[],groupResults:{},groupScores:{},groupStandings:{},changelog:[],tab:"hoy",
  activeGroup:"A",loading:true,loginBusy:false,
  savingGroup:false,savingPodium:false,
  editingName:false,pendingName:"",savingName:false,nameError:null,
  pendingPreds:{},pendingPodium:null,
  refreshing:false,rankChange:null,lastRank:null,
  inviteToken:null,accessDenied:false,accessError:null,
  adminUnlocked:false,adminKey:"",adminGateBusy:false,adminGateError:false,
  adminTriggering:false,adminTriggerMsg:null,adminTriggerOk:false,
  adminInviteBusy:false,adminInviteUrl:null
};
function ss(p){Object.assign(S,p);render();}

// ─── SCORING ──────────────────────────────────────────────────────────────────
function gPts(preds,results){let p=0;for(const k in results)if(preds[k]&&preds[k]===results[k])p++;return p;}
function podiumBonus(pod,fin){if(!pod||!fin)return 0;let p=0;if(pod[0]===fin[0])p+=5;if(pod[1]===fin[1])p+=3;if(pod[2]===fin[2])p+=2;return p;}

// ─── DATA ─────────────────────────────────────────────────────────────────────
async function loadData(){
  try{
    const[pls,resJson,clJson]=await Promise.all([
      sbGet("porra_jugadores","select=*"),
      fetch("results.json?t="+Date.now()).then(r=>r.json()).catch(()=>({results:{},scores:{}})),
      fetch("changelog.json?t="+Date.now()).then(r=>r.json()).catch(()=>[])
    ]);
    const players=Array.isArray(pls)?pls:[];
    const groupResults=resJson.results||{};
    const groupScores=resJson.scores||{};
    const groupStandings=resJson.standings||{};
    const changelog=Array.isArray(clJson)?clJson:[];
    let rankChange=null,newRank=null;
    if(S.user){
      const sorted=players.map(p=>({name:p.nombre,pts:gPts(p.group_predictions||{},groupResults)})).sort((a,b)=>b.pts-a.pts);
      newRank=sorted.findIndex(p=>p.name===S.user)+1||null;
      if(newRank&&S.lastRank&&newRank!==S.lastRank)rankChange=S.lastRank-newRank;
    }
    ss({players,groupResults,groupScores,groupStandings,changelog,loading:false,refreshing:false,rankChange,lastRank:newRank||S.lastRank||null});
    if(rankChange!==null)setTimeout(()=>ss({rankChange:null}),4000);
  }catch(e){console.error(e);ss({loading:false,refreshing:false});}
}

// Token de invitación: se lee de la URL (?invite=...) y se PERSISTE en
// localStorage, porque el ida-y-vuelta del login de Google vuelve a `origin`
// sin la query → si no, el token se perdería y el canje nunca correría. Tras
// el redirect (sin ?invite en la URL) se recupera del localStorage.
const PENDING_INVITE_KEY="porra_pending_invite";
function getInviteToken(){
  const q=(window.location&&window.location.search)||"";
  const m=/[?&]invite=([^&]+)/.exec(q);
  const fromUrl=m?decodeURIComponent(m[1]):null;
  if(fromUrl){try{window.localStorage.setItem(PENDING_INVITE_KEY,fromUrl);}catch(e){}return fromUrl;}
  try{return window.localStorage.getItem(PENDING_INVITE_KEY);}catch(e){return null;}
}
function clearPendingInvite(){try{window.localStorage.removeItem(PENDING_INVITE_KEY);}catch(e){}}

// Canjea una invitación contra el backend: el servidor valida token+caducidad y
// da de alta al jugador (el alta directa desde el cliente está bloqueada por RLS).
async function redeemInvite(token){
  try{
    const r=await fetch("/api/redeem-invite",{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+(_token||"")},
      body:JSON.stringify({token}),
    });
    if(r.ok)return await r.json();
  }catch(e){console.error(e);}
  return null;
}

async function saveGroupPreds(){
  const me=S.players.find(p=>p.nombre===S.user);
  const merged={...(me?.group_predictions||{}),...S.pendingPreds};
  ss({savingGroup:true});
  await sbPatch("porra_jugadores","user_id=eq."+S.userId,{group_predictions:merged,updated_at:new Date().toISOString()});
  await loadData();
  ss({savingGroup:false,pendingPreds:{}});
}

async function savePodium(podium){
  ss({savingPodium:true});
  await sbPatch("porra_jugadores","user_id=eq."+S.userId,{podium,updated_at:new Date().toISOString()});
  await loadData();
  ss({savingPodium:false,pendingPodium:null});
}

// Longitud máxima del nombre visible (mote/alias) del jugador.
const MAX_NAME_LEN=40;
// Valida el nombre visible: recorta espacios, rechaza vacío y limita longitud.
// Devuelve {ok, value} | {ok:false, error}.
function validateName(raw){
  const value=String(raw==null?"":raw).trim();
  if(!value)return{ok:false,error:"El nombre no puede estar vacío."};
  if(value.length>MAX_NAME_LEN)return{ok:false,error:"Máximo "+MAX_NAME_LEN+" caracteres."};
  return{ok:true,value};
}
// Guarda el nombre visible (mote) del jugador. Es un UPDATE de la propia fila,
// que RLS permite (auth.uid() = user_id). Las predicciones se indexan por
// user_id, así que renombrar es solo de cara a la UI; pero S.user y la fila en
// S.players se emparejan por `nombre`, de modo que hay que actualizar AMBOS o el
// usuario dejaría de coincidir con su propia fila (ranking/pódium/cabecera).
async function saveName(newName){
  const v=validateName(newName);
  if(!v.ok){ss({nameError:v.error});return;}
  ss({savingName:true,nameError:null});
  await sbPatch("porra_jugadores","user_id=eq."+S.userId,{nombre:v.value,updated_at:new Date().toISOString()});
  // Actualiza la propia fila en S.players y S.user (acoplados por `nombre`).
  const players=S.players.map(p=>p.user_id===S.userId||p.nombre===S.user?{...p,nombre:v.value}:p);
  ss({players,user:v.value,editingName:false,pendingName:"",savingName:false,nameError:null,lastRank:null});
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function pill(text,color){
  return`<span class="pill pill--${color||'blue'}">${text}</span>`;
}
function card(content){return`<div class="card">${content}</div>`;}
// Escapa datos controlados por el usuario antes de interpolarlos en innerHTML
// (los nombres, pódiums, etc. vienen de la BD y no son de confianza).
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

// ─── NOVEDADES (changelog) ────────────────────────────────────────────────────
// El banner muestra la entrada más reciente de changelog.json. El "ya visto" se
// guarda en localStorage (por dispositivo, sin escrituras a Supabase): al
// descartarlo se recuerda el id, y solo reaparece si llega una entrada nueva.
const CHANGELOG_SEEN_KEY="porra_changelog_seen";
function changelogSeenId(){try{return window.localStorage.getItem(CHANGELOG_SEEN_KEY);}catch(e){return null;}}
function renderChangelogBanner(){
  const latest=Array.isArray(S.changelog)&&S.changelog[0];
  if(!latest||!latest.id||changelogSeenId()===String(latest.id))return"";
  const items=(latest.items||[]).map(i=>`<li>${esc(i)}</li>`).join("");
  return`<div class="changelog-banner">
    <button onclick="dismissChangelog()" class="changelog-close" aria-label="Descartar">✕</button>
    <p class="changelog-title">✨ Novedades${latest.fecha?` · ${esc(latest.fecha)}`:""}</p>
    <ul class="changelog-list">${items}</ul>
  </div>`;
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function renderLogin(){
  return`<div class="auth-wrap">
    <div class="auth-card">
      <div class="auth-head">
        <div class="auth-logo">⚽</div>
        <h1 class="auth-title">PORRA MUNDIAL</h1>
        <p class="auth-sub">EEUU · CANADÁ · MÉXICO 2026</p>
      </div>
      <button onclick="doGoogleLogin()" class="login-btn">
        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#fff" d="M44.5 20H24v8.5h11.8C34.7 33.9 29.8 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.4-.1-2.7-.5-4z"/></svg>
        Entrar con Google
      </button>
      <p class="login-foot">Todos los participantes comparten los mismos datos en tiempo real</p>
    </div>
  </div>`;
}

// ─── ACCESO POR INVITACIÓN ─────────────────────────────────────────────────────
// Si el usuario se loguea pero no es miembro y no trae una invitación válida,
// no entra: se le pide un enlace de invitación al admin.
function renderAccessDenied(){
  const msg=S.accessError?esc(S.accessError):"Esta porra es solo por invitación.";
  return`<div class="auth-wrap">
    <div class="auth-card">
      <div class="auth-head">
        <div class="auth-logo--sm">🔒</div>
        <h1 class="auth-title--sm">Necesitas invitación</h1>
        <p class="link-greet">${msg} Pídele al admin un enlace de acceso.</p>
      </div>
      <button onclick="doLogout()" class="link-btn-secondary">Cerrar sesión</button>
    </div>
  </div>`;
}

// ─── PERFIL (editar nombre/mote) ───────────────────────────────────────────────
// Formulario inline para editar el nombre visible (mote/alias). Se abre desde el
// botón de perfil en la cabecera. El valor por defecto es el nombre actual.
function renderProfileEditor(){
  if(!S.editingName)return"";
  const val=S.pendingName!=null?S.pendingName:(S.user||"");
  const err=S.nameError?`<p class="profile-error">${esc(S.nameError)}</p>`:"";
  return`<div class="profile-edit">
    <label class="profile-label" for="profileNameInput">Tu nombre visible</label>
    <div class="profile-row">
      <input id="profileNameInput" type="text" class="profile-input" maxlength="${MAX_NAME_LEN}"
        value="${esc(val)}" oninput="setPendingName(this.value)" placeholder="Tu nombre o mote" />
      <button onclick="doSaveName()" class="profile-save${S.savingName?' profile-save--busy':''}">${S.savingName?'Guardando...':'Guardar'}</button>
      <button onclick="cancelEditName()" class="profile-cancel">Cancelar</button>
    </div>
    ${err}
  </div>`;
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function renderHeader(){
  const me=S.players.find(p=>p.nombre===S.user);
  const myPts=gPts(me?.group_predictions||{},S.groupResults);
  const rc=Object.keys(S.groupResults).length;
  const tabs=[["hoy","📅 Hoy"],["grupos","⚽ Grupos"],["podium","🏆 Pódium"],["marcador","📊 Ranking"],["admin","🔧 Admin"]];
  const rankBanner=S.rankChange!==null?`<div class="rank-banner ${S.rankChange>0?'rank-banner--up':'rank-banner--down'}">
    ${S.rankChange>0?'🔼 Has subido '+S.rankChange+' puesto'+(S.rankChange>1?'s':'')+'!':'🔽 Has bajado '+Math.abs(S.rankChange)+' puesto'+(Math.abs(S.rankChange)>1?'s':'')}
  </div>`:"";
  return`<div class="hdr">
    <div class="hdr-inner">
      <div class="hdr-brand">
        <span class="hdr-logo">⚽</span>
        <div>
          <p class="hdr-title">PORRA MUNDIAL 2026</p>
          <p class="hdr-meta">${esc(S.user)} · ${myPts} pts · ${rc}/${TOTAL_MATCHES} jugados</p>
        </div>
      </div>
      <div class="hdr-actions">
        <button onclick="startEditName()" class="btn-profile" aria-label="Editar nombre">👤 Editar nombre</button>
        <button onclick="doRefresh()" class="btn-refresh">${S.refreshing?'⏳ Actualizando...':'🔄 Actualizar datos'}</button>
        <button onclick="doLogout()" class="btn-logout">Salir</button>
      </div>
    </div>
    ${renderProfileEditor()}
    ${rankBanner}
    <div class="tabs">
      ${tabs.map(([id,label])=>`<button onclick="setTab('${id}')" class="tab${S.tab===id?' tab--active':''}">${label}</button>`).join("")}
    </div>
  </div>`;
}

// ─── CLASIFICACIÓN DEL GRUPO ──────────────────────────────────────────────────
// Conjunto de equipos terceros que clasifican: los 8 mejores terceros de los 12
// grupos (formato Mundial 2026), con el mismo criterio que la clasificación
// (pts ▸ DG ▸ GF ▸ nombre). Se calcula desde S.groupStandings (fuente única).
function bestThirdTeams(){
  const thirds=[];
  for(const g in S.groupStandings){
    const rows=S.groupStandings[g];
    if(rows&&rows.length>=3&&rows.some(t=>t.mp>0))thirds.push(rows[2]);
  }
  thirds.sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf||a.team.localeCompare(b.team,"es"));
  return new Set(thirds.slice(0,8).map(t=>t.team));
}

// Tabla en vivo calculada en el updater (results.json → S.groupStandings), única
// fuente de datos. Se marcan en verde los 2 primeros de cada grupo (clasificados
// directos) y en ámbar el 3º si está entre los 8 mejores terceros.
function renderStandings(g){
  const rows=S.groupStandings[g]||[];
  if(!rows.length)
    return`<p class="standings-empty">Clasificación no disponible</p>`;
  // Las plazas de clasificación solo se resaltan una vez empieza a jugarse;
  // sin partidos, la tabla sale a cero y ordenada alfabéticamente (del updater).
  const played=rows.some(t=>t.mp>0);
  const thirds=bestThirdTeams();
  const rowCls=(t,i)=>!played?'':i<2?'st-row--qual':(i===2&&thirds.has(t.team))?'st-row--third':'';
  const body=rows.map((t,i)=>`<tr class="${rowCls(t,i)}">
    <td class="st-pos">${i+1}</td>
    <td class="st-team">${fl(t.team)} ${esc(t.team)}</td>
    <td>${t.mp}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td>
    <td>${t.gf}</td><td>${t.ga}</td>
    <td class="st-gd">${t.gd>0?'+':''}${t.gd}</td>
    <td class="st-pts">${t.pts}</td>
  </tr>`).join("");
  return`<table class="standings">
    <thead><tr>
      <th class="st-pos">#</th><th class="st-team">Equipo</th>
      <th>PJ</th><th>G</th><th>E</th><th>P</th>
      <th>GF</th><th>GC</th><th class="st-gd">DG</th><th class="st-pts">Pts</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

// ─── GRUPOS ───────────────────────────────────────────────────────────────────
function renderGrupos(){
  const me=S.players.find(p=>p.nombre===S.user);
  const myPreds={...(me?.group_predictions||{}),...S.pendingPreds};
  const predCount=Object.keys(myPreds).length;
  const g=S.activeGroup;
  const matches=GM[g];

  const groupBtns=Object.keys(GROUPS).map(gr=>{
    const keys=GM[gr].map(m=>gr+"_"+m[0]+"_"+m[1]);
    const withR=keys.filter(k=>S.groupResults[k]).length;
    const pending=keys.length-withR;
    const isActive=gr===g;
    const isDone=withR===keys.length&&withR>0;
    const cls='group-btn'+(isActive?' group-btn--active':isDone?' group-btn--done':'');
    return`<button onclick="setGroup('${gr}')" class="${cls}">
      <div>${gr}</div>
      <div class="group-btn-sub">${isDone?'✅':pending+'⏳'}</div>
    </button>`;
  }).join("");

  const matchRows=matches.map(m=>{
    const key=g+"_"+m[0]+"_"+m[1];
    const hasR=!!S.groupResults[key];
    const score=S.groupScores[key];
    const pred=myPreds[key];
    const correct=hasR&&pred===S.groupResults[key];
    const wrong=hasR&&pred&&pred!==S.groupResults[key];
    const locked=isLocked(key);
    const blocked=hasR||locked;
    const matchCls='match'+(hasR?(correct?' match--correct':wrong?' match--wrong':''):locked?' match--locked':'');
    const badge=hasR
      ?`<span class="match-badge badge ${correct?'badge--correct':wrong?'badge--wrong':'badge--neutral'}">${correct?'+1✓':wrong?'✗':'—'}</span>`
      :locked?'<span class="match-badge badge badge--locked">🔒</span>'
      :'';
    return`<div class="${matchCls}">
      ${badge}
      <div class="match-meta">${fmtTime(key)} · ${tvChannel(key)}${score?' · 🔢 '+score:''}</div>
      <div class="match-row">
        <span class="team">${fl(m[0])} ${m[0]}</span>
        <div class="picks">
          ${["1","X","2"].map(v=>{
            const sel=pred===v;
            const isResult=hasR&&S.groupResults[key]===v;
            let pc="pick";
            if(sel)pc+=hasR?(correct?" pick--correct":" pick--wrong"):" pick--sel";
            if(wrong&&isResult)pc+=" pick--result";
            if(locked&&!hasR)pc+=" pick--locked";
            if(blocked)pc+=" pick--blocked";
            return`<button onclick="${blocked?'':('setPred(\''+key+'\',\''+v+'\')')}" class="${pc}">${v}</button>`;
          }).join("")}
        </div>
        <span class="team team--away">${fl(m[1])} ${m[1]}</span>
      </div>
    </div>`;
  }).join("");

  const myGroupKeys=matches.map(m=>g+"_"+m[0]+"_"+m[1]);
  const editableKeys=myGroupKeys.filter(k=>!S.groupResults[k]&&!isLocked(k));
  const editableSaved=editableKeys.length>0&&editableKeys.every(k=>(me?.group_predictions||{})[k]);
  const hasPendingInGroup=myGroupKeys.some(k=>S.pendingPreds[k]);
  const saveBtn=editableKeys.length===0
    ?`<p class="save-note">Todos los partidos están bloqueados o tienen resultado oficial</p>`
    :(editableSaved&&!hasPendingInGroup)
    ?`<p class="save-note save-note--ok">✓ Pronósticos guardados</p>`
    :`<button onclick="doSavePreds()" class="btn-save${S.savingGroup?' btn-save--busy':''}">${S.savingGroup?'Guardando...':'GUARDAR PRONÓSTICOS'}</button>`;

  return`
  ${card(`<div class="section-head"><h2 class="title">Fase de Grupos</h2>${pill(predCount+"/"+TOTAL_MATCHES,predCount===TOTAL_MATCHES?"green":"yellow")}</div><p class="hint">1=Local · X=Empate · 2=Visitante · 1pt por acierto · 🔒=bloqueado 1h antes</p>`)}
  <div class="group-grid">${groupBtns}</div>
  ${card(`<div class="section-head section-head--lg"><h3 class="title">Grupo ${g}</h3></div>
    <p class="standings-cap">Clasificación</p>
    ${renderStandings(g)}
    <p class="standings-cap">Partidos</p>
    <div class="match-list">${matchRows}</div>
    <div class="match-foot"><span>${Object.keys(myPreds).filter(k=>k.startsWith(g)).length}/${matches.length} pronosticados</span><span>🟢=acierto · 🔴=fallo</span></div>
    ${saveBtn}`)}`;
}

// ─── HOY ────────────────────────────────────────────────────────────────────
// Pestaña informativa (no se apuesta): lista los partidos cuya fecha de
// calendario en CEST (UTC+2) coincide con "hoy". Derivamos "hoy" de Date.now()
// desplazado +02:00 y leído con getters UTC, para que sea determinista en tests
// (opts.now) y para no dejar que la zona horaria local de Node/navegador falsee
// el día (mismo cuidado que el bug de fechas ya conocido en este repo).
function todayKeysCEST(){
  const n=new Date(Date.now()+2*3600*1000);
  const today=n.getUTCFullYear()+"-"+
    String(n.getUTCMonth()+1).padStart(2,"0")+"-"+
    String(n.getUTCDate()).padStart(2,"0");
  const keys=[];
  for(const g in GM){
    for(const m of GM[g]){
      const key=g+"_"+m[0]+"_"+m[1];
      const t=MATCH_TIMES[key];
      if(t&&t.split("T")[0]===today)keys.push(key);
    }
  }
  // Ordenadas por hora de inicio (el valor ISO ordena lexicográficamente).
  keys.sort((a,b)=>MATCH_TIMES[a].localeCompare(MATCH_TIMES[b]));
  return keys;
}
// "Tu jornada": resumen diario del usuario sobre los partidos de HOY que ya
// tienen resultado oficial. Cuenta aciertos y puntos ganados hoy (1pt por cada
// 1/X/2 acertado) y muestra el cambio de puesto en la clasificación (reusa
// S.rankChange, que loadData calcula respecto a la carga anterior).
// `keys` son las claves de los partidos de hoy (de todayKeysCEST).
function renderTuJornada(keys){
  const me=S.players.find(p=>p.nombre===S.user);
  const preds=(me&&me.group_predictions)||{};
  // ¿Tengo hechas mis apuestas de hoy? (sobre todos los partidos del día)
  const total=keys.length;
  const hechos=keys.filter(k=>preds[k]).length;
  const faltanAbiertos=keys.filter(k=>!preds[k]&&!isLocked(k)).length;
  let estado;
  if(hechos===total)
    estado=`<p class="tujornada-status tujornada-status--ok">✅ Tienes todas tus apuestas de hoy hechas</p>`;
  else if(faltanAbiertos)
    estado=`<p class="tujornada-status tujornada-status--warn">⚠️ Te faltan ${faltanAbiertos} por pronosticar · ¡aún estás a tiempo!</p>`;
  else
    estado=`<p class="tujornada-status">Te quedaron ${total-hechos} sin pronosticar</p>`;
  // Aciertos/puntos: solo sobre partidos de hoy con resultado oficial.
  const playedKeys=keys.filter(k=>S.groupResults[k]);
  let statsHtml;
  if(playedKeys.length){
    const todayResults={};
    for(const k of playedKeys)todayResults[k]=S.groupResults[k];
    const pts=gPts(preds,todayResults); // 1pt = 1 acierto en fase de grupos
    statsHtml=`<div class="tujornada-stats">
      <div class="tujornada-stat"><p class="tujornada-num">${pts}/${playedKeys.length}</p><p class="tujornada-lbl">Aciertos hoy</p></div>
      <div class="tujornada-stat"><p class="tujornada-num">${pts}</p><p class="tujornada-lbl">Puntos hoy</p></div>
    </div>`;
  }else{
    statsHtml=`<p class="tujornada-empty">Aún no hay resultados oficiales de hoy ⏳</p>`;
  }
  return card(`<div class="section-head"><h2 class="title">Tu jornada</h2>${pill(hechos+"/"+total+" apuestas","blue")}</div>
    ${estado}
    ${statsHtml}`);
}
function renderToday(){
  const keys=todayKeysCEST();
  if(!keys.length)
    return card(`<div class="section-head"><h2 class="title">Partidos de hoy</h2></div>
      <p class="today-empty">No hay partidos hoy 🌙</p>`);
  const rows=keys.map(key=>{
    // key = "{GRUPO}_{LOCAL}_{VISITANTE}". Recuperamos local/visitante de GM por la
    // letra de grupo (los nombres pueden contener "_", así que no hacemos split).
    const [home,away]=GM[key[0]].find(m=>(key[0]+"_"+m[0]+"_"+m[1])===key)||["",""];
    // Si el partido ya tiene resultado oficial, mostramos el marcador en el
    // centro (p. ej. los de madrugada ya jugados); si no, un "vs".
    const score=S.groupScores[key];
    const center=score
      ?`<span class="today-score">${score}</span>`
      :`<span class="today-vs">vs</span>`;
    return`<div class="today-match">
      <div class="match-meta"><span class="today-group">Grupo ${key[0]}</span> · ${fmtTime(key)} · ${tvChannel(key)}</div>
      <div class="today-row">
        <span class="team">${fl(home)} ${home}</span>
        ${center}
        <span class="team team--away">${fl(away)} ${away}</span>
      </div>
    </div>`;
  }).join("");
  // Bloque "Tu jornada" (resumen diario del usuario) encima de la lista.
  return renderTuJornada(keys)+
    card(`<div class="section-head"><h2 class="title">Partidos de hoy</h2>${pill(keys.length,"blue")}</div>
    <p class="hint">Solo informativo · horarios CEST · dónde verlo por TV</p>
    <div class="today-list">${rows}</div>`);
}

// ─── PÓDIUM ───────────────────────────────────────────────────────────────────
function renderPodium(){
  const me=S.players.find(p=>p.nombre===S.user);
  const saved=me?.podium||null;
  const form=S.pendingPodium||(saved?[...saved]:["","",""]);
  const used=form.filter(Boolean);
  const isSaved=saved&&!S.pendingPodium;
  const preview=isSaved?`<div class="podium-preview">${saved.map((t,i)=>`<div class="podium-preview-item"><p class="podium-preview-medal">${["🥇","🥈","🥉"][i]}</p><p class="podium-preview-team">${fl(t)} ${esc(t)}</p></div>`).join("")}</div>`:"";
  const podForm=[["🥇 Campeón",0],["🥈 Subcampeón",1],["🥉 3er Puesto",2]].map(([label,idx])=>{
    const avail=ALL_TEAMS.filter(t=>!used.includes(t)||t===form[idx]).sort((a,b)=>a.localeCompare(b,"es"));
    return`<div><label class="podium-field-label">${label}</label>
      <select onchange="setPodiumPos(${idx},this.value)" class="select">
        <option value="">— Selecciona —</option>
        ${avail.map(t=>`<option value="${t}" ${form[idx]===t?'selected':''}>${fl(t)} ${t}</option>`).join("")}
      </select></div>`;
  }).join("");
  const allSel=form[0]&&form[1]&&form[2];
  const saveBtn=allSel
    ?`<button onclick="doSavePodium()" class="btn-podium${S.savingPodium?' btn-podium--busy':''}">${S.savingPodium?'Guardando...':'💾 GUARDAR PÓDIUM'}</button>`
    :isSaved?'<p class="podium-saved">✓ Pódium guardado</p>'
    :'<p class="podium-hint">Selecciona los 3 equipos para guardar</p>';
  const others=S.players.filter(p=>p.nombre!==S.user).map(p=>`
    <div class="player-row">
      <div class="avatar">${esc((p.nombre[0]||"?").toUpperCase())}</div>
      <div class="grow"><p class="player-name">${esc(p.nombre)}</p>
        ${p.podium?`<p class="player-podium">🥇${esc(p.podium[0])} · 🥈${esc(p.podium[1])} · 🥉${esc(p.podium[2])}</p>`:`<p class="player-empty">Sin pronóstico aún</p>`}
      </div></div>`).join("");
  return`
  ${card(`<h2 class="podium-title">Mi Pronóstico de Pódium</h2>
    <p class="podium-sub">Bonus final: 🥇+5pts · 🥈+3pts · 🥉+2pts</p>
    ${preview}<div class="podium-form">${podForm}</div>${saveBtn}`)}
  ${card(`<h3 class="card-title">Pódiums del grupo (${S.players.length})</h3>
    <div class="list">${others||'<p class="list-empty">Aún no hay otros participantes</p>'}</div>`)}`;
}

// ─── RANKING ──────────────────────────────────────────────────────────────────
function renderRanking(){
  const scores=S.players.map(p=>({
    name:p.nombre,
    gpts:gPts(p.group_predictions||{},S.groupResults),
    ppts:podiumBonus(p.podium,null),
    get total(){return this.gpts+this.ppts;}
  })).sort((a,b)=>b.total-a.total);
  const medals=["🥇","🥈","🥉"];
  // Ranking estilo competición: los empates en puntos comparten puesto (premio
  // compartido), sin desempate arbitrario. Secuencia tipo 1, 2, 2, 4.
  const tiedTotals={};
  scores.forEach(s=>{tiedTotals[s.total]=(tiedTotals[s.total]||0)+1;});
  let pos=0,prevTotal=null;
  const rows=scores.map((s,i)=>{
    if(s.total!==prevTotal){pos=i+1;prevTotal=s.total;}
    const tied=s.total>0&&tiedTotals[s.total]>1;
    const badge=(s.total>0&&pos<=3)?medals[pos-1]:pos+".";
    return `
    <div class="rank-row${s.name===S.user?' rank-row--me':''}${tied?' rank-row--tie':''}">
      <span class="rank-pos">${badge}</span>
      <div class="grow">
        <p class="rank-name">${esc(s.name)}${s.name===S.user?' <span class="rank-you">(tú)</span>':''}${tied?' <span class="rank-tie">empate</span>':''}</p>
        <p class="rank-detail">Grupos: ${s.gpts}pts · Pódium: ${s.ppts}pts</p>
      </div>
      <div class="rank-total"><p class="rank-total-num">${s.total}</p><p class="rank-total-lbl">pts</p></div>
    </div>`;}).join("");
  const rules=[["⚽ Grupos (72 partidos)","1pt/acierto"],["🔟 Dieciseisavos","Base 2pts"],["8️⃣ Octavos","Base 4pts"],["4️⃣ Cuartos","Base 8pts"],["2️⃣ Semifinales","Base 16pts"],["🏅 3º/4º puesto","Base 24pts"],["🏆 Gran Final","Base 32pts"],["🎯 Bonus Pódium","+5+3+2pts"]];
  return`
  ${card(`<div class="section-head"><h2 class="title">Clasificación en vivo</h2>${pill(S.players.length+" jugadores","blue")}</div>
    <p class="hint--mb">${Object.keys(S.groupResults).length} resultados aplicados</p>
    <div class="list">${rows||'<p class="rank-empty">Aún no hay participantes</p>'}</div>`)}
  ${card(`<h3 class="card-title">📋 Puntuación por fase</h3>
    <div class="rules">${rules.map(([l,r])=>`<div class="rule"><span class="rule-label">${l}</span><span class="rule-value">${r}</span></div>`).join("")}</div>`)}`;
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────
function renderAdmin(){
  // Paso 1: formulario de acceso (la clave se valida contra el servidor).
  if(!S.adminUnlocked){
    return card(`<h2 class="title">Zona Admin</h2>
      <p class="hint admin-hint">Introduce la clave de administración para acceder.</p>
      <label class="admin-label">Clave de administración</label>
      <input id="adminKeyInput" type="password" class="admin-input" placeholder="••••••••" autocomplete="off" />
      <button onclick="doAdminLogin()" class="admin-btn${S.adminGateBusy?' admin-btn--busy':''}">${S.adminGateBusy?'⏳ Comprobando...':'ENTRAR'}</button>
      ${S.adminGateError?'<p class="admin-msg admin-msg--err">❌ Clave incorrecta</p>':""}`);
  }
  // Paso 2: tareas administrativas (de momento, solo el trigger de la Action).
  const msg=S.adminTriggerMsg
    ?`<p class="admin-msg admin-msg--${S.adminTriggerOk?'ok':'err'}">${S.adminTriggerMsg}</p>`
    :"";
  const invite=S.adminInviteUrl
    ?`<input class="admin-input admin-invite" type="text" readonly value="${esc(S.adminInviteUrl)}" onclick="this.select()" />`
    :"";
  return card(`<h2 class="title">Zona Admin</h2>
    <p class="hint admin-hint">Tareas administrativas.</p>
    <button onclick="doTriggerUpdate()" class="admin-btn${S.adminTriggering?' admin-btn--busy':''}">${S.adminTriggering?'⏳ Actualizando...':'🔄 Forzar actualización de resultados'}</button>
    <button onclick="doCreateInvite()" class="admin-btn${S.adminInviteBusy?' admin-btn--busy':''}">${S.adminInviteBusy?'⏳ Generando...':'🔗 Generar invitación (30 min)'}</button>
    ${invite}
    ${msg}`);
}

// ─── RENDER ───────────────────────────────────────────────────────────────────
function render(){
  const app=document.getElementById("app");
  if(!app)return;
  if(S.loading){app.innerHTML=`<div class="loading"><div class="loading-inner"><div class="loading-logo">⚽</div><p class="loading-text">Conectando...</p></div></div>`;return;}
  if(!S.user){app.innerHTML=S.accessDenied?renderAccessDenied():renderLogin();return;}
  const content={hoy:renderToday,grupos:renderGrupos,podium:renderPodium,marcador:renderRanking,admin:renderAdmin}[S.tab]?.();
  app.innerHTML=`${renderHeader()}<div class="app-main">${renderChangelogBanner()}${content||""}</div>`;
}

// ─── HANDLERS ─────────────────────────────────────────────────────────────────
window.doGoogleLogin=()=>sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin}});
window.doLogout=async()=>{await sb.auth.signOut();ss({user:null,userId:null,pendingPreds:{},pendingPodium:null,accessDenied:false,accessError:null,adminUnlocked:false,adminKey:"",adminGateError:false,adminTriggerMsg:null,adminInviteUrl:null});};
window.setTab=t=>ss({tab:t});
window.dismissChangelog=()=>{const l=Array.isArray(S.changelog)&&S.changelog[0];if(l&&l.id){try{window.localStorage.setItem(CHANGELOG_SEEN_KEY,String(l.id));}catch(e){}}ss({});};
window.setGroup=g=>ss({activeGroup:g,pendingPreds:{}});
window.setPred=(key,val)=>ss({pendingPreds:{...S.pendingPreds,[key]:val}});
window.doSavePreds=()=>{if(!S.savingGroup)saveGroupPreds();};
window.setPodiumPos=(idx,val)=>{const me=S.players.find(p=>p.nombre===S.user);const base=S.pendingPodium||(me?.podium?[...me.podium]:["","",""]);const u=[...base];u[idx]=val;ss({pendingPodium:u});};
window.doSavePodium=()=>{if(!S.savingPodium&&S.pendingPodium&&S.pendingPodium[0]&&S.pendingPodium[1]&&S.pendingPodium[2])savePodium(S.pendingPodium);};
window.doRefresh=()=>{if(!S.refreshing){ss({refreshing:true});loadData();}};

// ─── Perfil: editar el nombre visible (mote) ─────────────────────────────────
window.startEditName=()=>ss({editingName:true,pendingName:S.user||"",nameError:null});
window.setPendingName=v=>{S.pendingName=v;};
window.cancelEditName=()=>ss({editingName:false,pendingName:"",nameError:null});
window.doSaveName=()=>{if(!S.savingName)saveName(S.pendingName);};

async function verifyAdminKey(key){
  ss({adminGateBusy:true,adminGateError:false});
  try{
    const r=await fetch("/api/trigger-update",{method:"POST",headers:{"X-Admin-Secret":key,"X-Verify-Only":"1"}});
    if(r.ok)ss({adminGateBusy:false,adminUnlocked:true,adminKey:key,adminGateError:false});
    else ss({adminGateBusy:false,adminGateError:true});
  }catch(e){
    ss({adminGateBusy:false,adminGateError:true});
  }
}
window.doAdminLogin=()=>{if(S.adminGateBusy)return;const v=document.getElementById("adminKeyInput")?.value||"";if(v)verifyAdminKey(v);};

async function triggerUpdate(secret){
  ss({adminTriggering:true,adminTriggerMsg:null});
  try{
    const r=await fetch("/api/trigger-update",{method:"POST",headers:{"X-Admin-Secret":secret}});
    if(r.ok){
      ss({adminTriggering:false,adminTriggerOk:true,adminTriggerMsg:"✅ Actualización disparada. Los resultados aparecerán en unos minutos."});
    }else{
      const e=await r.json().catch(()=>({}));
      ss({adminTriggering:false,adminTriggerOk:false,adminTriggerMsg:"❌ "+(e.error||("Error "+r.status))});
    }
  }catch(e){
    ss({adminTriggering:false,adminTriggerOk:false,adminTriggerMsg:"❌ Error de red"});
  }
}
window.doTriggerUpdate=()=>{if(S.adminTriggering)return;if(S.adminKey)triggerUpdate(S.adminKey);};

async function createInvite(secret){
  ss({adminInviteBusy:true,adminInviteUrl:null,adminTriggerMsg:null});
  try{
    const r=await fetch("/api/create-invite",{method:"POST",headers:{"X-Admin-Secret":secret}});
    if(r.ok){
      const d=await r.json();
      const origin=(window.location&&window.location.origin)||"";
      ss({adminInviteBusy:false,adminInviteUrl:origin+"/?invite="+d.token});
    }else{
      ss({adminInviteBusy:false,adminTriggerOk:false,adminTriggerMsg:"❌ No se pudo generar la invitación"});
    }
  }catch(e){
    ss({adminInviteBusy:false,adminTriggerOk:false,adminTriggerMsg:"❌ Error de red"});
  }
}
window.doCreateInvite=()=>{if(S.adminInviteBusy)return;if(S.adminKey)createInvite(S.adminKey);};

// ─── INIT ─────────────────────────────────────────────────────────────────────
sb.auth.onAuthStateChange(async(event,session)=>{
  _token=session?.access_token||null;
  if(!session){
    _token=null;
    ss({user:null,userId:null,loading:false,accessDenied:false,accessError:null});
    return;
  }
  const userId=session.user.id;
  // ¿Ya es miembro? (su fila la creó un canje de invitación previo)
  const rows=await sbGet("porra_jugadores","user_id=eq."+userId+"&select=nombre");
  let nombre=Array.isArray(rows)&&rows[0]&&rows[0].nombre;
  if(!nombre){
    // No es miembro: solo entra si trae una invitación válida.
    if(S.inviteToken){
      const res=await redeemInvite(S.inviteToken);
      if(res&&res.ok){nombre=res.nombre;clearPendingInvite();}
      else{clearPendingInvite();ss({user:null,userId:null,loading:false,accessDenied:true,accessError:"Tu invitación no es válida o ha caducado.",inviteToken:null});return;}
    }else{
      ss({user:null,userId:null,loading:false,accessDenied:true,accessError:null});return;
    }
  }
  await loadData();
  clearPendingInvite();
  ss({user:nombre,userId,loading:false,accessDenied:false,accessError:null,inviteToken:null});
});
S.inviteToken=getInviteToken();
render();
