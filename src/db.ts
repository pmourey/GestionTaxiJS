import { Taxi, Sector, LocationItem, Course, Planning, PlanningArchive, DatabaseStats } from './types.js';

export class DatabaseManager {
  private taxis: Taxi[] = [];
  private sectors: Sector[] = [];
  private locations: LocationItem[] = [];
  private courses: Course[] = [];
  private archives: PlanningArchive[] = [];
  private nextArchiveId = 1;

  constructor() {
    this.initDatabase();
  }

  private initDatabase(): void {
    // 1. Initialiser les secteurs
    this.sectors = [
      { id: 1, code: 'S10', name: 'Nice Centre', center_lat: 43.7034, center_lng: 7.2663, radius: 2.0 },
      { id: 2, code: 'S20', name: 'Nice Nord', center_lat: 43.7184, center_lng: 7.2677, radius: 3.0 },
      { id: 3, code: 'S22', name: 'Archet', center_lat: 43.7500, center_lng: 7.2833, radius: 2.5 },
      { id: 4, code: 'S30', name: 'Nice Est', center_lat: 43.7102, center_lng: 7.2820, radius: 2.5 },
      { id: 5, code: 'S40', name: 'Nice Ouest', center_lat: 43.6936, center_lng: 7.2364, radius: 3.0 },
      { id: 6, code: 'S60', name: 'Nice Sud/Pasteur', center_lat: 43.6892, center_lng: 7.2707, radius: 2.0 },
      { id: 7, code: 'S70', name: 'Périphérie', center_lat: 43.7200, center_lng: 7.3000, radius: 5.0 },
    ];

    // 2. Initialiser les hôpitaux & lieux fréquents
    this.locations = [
      { id: 1, address: 'Nice LACASSAGNE BAT A', city: 'Nice', latitude: 43.7123, longitude: 7.2456, location_type: 'hospital', is_frequent: true },
      { id: 2, address: 'Nice LACASSAGNE BAT B', city: 'Nice', latitude: 43.7125, longitude: 7.2458, location_type: 'hospital', is_frequent: true },
      { id: 3, address: 'NICE HOPITAL ARCHET 2', city: 'Nice', latitude: 43.7500, longitude: 7.2833, location_type: 'hospital', is_frequent: true },
      { id: 4, address: 'NICE HOPITAL PASTEUR 2', city: 'Nice', latitude: 43.6892, longitude: 7.2707, location_type: 'hospital', is_frequent: true },
      { id: 5, address: 'Nice CYCLOTRON', city: 'Nice', latitude: 43.7184, longitude: 7.2677, location_type: 'hospital', is_frequent: true },
      { id: 6, address: 'NICE IUFC', city: 'Nice', latitude: 43.7034, longitude: 7.2663, location_type: 'hospital', is_frequent: true },
      { id: 7, address: 'Hôpital Les Sources', city: 'Nice', latitude: 43.7200, longitude: 7.3000, location_type: 'hospital', is_frequent: true },
    ];

    // 3. Initialiser les taxis
    const defaultWeekday = { lundi: true, mardi: true, mercredi: true, jeudi: true, vendredi: true };
    const defaultWeekendOff = { samedi: false, dimanche: false };
    const saturdayOn = { samedi: true, dimanche: false };
    const weekendAllOn = { samedi: true, dimanche: true };

    this.taxis = [
      { id: 1, name: 'ALAIN 242', phone: '242', sector_preference: 'S20,S22', disponibility_semaine: { ...defaultWeekday }, disponibility_weekend: { ...defaultWeekendOff }, active: true },
      { id: 2, name: 'ALEX 429', phone: '429', sector_preference: 'S20,S22,S60', disponibility_semaine: { ...defaultWeekday }, disponibility_weekend: { ...saturdayOn }, active: true },
      { id: 3, name: 'YANN 343', phone: '343', sector_preference: 'S60', disponibility_semaine: { ...defaultWeekday }, disponibility_weekend: { ...defaultWeekendOff }, active: true },
      { id: 4, name: 'LAURENT 286', phone: '286', sector_preference: 'S40,S30', disponibility_semaine: { ...defaultWeekday }, disponibility_weekend: { ...saturdayOn }, active: true },
      { id: 5, name: 'MAXIME 346', phone: '346', sector_preference: 'S60', disponibility_semaine: { ...defaultWeekday }, disponibility_weekend: { ...defaultWeekendOff }, active: true },
      { id: 6, name: 'JULIEN 331', phone: '331', sector_preference: 'S22,S30', disponibility_semaine: { ...defaultWeekday }, disponibility_weekend: { ...defaultWeekendOff }, active: true },
      { id: 7, name: 'LUDO 227', phone: '227', sector_preference: 'S70', disponibility_semaine: { ...defaultWeekday }, disponibility_weekend: { ...defaultWeekendOff }, active: true },
      { id: 8, name: 'AURELIEN 222', phone: '222', sector_preference: 'S30', disponibility_semaine: { ...defaultWeekday }, disponibility_weekend: { ...defaultWeekendOff }, active: true },
      { id: 9, name: 'MARC 92', phone: '92', sector_preference: 'S60', disponibility_semaine: { ...defaultWeekday }, disponibility_weekend: { ...defaultWeekendOff }, active: true },
      { id: 10, name: 'SAM 10', phone: '10', sector_preference: 'S60', disponibility_semaine: { ...defaultWeekday }, disponibility_weekend: { ...weekendAllOn }, active: true },
      { id: 11, name: 'SYLVIE 141', phone: '141', sector_preference: 'S22', disponibility_semaine: { ...defaultWeekday }, disponibility_weekend: { ...defaultWeekendOff }, active: true },
      { id: 12, name: 'CHARLES 203', phone: '203', sector_preference: 'S30', disponibility_semaine: { ...defaultWeekday }, disponibility_weekend: { ...defaultWeekendOff }, active: true },
      { id: 13, name: 'FRANCK 37', phone: '37', sector_preference: 'S60', disponibility_semaine: { ...defaultWeekday }, disponibility_weekend: { ...defaultWeekendOff }, active: true },
    ];

    // Initialiser un planning modèle archivé pour hier
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const samplePlanning: Planning = {
      date: yesterdayStr,
      taxis: {
        '1': {
          name: 'ALAIN 242',
          phone: '242',
          sectors: ['S20', 'S22'],
          courses: [
            {
              date: yesterdayStr,
              time: '08:00',
              patient_name: 'ROUSSEL Pierre',
              phone: '06 12 34 56 78',
              pickup_address: '14 Avenue Cyrille Besset Nice',
              destination: 'NICE HOPITAL ARCHET 2',
              exoneration: true,
              transport_info: 'BT AU RETOUR',
              special_instructions: 'Doit être à l\'heure',
              estimated_distance_km: 7.2,
              estimated_duration_minutes: 25,
            },
            {
              date: yesterdayStr,
              time: '10:30',
              patient_name: 'BLANC Marie',
              phone: '04 93 85 12 34',
              pickup_address: '22 Boulevard Gorbella Nice',
              destination: 'Nice LACASSAGNE BAT A',
              exoneration: false,
              transport_info: '',
              special_instructions: 'Chimiothérapie',
              estimated_distance_km: 5.4,
              estimated_duration_minutes: 20,
            }
          ],
          current_location: { lat: 43.7123, lng: 7.2456 },
          current_time: '10:50',
          total_km: 12.6,
          total_duration_minutes: 45
        },
        '2': {
          name: 'ALEX 429',
          phone: '429',
          sectors: ['S20', 'S22', 'S60'],
          courses: [
            {
              date: yesterdayStr,
              time: '08:45',
              patient_name: 'DURAND Jacques',
              phone: '06 98 76 54 32',
              pickup_address: '5 Rue de la Liberté Nice',
              destination: 'NICE HOPITAL PASTEUR 2',
              exoneration: true,
              transport_info: 'BT FOURNI',
              special_instructions: '',
              estimated_distance_km: 6.8,
              estimated_duration_minutes: 22,
            }
          ],
          current_location: { lat: 43.6892, lng: 7.2707 },
          current_time: '09:07',
          total_km: 6.8,
          total_duration_minutes: 22
        }
      },
      unassigned_courses: [],
      statistics: {
        total_courses: 3,
        assigned_courses: 3,
        unassigned_courses: 0,
        taxis_used: 2,
        total_km: 19.4,
        total_duration_hours: 1.1,
        average_courses_per_taxi: 1.5
      }
    };

    this.archives.push({
      id: this.nextArchiveId++,
      date: yesterdayStr,
      planning_data: samplePlanning,
      total_courses: 3,
      taxis_used: 2,
      created_at: new Date(Date.now() - 86400000).toISOString()
    });
  }

  public getAllTaxis(): Taxi[] {
    return this.taxis.filter(t => t.active);
  }

  public getAvailableTaxis(date: Date): { id: number; name: string; phone: string; sectors: string[] }[] {
    // 0 = Dimanche, 1 = Lundi, ... 6 = Samedi
    const dayIndex = date.getDay();
    const isWeekend = dayIndex === 0 || dayIndex === 6;
    const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const currentDayName = dayNames[dayIndex];

    const available: { id: number; name: string; phone: string; sectors: string[] }[] = [];

    for (const taxi of this.taxis) {
      if (!taxi.active) continue;
      const schedule = isWeekend ? taxi.disponibility_weekend : taxi.disponibility_semaine;
      if (schedule && schedule[currentDayName]) {
        available.push({
          id: taxi.id,
          name: taxi.name,
          phone: taxi.phone,
          sectors: taxi.sector_preference ? taxi.sector_preference.split(',').map(s => s.trim()) : [],
        });
      }
    }

    return available;
  }

  public updateTaxiAvailability(
    taxiId: number,
    availabilitySemaine: Record<string, boolean>,
    availabilityWeekend: Record<string, boolean>
  ): boolean {
    const taxi = this.taxis.find(t => t.id === Number(taxiId));
    if (!taxi) return false;
    taxi.disponibility_semaine = availabilitySemaine;
    taxi.disponibility_weekend = availabilityWeekend;
    return true;
  }

  public archivePlanning(date: string, planningData: Planning): number {
    let totalCourses = 0;
    let taxisUsed = 0;

    if (planningData.taxis) {
      for (const t of Object.values(planningData.taxis)) {
        if (t.courses && t.courses.length > 0) {
          taxisUsed++;
          totalCourses += t.courses.length;
        }
      }
    }
    if (planningData.unassigned_courses) {
      totalCourses += planningData.unassigned_courses.length;
    }

    const existingIndex = this.archives.findIndex(a => a.date === date);
    if (existingIndex >= 0) {
      this.archives[existingIndex] = {
        id: this.archives[existingIndex].id,
        date,
        planning_data: planningData,
        total_courses: totalCourses,
        taxis_used: taxisUsed,
        created_at: new Date().toISOString()
      };
      return this.archives[existingIndex].id;
    } else {
      const newId = this.nextArchiveId++;
      this.archives.unshift({
        id: newId,
        date,
        planning_data: planningData,
        total_courses: totalCourses,
        taxis_used: taxisUsed,
        created_at: new Date().toISOString()
      });
      return newId;
    }
  }

  public getPlanningByDate(date: string): PlanningArchive | null {
    return this.archives.find(a => a.date === date) || null;
  }

  public getRecentPlannings(limit = 10): { id: number; date: string; total_courses: number; taxis_used: number; created_at: string }[] {
    const sorted = [...this.archives].sort((a, b) => b.date.localeCompare(a.date));
    return sorted.slice(0, limit).map(a => ({
      id: a.id,
      date: a.date,
      total_courses: a.total_courses,
      taxis_used: a.taxis_used,
      created_at: a.created_at
    }));
  }

  public planningExistsForDate(date: string): boolean {
    return this.archives.some(a => a.date === date);
  }

  public deletePlanning(date: string): boolean {
    const initialLen = this.archives.length;
    this.archives = this.archives.filter(a => a.date !== date);
    return this.archives.length < initialLen;
  }

  public cleanDuplicates(): { taxis_supprimes: number; locations_supprimees: number; secteurs_supprimes: number } {
    const seenTaxiNames = new Set<string>();
    const uniqueTaxis: Taxi[] = [];
    let taxisSupprimes = 0;

    for (const taxi of this.taxis) {
      const key = `${taxi.name}_${taxi.phone}`;
      if (seenTaxiNames.has(key)) {
        taxisSupprimes++;
      } else {
        seenTaxiNames.add(key);
        uniqueTaxis.push(taxi);
      }
    }
    this.taxis = uniqueTaxis;

    const seenLocations = new Set<string>();
    const uniqueLocations: LocationItem[] = [];
    let locationsSupprimees = 0;
    for (const loc of this.locations) {
      const key = `${loc.address.toLowerCase()}_${loc.city.toLowerCase()}`;
      if (seenLocations.has(key)) {
        locationsSupprimees++;
      } else {
        seenLocations.add(key);
        uniqueLocations.push(loc);
      }
    }
    this.locations = uniqueLocations;

    const seenSectors = new Set<string>();
    const uniqueSectors: Sector[] = [];
    let secteursSupprimes = 0;
    for (const sec of this.sectors) {
      if (seenSectors.has(sec.code)) {
        secteursSupprimes++;
      } else {
        seenSectors.add(sec.code);
        uniqueSectors.push(sec);
      }
    }
    this.sectors = uniqueSectors;

    return {
      taxis_supprimes: taxisSupprimes,
      locations_supprimees: locationsSupprimees,
      secteurs_supprimes: secteursSupprimes
    };
  }

  public getDatabaseStats(): DatabaseStats {
    // Vérifier s'il y a des doublons dans les données actuelles
    const taxiCounts = new Map<string, number>();
    for (const t of this.taxis) {
      const k = `${t.name}_${t.phone}`;
      taxiCounts.set(k, (taxiCounts.get(k) || 0) + 1);
    }
    let doublonsTaxis = 0;
    for (const c of taxiCounts.values()) {
      if (c > 1) doublonsTaxis += c - 1;
    }

    const locCounts = new Map<string, number>();
    for (const l of this.locations) {
      const k = `${l.address.toLowerCase()}_${l.city.toLowerCase()}`;
      locCounts.set(k, (locCounts.get(k) || 0) + 1);
    }
    let doublonsLocations = 0;
    for (const c of locCounts.values()) {
      if (c > 1) doublonsLocations += c - 1;
    }

    return {
      taxis_actifs: this.taxis.filter(t => t.active).length,
      secteurs: this.sectors.length,
      locations: this.locations.length,
      courses: this.courses.length,
      plannings_archives: this.archives.length,
      doublons_taxis: doublonsTaxis,
      doublons_locations: doublonsLocations
    };
  }
}

export const dbManager = new DatabaseManager();
