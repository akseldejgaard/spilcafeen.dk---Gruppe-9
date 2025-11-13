// oversigt.js — dynamic renderer: fetch games.json and render the grid, keep filters/search working
(function(){
	const JSON_URL = "https://raw.githubusercontent.com/cederdorff/race/refs/heads/master/data/games.json";
	const FAV_KEY = 'spilcafe_favorites';

	const $ = (s, r=document) => r.querySelector(s);
	const $$ = (s, r=document) => Array.from((r||document).querySelectorAll(s));

	const Favs = {
		get() { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]').map(String); },
		set(v){ localStorage.setItem(FAV_KEY, JSON.stringify([...new Set(v.map(String))])); },
		has(id){ return this.get().includes(String(id)); },
		toggle(id){ const s=this.get(); const v=String(id); if (s.includes(v)) this.set(s.filter(x=>x!==v)); else { s.push(v); this.set(s); } }
	};

		// Icons used on cards (match start.js)
		const ICONS = {
			players: 'assets/images/spillere.png',
			time: 'assets/images/ur.png',
			shelf: 'assets/images/placering.png'
		};

		function mapPlaytime(minutes){
		if (minutes == null) return '—';
		const m = Number(minutes);
		if (isNaN(m)) return String(minutes);
		if (m <= 60) return '0-1 time';
		if (m <= 120) return '1-2 timer';
		return '2-3 timer';
	}

	function mapPlayers(p){
		if (!p) return '';
		if (typeof p === 'string') return p;
		if (typeof p === 'object' && p.min != null){
			const min = Number(p.min); const max = Number(p.max ?? p.min);
			if (min === max) return String(min);
			if (min <=2 && max <=4) return '2-4';
			if (min <=4 && max <=8) return '4-8';
			return `${min}-${max}`;
		}
		return '';
	}

	function safe(v, fallback=''){ return v == null ? fallback : v; }

		function playtimeText(mins){
			if (mins == null) return '';
			const m = Number(mins);
			if (isNaN(m)) return String(mins);
			if (m >= 60) {
				const h = Math.floor(m/60);
				const rest = m % 60;
				return rest ? `${h}t ${rest}m` : `${h}t`;
			}
			return `${m}m`;
		}

		function playersText(p){
			if (!p) return '';
			if (typeof p === 'string') return p;
			if (typeof p === 'object' && p.min != null) {
				const min = Number(p.min); const max = Number(p.max ?? p.min);
				return (min === max) ? String(min) : `${min}–${max}`;
			}
			return '';
		}

		function cardHTML(g){
			const fav = Favs.has(g.id);
			const img = safe(g.image, 'assets/images/placeholder.png');
			const varighed = mapPlaytime(g.playtime);
			const antal = mapPlayers(g.players);
			const genre = (g.genre || (g.genres && g.genres[0]) || '').toLowerCase();
			const alder = g.age ? `${g.age}+` : '';

			return `
				<article class="game-card" data-varighed="${varighed}" data-antal="${antal}" data-genre="${genre}" data-alder="${alder}" data-sværhedsgrad="${(g.difficulty||'').toLowerCase()}" data-id="${g.id}">
					<button class="heart-btn ${fav ? 'is-fav' : ''}" data-id="${g.id}" aria-pressed="${fav}" aria-label="Favorit">
						<svg width="22" height="22" viewBox="0 0 24 24"><path d="M12 21s-6.5-4-8.5-7.5C1.6 10 3.2 6 7 6c2.1 0 3.3 1.2 5 3 1.7-1.8 2.9-3 5-3 3.8 0 5.4 4 3.5 7.5S12 21 12 21z"/></svg>
					</button>

					<a href="detail.html?id=${encodeURIComponent(g.id)}" aria-label="Se detaljer om ${g.title}">
						<img class="game-img" src="${img}" alt="${g.title}">
					</a>

					<h3 class="game-title"><a href="detail.html?id=${encodeURIComponent(g.id)}">${g.title}</a></h3>

					<div class="meta" aria-label="Spilinfo">
						<div class="meta-item"><img src="${ICONS.players}" alt=""><small>${playersText(g.players)}</small></div>
						<div class="meta-item"><img src="${ICONS.time}" alt=""><small>${playtimeText(g.playtime)}</small></div>
						<div class="meta-item"><img src="${ICONS.shelf}" alt=""><small>${g.shelf ?? ''}</small></div>
					</div>
				</article>`;
		}

	async function fetchGames(){
		try{
			const res = await fetch(JSON_URL, { cache: 'no-store' });
			if (!res.ok) throw new Error('HTTP ' + res.status);
			const data = await res.json();
			return Array.isArray(data) ? data : (data.games || []);
		} catch(err){ console.error('[oversigt] fetch error', err); return []; }
	}

	function filterByVestergade(list){
		return list.filter(g => (g.location || '').toLowerCase().includes('vestergade'));
	}

	// RENDER + bind interaction
	async function init(){
		const grid = document.querySelector('.game-grid');
		if (!grid) return;
		grid.innerHTML = '<div class="empty"><p class="muted--inline">Indlæser spil…</p></div>';

		const all = await fetchGames();
		const list = filterByVestergade(all).length ? filterByVestergade(all) : all;
		if (!list.length){ grid.innerHTML = '<div class="empty"><strong>Ingen spil fundet</strong></div>'; return; }

		grid.innerHTML = list.map(cardHTML).join('');

		// Delegated favorite toggle (works for .fav-btn or .heart-btn)
			grid.addEventListener('click', (e) => {
				const btn = e.target.closest('.fav-btn, .heart-btn');
				if (!btn) return;
				e.preventDefault();
				const id = btn.dataset.id;
				Favs.toggle(id);
				const fav = Favs.has(id);
				btn.classList.toggle('is-fav', fav);
				btn.setAttribute('aria-pressed', String(fav));
						// Do not navigate — just update localStorage and UI. User can visit favorites.html manually.
			});

		// SEARCH: toggle input and filter cards by title/metadata
		const searchBtn = document.getElementById('btnSearch');
		const searchInput = document.getElementById('searchInput');
		searchBtn?.addEventListener('click', (e)=>{
			e.stopPropagation();
			e.preventDefault();
			if (!searchInput) return;
			const isShown = searchInput.style.display === 'block';
			if (isShown){
				searchInput.style.display = 'none';
				searchInput.value = '';
				Array.from(grid.children).forEach(c=>c.style.display='');
			} else {
				searchInput.style.display = 'block';
				searchInput.focus();
			}
		});

		searchInput?.addEventListener('input', ()=>{
			const q = (searchInput.value || '').toLowerCase().trim();
			Array.from(grid.children).forEach(c => {
				const title = (c.querySelector('h3, h2')?.textContent || '').toLowerCase();
				// read attributes with getAttribute to safely handle names with special characters (e.g. data-sværhedsgrad)
				const meta = (
					(c.getAttribute('data-genre') || '') + ' ' +
					(c.getAttribute('data-alder') || '') + ' ' +
					(c.getAttribute('data-antal') || '') + ' ' +
					(c.getAttribute('data-sværhedsgrad') || '')
				).toLowerCase();
				const match = !q || title.includes(q) || meta.includes(q);
				c.style.display = match ? '' : 'none';
			});
		});

		// FILTERS: wire option buttons to operate on the newly rendered cards
		function closeAllFilters(){ document.querySelectorAll('.filter-options').forEach(o=>o.style.display='none'); document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active')); }

		// helper: try multiple attribute name variants (ascii <-> danish chars)
		function getAttrFlexible(el, name){
			if (!name) return null;
			const candidates = [name];
			const toUtf = name.replace(/ae/g,'æ').replace(/oe/g,'ø').replace(/aa/g,'å');
			if (toUtf !== name) candidates.push(toUtf);
			const toAscii = name.replace(/æ/g,'ae').replace(/ø/g,'oe').replace(/å/g,'aa');
			if (toAscii !== name) candidates.push(toAscii);
			for (const n of candidates){
				const v = el.getAttribute(n);
				if (v != null) return v;
			}
			return null;
		}

		// Robust age matcher: accepts many formats ("8+", "8–15 år", "15+", "8")
		function matchAge(cardStr, optStr){
			if (!cardStr || !optStr) return false;
			const s1 = String(cardStr);
			const s2 = String(optStr);
			const nums1 = (s1.match(/\d+/g) || []).map(Number);
			const nums2 = (s2.match(/\d+/g) || []).map(Number);
			const hasRange2 = /-|–/.test(s2);
			const hasPlus2 = /\+/.test(s2);
			const hasRange1 = /-|–/.test(s1);
			const hasPlus1 = /\+/.test(s1);

			function toRange(nums, hasRange, hasPlus){
				if (!nums.length) return null;
				if (hasRange) return { min: nums[0], max: nums[1] ?? nums[0] };
				if (hasPlus) return { min: nums[0], max: Infinity };
				if (nums.length === 1) return { min: nums[0], max: nums[0] };
				return { min: nums[0], max: nums[nums.length - 1] };
			}

			const r1 = toRange(nums1, hasRange1, hasPlus1);
			const r2 = toRange(nums2, hasRange2, hasPlus2);
			if (r1 && r2) return (r1.min <= r2.max && r2.min <= r1.max);

			// fallback: substring match of digits or whole text
			if (nums1.length && nums2.length){
				return nums1.some(n => nums2.includes(n));
			}
			const clean1 = s1.replace(/[^0-9+\-–]/g,'');
			const clean2 = s2.replace(/[^0-9+\-–]/g,'');
			return clean1 && clean2 && (clean1 === clean2 || clean1.includes(clean2) || clean2.includes(clean1));
		}
		document.addEventListener('click', (e)=>{ if (!e.target.closest('.filter-bar') && !e.target.closest('.filter-options')) closeAllFilters(); });

		// Generic wiring for each filter button group
		document.querySelectorAll('.filter-btn').forEach(btn => {
			const key = btn.dataset.filter; if (!key) return;
			// Try to locate options panel; handle keys with special chars by trying an ASCII fallback
			let opts = document.getElementById(`${key}-options`);
			if (!opts){
				const ascii = key.replace(/æ/g,'ae').replace(/Æ/g,'Ae').replace(/ø/g,'o').replace(/Ø/g,'O').replace(/å/g,'a').replace(/Å/g,'A');
				opts = document.getElementById(`${ascii}-options`);
			}
			btn.addEventListener('click', ()=>{ const isVisible = opts && opts.style.display==='flex'; closeAllFilters(); if (!opts) return; opts.style.display = isVisible ? 'none' : 'flex'; if (!isVisible) btn.classList.add('active'); });
			const optionBtns = opts?.querySelectorAll('.option-btn') || [];
			optionBtns.forEach(o => o.addEventListener('click', ()=>{
				optionBtns.forEach(x=>x.classList.remove('active')); o.classList.add('active');
				// find the first data- attribute on the option button and use its name/value
				const dataAttr = Array.from(o.attributes).find(a => a.name && a.name.startsWith('data-'));
				const attrName = dataAttr ? dataAttr.name : null;
				const valRaw = dataAttr ? dataAttr.value : null;
				const val = valRaw ? String(valRaw).toLowerCase() : null;
				Array.from(grid.children).forEach(card => {
					// read card attribute flexibly (handles data-sværhedsgrad vs data-svaerhedsgrad)
					const rawCardVal = attrName ? (getAttrFlexible(card, attrName) || '') : '';
					const cardVal = String(rawCardVal).toLowerCase();

					let show = false;
					if (!val || val === 'alle') show = true;
					else if (attrName && attrName.toLowerCase().includes('alder')){
						// Treat card age as minimum age. Option values can be ranges ("8-15"), plus ("15+"),
						// or single numbers. Match when the card's minimum age falls into the selected option.
						function parseMinAge(s){
							if (!s) return null;
							const m = String(s).match(/\d+/);
							return m ? Number(m[0]) : null;
						}

						const cardMin = parseMinAge(rawCardVal);
						const optNums = (String(valRaw).match(/\d+/g) || []).map(Number);
						const optHasPlus = /\+/.test(String(valRaw));
						const optHasRange = /-|–/.test(String(valRaw));
						if (cardMin == null) {
							show = false;
						} else if (optHasRange && optNums.length >= 2){
							const [omin, omax] = optNums;
							show = (cardMin >= omin && cardMin <= omax);
						} else if (optHasPlus && optNums.length >= 1){
							const [omin] = optNums;
							show = (cardMin >= omin);
						} else if (optNums.length === 1){
							const [oval] = optNums;
							// treat single number option as matching games with minimum >= that number
							show = (cardMin >= oval);
						} else {
							// fallback to substring
							show = matchAge(rawCardVal, valRaw);
						}
					} else {
						// default: simple substring equality
						show = cardVal === val || cardVal.includes(val) || val.includes(cardVal);
					}

					card.style.display = show ? '' : 'none';
				});
			}));
		});

		// Back button behaviour: try history.back(), fallback to index.html
		const backBtn = document.getElementById('btnBack');
		if (backBtn){
			backBtn.addEventListener('click', (e)=>{
				e.preventDefault();
				if (window.history && window.history.length > 1) window.history.back();
				else window.location.href = 'index.html';
			});
		}
	}

	document.addEventListener('DOMContentLoaded', init);
})();
