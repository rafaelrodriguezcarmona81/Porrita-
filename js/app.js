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

// Epoch (ms) del saque para una clave de partido, sea de GRUPOS o de ELIMINATORIAS.
// - Grupos: clave team-key en MATCH_TIMES (hora CEST naive, UTC+2).
// - KO: clave "{RONDA}_M{n}" → su nº de partido se busca en KO_SCHEDULE (instante
//   UTC absoluto). Devuelve null si la clave no corresponde a ningún partido.
function kickoffMs(key){
  const t=MATCH_TIMES[key];
  if(t)return new Date(t+":00+02:00").getTime();
  const m=koMatchNum(key);
  const sch=m!=null?KO_SCHEDULE[m]:null;
  if(sch)return new Date(sch.utc).getTime();
  return null;
}
function isLocked(key){
  const ko=kickoffMs(key);
  if(ko==null)return false;
  return Date.now()>=ko-60*60*1000;
}
// El pódium se bloquea 1h antes del primer partido KO (M73) y ya no puede
// modificarse. Es irreversible: una vez arrancada la fase eliminatoria, el
// pronóstico queda fijo independientemente de lo que pase después.
function isPodiumLocked(){
  const first=Math.min(...Object.values(KO_SCHEDULE).map(s=>new Date(s.utc).getTime()));
  return Date.now()>=first-60*60*1000;
}

// ─── STATE ────────────────────────────────────────────────────────────────────
let S={
  user:null,userId:null,players:[],groupResults:{},groupScores:{},groupStandings:{},changelog:[],tab:"hoy",
  activeGroup:"A",loading:true,loginBusy:false,
  savingGroup:false,savingPodium:false,savingBracket:false,
  editingName:false,pendingName:"",savingName:false,nameError:null,
  pendingPreds:{},pendingPodium:null,pendingBracket:{},
  koFixtures:{},koResults:{},koScores:{},
  refreshing:false,rankChange:null,lastRank:null,
  inviteToken:null,accessDenied:false,accessError:null,
  adminUnlocked:false,adminKey:"",adminGateBusy:false,adminGateError:false,
  adminTriggering:false,adminTriggerMsg:null,adminTriggerOk:false,
  adminInviteBusy:false,adminInviteUrl:null,
  adminRemoveBusy:false,adminRemoveMsg:null,adminRemoveOk:false,
  bracketView:"lista"
};
function ss(p){Object.assign(S,p);render();}

// ─── ELIMINATORIAS (knockout / cuadro) ────────────────────────────────────────
// Metadatos de las rondas KO, dirigidos por datos (NO un mapa fijo de cruces
// oficiales del Mundial 2026). `base` = puntos por cada equipo correctamente
// pronosticado como "avanza" en esa ronda; coincide con la tabla de puntuación de
// renderRanking. `advancers` (cuando aplica) es solo informativo (nº de equipos
// que pasan la ronda). Los cruces reales (emparejamientos) llegarán como datos en
// results.json cuando arranque la fase eliminatoria — ver S.koFixtures.
const KO_ROUNDS=[
  {key:"r32",label:"Dieciseisavos",base:2,advancers:16},
  {key:"r16",label:"Octavos",base:4,advancers:8},
  {key:"qf",label:"Cuartos",base:8,advancers:4},
  {key:"sf",label:"Semifinales",base:16,advancers:2},
  {key:"third",label:"3º/4º puesto",base:24},
  {key:"final",label:"Gran Final",base:32}
];

// ─── CUADRO OFICIAL (plantilla pública, Mundial 2026) ─────────────────────────
// La PLANTILLA de huecos del cuadro es fija y pública (Round of 32 = M73..M88,
// luego octavos/cuartos/semis/3º/final). Los EQUIPOS que rellenan cada hueco se
// resuelven progresivamente: el 1º/2º de un grupo se sabe cuando ese grupo
// termina su 3ª jornada; los 8 mejores terceros (y por tanto los huecos "tercero
// de {…}") solo se conocen cuando los 12 grupos han terminado (ranking entre
// grupos). Por eso el resolver TOLERA estado parcial → deja `null` lo pendiente.
//
// Cada partido tiene: `round` (clave de KO_ROUNDS), `m` (nº oficial de partido,
// 73..104) y una `key` estable "{RONDA}_M{n}" (independiente de los equipos, que
// cambian al resolverse → no se puede usar la team-key como clave de plantilla).
// `home`/`away` son specs de hueco:
//   {type:"winner",group:"E"}                   → 1º del grupo E
//   {type:"runner",group:"C"}                   → 2º del grupo C
//   {type:"third",groups:["A","B","C","D","F"]} → mejor tercero de ese conjunto
//   {type:"matchWinner",match:74}               → ganador del partido 74
//   {type:"matchLoser",match:101}               → perdedor del partido 101
const W=m=>({type:"matchWinner",match:m});
const L=m=>({type:"matchLoser",match:m});
const w1=g=>({type:"winner",group:g});
const r2=g=>({type:"runner",group:g});
const t3=(...gs)=>({type:"third",groups:gs});
const KO_BRACKET=[
  // Round of 32 (dieciseisavos) — plantilla oficial M73..M88.
  {round:"r32",m:73,key:"r32_M73",home:r2("A"),away:r2("B")},
  {round:"r32",m:74,key:"r32_M74",home:w1("E"),away:t3("A","B","C","D","F")},
  {round:"r32",m:75,key:"r32_M75",home:w1("F"),away:r2("C")},
  {round:"r32",m:76,key:"r32_M76",home:w1("C"),away:r2("F")},
  {round:"r32",m:77,key:"r32_M77",home:w1("I"),away:t3("C","D","F","G","H")},
  {round:"r32",m:78,key:"r32_M78",home:r2("E"),away:r2("I")},
  {round:"r32",m:79,key:"r32_M79",home:w1("A"),away:t3("C","E","F","H","I")},
  {round:"r32",m:80,key:"r32_M80",home:w1("L"),away:t3("E","H","I","J","K")},
  {round:"r32",m:81,key:"r32_M81",home:w1("D"),away:t3("B","E","F","I","J")},
  {round:"r32",m:82,key:"r32_M82",home:w1("G"),away:t3("A","E","H","I","J")},
  {round:"r32",m:83,key:"r32_M83",home:r2("K"),away:r2("L")},
  {round:"r32",m:84,key:"r32_M84",home:w1("H"),away:r2("J")},
  {round:"r32",m:85,key:"r32_M85",home:w1("B"),away:t3("E","F","G","I","J")},
  {round:"r32",m:86,key:"r32_M86",home:w1("J"),away:r2("H")},
  {round:"r32",m:87,key:"r32_M87",home:w1("K"),away:t3("D","E","I","J","L")},
  {round:"r32",m:88,key:"r32_M88",home:r2("D"),away:r2("G")},
  // Octavos (R16).
  {round:"r16",m:89,key:"r16_M89",home:W(74),away:W(77)},
  {round:"r16",m:90,key:"r16_M90",home:W(73),away:W(75)},
  {round:"r16",m:91,key:"r16_M91",home:W(76),away:W(78)},
  {round:"r16",m:92,key:"r16_M92",home:W(79),away:W(80)},
  {round:"r16",m:93,key:"r16_M93",home:W(83),away:W(84)},
  {round:"r16",m:94,key:"r16_M94",home:W(81),away:W(82)},
  {round:"r16",m:95,key:"r16_M95",home:W(86),away:W(88)},
  {round:"r16",m:96,key:"r16_M96",home:W(85),away:W(87)},
  // Cuartos (QF).
  {round:"qf",m:97,key:"qf_M97",home:W(89),away:W(90)},
  {round:"qf",m:98,key:"qf_M98",home:W(93),away:W(94)},
  {round:"qf",m:99,key:"qf_M99",home:W(91),away:W(92)},
  {round:"qf",m:100,key:"qf_M100",home:W(95),away:W(96)},
  // Semifinales (SF).
  {round:"sf",m:101,key:"sf_M101",home:W(97),away:W(98)},
  {round:"sf",m:102,key:"sf_M102",home:W(99),away:W(100)},
  // 3º puesto y Final.
  {round:"third",m:103,key:"third_M103",home:L(101),away:L(102)},
  {round:"final",m:104,key:"final_M104",home:W(101),away:W(102)}
];

// ─── CALENDARIO OFICIAL DE ELIMINATORIAS (fecha/hora/sede) ────────────────────
// Keyed por nº de partido (73..104). `utc` es el INSTANTE absoluto del saque en
// UTC (calculado a partir de la hora local de la sede + su offset UTC oficial,
// almacenado en UTC para evitar ambigüedad). `venue` = "Estadio, Ciudad". La
// hora se MUESTRA en CEST (UTC+2) como el resto de la app — ver fmtKO().
const KO_SCHEDULE={
  73:{utc:"2026-06-28T19:00:00Z",venue:"SoFi Stadium, Inglewood"},
  74:{utc:"2026-06-29T20:30:00Z",venue:"Gillette Stadium, Foxborough"},
  75:{utc:"2026-06-30T01:00:00Z",venue:"Estadio BBVA, Guadalupe"},
  76:{utc:"2026-06-29T17:00:00Z",venue:"NRG Stadium, Houston"},
  77:{utc:"2026-06-30T21:00:00Z",venue:"MetLife Stadium, East Rutherford"},
  78:{utc:"2026-06-30T17:00:00Z",venue:"AT&T Stadium, Arlington"},
  79:{utc:"2026-07-01T01:00:00Z",venue:"Estadio Azteca, Mexico City"},
  80:{utc:"2026-07-01T16:00:00Z",venue:"Mercedes-Benz Stadium, Atlanta"},
  81:{utc:"2026-07-02T00:00:00Z",venue:"Levi's Stadium, Santa Clara"},
  82:{utc:"2026-07-01T20:00:00Z",venue:"Lumen Field, Seattle"},
  83:{utc:"2026-07-02T23:00:00Z",venue:"BMO Field, Toronto"},
  84:{utc:"2026-07-02T19:00:00Z",venue:"SoFi Stadium, Inglewood"},
  85:{utc:"2026-07-03T03:00:00Z",venue:"BC Place, Vancouver"},
  86:{utc:"2026-07-03T22:00:00Z",venue:"Hard Rock Stadium, Miami Gardens"},
  87:{utc:"2026-07-04T01:30:00Z",venue:"Arrowhead Stadium, Kansas City"},
  88:{utc:"2026-07-03T18:00:00Z",venue:"AT&T Stadium, Arlington"},
  89:{utc:"2026-07-04T21:00:00Z",venue:"Lincoln Financial Field, Philadelphia"},
  90:{utc:"2026-07-04T17:00:00Z",venue:"NRG Stadium, Houston"},
  91:{utc:"2026-07-05T20:00:00Z",venue:"MetLife Stadium, East Rutherford"},
  92:{utc:"2026-07-06T00:00:00Z",venue:"Estadio Azteca, Mexico City"},
  93:{utc:"2026-07-06T19:00:00Z",venue:"AT&T Stadium, Arlington"},
  94:{utc:"2026-07-07T00:00:00Z",venue:"Lumen Field, Seattle"},
  95:{utc:"2026-07-07T16:00:00Z",venue:"Mercedes-Benz Stadium, Atlanta"},
  96:{utc:"2026-07-07T20:00:00Z",venue:"BC Place, Vancouver"},
  97:{utc:"2026-07-09T20:00:00Z",venue:"Gillette Stadium, Foxborough"},
  98:{utc:"2026-07-10T19:00:00Z",venue:"SoFi Stadium, Inglewood"},
  99:{utc:"2026-07-11T21:00:00Z",venue:"Hard Rock Stadium, Miami Gardens"},
  100:{utc:"2026-07-12T01:00:00Z",venue:"Arrowhead Stadium, Kansas City"},
  101:{utc:"2026-07-14T19:00:00Z",venue:"AT&T Stadium, Arlington"},
  102:{utc:"2026-07-15T19:00:00Z",venue:"Mercedes-Benz Stadium, Atlanta"},
  103:{utc:"2026-07-18T21:00:00Z",venue:"Hard Rock Stadium, Miami Gardens"},
  104:{utc:"2026-07-19T19:00:00Z",venue:"MetLife Stadium, East Rutherford"}
};

// País anfitrión de cada sede (Mundial 2026: EEUU, México y Canadá). Solo 4 de las
// 16 sedes no son de EEUU, así que las marcamos por nombre y el resto es EEUU.
const VENUE_MX=["Estadio BBVA, Guadalupe","Estadio Azteca, Mexico City"];
const VENUE_CA=["BMO Field, Toronto","BC Place, Vancouver"];
function venueCountry(venue){
  if(VENUE_MX.includes(venue))return"México";
  if(VENUE_CA.includes(venue))return"Canadá";
  return"Estados Unidos";
}
// Extrae el nº de partido (73..104) de una clave de plantilla KO "{RONDA}_M{n}".
// Devuelve null si la clave no encaja con ese patrón.
function koMatchNum(key){
  const mt=/_M(\d+)$/.exec(key||"");
  return mt?+mt[1]:null;
}
// Formatea el saque de un partido KO (por nº) en CEST (UTC+2) con el mismo estilo
// que fmtTime() para los grupos: "Día DD/MM HH:MM" (p.ej. "Dom 28/06 21:00").
// Gestiona el cambio de día cuando el instante UTC cae en el día siguiente CEST.
function fmtKO(matchNumber){
  const sch=KO_SCHEDULE[matchNumber];
  if(!sch)return"";
  const days=["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
  const pad=n=>String(n).padStart(2,"0");
  const c=new Date(new Date(sch.utc).getTime()+2*60*60*1000); // a CEST
  return days[c.getUTCDay()]+" "+pad(c.getUTCDate())+"/"+pad(c.getUTCMonth()+1)+" "
    +pad(c.getUTCHours())+":"+pad(c.getUTCMinutes());
}

// ¿Está el grupo G completo (las 4 selecciones con 3 partidos jugados)? El
// resolver fija terceros solo sobre grupos cerrados; 1º/2º pueden fijarse antes
// si la posición está matemáticamente asegurada (ver clinchedPositions).
function isGroupComplete(standings,g){
  const rows=standings&&standings[g];
  return Array.isArray(rows)&&rows.length>=4&&rows.every(t=>t&&t.mp===3);
}

// Partidos del grupo G que aún NO se han jugado (de GM menos los de groupResults).
function groupRemaining(g,groupResults){
  const rem=[];
  for(const[home,away]of(GM[g]||[])){
    if(!((g+"_"+home+"_"+away)in groupResults))rem.push([home,away]);
  }
  return rem;
}

// Posiciones de grupo MATEMÁTICAMENTE ASEGURADAS (p. ej. Alemania ya 1ª del E con
// el grupo sin terminar). Devuelve { equipo: puesto } (0=1º, 1=2º, …) SOLO para
// equipos cuyo puesto está cerrado por PUNTOS: se enumeran los resultados V/E/D de
// los partidos que faltan y se exige que, en TODOS los escenarios, el nº de
// equipos estrictamente por encima sea el mismo y que el equipo NUNCA empate a
// puntos con otro (un empate a puntos exigiría desempate por DG/head-to-head, que
// no garantizamos → no se fija). Conservador a propósito: no coloca a nadie mal.
function clinchedPositions(g,standings,groupResults){
  const rows=standings&&standings[g];
  if(!Array.isArray(rows)||rows.length<4)return{};
  const teams=rows.map(r=>r.team);
  const base={};for(const r of rows)base[r.team]=r.pts||0;
  const rem=groupRemaining(g,groupResults||{});
  // Guard de consistencia: si un partido "restante" menciona un equipo que no
  // está en el standings (datos incoherentes, p. ej. nombres que no casan con GM),
  // no razonamos para no colocar a nadie mal.
  for(const[h,a]of rem){if(!(h in base)||!(a in base))return{};}
  const total=Math.pow(3,rem.length); // 3^restantes (≤ 729)
  const scenarios=[];
  for(let mask=0;mask<total;mask++){
    const pts={...base};let m=mask;
    for(let i=0;i<rem.length;i++){
      const o=m%3;m=Math.floor(m/3);const[h,a]=rem[i];
      if(o===0)pts[h]+=3;else if(o===1){pts[h]+=1;pts[a]+=1;}else pts[a]+=3;
    }
    scenarios.push(pts);
  }
  const locked={};
  for(const t of teams){
    let pos=null,ok=true;
    for(const pts of scenarios){
      let above=0,tied=false;
      for(const u of teams){if(u===t)continue;if(pts[u]>pts[t])above++;else if(pts[u]===pts[t])tied=true;}
      if(tied){ok=false;break;}
      if(pos===null)pos=above;else if(pos!==above){ok=false;break;}
    }
    if(ok&&pos!==null)locked[t]=pos;
  }
  return locked;
}

// Los 8 mejores terceros a partir de UN objeto standings dado (versión pura de
// bestThirdTeams, que opera sobre S.groupStandings). Devuelve filas {team,group,
// pts,gd,gf,...} ordenadas (pts ▸ DG ▸ GF ▸ nombre) y recortadas a 8. Solo se
// invoca cuando los 12 grupos están completos.
function bestThirdsFrom(standings){
  const thirds=[];
  for(const g in standings){
    const rows=standings[g];
    if(rows&&rows.length>=3)thirds.push({...rows[2],group:g});
  }
  thirds.sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf||a.team.localeCompare(b.team,"es"));
  return thirds.slice(0,8);
}

// Asigna cada uno de los 8 mejores terceros a su hueco "tercero de {…}". NO se
// transcribe la tabla Anexo C de la FIFA (495 filas): cada hueco lista grupos
// candidatos; asignamos el tercero clasificado cuyo grupo esté en ese conjunto,
// garantizando un emparejamiento 1-a-1 sobre los 8 huecos. Se resuelve por
// backtracking eligiendo siempre el hueco con menos candidatos válidos (heurística
// de restricción mínima). Devuelve { matchM: teamName } o null si NINGUNA
// asignación completa es posible con los datos (no se inventa nada).
function assignThirdSlots(thirdSlots,thirds){
  const byGroup={};for(const t of thirds)byGroup[t.group]=t.team;
  const available=new Set(thirds.map(t=>t.group)); // grupos de terceros clasificados
  // Para cada hueco, los grupos candidatos que SÍ clasificaron como tercero.
  const slots=thirdSlots.map(s=>({m:s.m,cands:s.groups.filter(g=>available.has(g))}));
  const result={};
  function bt(remaining,used){
    if(!remaining.length)return true;
    // Elegir el hueco con menos candidatos libres (fail-fast).
    let bi=0,bf=Infinity;
    for(let i=0;i<remaining.length;i++){
      const free=remaining[i].cands.filter(g=>!used.has(g)).length;
      if(free<bf){bf=free;bi=i;}
    }
    const slot=remaining[bi];
    const rest=remaining.filter((_,i)=>i!==bi);
    for(const g of slot.cands){
      if(used.has(g))continue;
      used.add(g);result[slot.m]=byGroup[g];
      if(bt(rest,used))return true;
      used.delete(g);delete result[slot.m];
    }
    return false;
  }
  return bt(slots,new Set())?result:null;
}

// Etiqueta legible de un hueco aún sin resolver (para el placeholder "pendiente").
// Si por lo que sea ya hay equipo resuelto, lo devuelve tal cual.
function slotLabel(spec,team){
  if(team!=null)return team;
  if(!spec)return"Pendiente";
  if(spec.type==="winner")return"1º Grupo "+spec.group;
  if(spec.type==="runner")return"2º Grupo "+spec.group;
  if(spec.type==="third")return"Mejor 3º ("+spec.groups.join("/")+")";
  if(spec.type==="matchWinner")return"Ganador M"+spec.match;
  if(spec.type==="matchLoser")return"Perdedor M"+spec.match;
  return"Pendiente";
}

// Resolver de huecos → equipos. Función PURA: dado el `standings` por grupo y el
// mapa `koResults` (match-key → equipo que avanzó), y opcionalmente `koFixtures`
// con cruces concretos (de results.json, que TIENEN PRECEDENCIA), devuelve un
// objeto { matchKey: { m, round, key, home, away } } donde home/away son nombres
// de equipo concretos donde se conocen, o `null` donde siguen pendientes.
// Tolera estado parcial: grupos sin terminar → sus huecos quedan null; terceros
// → null hasta que los 12 grupos estén completos.
function resolveBracketTeams(standings,koResults,koFixtures,groupResults){
  standings=standings||{};koResults=koResults||{};koFixtures=koFixtures||{};groupResults=groupResults||{};
  // Cache de posiciones aseguradas por grupo (1º/2º antes de cerrar el grupo).
  const clinchCache={};
  const clinchedTeamAt=(g,pos)=>{
    if(isGroupComplete(standings,g))return standings[g][pos]?standings[g][pos].team:null;
    if(!clinchCache[g])clinchCache[g]=clinchedPositions(g,standings,groupResults);
    for(const t in clinchCache[g])if(clinchCache[g][t]===pos)return t;
    return null;
  };
  // Índice plano de fixtures concretos provistos por datos (precedencia máxima),
  // por match-key estable. Aceptamos tanto {key:"r16_M89",home,away} sueltos como
  // agrupados por ronda { r16:[...] } (formato histórico de koFixtures).
  const fixByKey={};
  for(const rk in koFixtures){
    const v=koFixtures[rk];
    if(Array.isArray(v))for(const f of v){if(f&&f.key)fixByKey[f.key]=f;}
    else if(v&&v.key)fixByKey[rk]=v;
  }
  // ¿Todos los grupos (los que aparecen en algún hueco) completos? Necesario para
  // resolver los terceros (ranking entre grupos).
  const allGroups=new Set();
  for(const b of KO_BRACKET){
    for(const s of[b.home,b.away]){
      if(s.type==="winner"||s.type==="runner")allGroups.add(s.group);
      else if(s.type==="third")for(const g of s.groups)allGroups.add(g);
    }
  }
  const allComplete=[...allGroups].every(g=>isGroupComplete(standings,g));
  // Asignación de terceros a huecos (solo si los 12 grupos están completos).
  let thirdAssign=null;
  if(allComplete){
    const thirds=bestThirdsFrom(standings);
    const thirdSlots=[];
    for(const b of KO_BRACKET){
      for(const s of[b.home,b.away])if(s.type==="third")thirdSlots.push({m:b.m,groups:s.groups});
    }
    thirdAssign=assignThirdSlots(thirdSlots,thirds);
    if(!thirdAssign)console.warn("resolveBracketTeams: no hay asignación 1-a-1 de terceros con estos datos; huecos de tercero quedan pendientes");
  }
  const out={};
  // Primera pasada: resolver huecos de grupo y terceros (no dependen de otros M).
  const resolveSlot=(s,self)=>{
    if(s.type==="winner")return clinchedTeamAt(s.group,0);
    if(s.type==="runner")return clinchedTeamAt(s.group,1);
    if(s.type==="third")return thirdAssign?thirdAssign[self.m]??null:null;
    return undefined; // matchWinner/matchLoser → 2ª pasada
  };
  for(const b of KO_BRACKET){
    out[b.key]={m:b.m,round:b.round,key:b.key,home:null,away:null};
    const h=resolveSlot(b.home,b),a=resolveSlot(b.away,b);
    if(h!==undefined)out[b.key].home=h;
    if(a!==undefined)out[b.key].away=a;
    // Precedencia de datos: si koFixtures trae el cruce concreto, fija home/away
    // YA (antes de propagar ganadores/perdedores), para que matchLoser pueda
    // calcular el perdedor de un partido cuyo emparejamiento viene de datos.
    const f=fixByKey[b.key];
    if(f){if(f.home!=null)out[b.key].home=f.home;if(f.away!=null)out[b.key].away=f.away;}
  }
  // Segunda pasada (iterativa): resolver matchWinner/matchLoser desde koResults,
  // que pueden encadenarse a través de rondas. Iteramos hasta punto fijo.
  const byM={};for(const b of KO_BRACKET)byM[b.m]=b;
  const advancer=m=>{const b=byM[m];return b?koResults[b.key]??null:null;};
  const loserOf=m=>{
    const b=byM[m];if(!b)return null;
    const adv=koResults[b.key];if(!adv)return null;
    const o=out[b.key];if(!o||o.home==null||o.away==null)return null;
    return adv===o.home?o.away:adv===o.away?o.home:null;
  };
  const slotTeam=s=>{
    if(s.type==="matchWinner")return advancer(s.match);
    if(s.type==="matchLoser")return loserOf(s.match);
    return undefined;
  };
  let changed=true;
  while(changed){
    changed=false;
    for(const b of KO_BRACKET){
      const f=fixByKey[b.key];
      for(const side of["home","away"]){
        if(f&&f[side]!=null)continue; // un cruce concreto de datos tiene precedencia
        const s=b[side];
        const t=slotTeam(s);
        if(t!==undefined&&t!=null&&out[b.key][side]!==t){out[b.key][side]=t;changed=true;}
      }
    }
  }
  return out;
}

// ─── SCORING ──────────────────────────────────────────────────────────────────
function gPts(preds,results){let p=0;for(const k in results)if(preds[k]&&preds[k]===results[k])p++;return p;}
function podiumBonus(pod,fin){if(!pod||!fin)return 0;let p=0;if(pod[0]===fin[0])p+=5;if(pod[1]===fin[1])p+=3;if(pod[2]===fin[2])p+=2;return p;}
// Puntos del cuadro de eliminatorias. REGLA: por cada ronda KO se suman `base`
// puntos por cada equipo que el jugador acertó como "avanza" (el equipo que
// pronosticó realmente avanzó, según koResults). koResults es un mapa
// match-key → equipo que avanzó (mismas claves que bracket_predictions). Se
// suma a través de las rondas usando el prefijo de ronda de cada clave
// ("{RONDA}_..."). Devuelve 0 cuando no hay resultados KO (fase de grupos →
// inerte, igual que podiumBonus es 0 hasta la final). Tolera entradas vacías.
function bracketPts(bracketPreds,koResults){
  if(!bracketPreds||!koResults)return 0;
  // base por ronda, indexada por la `key` de KO_ROUNDS.
  const baseByRound={};for(const r of KO_ROUNDS)baseByRound[r.key]=r.base;
  let pts=0;
  for(const k in koResults){
    const round=k.split("_")[0]; // "{RONDA}_{LOCAL}_{VISITANTE}" → ronda
    const base=baseByRound[round];
    if(!base)continue; // clave de ronda desconocida → se ignora
    if(bracketPreds[k]&&bracketPreds[k]===koResults[k])pts+=base;
  }
  return pts;
}

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
    // Eliminatorias (KO): los cruces y resultados llegarán en results.json bajo
    // las claves `ko`/`bracket` y `koResults` cuando arranque la fase final. Aún
    // NO existen → por defecto vacíos (la UI del cuadro muestra estado bloqueado).
    const koFixtures=resJson.ko||resJson.bracket||{};
    const koResults=resJson.koResults||{};
    const koScores=resJson.koScores||{};
    const changelog=Array.isArray(clJson)?clJson:[];
    let rankChange=null,newRank=null;
    if(S.user){
      const sorted=players.map(p=>({name:p.nombre,pts:gPts(p.group_predictions||{},groupResults)})).sort((a,b)=>b.pts-a.pts);
      newRank=sorted.findIndex(p=>p.name===S.user)+1||null;
      if(newRank&&S.lastRank&&newRank!==S.lastRank)rankChange=S.lastRank-newRank;
    }
    // Si acaba de arrancar la fase KO (hay cruces concretos) y el usuario estaba
    // en "grupos", le redirigimos al cuadro automáticamente.
    const newTab=(Object.keys(koFixtures).length>0&&S.tab==="grupos")?"bracket":S.tab;
    ss({players,groupResults,groupScores,groupStandings,koFixtures,koResults,koScores,changelog,loading:false,refreshing:false,rankChange,lastRank:newRank||S.lastRank||null,tab:newTab});
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

// Guarda el pronóstico del cuadro de eliminatorias (mapa match-key → equipo que
// el jugador cree que avanza). Es un UPDATE de la propia fila; la petición lleva
// el JWT del usuario (getHDR) y RLS la limita al dueño (auth.uid() = user_id).
async function saveBracket(preds){
  ss({savingBracket:true});
  await sbPatch("porra_jugadores","user_id=eq."+S.userId,{bracket_predictions:preds,updated_at:new Date().toISOString()});
  await loadData();
  ss({savingBracket:false,pendingBracket:{}});
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

// ─── FASE KO ──────────────────────────────────────────────────────────────────
// Devuelve true cuando hay datos de la fase eliminatoria (al menos un cruce
// concreto con equipos conocidos en S.koFixtures). Durante la fase de grupos
// koFixtures está vacío → devuelve false.
function isKOPhase(){
  return Object.keys(S.koFixtures||{}).length>0;
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
  // Pestañas adaptativas según la fase del torneo.
  // - Fase de grupos: orden normal, "Grupos" pestaña principal.
  // - Fase KO: "Cuadro" se mueve antes de "Grupos"; "Grupos" pasa a histórico.
  const ko=isKOPhase();
  const tabsBase=[
    ["hoy","📅 Hoy",false],
    ["bracket","🏆 Cuadro",false],
    ["grupos",ko?"📁 Grupos (hist.)":"⚽ Grupos",ko],
    ["podium","🏆 Pódium",false],
    ["marcador","📊 Ranking",false],
    ["admin","🔧 Admin",false]
  ];
  // En fase de grupos, "Cuadro" va detrás de "Grupos" (orden original).
  const tabs=ko?tabsBase:[
    ["hoy","📅 Hoy",false],
    ["grupos","⚽ Grupos",false],
    ["bracket","🏆 Cuadro",false],
    ["podium","🏆 Pódium",false],
    ["marcador","📊 Ranking",false],
    ["admin","🔧 Admin",false]
  ];
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
      ${tabs.map(([id,label,hist])=>`<button onclick="setTab('${id}')" class="tab${S.tab===id?' tab--active':''}${hist?' tab--hist':''}">${label}</button>`).join("")}
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
function todayGroupKeysCEST(){
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
// tienen resultado oficial. Cuenta aciertos y puntos ganados hoy (1 punto en grupos y la base de ronda en eliminatorias) y muestra el cambio de puesto en la clasificación (reusa
// S.rankChange, que loadData calcula respecto a la carga anterior).
// `keys` son las claves de los partidos de hoy (de todayKeysCEST).
function todayKOKeysCEST(){
  const n=new Date(Date.now()+2*3600*1000);
  const today=n.getUTCFullYear()+"-"+
    String(n.getUTCMonth()+1).padStart(2,"0")+"-"+
    String(n.getUTCDate()).padStart(2,"0");
  return KO_BRACKET.filter(b=>{
    const sch=KO_SCHEDULE[b.m];
    if(!sch)return false;
    const c=new Date(new Date(sch.utc).getTime()+2*3600*1000);
    const d=c.getUTCFullYear()+"-"+String(c.getUTCMonth()+1).padStart(2,"0")+"-"+String(c.getUTCDate()).padStart(2,"0");
    return d===today;
  }).map(b=>b.key).sort((a,b)=>kickoffMs(a)-kickoffMs(b));
}
function todayKeysCEST(){
  return [...todayGroupKeysCEST(),...todayKOKeysCEST()].sort((a,b)=>kickoffMs(a)-kickoffMs(b));
}
function todayKeyType(k){return koMatchNum(k)!=null?"ko":"group";}
function todayRoundBase(k){
  const b=KO_BRACKET.find(x=>x.key===k);
  const r=b&&KO_ROUNDS.find(x=>x.key===b.round);
  return r?r.base:1;
}
function todayPred(preds,k){return todayKeyType(k)==="ko"?preds.bracket[k]:preds.group[k];}
function todayResult(k){return todayKeyType(k)==="ko"?S.koResults[k]:S.groupResults[k];}
// Marcador del partido KO (p.ej. "0-1"), si ya existe en S.koScores.
function koScore(k){return(S.koScores||{})[k]||null;}
function todayLabel(k){
  const b=KO_BRACKET.find(x=>x.key===k);
  const r=b&&KO_ROUNDS.find(x=>x.key===b.round);
  return b&&r?`${r.label} · M${b.m}`:`Grupo ${k[0]}`;
}
function renderTuJornada(keys){
  const me=S.players.find(p=>p.nombre===S.user);
  const preds={group:(me&&me.group_predictions)||{},bracket:{...(me&&me.bracket_predictions)||{},...S.pendingBracket}};
  // ¿Tengo hechas mis apuestas de hoy? (sobre todos los partidos del día)
  const total=keys.length;
  const hechos=keys.filter(k=>todayPred(preds,k)).length;
  const faltanAbiertos=keys.filter(k=>!todayPred(preds,k)&&!isLocked(k)).length;
  let estado;
  if(hechos===total)
    estado=`<p class="tujornada-status tujornada-status--ok">✅ Tienes todas tus apuestas de hoy hechas</p>`;
  else if(faltanAbiertos)
    estado=`<p class="tujornada-status tujornada-status--warn">⚠️ Te faltan ${faltanAbiertos} por pronosticar · ¡aún estás a tiempo!</p>`;
  else
    estado=`<p class="tujornada-status">Te quedaron ${total-hechos} sin pronosticar</p>`;
  // Aciertos/puntos: solo sobre partidos de hoy con resultado oficial. En KO,
  // cada acierto suma la base de su ronda (2/4/8/16/24/32), no 1 punto.
  const playedKeys=keys.filter(k=>todayResult(k));
  let statsHtml;
  if(playedKeys.length){
    let aciertos=0,pts=0;
    for(const k of playedKeys){
      if(todayPred(preds,k)===todayResult(k)){aciertos++;pts+=todayRoundBase(k);}
    }
    statsHtml=`<div class="tujornada-stats">
      <div class="tujornada-stat"><p class="tujornada-num">${aciertos}/${playedKeys.length}</p><p class="tujornada-lbl">Aciertos hoy</p></div>
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
  const me=S.players.find(p=>p.nombre===S.user);
  const bracketPicks={...(me&&me.bracket_predictions)||{},...S.pendingBracket};
  const resolved=resolveBracketTeams(S.groupStandings||{},S.koResults||{},S.koFixtures||{},S.groupResults||{});
  const rows=keys.map(key=>{
    if(todayKeyType(key)==="ko"){
      const b=KO_BRACKET.find(x=>x.key===key);
      const o=resolved[key]||{};
      const home=o.home||slotLabel(b.home,o.home);
      const away=o.away||slotLabel(b.away,o.away);
      const res=S.koResults[key];
      const pick=bracketPicks[key];
      const badge=res
        ?`<span class="bracket-badge badge ${pick&&pick===res?'badge--correct':pick?'badge--wrong':'badge--neutral'}">${pick&&pick===res?'+'+todayRoundBase(key)+'✓':pick?'✗':'—'}</span>`
        :isLocked(key)?'<span class="bracket-badge badge badge--locked">🔒</span>':'';
      const center=res
        ?`<span class="today-score">${koScore(key)?esc(koScore(key))+' · ':''}Pasa ${fl(res)} ${esc(res)}</span>`
        :`<span class="today-vs">vs</span>`;
      return`<div class="today-match">
        ${badge}
        <div class="match-meta"><span class="today-group">${esc(todayLabel(key))}</span> · ${fmtKO(b.m)} · ${fl(venueCountry(KO_SCHEDULE[b.m].venue))} ${esc(KO_SCHEDULE[b.m].venue)}</div>
        <div class="today-row">
          <span class="team">${o.home?fl(o.home):""} ${esc(home)}</span>
          ${center}
          <span class="team team--away">${o.away?fl(o.away):""} ${esc(away)}</span>
        </div>
      </div>`;
    }
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
  // El pódium queda bloqueado 1h antes del primer partido KO (isPodiumLocked).
  // Una vez bloqueado solo se muestra el pronóstico guardado (o aviso si no se
  // guardó ninguno). El bloqueo es IRREVERSIBLE: no hay forma de editarlo de nuevo.
  if(isPodiumLocked()){
    const lockMsg=`<p class="podium-locked-msg">🔒 El pódium está bloqueado — ya no puede modificarse una vez empezada la fase eliminatoria.</p>`;
    const podContent=saved
      ?`<div class="podium-preview">${saved.map((t,i)=>`<div class="podium-preview-item"><p class="podium-preview-medal">${["🥇","🥈","🥉"][i]}</p><p class="podium-preview-team">${fl(t)} ${esc(t)}</p></div>`).join("")}</div>${lockMsg}`
      :`<p class="podium-empty">⚠️ No guardaste tu pronóstico de pódium antes de que empezaran las eliminatorias.</p>${lockMsg}`;
    const others=S.players.filter(p=>p.nombre!==S.user).map(p=>`
      <div class="player-row">
        <div class="avatar">${esc((p.nombre[0]||"?").toUpperCase())}</div>
        <div class="grow"><p class="player-name">${esc(p.nombre)}</p>
          ${p.podium?`<p class="player-podium">🥇${esc(p.podium[0])} · 🥈${esc(p.podium[1])} · 🥉${esc(p.podium[2])}</p>`:`<p class="player-empty">Sin pronóstico</p>`}
        </div></div>`).join("");
    return`
    ${card(`<h2 class="podium-title">Mi Pronóstico de Pódium</h2>
      <p class="podium-sub">Bonus final: 🥇+5pts · 🥈+3pts · 🥉+2pts</p>
      ${podContent}`)}
    ${card(`<h3 class="card-title">Pódiums del grupo (${S.players.length})</h3>
      <div class="list">${others||'<p class="list-empty">Aún no hay otros participantes</p>'}</div>`)}`;
  }
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
    bpts:bracketPts(p.bracket_predictions||{},S.koResults||{}),
    get total(){return this.gpts+this.ppts+this.bpts;}
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
        <p class="rank-detail">Grupos: ${s.gpts}pts · Pódium: ${s.ppts}pts · Bracket: ${s.bpts}pts</p>
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

// ─── CUADRO / ELIMINATORIAS — vista mapa (árbol visual) ──────────────────────
// La estructura del árbol sigue la progresión oficial:
//   Mitad izquierda: R32 M73-M80 → R16 M89-M92 → QF M97,M99 → SF M101
//   Mitad derecha:   R32 M81-M88 → R16 M93-M96 → QF M98,M100 → SF M102
//   Centro: Final M104, 3er puesto M103 debajo
// La vista es solo lectura (sin predicciones ni badges de gamificación).
function renderBracketMap(){
  const koResults=S.koResults||{};
  const resolved=resolveBracketTeams(S.groupStandings||{},koResults,S.koFixtures||{},S.groupResults||{});
  const byM={};for(const b of KO_BRACKET)byM[b.m]=b;

  // Renderiza una celda de partido para la vista mapa (solo lectura).
  function mapMatch(m){
    const b=byM[m];
    if(!b)return'<div class="bmap-match bmap-match--empty"></div>';
    const o=resolved[b.key]||{home:null,away:null};
    const score=S.koScores&&S.koScores[b.key];
    const sch=KO_SCHEDULE[m];
    const dateStr=sch?fmtKO(m):"";
    const homeLabel=o.home!=null?`${fl(o.home)} ${esc(o.home)}`:'<span class="bmap-unknown">?</span>';
    const awayLabel=o.away!=null?`${fl(o.away)} ${esc(o.away)}`:'<span class="bmap-unknown">?</span>';
    const scoreStr=score?`<div class="bmap-score">${esc(score)}</div>`:'';
    return`<div class="bmap-match">
      <div class="bmap-match-id">M${m}</div>
      ${dateStr?`<div class="bmap-date">${esc(dateStr)}</div>`:''}
      <div class="bmap-team bmap-team--home">${homeLabel}</div>
      ${scoreStr}
      <div class="bmap-team bmap-team--away">${awayLabel}</div>
    </div>`;
  }

  // Columnas de la mitad izquierda (orden de arriba a abajo por ronda)
  const leftR32 =[73,74,75,76,77,78,79,80];
  const leftR16 =[89,90,91,92];
  const leftQF  =[97,99];
  const leftSF  =[101];

  // Columnas de la mitad derecha (orden de arriba a abajo por ronda)
  const rightSF =[102];
  const rightQF =[98,100];
  const rightR16=[93,94,95,96];
  const rightR32=[81,82,83,84,85,86,87,88];

  function col(matches,label,extraClass=''){
    const cells=matches.map(m=>mapMatch(m)).join('');
    return`<div class="bmap-col${extraClass?(' '+extraClass):''}">
      <div class="bmap-col-label">${esc(label)}</div>
      <div class="bmap-col-matches">${cells}</div>
    </div>`;
  }

  const finalMatch=mapMatch(104);
  const thirdMatch=mapMatch(103);

  return`<div class="bmap-scroll">
    <div class="bmap-tree">
      ${col(leftR32,'Dieciseisavos','bmap-col--r32')}
      ${col(leftR16,'Octavos','bmap-col--r16')}
      ${col(leftQF,'Cuartos','bmap-col--qf')}
      ${col(leftSF,'Semifinales','bmap-col--sf')}
      <div class="bmap-col bmap-col--center">
        <div class="bmap-col-label">Final</div>
        <div class="bmap-col-matches">
          ${finalMatch}
          <div class="bmap-third-label">3er/4º puesto</div>
          ${thirdMatch}
        </div>
      </div>
      ${col(rightSF,'Semifinales','bmap-col--sf')}
      ${col(rightQF,'Cuartos','bmap-col--qf')}
      ${col(rightR16,'Octavos','bmap-col--r16')}
      ${col(rightR32,'Dieciseisavos','bmap-col--r32')}
    </div>
  </div>`;
}

// ─── CUADRO / ELIMINATORIAS (knockout bracket) ─────────────────────────────────
// La PLANTILLA de cruces es fija y pública (KO_BRACKET, M73..M104). Los equipos de
// cada hueco se resuelven con resolveBracketTeams() contra S.groupStandings (1º/2º
// de cada grupo cerrado + los 8 mejores terceros cuando los 12 grupos terminan) y
// S.koResults (ganador/perdedor de partidos previos para octavos en adelante). Si
// S.koFixtures trae cruces concretos (de results.json), tienen precedencia.
//
// Desbloqueo progresivo POR HUECO: un partido es editable solo cuando AMBOS equipos
// están resueltos; si alguno está pendiente (grupo sin terminar, o terceros aún sin
// determinar), se muestra "pendiente". isLocked(key) bloquea cerca del saque (CEST)
// y, si hay resultado (S.koResults), se marca el acierto/fallo y el equipo que avanzó.
function renderBracket(){
  // Toggle de vista lista/mapa — aparece siempre (incluso en estado vacío).
  const view=S.bracketView||"lista";
  const toggleHtml=`<div class="bracket-view-toggle">
    <button onclick="setBracketView('lista')" class="bracket-view-btn${view==='lista'?' bracket-view-btn--active':''}">📋 Lista</button>
    <button onclick="setBracketView('mapa')" class="bracket-view-btn${view==='mapa'?' bracket-view-btn--active':''}">🗺️ Mapa</button>
  </div>`;

  // Si la vista activa es mapa, delegar completamente.
  if(view==="mapa"){
    return`
    ${card(`<div class="section-head"><h2 class="title">Cuadro de eliminatorias</h2></div>
      ${toggleHtml}`)}
    ${card(renderBracketMap())}`;
  }

  const me=S.players.find(p=>p.nombre===S.user);
  const saved=(me&&me.bracket_predictions)||{};
  const picks={...saved,...S.pendingBracket};
  const koResults=S.koResults||{};
  const resolved=resolveBracketTeams(S.groupStandings||{},koResults,S.koFixtures||{},S.groupResults||{});
  // ¿Hay algún hueco ya resuelto (un solo equipo basta)? Así, en cuanto un grupo
  // cierra (o una posición queda asegurada), se pinta el cuadro con ese equipo en
  // su sitio y el rival como "pendiente" — sin esperar a que un cruce tenga AMBOS.
  const anyResolved=KO_BRACKET.some(b=>{const o=resolved[b.key];return o&&(o.home!=null||o.away!=null);});

  if(!anyResolved){
    // Estado vacío: la fase de grupos sigue en marcha y aún no se conoce ningún
    // cruce. Mostramos la plantilla de rondas con sus bases como información.
    const roundsInfo=KO_ROUNDS.map(r=>`<div class="bracket-round-info">
      <span class="bracket-round-name">${esc(r.label)}</span>
      <span class="bracket-round-base">Base ${r.base}pts</span>
    </div>`).join("");
    return`
    ${card(`<div class="section-head"><h2 class="title">Cuadro de eliminatorias</h2></div>
      ${toggleHtml}
      <p class="bracket-locked">🔒 El cuadro se desbloqueará cuando termine la fase de grupos. Cada cruce se irá rellenando a medida que se conozcan los clasificados.</p>`)}
    ${card(`<h3 class="card-title">📋 Puntuación por ronda</h3>
      <div class="bracket-rounds">${roundsInfo}</div>`)}`;
  }

  // Hay cruces: pintamos cada ronda con sus partidos de KO_BRACKET.
  const sections=KO_ROUNDS.map(r=>{
    const list=KO_BRACKET.filter(b=>b.round===r.key);
    const matches=list.map(b=>{
      const key=b.key;
      const o=resolved[key]||{home:null,away:null};
      const pending=o.home==null||o.away==null; // algún hueco sin resolver
      const res=koResults[key]; // equipo que avanzó (si ya hay resultado)
      const hasR=!!res;
      const pick=picks[key];
      const locked=isLocked(key);
      const blocked=pending||hasR||locked;
      const badge=hasR
        ?`<span class="bracket-badge badge ${pick&&pick===res?'badge--correct':pick?'badge--wrong':'badge--neutral'}">${pick&&pick===res?'+'+r.base+'✓':pick?'✗':'—'}</span>`
        :pending?'<span class="bracket-badge badge badge--neutral">⏳</span>'
        :locked?'<span class="bracket-badge badge badge--locked">🔒</span>':'';
      // Línea de fecha/hora (CEST) y sede — conocida por nº de partido aunque el
      // rival siga pendiente (viene de KO_SCHEDULE).
      const sch=KO_SCHEDULE[b.m];
      const labHome=esc(slotLabel(b.home,o.home));
      const labAway=esc(slotLabel(b.away,o.away));
      // Chip con el ID del propio partido (M73..M104) — permite cruzar las
      // referencias "Ganador M74" que aparecen en las rondas siguientes.
      const mid=`<span class="bracket-mid">M${b.m}</span>`;
      const score=S.koScores&&S.koScores[key];
      const venue=sch?` ${fmtKO(b.m)} · ${fl(venueCountry(sch.venue))} ${esc(sch.venue)}${score?' · 🔢 '+esc(score):''}`:"";
      const meta=`<div class="match-meta bracket-meta">${mid}${venue}</div>`;
      // El "vs" va ENTRE las dos cards de equipo, nunca dentro de ellas.
      const sep=`<span class="bracket-vs-sep">vs</span>`;
      if(pending){
        // Cruce aún no jugable (falta un rival). Cada lado: si el equipo YA está
        // resuelto, se pinta con su bandera como card fija (no clicable); si sigue
        // pendiente, placeholder gris. Fecha/hora/sede se muestran igualmente.
        const cell=(spec,team,lab)=>team!=null
          ?`<span class="bracket-pick bracket-pick--fixed">${fl(team)} ${lab}</span>`
          :`<span class="bracket-pick bracket-pick--ph">${lab}</span>`;
        return`<div class="bracket-match bracket-match--pending">
          ${badge}
          ${meta}
          <div class="bracket-options">
            ${cell(b.home,o.home,labHome)}
            ${sep}
            ${cell(b.away,o.away,labAway)}
          </div>
        </div>`;
      }
      // Cada equipo es una card-button; el "vs" queda fuera, entre ambas.
      const teamBtn=t=>{
        const sel=pick===t;
        const isAdv=hasR&&res===t;
        let pc="bracket-pick";
        if(sel)pc+=hasR?(res===t?" bracket-pick--correct":" bracket-pick--wrong"):" bracket-pick--sel";
        if(hasR&&isAdv&&pick!==t)pc+=" bracket-pick--result";
        if(locked&&!hasR)pc+=" bracket-pick--locked";
        if(blocked)pc+=" bracket-pick--blocked";
        return`<button onclick="${blocked?'':('setBracketPick(\''+esc(key)+'\',\''+esc(t)+'\')')}" class="${pc}">${fl(t)} ${esc(t)}</button>`;
      };
      return`<div class="bracket-match">
        ${badge}
        ${meta}
        <div class="bracket-options">${teamBtn(o.home)}${sep}${teamBtn(o.away)}</div>
      </div>`;
    }).join("");
    return`${card(`<div class="section-head"><h3 class="title">${esc(r.label)}</h3><span class="bracket-round-base">Base ${r.base}pts</span></div>
      <div class="bracket-list">${matches}</div>`)}`;
  }).join("");

  // Botón de guardar: solo si hay cambios pendientes sin guardar.
  const hasPending=Object.keys(S.pendingBracket||{}).length>0;
  const saveBtn=hasPending
    ?`<button onclick="doSaveBracket()" class="btn-bracket${S.savingBracket?' btn-bracket--busy':''}">${S.savingBracket?'Guardando...':'💾 GUARDAR CUADRO'}</button>`
    :`<p class="bracket-saved">✓ Cuadro guardado</p>`;

  return`
  ${card(`<div class="section-head"><h2 class="title">Cuadro de eliminatorias</h2></div>
    ${toggleHtml}
    <p class="hint">Elige el equipo que avanza en cada cruce · 🔒=bloqueado 1h antes</p>`)}
  ${sections}
  ${card(saveBtn)}`;
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
  const removeMsg=S.adminRemoveMsg
    ?`<p class="admin-msg admin-msg--${S.adminRemoveOk?'ok':'err'}">${S.adminRemoveMsg}</p>`
    :"";
  const options=(S.players||[]).map(p=>`<option value="${esc(p.user_id)}">${esc(p.nombre)}</option>`).join("");
  return card(`<h2 class="title">Zona Admin</h2>
    <p class="hint admin-hint">Tareas administrativas.</p>
    <button onclick="doTriggerUpdate()" class="admin-btn${S.adminTriggering?' admin-btn--busy':''}">${S.adminTriggering?'⏳ Actualizando...':'🔄 Forzar actualización de resultados'}</button>
    <button onclick="doCreateInvite()" class="admin-btn${S.adminInviteBusy?' admin-btn--busy':''}">${S.adminInviteBusy?'⏳ Generando...':'🔗 Generar invitación (30 min)'}</button>
    ${invite}
    ${msg}
    <div class="admin-section">
      <label class="admin-label">Dar de baja a un jugador</label>
      <select id="adminRemoveSelect" class="select">${options}</select>
      <button onclick="doRemovePlayer()" class="admin-btn${S.adminRemoveBusy?' admin-btn--busy':''}">${S.adminRemoveBusy?'⏳ Dando de baja...':'🗑️ Dar de baja'}</button>
      ${removeMsg}
    </div>`);
}

// ─── RENDER ───────────────────────────────────────────────────────────────────
function render(){
  const app=document.getElementById("app");
  if(!app)return;
  if(S.loading){app.innerHTML=`<div class="loading"><div class="loading-inner"><div class="loading-logo">⚽</div><p class="loading-text">Conectando...</p></div></div>`;return;}
  if(!S.user){app.innerHTML=S.accessDenied?renderAccessDenied():renderLogin();return;}
  const content={hoy:renderToday,grupos:renderGrupos,bracket:renderBracket,podium:renderPodium,marcador:renderRanking,admin:renderAdmin}[S.tab]?.();
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
// Cuadro de eliminatorias: selecciona el equipo que avanza en un cruce y guarda.
window.setBracketPick=(key,team)=>ss({pendingBracket:{...S.pendingBracket,[key]:team}});
// Alterna entre la vista lista y la vista mapa del cuadro.
window.setBracketView=v=>ss({bracketView:v});
window.doSaveBracket=()=>{
  if(S.savingBracket||!Object.keys(S.pendingBracket||{}).length)return;
  const me=S.players.find(p=>p.nombre===S.user);
  const merged={...((me&&me.bracket_predictions)||{}),...S.pendingBracket};
  saveBracket(merged);
};
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

async function removePlayer(secret,userId){
  ss({adminRemoveBusy:true,adminRemoveMsg:null});
  try{
    const r=await fetch("/api/remove-player",{method:"POST",headers:{"X-Admin-Secret":secret,"Content-Type":"application/json"},body:JSON.stringify({user_id:userId})});
    if(r.ok){
      const d=await r.json().catch(()=>({}));
      ss({adminRemoveBusy:false,adminRemoveOk:true,adminRemoveMsg:"✅ "+esc(d.nombre||"Jugador")+" dado de baja."});
      loadData();
    }else{
      const e=await r.json().catch(()=>({}));
      ss({adminRemoveBusy:false,adminRemoveOk:false,adminRemoveMsg:"❌ "+(e.error||("Error "+r.status))});
    }
  }catch(e){
    ss({adminRemoveBusy:false,adminRemoveOk:false,adminRemoveMsg:"❌ Error de red"});
  }
}
window.doRemovePlayer=()=>{
  if(S.adminRemoveBusy)return;
  if(!S.adminUnlocked||!S.adminKey)return;
  const userId=document.getElementById("adminRemoveSelect")?.value||"";
  if(!userId)return;
  const p=(S.players||[]).find(x=>x.user_id===userId);
  const nombre=(p&&p.nombre)||"este jugador";
  if(!window.confirm("¿Seguro que quieres dar de baja a "+nombre+"? Se borrarán sus pronósticos."))return;
  removePlayer(S.adminKey,userId);
};

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
