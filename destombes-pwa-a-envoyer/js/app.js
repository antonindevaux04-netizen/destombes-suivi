/* DESTOMBES — interface : saisie sur tablette partagée, projets, tableau de bord, sauvegarde. */
import { OUVRIERS, CATEGORIES, PHASES, STATUTS, CRENEAUX } from './config.js';
import { store, projKey } from './store.js';
import { complete, controle, totalJour, stats, lignesProjets, projetsDe, enRetard } from './engine.js';

const $ = s => document.querySelector(s), esc = s => String(s ?? '').replace(/[&<>"]/g, c => '&#' + c.charCodeAt(0) + ';');
const hh = n => (Math.round(n * 10) / 10).toLocaleString('fr-FR') + ' h';
const aujourdhui = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const opt = (L, sel) => L.map(x => `<option${x === sel ? ' selected' : ''}>${esc(x)}</option>`).join('');
const clos = ['Terminé', 'Annulé'];
let S = { saisies: [], projets: [] }, vue = 'saisie', ouvrier = null, date = aujourdhui(), masque = true, du = aujourdhui().slice(0, 4) + '-01-01', au = aujourdhui(), idle;

function render() {
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.v === vue));
  ({ saisie: vSaisie, projets: vProjets, dash: vDash })[vue]();
}

/* ---------- saisie : on choisit d'abord son prénom (tablette commune), retour automatique après 90 s d'inactivité ---------- */
function vSaisie() {
  if (!ouvrier) {
    $('#v').innerHTML = '<div class="card"><h2>Qui es-tu ?</h2><div class="noms">' + OUVRIERS.map(o => `<button class="nom" data-o="${esc(o)}">${esc(o)}</button>`).join('') + '</div></div>';
    document.querySelectorAll('.nom').forEach(b => b.onclick = () => { ouvrier = b.dataset.o; render(); });
    return;
  }
  const L = S.saisies.filter(x => x.ouvrier === ouvrier && x.date === date).sort((a, b) => a.debut < b.debut ? -1 : 1), t = totalJour(S.saisies, ouvrier, date);
  const dernier = L.length ? L[L.length - 1].fin : '07:00', fin = CRENEAUX[Math.min(Math.max(0, CRENEAUX.indexOf(dernier)) + 4, CRENEAUX.length - 1)];
  $('#v').innerHTML = `<div class="card"><div class="g"><h2>Bonjour ${esc(ouvrier)}</h2><button class="sec" id="chg">Changer d'ouvrier</button></div>
  <label>Date</label><input type="date" id="d" value="${date}">
  <label>Famille / activité</label><select id="c">${opt(CATEGORIES.map(c => c.nom))}</select>
  <div id="rb"><label>Client / réf chantier</label><input id="r" list="rl" autocomplete="off"><datalist id="rl"></datalist><label>Phase</label><select id="p">${opt(PHASES)}</select></div>
  <div class="g"><div><label>Début</label><select id="a">${opt(CRENEAUX, dernier)}</select></div><div><label>Fin</label><select id="b">${opt(CRENEAUX, fin)}</select></div></div>
  <label>Commentaire</label><input id="m"><label><input type="checkbox" id="t" style="width:auto"> Tâche terminée</label>
  <button class="p" id="go">Enregistrer</button><div id="msg" class="err"></div></div>
  <div class="card"><b>Total du jour : ${hh(t.total)}${t.sup ? ` (dont ${hh(t.sup)} sup.)` : ''}</b><table>${L.map(x => `<tr><td>${x.debut}–${x.fin}</td><td>${esc(x.categorie)} ${esc(x.ref)}<br><small>${esc(x.phase)} ${esc(x.commentaire)}</small></td><td>${x.termine ? '✔' : ''}</td><td><button class="x" data-id="${x.id}">✕</button></td></tr>`).join('')}</table></div>`;
  const cat = () => CATEGORIES.find(c => c.nom === $('#c').value);
  const maj = () => { $('#rb').classList.toggle('hide', !cat().direct); $('#rl').innerHTML = S.projets.filter(p => p.categorie === cat().nom && p.ref && !clos.includes(p.statut)).map(p => `<option value="${esc(p.ref)}">`).join(''); };
  maj(); $('#c').onchange = maj;
  $('#chg').onclick = () => { ouvrier = null; render(); };
  $('#d').onchange = () => { date = $('#d').value; render(); };
  $('#a').onchange = () => { $('#b').selectedIndex = Math.min($('#a').selectedIndex + 4, CRENEAUX.length - 1); };
  document.querySelectorAll('.x').forEach(b => b.onclick = async () => { const id = +b.dataset.id; if (confirm('Supprimer cette saisie ?')) { await store.del('saisies', id); S.saisies = S.saisies.filter(x => x.id !== id); render(); } });
  $('#go').onclick = async () => {
    const c = cat(), s = complete({ date, ouvrier, categorie: c.nom, ref: c.direct ? $('#r').value.trim() : '', phase: c.direct ? $('#p').value : '', debut: $('#a').value, fin: $('#b').value, commentaire: $('#m').value.trim(), termine: $('#t').checked });
    const err = controle(s, S.saisies, aujourdhui()); if (err) return void ($('#msg').textContent = err);
    s.id = await store.put('saisies', s); S.saisies.push(s);
    const k = projKey(s.categorie, s.ref);
    if (!S.projets.some(p => p.key === k)) { const p = { key: k, categorie: s.categorie, ref: s.ref, statut: 'En cours', deadline: '' }; await store.put('projets', p); S.projets.push(p); }
    render();
  };
}

/* ---------- projets ---------- */
function vProjets() {
  const R = lignesProjets(S.saisies, S.projets, CATEGORIES).filter(p => !masque || !clos.includes(p.statut)).sort((a, b) => (a.deadline || '9') < (b.deadline || '9') ? -1 : 1);
  $('#v').innerHTML = `<div class="card"><label><input type="checkbox" id="ft" style="width:auto"${masque ? ' checked' : ''}> Masquer terminés / annulés</label><div style="overflow-x:auto"><table><tr><th>Projet</th><th>Statut</th><th>Deadline</th><th>Débit</th><th>Assemb.</th><th>Palette</th><th></th></tr>`
    + R.map(p => `<tr><td>${esc(p.categorie)}<br><small>${esc(p.ref)}</small></td><td><select data-k="${esc(p.key)}" data-f="statut">${opt(STATUTS, p.statut)}</select></td><td><input type="date" data-k="${esc(p.key)}" data-f="deadline" value="${p.deadline || ''}"></td>`
      + p.phases.map(f => `<td>${hh(f.h)}<br><small>${f.fin}</small></td>`).join('') + `<td class="err">${enRetard(p, aujourdhui()) ? '⚠ RETARD' : ''}</td></tr>`).join('') + '</table></div></div>';
  $('#ft').onchange = () => { masque = $('#ft').checked; render(); };
  document.querySelectorAll('[data-k]').forEach(e => e.onchange = async () => { const p = S.projets.find(x => x.key === e.dataset.k); p[e.dataset.f] = e.value; await store.put('projets', p); render(); });
}

/* ---------- tableau de bord + sauvegarde ---------- */
const barres = (t, r) => { const mx = Math.max(1, ...r.map(x => x.h)); return `<div class="card"><b>${t}</b>` + r.map(x => `<div class="bar"><span>${esc(x.k)}</span><i style="width:${x.h / mx * 55}%"></i><span>${hh(x.h)}</span></div>`).join('') + '</div>'; };
function vDash() {
  const D = stats(S.saisies, S.projets, CATEGORIES, du, au, aujourdhui());
  $('#v').innerHTML = `<div class="card g"><div><label>Du</label><input type="date" id="du" value="${du}"></div><div><label>Au</label><input type="date" id="au" value="${au}"></div></div>
  <div class="k card"><div>Heures totales<b>${hh(D.total)}</b></div><div>Temps indirect<b>${D.total ? Math.round(D.indirect / D.total * 100) : 0} %</b></div><div>Heures sup.<b>${hh(D.sup)}</b></div><div>Projets en retard<b>${D.retards}</b></div></div>`
    + barres('Par phase', D.phase) + barres('Par ouvrier', D.ouvrier) + barres('Par famille', D.categorie) + barres('Par semaine', D.semaine)
    + '<div class="card g"><button class="sec" id="ex">Sauvegarder (JSON)</button><button class="sec" id="im">Restaurer / importer</button><input type="file" id="fi" accept=".json" class="hide"></div>';
  $('#du').onchange = $('#au').onchange = () => { du = $('#du').value; au = $('#au').value; render(); };
  $('#ex').onclick = exporter; $('#im').onclick = () => $('#fi').click(); $('#fi').onchange = e => importer(e.target.files[0]);
}
function exporter() {
  const a = document.createElement('a'); a.download = 'destombes-' + aujourdhui() + '.json';
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, saisies: S.saisies, projets: S.projets })], { type: 'application/json' })); a.click();
}
async function importer(f) {
  if (!f) return;
  const j = JSON.parse(await f.text()), sa = j.saisies || [];
  if (!confirm(`Remplacer toutes les données de la tablette par ${sa.length} saisies ?`)) return;
  await store.replace('saisies', sa); await store.replace('projets', j.projets || projetsDe(sa));
  S = { saisies: await store.all('saisies'), projets: await store.all('projets') }; render();
}

document.querySelectorAll('nav button').forEach(b => b.onclick = () => { vue = b.dataset.v; render(); });
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => { clearTimeout(idle); idle = setTimeout(() => { if (ouvrier) { ouvrier = null; vue = 'saisie'; render(); } }, 9e4); }));
(async () => {
  navigator.storage?.persist?.();   /* demande au navigateur de ne pas effacer les données */
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  S = { saisies: await store.all('saisies'), projets: await store.all('projets') }; render();
})();
