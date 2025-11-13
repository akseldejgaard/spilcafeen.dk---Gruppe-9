// ==============================
// start.js — for start.html
// ==============================
console.log("[start.js] loaded");

// ---------- KONFIG ----------
const CONFIG = {
  CURRENT_LOCATION: "Vestergade",
  JSON_URL: "https://raw.githubusercontent.com/cederdorff/race/refs/heads/master/data/games.json",
  ICONS: {
    players: "assets/images/spillere.png",
    time:    "assets/images/ur.png",
    shelf:   "assets/images/placering.png",
  },
  MONTHLY_COUNT: 3,
  FAV_KEY: "spilcafe_favorites",
};

// ---------- HELPERS ----------
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const asId = (x) => String(x);
const detailUrl = (id) => `detail.html?id=${encodeURIComponent(id)}`;

// ---------- FAVORITTER ----------
const Favs = {
  KEY: CONFIG.FAV_KEY,
  get()  { return JSON.parse(localStorage.getItem(this.KEY) || "[]").map(asId); },
  set(v) { localStorage.setItem(this.KEY, JSON.stringify([...new Set(v.map(asId))])); },
  has(id){ return this.get().includes(asId(id)); },
  add(id){ const s=this.get(); s.push(asId(id)); this.set(s); },
  remove(id){ const v=asId(id); this.set(this.get().filter(x => asId(x)!==v)); },
  toggle(id){ this.has(id) ? this.remove(id) : this.add(id); }
};

// ---------- FORMATTING ----------
const playersText = (p) => {
  if (p && typeof p === 'object' && p.min != null) {
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

const sampleRandom = (arr, n) => arr.slice().sort(()=>0.5-Math.random()).slice(0,n);

// ---------- FETCH ----------
async function fetchGames(){
  const res = await fetch(CONFIG.JSON_URL, { cache:"no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.games || []);
}

function filterByLocation(list, location){
  return list.filter(g => (g.location || "").toLowerCase() === location.toLowerCase());
}

// ---------- GAME CARD ----------
function gameCardHTML(g){
  const fav = Favs.has(g.id);
  const href = detailUrl(g.id);

  return `
    <article class="game-card" data-id="${g.id}" role="listitem" aria-label="${g.title}">
      <button class="heart-btn ${fav ? "is-fav" : ""}" data-id="${g.id}" aria-pressed="${fav}" aria-label="Favorit">
        <svg width="22" height="22" viewBox="0 0 24 24">
          <path d="M12 21s-6.5-4-8.5-7.5C1.6 10 3.2 6 7 6c2.1 0 3.3 1.2 5 3 1.7-1.8 2.9-3 5-3 3.8 0 5.4 4 3.5 7.5S12 21 12 21z"/>
        </svg>
      </button>

      <a href="${href}" aria-label="Se detaljer om ${g.title}">
        <img class="game-img" src="${g.image}" alt="${g.title}" loading="lazy">
      </a>

      <h3 class="game-title">
        <a href="${href}">${g.title}</a>
      </h3>

      <div class="meta">
        <div class="meta-item" title="Spillere">
          <img src="${CONFIG.ICONS.players}" alt="">
          <small>${playersText(g.players)}</small>
        </div>
        <div class="meta-item" title="Spilletid">
          <img src="${CONFIG.ICONS.time}" alt="">
          <small>${playtimeText(g.playtime)}</small>
        </div>
        <div class="meta-item" title="Hylde">
          <img src="${CONFIG.ICONS.shelf}" alt="">
          <small>${g.shelf ?? ""}</small>
        </div>
      </div>
    </article>
  `;
}

// ---------- RENDER: MONTHLY ----------
async function renderMonthly(){
  const row = $("#gamesRow");
  if (!row) return;

  row.innerHTML = `<p class="muted--mt6">Indlæser månedens spil…</p>`;

  try {
    const all  = await fetchGames();
    const here = filterByLocation(all, CONFIG.CURRENT_LOCATION);
    const base = here.length ? here : all; // fallback hvis ingen matcher
    const pick = sampleRandom(base, CONFIG.MONTHLY_COUNT);

    row.innerHTML = pick.map(gameCardHTML).join("");

    // Heart click handler (toggler uden at navigere)
    row.addEventListener("click", (e) => {
      const btn = e.target.closest(".heart-btn");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.id;
      Favs.toggle(id);
      const fav = Favs.has(id);
      btn.classList.toggle("is-fav", fav);
      btn.setAttribute("aria-pressed", String(fav));
    });

    // Initial sync (marks hearts correctly on load)
    syncHearts();

    console.log(`[start.js] Rendered ${pick.length} games for ${CONFIG.CURRENT_LOCATION}`);
  } catch (err) {
    console.error("[start.js] fetch error:", err);
  row.innerHTML = `<p class="muted">Kunne ikke hente spil.</p>`;
  }
}

// ---------- SYNC HEART STATE ----------
function syncHearts(){
  $$(".game-card").forEach(card => {
    const id = card.dataset.id;
    const btn = card.querySelector(".heart-btn");
    if (!btn) return;
    const fav = Favs.has(id);
    btn.classList.toggle("is-fav", fav);
    btn.setAttribute("aria-pressed", String(fav));
  });
}

// ---------- LOCATION CAROUSEL ----------
function initLocationCarousel(){
  const track = $("#locTrack");
  if (!track) return;
  const slides = $$("#locTrack > .loc-slide");
  const prev = $(".loc-arrow--prev");
  const next = $(".loc-arrow--next");
  const dots = $("#locDots");
  const title = $("#loc-title");
  let idx = 0;

  function renderDots(){
    dots.innerHTML = slides.map((_,i)=>`<button type="button" role="tab" aria-current="${i===idx}"></button>`).join("");
  }
  function update(){
    track.style.transform = `translateX(-${idx*100}%)`;
    title.textContent = slides[idx]?.dataset?.title || "Lokation";
    [...dots.children].forEach((d,i)=>d.setAttribute("aria-current", String(i===idx)));
  }
  function go(n){
    idx = (n + slides.length) % slides.length;
    update();
  }

  renderDots(); update();
  prev?.addEventListener("click", ()=> go(idx-1));
  next?.addEventListener("click", ()=> go(idx+1));
  dots.addEventListener("click", (e)=>{
    const i = [...dots.children].indexOf(e.target);
    if (i>=0) go(i);
  });
}

// ---------- TOP NAV ----------
function initTopNav(){
  $("#btnBack")?.addEventListener("click", ()=> location.href="index.html");
  $("#btnSearch")?.addEventListener("click", ()=> location.href="search.html");
  $("#btnFavs")?.addEventListener("click", ()=> location.href="favorites.html");
}

// ---------- BOOT ----------
document.addEventListener("DOMContentLoaded", () => {
  console.log("[start.js] DOM ready");
  // Hvis brugeren valgte en lokation tidligere, brug den
  try {
    const stored = localStorage.getItem('spilcafe_location');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object' && parsed.label) {
        CONFIG.CURRENT_LOCATION = parsed.label;
      } else if (typeof parsed === 'string') {
        CONFIG.CURRENT_LOCATION = parsed;
      }
    }
  } catch (err) {
    console.warn('[start.js] kunne ikke læse gemt lokation', err);
  }
  initTopNav();
  renderMonthly();
  initLocationCarousel();
});

// Resync hearts when coming back from favorites or storage changes
window.addEventListener("pageshow", syncHearts);
window.addEventListener("storage", (e)=>{
  if (e.key === Favs.KEY) syncHearts();
});
