/* DESTOMBES — listes de référence. Pour ajouter un ouvrier, une famille ou une phase : modifier ici, puis changer V dans sw.js. */
export const OUVRIERS = 'Alexis André Franck Jiovanni Kevin Lionel Mario Nicolas Stanislas Thomas Valentin'.split(' ');
/* direct:false = temps indirect (hors projet) */
export const CATEGORIES = [
  ...['Carports', 'Chalets en 28mm', 'Chantier Publique', 'Divers', 'Fenêtres', 'Fermes', 'Garage', 'Gouttières', 'Pergolas', 'Pignons', 'Planchers', 'Portes', 'Quadro', 'Quadro (cerisier)', 'Sur chantier', 'Terrasse suspendue', 'Volets'].map(nom => ({ nom, direct: true })),
  ...['Congés', 'Rangement', 'Réunion'].map(nom => ({ nom, direct: false }))];
export const PHASES = ['Débit', 'Assemblage', 'Mise en palette + préparation', 'Urgence'];
export const STATUTS = ['Non commencé', 'En cours', 'Terminé', 'Bloqué', 'Annulé'];
export const SEUIL_SUP = 8;   /* heures par jour au-delà desquelles on compte des heures sup */
/* créneaux de 15 min, 6h–18h, pause de midi (12h15–12h45) exclue, comme dans le classeur d'origine */
export const CRENEAUX = (() => { const o = []; for (let m = 360; m <= 1080; m += 15) { if (m >= 735 && m <= 765) continue; o.push(String(m / 60 | 0).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0')); } return o; })();
