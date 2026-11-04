/* DESTOMBES — stockage : IndexedDB, la base interne du navigateur de la tablette. Rien ne quitte l'appareil. */
const ouvrir = () => new Promise((ok, ko) => {
  const r = indexedDB.open('destombes', 1);
  r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('saisies', { keyPath: 'id', autoIncrement: true }).createIndex('date', 'date'); d.createObjectStore('projets', { keyPath: 'key' }); };
  r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error);
});
let P; const db = () => P || (P = ouvrir());
const run = async (nom, mode, fn) => { const d = await db(); return new Promise((ok, ko) => { const t = d.transaction(nom, mode), q = fn(t.objectStore(nom)); t.oncomplete = () => ok(q && q.result); t.onerror = () => ko(t.error); }); };
export const store = {
  all: n => run(n, 'readonly', s => s.getAll()),
  put: (n, o) => run(n, 'readwrite', s => s.put(o)),   /* renvoie la clé (id généré pour les saisies) */
  del: (n, k) => run(n, 'readwrite', s => s.delete(k)),
  async replace(n, liste) { await run(n, 'readwrite', s => s.clear()); for (const o of liste) await this.put(n, o); }
};
export const projKey = (categorie, ref) => categorie + '|' + ref;
