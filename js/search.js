document.addEventListener('DOMContentLoaded', () => {
  // demo-søg – skift senere til rigtig JSON
  const DB = [
    {id:'7wonders',title:'7 Wonders'},
    {id:'partners',title:'Partners'},
    {id:'cluedo',title:'Cluedo'}
  ];

  const results = document.getElementById('results');
  const form = document.querySelector('.searchbox');
  if(!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = document.getElementById('q').value.toLowerCase().trim();
    const found = DB.filter(x => x.title.toLowerCase().includes(q));
    results.innerHTML = found.length
      ? `<ul>${found.map(x=>`<li>${x.title}</li>`).join('')}</ul>`
      : `<p class="muted">Ingen resultater.</p>`;
  });
});
