import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { dbManager } from './src/db.js';
import { ReservationParser, PlanningAlgorithm, generatePlanningText } from './src/planningEngine.js';
import { Planning } from './src/types.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = '0.0.0.0';

// Configuration Multer pour l'upload de fichiers
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// Configuration du moteur de vues
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Fichiers statiques
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use(express.static(path.join(__dirname, 'static')));

// Stockage temporaire des plannings en mémoire de session
interface SessionPlanning {
  planning: Planning;
  target_date: string;
  created_at: string;
}
const currentPlannings = new Map<string, SessionPlanning>();
let latestPlanningId = '';

// ================= ROUTES =================

// Page d'accueil
app.get('/', (req: Request, res: Response) => {
  res.render('index', {
    title: 'Accueil - Taxi Médical',
    activeTab: 'home'
  });
});

// Page À propos
app.get(['/about', '/about/'], (req: Request, res: Response) => {
  res.render('about', {
    title: 'À propos - Taxi Médical',
    activeTab: 'about'
  });
});

// Page de planification automatique
app.get('/planning_auto', (req: Request, res: Response) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDateStr = tomorrow.toISOString().split('T')[0];

  res.render('planning_auto', {
    title: 'Planification Automatique - Taxi Médical',
    activeTab: 'planning_auto',
    tomorrow_date: tomorrowDateStr
  });
});

// Upload et traitement du fichier de réservations
app.post('/upload_reservations', upload.single('reservation_file') as any, (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Aucun fichier fourni' });
      return;
    }

    const fileContent = req.file.buffer.toString('utf-8');
    if (!fileContent.trim()) {
      res.status(400).json({ error: 'Le fichier est vide' });
      return;
    }

    let targetDateStr = (req.body.target_date as string) || '';
    if (!targetDateStr) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      targetDateStr = tomorrow.toISOString().split('T')[0];
    }

    const forceReplace = req.body.force_replace === 'true';
    const existingPlanning = dbManager.getPlanningByDate(targetDateStr);

    if (existingPlanning && !forceReplace) {
      res.json({
        planning_exists: true,
        existing_planning: {
          date: existingPlanning.date,
          total_courses: existingPlanning.total_courses,
          taxis_used: existingPlanning.taxis_used,
          created_at: existingPlanning.created_at
        },
        message: `Un planning existe déjà pour le ${targetDateStr}`,
        view_url: `/view_saved_planning/${targetDateStr}`
      });
      return;
    }

    // Parsing du fichier
    const mapboxKey = process.env.MAPBOX_API_KEY || '';
    const parser = new ReservationParser(mapboxKey);
    const courses = parser.parseReservationFile(fileContent, targetDateStr);

    if (!courses || courses.length === 0) {
      res.status(400).json({ error: 'Aucune réservation reconnue dans le fichier' });
      return;
    }

    // Génération du planning
    const targetDate = new Date(targetDateStr);
    const algorithm = new PlanningAlgorithm(mapboxKey);
    const planning = algorithm.createPlanning(courses, targetDate);

    // Sauvegarde en session et en base
    const planningId = uuidv4().slice(0, 8);
    currentPlannings.set(planningId, {
      planning,
      target_date: targetDateStr,
      created_at: new Date().toISOString()
    });
    latestPlanningId = planningId;

    const archiveId = dbManager.archivePlanning(targetDateStr, planning);

    res.json({
      success: true,
      courses_found: courses.length,
      planning_created: true,
      planning_id: planningId,
      archive_id: archiveId,
      auto_saved: true,
      redirect_url: '/show_planning'
    });
  } catch (err: any) {
    console.error('Erreur upload_reservations:', err);
    res.status(500).json({ error: `Erreur lors du traitement: ${err.message}` });
  }
});

// Affichage du planning généré
app.get('/show_planning', (req: Request, res: Response) => {
  const current = currentPlannings.get(latestPlanningId);

  if (!current) {
    // Si aucun planning en mémoire, tenter de charger le plus récent de l'historique
    const recent = dbManager.getRecentPlannings(1);
    if (recent.length > 0) {
      const saved = dbManager.getPlanningByDate(recent[0].date);
      if (saved) {
        res.render('show_planning', {
          title: `Planning du ${saved.date} - Taxi Médical`,
          activeTab: 'planning_auto',
          planning: saved.planning_data,
          target_date: saved.date,
          taxis: saved.planning_data.taxis,
          statistics: saved.planning_data.statistics,
          is_saved_planning: true
        });
        return;
      }
    }

    res.redirect('/planning_auto');
    return;
  }

  res.render('show_planning', {
    title: `Planning du ${current.target_date} - Taxi Médical`,
    activeTab: 'planning_auto',
    planning: current.planning,
    target_date: current.target_date,
    taxis: current.planning.taxis,
    statistics: current.planning.statistics,
    is_saved_planning: false
  });
});

// Exportation du planning courant au format texte
app.get('/export_planning', (req: Request, res: Response) => {
  const current = currentPlannings.get(latestPlanningId);
  if (!current) {
    res.redirect('/planning_auto');
    return;
  }

  const text = generatePlanningText(current.planning, current.target_date);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=Planning_${current.target_date}.txt`);
  res.send(text);
});

// Sauvegarde du planning courant
app.post('/save_planning', (req: Request, res: Response) => {
  const current = currentPlannings.get(latestPlanningId);
  if (!current) {
    res.status(400).json({ error: 'Aucun planning en cours à sauvegarder' });
    return;
  }

  try {
    dbManager.archivePlanning(current.target_date, current.planning);
    res.json({ success: true, message: 'Planning sauvegardé avec succès' });
  } catch (err: any) {
    res.status(500).json({ error: `Erreur lors de la sauvegarde: ${err.message}` });
  }
});

// Gestion des taxis
app.get('/manage_taxis', (req: Request, res: Response) => {
  const taxis = dbManager.getAllTaxis();
  res.render('manage_taxis', {
    title: 'Gestion des Taxis - Taxi Médical',
    activeTab: 'manage_taxis',
    taxis
  });
});

// Mise à jour de la disponibilité d'un taxi
app.post('/update_taxi_availability', (req: Request, res: Response) => {
  try {
    const { taxi_id, availability_semaine, availability_weekend } = req.body;
    const ok = dbManager.updateTaxiAvailability(Number(taxi_id), availability_semaine, availability_weekend);

    if (ok) {
      res.json({ success: true, message: 'Disponibilité mise à jour' });
    } else {
      res.status(404).json({ error: 'Taxi non trouvé' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Historique des plannings archivés
app.get('/planning_history', (req: Request, res: Response) => {
  const archives = dbManager.getRecentPlannings(30);
  res.render('planning_history', {
    title: 'Historique des Plannings - Taxi Médical',
    activeTab: 'history',
    archives
  });
});

// Consultation d'un planning archivé
app.get('/view_saved_planning/:date', (req: Request, res: Response) => {
  const date = req.params.date;
  const saved = dbManager.getPlanningByDate(date);

  if (!saved) {
    res.redirect('/planning_history');
    return;
  }

  res.render('show_planning', {
    title: `Planning du ${saved.date} (Sauvegardé) - Taxi Médical`,
    activeTab: 'history',
    planning: saved.planning_data,
    target_date: saved.date,
    taxis: saved.planning_data.taxis,
    statistics: saved.planning_data.statistics,
    is_saved_planning: true
  });
});

// Vérification de l'existence d'un planning pour une date
app.get('/check_existing_planning/:date', (req: Request, res: Response) => {
  const date = req.params.date;
  const existing = dbManager.getPlanningByDate(date);

  if (existing) {
    res.json({
      exists: true,
      planning: {
        date: existing.date,
        total_courses: existing.total_courses,
        taxis_used: existing.taxis_used,
        created_at: existing.created_at
      },
      view_url: `/view_saved_planning/${date}`
    });
  } else {
    res.json({ exists: false });
  }
});

// Exportation d'un planning archivé au format texte
app.get('/export_saved_planning/:date', (req: Request, res: Response) => {
  const date = req.params.date;
  const saved = dbManager.getPlanningByDate(date);

  if (!saved) {
    res.status(404).json({ error: 'Planning non trouvé' });
    return;
  }

  const text = generatePlanningText(saved.planning_data, date);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=Planning_${date}.txt`);
  res.send(text);
});

// Suppression d'un planning archivé
app.post('/delete_planning/:date', (req: Request, res: Response) => {
  const date = req.params.date;
  const ok = dbManager.deletePlanning(date);

  if (ok) {
    res.json({
      success: true,
      message: `Planning du ${date} supprimé avec succès`
    });
  } else {
    res.status(404).json({ error: 'Planning non trouvé' });
  }
});

// Page de maintenance de la base de données
app.get('/database_maintenance', (req: Request, res: Response) => {
  const stats = dbManager.getDatabaseStats();
  res.render('database_maintenance', {
    title: 'Maintenance Base de Données - Taxi Médical',
    activeTab: 'maintenance',
    stats
  });
});

// Nettoyage des doublons
app.post('/clean_duplicates', (req: Request, res: Response) => {
  try {
    const results = dbManager.cleanDuplicates();
    res.json({
      success: true,
      message: 'Nettoyage terminé avec succès',
      results
    });
  } catch (err: any) {
    res.status(500).json({ error: `Erreur lors du nettoyage: ${err.message}` });
  }
});

// Statistiques de la base en JSON
app.get('/database_stats', (req: Request, res: Response) => {
  try {
    const stats = dbManager.getDatabaseStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Plannings récents au format HTML pour la page d'accueil
app.get('/recent_plannings', (req: Request, res: Response) => {
  try {
    const plannings = dbManager.getRecentPlannings(3);
    if (!plannings || plannings.length === 0) {
      res.send('<div class="alert alert-warning mb-0">Aucun planning archivé</div>');
      return;
    }

    let html = '';
    for (const p of plannings) {
      html += `<div class="planning-item" data-date="${p.date}" data-taxi="${p.taxis_used}" data-url="/view_saved_planning/${p.date}">
        <span><strong>Date :</strong> ${p.date}</span><br>
        <span><strong>Courses :</strong> ${p.total_courses}</span><br>
        <span><strong>Taxis :</strong> ${p.taxis_used}</span><br>
        <span><strong>Créé le :</strong> ${p.created_at.slice(0, 16).replace('T', ' à ')}</span>
      </div>`;
    }
    res.send(html);
  } catch (err: any) {
    res.status(500).send(`<div class="alert alert-danger mb-0">Erreur: ${err.message}</div>`);
  }
});

// Redirection de courtoisie pour l'ancienne route /planning
app.all('/planning', (req: Request, res: Response) => {
  res.redirect('/planning_auto');
});

// Démarrage du serveur
app.listen(PORT, HOST, () => {
  console.log(`Serveur GestionTaxis démarré sur http://${HOST}:${PORT}`);
});
