# Système de Planification Taxi Médical - Nice

Application web moderne d'optimisation et de génération automatisée des plannings de courses de taxis conventionnés et médicaux sur la métropole de Nice.

---

## 📋 Présentation

Cette application permet aux sociétés de taxi médical de charger leurs réservations quotidiennes (au format texte standard ou emails `.eml`), de géolocaliser automatiquement les adresses et points d'intérêt médicaux (centres hospitaliers, cliniques, cabinets), et de répartir intelligemment les courses entre les chauffeurs selon leurs secteurs de prédilection et leurs disponibilités.

---

## 🎯 Fonctionnalités Clés

- **Importation & Parsing Intelligent** : Détection automatique des horaires, noms de patients, adresses de prise en charge, destinations hospitalières, numéros de téléphone et mentions spéciales (`EXO OUI`, chimiothérapie, immunothérapie, bon de transport).
- **Cartographie & Secteurs Niçois** : Prise en charge des secteurs clés de Nice (S10 Centre, S20 Nord, S22 Archet, S30 Est, S40 Ouest, S60 Pasteur/Sud, S70 Périphérie).
- **Algorithme d'Optimisation Heuristique** :
  - Respect strict des disponibilités des chauffeurs (grille semaine et week-end).
  - Attribution prioritaire par proximité géographique et secteur préférentiel.
  - Gestion des délais d'attente optimaux (30 à 60 minutes entre courses).
  - Équilibrage équitable de la charge de travail entre les véhicules.
- **Visualisation & Export** :
  - Tableau de bord avec statistiques consolidées (total courses, kilomètres estimés, heures de route, taux d'affectation).
  - Détail chronologique par chauffeur avec consignes patient.
  - Export au format texte `.TXT` pour diffusion immédiate (radio, SMS, impression).
- **Gestion de Flotte & Disponibilités** : Configuration interactive des jours de présence de chaque taxi (lundi au dimanche) avec sauvegarde instantanée.
- **Archivage & Historique** : Consultation des plannings antérieurs, téléchargement et gestion des archives.
- **Maintenance & Cohérence** : Outils de contrôle d'intégrité, détection et nettoyage des doublons.

---

## 🏗️ Architecture Technique (Node.js & TypeScript)

L'application a été modernisée vers une architecture full-stack robuste et performante sous **Node.js 22** :

```text
├── server.ts                       # Point d'entrée serveur Express & routes HTTP/API
├── src/
│   ├── db.ts                       # Gestionnaire de données en mémoire & persistance flotte
│   ├── planningEngine.ts           # Parseur de réservations & moteur d'optimisation
│   └── types.ts                    # Définitions TypeScript (Taxi, Course, Planning, Secteur)
├── views/                          # Gabarits de rendu EJS modulaires
│   ├── partials/
│   │   ├── header.ejs              # En-tête partagé, navigation & styles
│   │   └── footer.ejs              # Pied de page & scripts Bootstrap
│   ├── index.ejs                   # Page d'accueil & accès rapide
│   ├── planning_auto.ejs           # Interface d'upload & génération
│   ├── show_planning.ejs           # Tableau de bord du planning & export
│   ├── manage_taxis.ejs            # Gestion de flotte & disponibilités hebdomadaires
│   ├── planning_history.ejs        # Historique des plannings archivés
│   ├── database_maintenance.ejs    # Console de maintenance & doublons
│   └── about.ejs                   # Documentation & à propos
├── static/
│   ├── css/
│   │   └── style.css               # Charte graphique & thème Côte d'Azur
│   ├── media/                      # Ressources visuelles
│   └── sample_reservations.txt     # Fichier d'exemple pour test immédiat
├── .env.example                    # Modèle des variables d'environnement
├── metadata.json                   # Métadonnées applicatives AI Studio
├── package.json                    # Dépendances & scripts npm
└── tsconfig.json                   # Configuration du compilateur TypeScript
```

---

## 🚀 Installation & Démarrage

### Prérequis
- **Node.js** >= 20 (Node.js 22 recommandé)
- **npm** >= 10

### 1. Installation des dépendances
```bash
npm install
```

### 2. Configuration des variables d'environnement
Copiez le fichier `.env.example` en `.env` :
```bash
cp .env.example .env
```

Variables disponibles :
- `PORT` : Port d'écoute du serveur (par défaut `3000`).
- `MAPBOX_API_KEY` *(optionnel)* : Clé API Mapbox pour le géocodage haute précision et le trafic en temps réel. En l'absence de clé, l'algorithme utilise le géocodage interne basé sur les coordonnées des secteurs et hôpitaux de Nice.
- `SECRET_KEY` : Clé de chiffrement des sessions.
- `LIBELLE_SOCIETE` : Nom de la société de taxi affiché sur les documents.

### 3. Lancement en mode développement
```bash
npm run dev
```
L'application démarre sur [http://localhost:3000](http://localhost:3000).

### 4. Vérification et compilation TypeScript
```bash
npm run build
npm run lint
```

---

## 📖 Guide d'Utilisation Rapide

1. **Créer un nouveau planning** : Rendez-vous sur *Planification > Planification Automatique*.
2. **Charger un fichier de réservations** : Sélectionnez un fichier texte `.txt` ou cliquez sur **"Charger un exemple de test"** pour tester instantanément avec 9 courses d'exemple.
3. **Sélectionner la date** : Choisissez la date cible (par défaut la date du lendemain).
4. **Générer le planning** : Cliquez sur *Générer le Planning Automatiquement*.
5. **Consulter et exporter** : Le planning généré affiche la répartition optimale par chauffeur, les indicateurs clés et un bouton de téléchargement au format `.TXT`.

---

## 🛡️ Sécurité & Bonnes Pratiques

- Validation stricte des données d'entrée et parsing tolérant aux fautes de frappe.
- Typage statique intégral avec TypeScript pour prévenir les erreurs d'exécution.
- Serveur Express configuré sur l'adresse `0.0.0.0:3000` compatible avec les conteneurs cloud.
- Absence d'alertes bloquantes (`window.alert`) au profit de fenêtres modales et notifications Bootstrap intégrées.

---

## 👨‍💻 Auteur & Licence

- **Développeur** : Philippe Mourey
- **Version** : 2.0.0 (Architecture Node.js / TypeScript)
- **Région** : Nice Côte d'Azur, France
