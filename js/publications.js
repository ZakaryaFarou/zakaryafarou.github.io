let pubs=[];
const list=document.querySelector('#pub-list');
const count=document.querySelector('#pub-count');
const filters=document.querySelector('#filters');
function render(){const active=document.querySelector('.filter.active')?.dataset.filter||'All';const shown=pubs.filter(p=>active==='All'||p.year==active||p.type===active||p.themes.includes(active));count.textContent=`${shown.length} publication${shown.length===1?'':'s'}`;list.innerHTML=shown.map(p=>`<article class="pub"><div class="pub-year">${p.year}</div><div><h2>${p.title}</h2><div class="authors">${p.authors}</div><div class="venue">${p.venue}</div><div class="tags">${p.themes.map(t=>`<span class="tag">${t}</span>`).join('')}</div></div><div class="pub-links">${Object.entries(p.links||{}).map(([k,v])=>`<a href="${v}" target="_blank" rel="noopener">${k.toUpperCase()} ↗</a>`).join('')}</div></article>`).join('')}
fetch('data/publications.json').then(r=>r.json()).then(d=>{pubs=d;render()});
filters?.addEventListener('click',e=>{if(!e.target.classList.contains('filter'))return;document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));e.target.classList.add('active');render()});
