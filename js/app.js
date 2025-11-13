(function(){
// Config / defaults
const SPLASH_MS = 1000; // ms to show splash (was previously inline in index.html)
const STORAGE_KEY = 'spilcafe_location';

const splash = document.getElementById("splash");
const locationScreen = document.getElementById("location");
// older markup used an id, current pages use a class .btn-list — be tolerant
const listEl = document.getElementById("location-list") || document.querySelector('.btn-list');


// 1) Splash → Lokation efter 1s
window.addEventListener("load", () => {
window.setTimeout(() => {
hideSplashShowLocation();
}, SPLASH_MS);
});


function hideSplashShowLocation(){
splash?.classList.add("is-hidden");
locationScreen?.classList.remove("is-hidden");
locationScreen?.removeAttribute("aria-hidden");
// Flyt fokus for tilgængelighed
const title = locationScreen?.querySelector(".title");
if(title) title.setAttribute("tabindex", "-1"), title.focus();
}


// 2) Hent lokationer fra JSON (fallback til inline data)
async function fetchLocations(){
try{
const res = await fetch("js/data/locations.json", { cache: "no-store" });
if(!res.ok) throw new Error("HTTP " + res.status);
return await res.json();
} catch(err){
console.warn("Bruger fallback lokations-data:", err);
return [
{ id: "aarhus-fredensgade", label: "Aarhus C – Fredensgade" },
{ id: "aarhus-vestergade", label: "Aarhus C – Vestergade" },
{ id: "aalborg", label: "Aalborg" },
{ id: "odense", label: "Odense" },
{ id: "kolding", label: "Kolding" }
];
}
}


// 3) Render lokationer som semantisk liste med knapper
function renderLocations(locations){
	listEl.innerHTML = "";
	const frag = document.createDocumentFragment();

	// Only Vestergade should navigate to the start page. Other locations are shown as
	// inactive buttons ("Kommer snart") until their pages exist.
	locations.forEach(loc => {
		const li = document.createElement("li");
		const label = String(loc.label || loc.id || "");
		const isVestergade = (String(loc.id || "").toLowerCase().includes('vestergade')) || label.toLowerCase().includes('vestergade');

		if (isVestergade) {
			// Use an anchor for the active location so it behaves like a normal link
			const a = document.createElement('a');
			a.className = 'btn';
			a.href = 'start.html';
			a.textContent = label;
			a.addEventListener('click', (e) => {
				e.preventDefault();
				onSelectLocation(loc);
			});
			li.appendChild(a);
		} else {
			// Inactive placeholder
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'btn';
			btn.textContent = label;
			btn.setAttribute('aria-disabled', 'true');
			btn.disabled = true;
			btn.title = 'Kommer snart';
			li.appendChild(btn);
		}

		frag.appendChild(li);
	});

	listEl.appendChild(frag);
}


function onSelectLocation(loc){
	try { localStorage.setItem(STORAGE_KEY, JSON.stringify(loc)); } catch(e){
		console.warn('Kunne ikke gemme valgt lokation', e);
	}
	console.log("Valgt lokation:", loc);
	// Navigér til start-siden hvor vi viser spil for den valgte lokation
	window.location.href = 'start.html';
}


// Init
fetchLocations().then(renderLocations);
})();

