# Système de Planification Automatique - Taxi Médical Nice

## 📋 Vue d'ensemble

Ce système optimise la planification des courses de taxi médical sur le territoire de Nice et sa périphérie à partir de feuilles de réservations brutes. Il affecte automatiquement les courses aux taxis disponibles selon des critères d'efficacité géographique, de contraintes horaires, de préférences sectorielles et de continuité de service.

---

## 🎯 Fonctionnalités Principales

- **Parsing multi-formats tolérant** : Analyse les lignes d'horaires (`7H30`, `08:15`), noms de patients entre parenthèses, adresses de départ, destinations hospitalières (`DEST ...`), téléphones et consignes médicales (`EXO OUI`, chimio, accompagnement).
- **Géocodage & Réseau Niçois** : Prise en compte immédiate des pôles hospitaliers majeurs (Archet 2, Pasteur 2, Centre Antoine Lacassagne, Cyclotron, IUFC, Lenval, Les Sources) et des axes de transit (Promenade des Anglais, Gorbella, Gambetta, Cessole, Malaussena).
- **Moteur d'Optimisation Intelligente** :
  - Filtrage des taxis actifs selon leur calendrier individuel (semaine vs samedi/dimanche).
  - Attribution par calcul de score minimisant les temps à vide et maximisant l'adéquation au secteur du chauffeur.
  - Calcul de distance réelle avec coefficient d'encombrement urbain et temps de prise en charge.
  - Sauvegarde et archivage instantané en base de données.
- **Interface Web Moderne** :
  - Module d'upload avec barre d'état et chargement d'un fichier d'exemple en 1 clic.
  - Vue détaillée par taxi avec horaires, itinéraires estimés et consignes.
  - Export texte formaté prêt pour l'envoi aux chauffeurs ou impression.
  - Module de gestion des disponibilités des chauffeurs (boutons jour par jour).
  - Historique complet et console de maintenance.

---

## 🏗️ Architecture du Système

```text
Node.js 22 + TypeScript Application
├── server.ts                       # Serveur Web Express & API REST
├── src/
│   ├── db.ts                       # Gestionnaire de base en mémoire & archives
│   ├── planningEngine.ts           # Algorithme d'optimisation & parseur
│   └── types.ts                    # Interfaces de données TypeScript
├── views/                          # Interface utilisateur (moteur EJS)
│   ├── partials/
│   │   ├── header.ejs              # Barre de navigation & thème graphique
│   │   └── footer.ejs              # Pied de page
│   ├── index.ejs                   # Accueil & plannings récents
│   ├── planning_auto.ejs           # Upload de réservations & génération
│   ├── show_planning.ejs           # Affichage par chauffeur & statistiques
│   ├── manage_taxis.ejs            # Disponibilités de la flotte
│   ├── planning_history.ejs        # Historique & téléchargement archives
│   └── database_maintenance.ejs    # Audit de base & suppression doublons
├── static/
│   ├── css/style.css               # Feuille de style personnalisée
│   └── sample_reservations.txt     # Données de test prêtes à l'emploi
└── package.json                    # Configuration et scripts
```

---

## 📊 Modèle de Données

- **Taxis** : Identifiant, nom, indicatif radio/téléphone, secteurs favoris (ex: `S20,S22`), calendrier semaine (`lundi` à `vendredi`), calendrier week-end (`samedi`, `dimanche`), statut actif.
- **Secteurs** : Code (`S10` à `S70`), libellé, coordonnées géographiques et rayon d'action.
- **Courses** : Date, heure, patient, téléphone, adresse départ, destination, exonération (`EXO`), bon de transport, distance et durée estimées, taxi affecté.
- **Archives** : Date, données complètes du planning en JSON, nombre total de courses, nombre de taxis mobilisés, date de création.

---

## 📝 Format Standard des Réservations

L'algorithme analyse les réservations rédigées selon le format médical usuel :
```text
07H30 (LEFEBVRE Christine) 18 Rue Vernier Nice - 06 11 22 33 44 DEST NICE HOPITAL ARCHET 2 <<BT AU RETOUR
EXO OUI
DOIT ETRE A L HEURE

08H15 (BENHAMOU David) 3 Boulevard Cessole Nice - 04 93 51 20 10 DEST Nice LACASSAGNE BAT A <<BT FOURNI
CHIMIO
```
Les délimiteurs de bloc (`>>`) et les sauts de ligne sont automatiquement pris en compte.

---

## 🤖 Logique de l'Algorithme de Score

Pour chaque course ordonnée par heure de départ :
1. **Contrainte de temps** : Le taxi doit avoir achevé sa course précédente (avec marge de sécurité). Si le taxi est encore en course, son score est rejeté (`Infinity`).
2. **Adéquation géographique** : Calcul de la distance géodésique (formule de Haversine) entre la position finale du taxi et le nouveau point de ramassage. Bonus de -50 points si le secteur de départ correspond aux préférences du chauffeur.
3. **Pénalité de charge** : +20 points par course déjà assignée au chauffeur afin de répartir le travail uniformément sur l'ensemble de la flotte.
4. **Intervalle idéal** : Bonus si l'attente se situe entre 30 et 60 minutes ; pénalité si l'intervalle est inférieur à 30 minutes.

---

## 🔧 Installation & Démarrage

```bash
# Installation des paquets
npm install

# Démarrage de l'application
npm run dev

# Validation du code
npm run lint
npm run build
```

L'application est accessible sur le port `3000` (`http://localhost:3000`).

---

## 📈 Format d'Export Texte

L'export généré par l'application produit un fichier prêt à être transmis :
```text
PLANNING TAXI MEDICAL - 2026-10-05
==================================================

Total courses: 9
Taxis utilisés: 6
Courses non assignées: 0
Distance totale: 36.5 km

---------------- ALAIN 242
07:30 (LEFEBVRE Christine) 18 Rue Vernier Nice - 06 11 22 33 44 DEST NICE HOPITAL ARCHET 2 <<BT AU RETOUR
EXO OUI
Instructions: Doit être à l'heure

---------------- ALEX 429
08:15 (BENHAMOU David) 3 Boulevard Cessole Nice - 04 93 51 20 10 DEST Nice LACASSAGNE BAT A <<BT FOURNI
Instructions: Chimiothérapie
```

---

## 📞 Support & Maintenance

- **Responsable** : Philippe Mourey
- **Version** : 2.0.0
- **Dernière mise à jour** : Octobre 2026
