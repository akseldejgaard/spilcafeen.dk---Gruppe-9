"use strict";

// === Datakilde (samme som start.js) ===
const DATA_URL = "https://raw.githubusercontent.com/cederdorff/race/refs/heads/master/data/games.json";
// const DATA_URL = "data/games.json";

// === Helpers ===
const $ = (s, r=document) => r.querySelector(s);
const getIdFromQuery = () => new URLSearchParams(location.search).get("id");

const ratingLabel = (r) => `${String(Number(r) || 0).replace(/\.0$/,"")}/5`;
const playersText = (p) => {
  if (p && typeof p === 'object' && p.min != null) {
    // If min and max are equal, show single number (e.g. "4" instead of "4–4")
    return (p.min === p.max) ? String(p.min) : `${p.min}–${p.max}`;
  }
  return (p || "");
};
function playtimeText(mins){
  if (mins == null) return "";
  const m = Number(mins);
  if (isNaN(m)) return String(mins);
  if (m >= 60) {
    const h = Math.floor(m/60);
    const rest = m % 60;
    return rest ? `${h}t ${rest}m` : `${h}t`;
  }
  return `${m}m`;
}

// === Ikoner ===
// DINE kendte PNG’er
const ICONS = {
  time:    "assets/images/ur.png",
  players: "assets/images/spillere.png",
  shelf:   "assets/images/placering.png",
};

// NU OGSÅ de to rigtige filer i stedet for sample-SVG’er
const SAMPLE = {
  age:  `<img src="assets/images/alder.png" alt="Alder">`,
  star: `<img src="assets/images/rating.png" alt="Bedømmelse">`,
};

// === “Læs mere” toggle ===
function applyReadMore(descEl, toggleBtn, fullText){
  const MAX_CHARS = 480;
  if (!fullText || fullText.length <= MAX_CHARS){
    descEl.textContent = fullText || "Ingen beskrivelse.";
    toggleBtn.hidden = true;
    return;
  }
  let expanded = false;
  const shortText = fullText.slice(0, MAX_CHARS).trim() + "…";
  const render = () => {
    descEl.textContent = expanded ? fullText : shortText;
    toggleBtn.textContent = expanded ? "Vis mindre" : "Læs mere";
  };
  toggleBtn.hidden = false;
  toggleBtn.addEventListener("click", () => { expanded = !expanded; render(); });
  render();
}

// === Facts ===
// Rækkefølge: VARIGHED → SPILLERE → ALDER → RATING → HYLDE
const liPNG = (src, lbl) =>
  `<li><img src="${src}" alt="" width="22" height="22"><div class="lbl">${lbl}</div></li>`;
const liSVG = (svg, lbl) =>
  `<li>${svg}<div class="lbl">${lbl}</div></li>`;

function renderFacts(g){
  const items = [];
  items.push(liPNG(ICONS.time,    playtimeText(g.playtime) || "—"));                 // VARIGHED
  items.push(liPNG(ICONS.players, playersText(g.players)  || "—"));                  // SPILLERE
  items.push(liSVG(SAMPLE.age,    g.age ? `${g.age}+` : "—"));                       // ALDER
  items.push(liSVG(SAMPLE.star,   g.rating != null ? ratingLabel(g.rating) : "—"));  // RATING
  items.push(liPNG(ICONS.shelf,   g.shelf ?? "—"));                                   // HYLDE
  $("#factsRow").innerHTML = items.join("");
}

// === Render hele siden ===
function renderGame(g){
  $("#gameTitle").textContent = g.title || "Spil";

  const img = $("#gameImage");
  img.src = g.image || "";
  img.alt = g.title ? `Billede af ${g.title}` : "Spilbillede";

  applyReadMore($("#gameDescription"), $("#toggleDesc"), g.description || "");

  const rulesEl = $("#gameRules");
  if (rulesEl) rulesEl.textContent = g.rules || "—";

  renderFacts(g);
}

// === Fejlside ===
function notFound(){
  document.body.innerHTML = `
    <main class="page">
      <article class="game-card">
        <h1>Spil ikke fundet</h1>
        <p>Kunne ikke finde et spil med dette id.</p>
        <p><a href="start.html">Tilbage til spil</a></p>
      </article>
    </main>`;
}

// === Topbar knapper (samme som start.html) ===
function initTopNav(){
  $("#backBtn")?.addEventListener("click", () => {
    if (history.length > 1) history.back(); else location.href = "start.html";
  });
  $("#btnSearch")?.addEventListener("click", () => location.href = "search.html");
  $("#btnFavs")?.addEventListener("click",   () => location.href = "favorites.html");
}

// === Load flow ===
async function load(){
  const id = getIdFromQuery();
  if (!id){ notFound(); return; }

  try{
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.games || []);
    const game = list.find(g => String(g.id) === String(id));
    if (!game){ notFound(); return; }
    renderGame(game);
  } catch (err) {
    console.error("[detail.js] fetch error:", err);
    notFound();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initTopNav();
  load();
});
