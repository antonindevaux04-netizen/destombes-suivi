/* DESTOMBES — moteur : fonctions pures (durées, contrôles, heures sup, statistiques). Ni DOM ni stockage : testable seul. */
import { PHASES, SEUIL_SUP } from './config.js';

export const hrs = t => { const [h, m] = t.split(':'); return +h + m / 60; };
export const complete = s => ({ ...s, duree: hrs(s.fin) - hrs(s.debut) });
const sum = L => L.reduce((s, x) => s + x.duree, 0);
/** Semaine ISO « 2026-S07 » */
export const semaine = s => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); return d.getUTCFullYear() + '-S' + String(Math.ceil(((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7)).padStart(2, '0'); };
export const enRetard = (p, today) => !!(p.deadline && p.deadline < today && !['Terminé', 'Annulé'].includes(p.statut));

/** Contrôles de saisie : renvoie un message d'erreur, ou '' si tout va bien. */
export function controle(s, toutes, today) {
  const j = Date.parse(s.date), t = Date.parse(today);
  if (!(j >= t - 400 * 864e5 && j <= t + 60 * 864e5)) return 'Date improbable : ' + s.date;
  if (hrs(s.fin) <= hrs(s.debut)) return "L'heure de fin doit être après l'heure de début";
  if (toutes.some(x => x.ouvrier === s.ouvrier && x.date === s.date && x.debut < s.fin && x.fin > s.debut)) return 'Ce créneau chevauche une autre saisie';
  return '';
}
export function totalJour(saisies, ouvrier, date) {
  const total = sum(saisies.filter(x => x.ouvrier === ouvrier && x.date === date));
  return { total, sup: Math.max(0, total - SEUIL_SUP) };
}
/** Un projet = une famille + une réf chantier. */
export const projetsDe = L => { const m = {}; L.forEach(s => { const k = s.categorie + '|' + s.ref; m[k] = m[k] || { key: k, categorie: s.categorie, ref: s.ref, statut: 'En cours', deadline: '' }; }); return Object.values(m); };

/** Heures et date de fin (dernière saisie « terminée ») par phase, pour chaque projet de production. */
export function lignesProjets(saisies, projets, cats) {
  const direct = Object.fromEntries(cats.map(c => [c.nom, c.direct]));
  return projets.filter(p => direct[p.categorie]).map(p => {
    const L = saisies.filter(x => x.categorie === p.categorie && x.ref === p.ref);
    const phases = PHASES.slice(0, 3).map(n => { const l = L.filter(x => x.phase === n); return { h: sum(l), fin: l.filter(x => x.termine).map(x => x.date).sort().pop() || '' }; });
    return { ...p, phases, total: sum(L) };
  });
}
const somme = (L, f) => { const m = {}; L.forEach(x => { const k = f(x); m[k] = (m[k] || 0) + x.duree; }); return Object.entries(m).map(([k, h]) => ({ k, h })).sort((a, b) => b.h - a.h); };
export function stats(saisies, projets, cats, du, au, today) {
  const L = saisies.filter(x => x.date >= du && x.date <= au), direct = Object.fromEntries(cats.map(c => [c.nom, c.direct])), jours = {};
  L.forEach(x => { const k = x.ouvrier + x.date; jours[k] = (jours[k] || 0) + x.duree; });
  return { total: sum(L), indirect: sum(L.filter(x => !direct[x.categorie])), sup: Object.values(jours).reduce((s, t) => s + Math.max(0, t - SEUIL_SUP), 0),
    retards: projets.filter(p => enRetard(p, today)).length, phase: somme(L, x => x.phase || 'Sans phase'), ouvrier: somme(L, x => x.ouvrier),
    categorie: somme(L, x => x.categorie), semaine: somme(L, x => semaine(x.date)).sort((a, b) => a.k < b.k ? -1 : 1) };
}
