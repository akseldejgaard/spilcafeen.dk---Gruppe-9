// ==============================
// favorites.js — for favorites.html
// Viser spil der er liket på start-siden m.fl.
// ==============================
console.log("[favorites.js] loaded");

// ---- KONFIG ----
const CONFIG = {
  // Brug samme JSON-kilde som på start-siden:
  JSON_URL: "https://raw.githubusercontent.com/cederdorff/race/refs/heads/master/data/games.json",
  // JSON_URL: "assets/data/games.json", // hvis I har en lokal kopi

  ICONS: {
    players: "assets/images/spillere.png",
    time:    "assets/images/ur.png",
    shelf:   "assets/images/placering.png",
  },

  FAV_KEY: "spilcafe_favorites" // SKAL matche start-siden
};

// ---- HELPERS ----
const $  = (sel, root=document) => root.querySelector(sel);
const asId = (x) => String(x); // normaliser ID (tal/tekst) til string

// ---- FAVORITTER (localStorage) ----
const Favs = {
  get()  { return JSON.parse(localStorage.getItem(CONFIG.FAV_KEY) || "[]").map(asId); },
  set(v) { localStorage.setItem(CONFIG.FAV_KEY, JSON.stringify([...new Set(v.map(asId))])); },
  has(id){ return this.get().includes(asId(id)); },
  add(id){ const s = this.get(); const v = asId(id); if (!s.includes(v)) s.push(v); this.set(s); },
  remove(id){
    const v = asId(id);
    this.set(this.get().filter(x => asId(x) !== v));
  }
};

// ---- DATA ----
async function fetchGames(){
  const res = await fetch(CONFIG.JSON_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ved hentning af games.json`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.games || []);
}

function playersText(p){
  if (!p) return "";
  if (typeof p === 'string') return p;
  if (typeof p === 'object' && p.min != null && p.max != null) {
    return (p.min === p.max) ? String(p.min) : `${p.min}–${p.max}`;
  }
  return "";
}
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

// ---- RENDER ----
function cardHTML(g){
  const id = asId(g.id);
  return `
    <article class="game-card" data-id="${id}">
      <button class="heart-btn is-fav" aria-label="Fjern favorit" data-id="${id}">
        <svg width="22" height="22" viewBox="0 0 24 24">
          <path d="M12 21s-6.5-4-8.5-7.5C1.6 10 3.2 6 7 6c2.1 0 3.3 1.2 5 3 1.7-1.8 2.9-3 5-3 3.8 0 5.4 4 3.5 7.5S12 21 12 21z"/>
        </svg>
      </button>

      <img class="game-img" src="${g.image}" alt="${g.title}">
      <h3 class="game-title">${g.title}</h3>

      <div class="meta" aria-label="Spilinfo">
        <div class="meta-item"><img src="${CONFIG.ICONS.players}" alt=""><small>${playersText(g.players)}</small></div>
        <div class="meta-item"><img src="${CONFIG.ICONS.time}" alt=""><small>${playtimeText(g.playtime)}</small></div>
        <div class="meta-item"><img src="${CONFIG.ICONS.shelf}" alt=""><small>${g.shelf ?? ""}</small></div>
      </div>
    </article>
  `;
}

async function renderFavorites(){
  const container = $("#favList");
  const countEl   = $("#favCount");
  if (!container) return;

  const favIds = Favs.get(); // allerede normaliseret til strings
  countEl.textContent = favIds.length ? `${favIds.length} spil i dine favoritter` : "Ingen favoritter endnu";

  if (!favIds.length){
    container.innerHTML = `
      <div class="empty">
        <strong>Ingen favoritter endnu</strong>
        <p>Tryk på hjertet på et spil for at tilføje det her.</p>
      </div>`;
    return;
  }

  // loading-state så den ikke ser tom ud
  container.innerHTML = `<div class="empty"><p class="muted--inline">Indlæser favoritter…</p></div>`;

  try {
    const all = await fetchGames();
    // Map alle spil efter id (string)
    const byId = new Map(all.map(g => [asId(g.id), g]));

    // Bevar rækkefølgen fra localStorage og filtrér ukendte IDs fra
    const list = favIds.map(id => byId.get(id)).filter(Boolean);

    if (!list.length){
      // alle ID’er var stale → ryd og vis tom-tilstand
      Favs.set([]);
      countEl.textContent = "Ingen favoritter endnu";
      container.innerHTML = `
        <div class="empty">
          <strong>Ingen favoritter endnu</strong>
          <p>Tryk på hjertet på et spil for at tilføje det her.</p>
        </div>`;
      return;
    }

    container.innerHTML = list.map(cardHTML).join("");

    // Delegation: klik på hjerte fjerner favorit + kort + opdaterer tæller
    container.addEventListener("click", (e) => {
      const btn = e.target.closest(".heart-btn");
      if (!btn) return;
      const id = asId(btn.dataset.id);

      // fjern fra storage
      Favs.remove(id);

      // fjern kort i UI
      btn.closest(".game-card")?.remove();

      // opdater tæller / tom-tilstand
      const left = Favs.get().length;
      countEl.textContent = left ? `${left} spil i dine favoritter` : "Ingen favoritter endnu";
      if (!left){
        container.innerHTML = `
          <div class="empty">
            <strong>Ingen favoritter endnu</strong>
            <p>Tryk på hjertet på et spil for at tilføje det her.</p>
          </div>`;
      }
    });

  } catch (err) {
    console.error("[favorites.js] fetch error:", err);
    // Fallback: vis bare ID’erne så siden ikke er helt tom
    const ids = Favs.get();
    container.innerHTML = `
      <div class="empty">
        <strong>Kan ikke hente spil lige nu</strong>
        <p>Favorit-ID’er: ${ids.join(", ") || "ingen"}</p>
      </div>`;
  }
}

// ---- TOP-IKON NAV + TILBAGE ----
function initTopNav(){
  // Brug <a id="btnBack" href="start.html"> i HTML, så har du altid fallback.
  // Her forsøger vi history.back() først, men lader href virke hvis der ikke er en historik.
  const backLink = $("#btnBack");
  backLink?.addEventListener("click", (e) => {
    if (document.referrer && document.referrer !== location.href) { // kom fra en anden side
      e.preventDefault();
      history.back();
    }
  });

  $("#btnSearch")?.addEventListener("click", ()=> location.href = "search.html");
  $("#btnFavs")?.addEventListener("click",   ()=> location.href = "favorites.html");
}

// ---- BOOT ----
document.addEventListener("DOMContentLoaded", () => {
  initTopNav();
  renderFavorites();
});
