/* =====================================================================
   MUNDIAL 26 — Data (productos, equipos, especiales, álbum, tier prices)
   ===================================================================== */

const pad = (n) => String(n).padStart(2, "0");

export const PRODUCTS = [
  { id:"CAJA-100", name:"Caja 100 sobres", price:2500, category:"sobres", description:"Caja sellada Panini oficial. 100 sobres × 7 estampas.", emoji:"📦", image:"./images/productos/caja-100-sobres.webp?v=2", gradient:["#CE1126","#8B0B1C"], badge:"MEJOR VOLUMEN" },
  { id:"SOBRE-1", name:"Sobre individual", price:25, category:"sobres", description:"Un sobre oficial con 7 estampas aleatorias.", emoji:"✉️", image:"./images/productos/sobre.webp?v=2", gradient:["#006341","#004a30"], badge:"MÁS VENDIDO" },
  { id:"ALBUM-HARD", name:"Álbum pasta dura", price:349, category:"albumes", description:"Edición coleccionista México 2026, tapa dura premium.", emoji:"📗", image:"./images/productos/album-hardcover.webp?v=2", gradient:["#006341","#FFD100"], badge:"COLECCIONISTA" },
  { id:"ALBUM-SOFT", name:"Álbum pasta blanda", price:99, category:"albumes", description:"Edición estándar softcover, mismas páginas.", emoji:"📘", image:"./images/productos/album-softcover.webp?v=2", gradient:["#006341","#00815a"] },
  { id:"SET-COCA", name:"Set Coca-Cola completo (14 cartas)", price:490, category:"coca", description:"Cartas exclusivas que no vienen en sobres regulares.", emoji:"🥤", image:"./images/productos/set-coca.webp?v=2", gradient:["#CE1126","#FFD100"], badge:"EDICIÓN ESPECIAL" },
  { id:"SOBRE-COCA", name:"Sobre Coca-Cola", price:40, category:"coca", description:"Sobre exclusivo con estampas edición limitada.", emoji:"🎟️", image:"./images/productos/sobre-coca.webp?v=2", gradient:["#CE1126","#006341"], badge:"LIMITED" },
  { id:"CARTA-COCA", name:"Carta Coca-Cola", price:40, category:"coca", description:"Carta holográfica Coca-Cola individual.", emoji:"✨", gradient:["#FFD100","#CE1126"], badge:"HOLOGRÁFICA" },
  { id:"CARTA-SUELTA", name:"Carta suelta Panini", price:5, category:"cartas", description:"Carta individual para completar tu álbum.", emoji:"🃏", gradient:["#006341","#FFD100"], badge:"COMPLETA ÁLBUM" },
  { id:"COLECCION", name:"Colección completa", price:6000, category:"packs", description:"Álbum pasta dura + 140 sobres. Envío express.", emoji:"🏆", image:"./images/productos/combo.webp?v=2", gradient:["#FFD100","#006341"], badge:"RECOMENDADO" },
  { id:"JERSEY-MX-LOCAL", name:"Jersey México Local 26", price:2199, category:"jerseys", description:"Jersey oficial selección mexicana local Mundial 2026.", emoji:"🇲🇽", gradient:["#006341","#CE1126"], badge:"OFICIAL" },
  { id:"JERSEY-MX-VISITA", name:"Jersey México Visita 26", price:2199, category:"jerseys", description:"Jersey oficial selección mexicana visita Mundial 2026.", emoji:"⚽", gradient:["#FAF6EE","#006341"], badge:"OFICIAL" },
  { id:"JERSEY-ARG", name:"Jersey Argentina 26", price:2299, category:"jerseys", description:"Jersey oficial Argentina Mundial 2026.", emoji:"🇦🇷", gradient:["#6FA8DC","#FFFFFF"] },
  { id:"JERSEY-BRA", name:"Jersey Brasil 26", price:2299, category:"jerseys", description:"Jersey amarillo Brasil Mundial 2026.", emoji:"🇧🇷", gradient:["#FFD100","#006341"] },
  { id:"BALON-OFICIAL", name:"Balón oficial Mundial 26", price:3499, category:"balones", description:"Adidas tamaño 5 FIFA Quality Pro.", emoji:"⚽", gradient:["#CE1126","#FFD100"], badge:"FIFA QUALITY" },
  { id:"BALON-REPLICA", name:"Balón réplica Mundial 26", price:899, category:"balones", description:"Réplica oficial.", emoji:"🥎", gradient:["#006341","#FFD100"] },
  { id:"COPA-REPLICA-MINI", name:"Copa FIFA réplica mini", price:499, category:"trofeos", description:"Altura 15 cm.", emoji:"🏆", gradient:["#FFD100","#C19800"], badge:"COLECCIONABLE" },
  { id:"COPA-REPLICA-FULL", name:"Copa FIFA réplica 1:1", price:3999, category:"trofeos", description:"36.8 cm. Edición coleccionista.", emoji:"🏆", gradient:["#FFD100","#B27D00"], badge:"EDICIÓN LIMITADA" },
  { id:"GORRA-MX", name:"Gorra México Oficial", price:599, category:"accesorios", description:"Gorra bordada oficial selección mexicana.", emoji:"🧢", gradient:["#006341","#CE1126"] },
  { id:"BUFANDA-MX", name:"Bufanda México", price:399, category:"accesorios", description:"Bufanda tejida tricolor edición Mundial 2026.", emoji:"🧣", gradient:["#CE1126","#006341"] },
  { id:"LLAVERO-PACK", name:"Pack 5 llaveros selecciones", price:249, category:"accesorios", description:"5 llaveros selecciones varias.", emoji:"🗝️", gradient:["#FFD100","#006341"] },
  { id:"POSTER-MASCOTAS", name:"Poster oficial mascotas 26", price:149, category:"accesorios", description:"A2 de las mascotas Maple, Zayu y Clutch.", emoji:"🖼️", gradient:["#FFD100","#CE1126"] },
];

export const CATEGORIES = [
  {id:"all",label:"Todos"},
  {id:"packs",label:"Packs"},
  {id:"sobres",label:"Sobres"},
  {id:"albumes",label:"Álbumes"},
  {id:"coca",label:"Coca-Cola"},
  {id:"jerseys",label:"Jerseys"},
  {id:"balones",label:"Balones"},
  {id:"trofeos",label:"Trofeos"},
  {id:"accesorios",label:"Accesorios"},
];

// Las 48 selecciones del Mundial 2026 según el sorteo oficial del 5-dic-2025
// (en.wikipedia.org/wiki/2026_FIFA_World_Cup, sección Groups). Chile, Italia
// y Costa Rica del set anterior NO calificaron y se removieron — los códigos
// CHI/ITA/CRC ya no resuelven.
//
// El campo `group` es el grupo del Mundial (A–L); se usa como subtitle de la
// sección en el álbum.
export const TEAMS = [
  // Group A — Mexico host
  {code:"MEX",name:"México",flag:"🇲🇽",group:"Grupo A"},
  {code:"RSA",name:"Sudáfrica",flag:"🇿🇦",group:"Grupo A"},
  {code:"KOR",name:"Corea del Sur",flag:"🇰🇷",group:"Grupo A"},
  {code:"CZE",name:"República Checa",flag:"🇨🇿",group:"Grupo A"},
  // Group B — Canada host
  {code:"CAN",name:"Canadá",flag:"🇨🇦",group:"Grupo B"},
  {code:"BIH",name:"Bosnia y Herzegovina",flag:"🇧🇦",group:"Grupo B"},
  {code:"QAT",name:"Catar",flag:"🇶🇦",group:"Grupo B"},
  {code:"SUI",name:"Suiza",flag:"🇨🇭",group:"Grupo B"},
  // Group C
  {code:"BRA",name:"Brasil",flag:"🇧🇷",group:"Grupo C"},
  {code:"MAR",name:"Marruecos",flag:"🇲🇦",group:"Grupo C"},
  {code:"HAI",name:"Haití",flag:"🇭🇹",group:"Grupo C"},
  {code:"SCO",name:"Escocia",flag:"🏴󠁧󠁢󠁳󠁣󠁴󠁿",group:"Grupo C"},
  // Group D — USA host
  {code:"USA",name:"Estados Unidos",flag:"🇺🇸",group:"Grupo D"},
  {code:"PAR",name:"Paraguay",flag:"🇵🇾",group:"Grupo D"},
  {code:"AUS",name:"Australia",flag:"🇦🇺",group:"Grupo D"},
  {code:"TUR",name:"Turquía",flag:"🇹🇷",group:"Grupo D"},
  // Group E
  {code:"GER",name:"Alemania",flag:"🇩🇪",group:"Grupo E"},
  {code:"CUW",name:"Curazao",flag:"🇨🇼",group:"Grupo E"},
  {code:"CIV",name:"Costa de Marfil",flag:"🇨🇮",group:"Grupo E"},
  {code:"ECU",name:"Ecuador",flag:"🇪🇨",group:"Grupo E"},
  // Group F
  {code:"NED",name:"Países Bajos",flag:"🇳🇱",group:"Grupo F"},
  {code:"JPN",name:"Japón",flag:"🇯🇵",group:"Grupo F"},
  {code:"SWE",name:"Suecia",flag:"🇸🇪",group:"Grupo F"},
  {code:"TUN",name:"Túnez",flag:"🇹🇳",group:"Grupo F"},
  // Group G
  {code:"BEL",name:"Bélgica",flag:"🇧🇪",group:"Grupo G"},
  {code:"EGY",name:"Egipto",flag:"🇪🇬",group:"Grupo G"},
  {code:"IRN",name:"Irán",flag:"🇮🇷",group:"Grupo G"},
  {code:"NZL",name:"Nueva Zelanda",flag:"🇳🇿",group:"Grupo G"},
  // Group H
  {code:"ESP",name:"España",flag:"🇪🇸",group:"Grupo H"},
  {code:"CPV",name:"Cabo Verde",flag:"🇨🇻",group:"Grupo H"},
  {code:"KSA",name:"Arabia Saudita",flag:"🇸🇦",group:"Grupo H"},
  {code:"URU",name:"Uruguay",flag:"🇺🇾",group:"Grupo H"},
  // Group I
  {code:"FRA",name:"Francia",flag:"🇫🇷",group:"Grupo I"},
  {code:"SEN",name:"Senegal",flag:"🇸🇳",group:"Grupo I"},
  {code:"IRQ",name:"Irak",flag:"🇮🇶",group:"Grupo I"},
  {code:"NOR",name:"Noruega",flag:"🇳🇴",group:"Grupo I"},
  // Group J
  {code:"ARG",name:"Argentina",flag:"🇦🇷",group:"Grupo J"},
  {code:"ALG",name:"Argelia",flag:"🇩🇿",group:"Grupo J"},
  {code:"AUT",name:"Austria",flag:"🇦🇹",group:"Grupo J"},
  {code:"JOR",name:"Jordania",flag:"🇯🇴",group:"Grupo J"},
  // Group K
  {code:"POR",name:"Portugal",flag:"🇵🇹",group:"Grupo K"},
  {code:"COD",name:"RD Congo",flag:"🇨🇩",group:"Grupo K"},
  {code:"UZB",name:"Uzbekistán",flag:"🇺🇿",group:"Grupo K"},
  {code:"COL",name:"Colombia",flag:"🇨🇴",group:"Grupo K"},
  // Group L
  {code:"ENG",name:"Inglaterra",flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",group:"Grupo L"},
  {code:"CRO",name:"Croacia",flag:"🇭🇷",group:"Grupo L"},
  {code:"GHA",name:"Ghana",flag:"🇬🇭",group:"Grupo L"},
  {code:"PAN",name:"Panamá",flag:"🇵🇦",group:"Grupo L"},
];

// Orden FWC del álbum oficial: Specials → Balls and Countries → History →
// Coca-Cola. Las tres primeras subsecciones FWC ocupan un rango de
// números contiguo (0..19, total 20). Coca-Cola es una sección sponsor
// con su propia numeración 1..14.
//   • Specials              n=0..4    →  MAS00..MAS04
//   • Balls and Countries   n=5..8    →  BNC05..BNC08
//   • History               n=9..19   →  LEY09..LEY19
//   • Coca-Cola             n=1..14   →  COC01..COC14
// Balls (antes TRO) y Countries (antes EST) ahora viven juntos bajo el
// prefijo BNC. Los códigos viejos (TRO*, EST*, MAS05+, LEY01..LEY08) ya no
// resuelven — lo asumimos como costo de la restructura.
export const SPECIALS = [
  {id:"MAS",fullId:"MASCOTAS",         name:"FWC - Specials",           emoji:"🦅", count:5,  startN:0 },
  {id:"BNC",fullId:"BALLS_COUNTRIES",  name:"FWC - Ball & Countries",   emoji:"⚽", count:4,  startN:5 },
  {id:"LEY",fullId:"LEYENDAS",         name:"FWC - History",            emoji:"👑", count:11, startN:9 },
  {id:"COC",fullId:"COCA_COLA",        name:"CC - Coca Cola",          emoji:"🥤", count:14, startN:1 },
];

// Grupos del Mundial 2026 — sorteo oficial del 5 de diciembre de 2025.
// Fuente: https://en.wikipedia.org/wiki/2026_FIFA_World_Cup (sección Groups,
// posiciones A1..L4 según lo emitido en la transmisión Final Draw).
// Anfitriones colocados a priori: MEX A1, CAN B1, USA D1. El resto sale
// del sorteo de bombos. Las 48 selecciones quedan distribuidas entre los
// 12 grupos de 4 — sin TBD.
export const WORLD_CUP_2026_GROUPS = [
  { id:"A", teams:["MEX","RSA","KOR","CZE"] },
  { id:"B", teams:["CAN","BIH","QAT","SUI"] },
  { id:"C", teams:["BRA","MAR","HAI","SCO"] },
  { id:"D", teams:["USA","PAR","AUS","TUR"] },
  { id:"E", teams:["GER","CUW","CIV","ECU"] },
  { id:"F", teams:["NED","JPN","SWE","TUN"] },
  { id:"G", teams:["BEL","EGY","IRN","NZL"] },
  { id:"H", teams:["ESP","CPV","KSA","URU"] },
  { id:"I", teams:["FRA","SEN","IRQ","NOR"] },
  { id:"J", teams:["ARG","ALG","AUT","JOR"] },
  { id:"K", teams:["POR","COD","UZB","COL"] },
  { id:"L", teams:["ENG","CRO","GHA","PAN"] },
];

export const PRICE_BY_TIER = { comun: 5, media: 15, dificil: 30 };

export function stickerType(i) { return i===1?"logo":i===2?"team":"player"; }
export function tierFor(type, groupKind, groupPrefix){ if(groupKind==="special" && groupPrefix==="LEY") return "dificil"; if(type==="logo") return "dificil"; if(type==="team" || groupKind==="special") return "media"; return "comun"; }
export function priceForTier(tier){ return PRICE_BY_TIER[tier]; }
function stickersTeam(groupPrefix){
  const a=[];
  for(let i=1;i<=18;i++){
    const type = stickerType(i);
    const tier = tierFor(type, "team", groupPrefix);
    const code = groupPrefix + pad(i);
    a.push({ n:i, code, label: i===1?"Escudo":i===2?"Foto equipo":"Jugador "+(i-2), type, tier, price: PRICE_BY_TIER[tier] });
  }
  return a;
}

// Orden de equipos por sorteo Mundial 2026 (grupos A→L, posiciones 1→4).
// Equipos sin posición confirmada se agregan al final en el orden de TEAMS.
const _teamByCode = new Map(TEAMS.map(t => [t.code, t]));
const _placedCodes = new Set();
const _teamsInGroupOrder = [];
for (const g of WORLD_CUP_2026_GROUPS) {
  for (const code of g.teams) {
    const t = _teamByCode.get(code);
    if (t && !_placedCodes.has(code)) {
      _teamsInGroupOrder.push(t);
      _placedCodes.add(code);
    }
  }
}
for (const t of TEAMS) {
  if (!_placedCodes.has(t.code)) _teamsInGroupOrder.push(t);
}

export const ALBUM = [
  ...SPECIALS.map(s => ({
    id: s.fullId, prefix: s.id, name: s.name, subtitle: "Sección especial",
    emoji: s.emoji, kind: "special",
    stickers: Array.from({ length: s.count }, (_, i) => {
      const n = (s.startN || 0) + i;
      const tier = tierFor("special", "special", s.id);
      return { n, code: s.id + pad(n), label: "Estampa " + n, type: "special", tier, price: PRICE_BY_TIER[tier] };
    }),
  })),
  ..._teamsInGroupOrder.map(t=>({ id:"TEAM-"+t.code, prefix:t.code, name:t.name, subtitle:t.group, emoji:t.flag, kind:"team", stickers:stickersTeam(t.code) })),
];

// Total real de stickers del álbum activo — derivado del propio ALBUM, que
// es la misma fuente que renderiza la grilla de la pestaña Álbum. Si en el
// futuro hay un selector de álbum (ej. "Usa Mex Can 26" vs otro), basta con
// que ALBUM apunte al álbum activo y TOTAL/missing/% se recalculan solos
// vía albumStats() en cada render.
//
// Antes era 500 hardcoded (commit 4251d30 lo pineó mientras se reestructuraba
// la composición de secciones). Ahora la composición está estable:
//   • 4 secciones especiales:  5 + 4 + 11 + 14 = 34 stickers
//   • 48 selecciones × 18:                       864 stickers
//   • TOTAL                                      898 stickers
export const TOTAL = ALBUM.reduce((s, g) => s + g.stickers.length, 0);
export const PREFIX_MAP = ALBUM.reduce((m,g)=>{ m[g.prefix]=g.id; return m; }, {});
