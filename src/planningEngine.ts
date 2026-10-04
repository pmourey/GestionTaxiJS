import { Course, Planning, TaxiSchedule, PlanningStats } from './types.js';
import { dbManager } from './db.js';

export class ReservationParser {
  private mapboxApiKey: string;

  constructor(mapboxApiKey: string = '') {
    this.mapboxApiKey = mapboxApiKey;
  }

  public parseReservationFile(fileContent: string, targetDateStr: string): Course[] {
    const courses: Course[] = [];
    const allLines = fileContent.split(/\r?\n/);

    const timePatterns = [
      /\b(\d{1,2}[Hh]\d{2})\b/,
      /\b(\d{1,2}:\d{2})\b/
    ];
    const namePattern = /\(([^)]+)\)/;

    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i].trim();
      if (!line) continue;

      let timeMatch: RegExpMatchArray | null = null;
      for (const pattern of timePatterns) {
        timeMatch = line.match(pattern);
        if (timeMatch) break;
      }

      if (timeMatch && namePattern.test(line)) {
        const contextLines: string[] = [];
        for (let j = i + 1; j < Math.min(i + 5, allLines.length); j++) {
          const nextLine = allLines[j].trim();
          if (!nextLine) continue;
          if (timePatterns.some(p => p.test(nextLine)) && namePattern.test(nextLine)) {
            break;
          }
          contextLines.push(nextLine);
        }

        const course = this.parseSingleCourse(line, contextLines, targetDateStr);
        if (course) {
          courses.push(course);
        }
      }
    }

    return courses;
  }

  private parseSingleCourse(mainLine: string, contextLines: string[], targetDateStr: string): Course | null {
    const timeMatch = mainLine.match(/\b(\d{1,2}[Hh]\d{2})\b/) || mainLine.match(/\b(\d{1,2}:\d{2})\b/);
    const nameMatch = mainLine.match(/\(([^)]+)\)/);

    if (!timeMatch || !nameMatch) return null;

    const time = this.normalizeTime(timeMatch[1]);
    const patientName = nameMatch[1].trim();

    // Phone extraction
    const phoneMatch = mainLine.match(/(\d{2}\s+\d{2}\s+\d{2}\s+\d{2}\s+\d{2}|\d{4}\s+\d{2}\s+\d{2}\s+\d{2}\s+\d{2}|\d{10})/);
    const phone = phoneMatch ? phoneMatch[1] : '';

    // Destination extraction: DEST ... << or DEST ...
    const destMatch = mainLine.match(/DEST\s+([^<\n]+?)(?:\s*<<|$)/i);
    const destination = destMatch ? destMatch[1].trim() : 'Destination non spécifiée';

    // Pickup address extraction
    let pickupAddress = '';
    const nameEnd = (mainLine.indexOf(nameMatch[0]) + nameMatch[0].length);
    if (destMatch && destMatch.index !== undefined) {
      pickupAddress = mainLine.slice(nameEnd, destMatch.index).trim();
    } else {
      pickupAddress = mainLine.slice(nameEnd).trim();
    }

    // Clean address: remove trailing phone and punctuation
    pickupAddress = pickupAddress.replace(/\s*-?\s*\d{2,4}\s+\d{2}\s+\d{2}\s+\d{2}\s+\d{2}\s*$/, '');
    pickupAddress = pickupAddress.replace(/^[\s\-–—]+|[\s\-–—]+$/g, '').trim();

    // Context analysis
    const allContext = contextLines.join(' ');
    const exoneration = /EXO\s+OUI/i.test(allContext);

    let transportInfo = '';
    const transportMatch = allContext.match(/<<([^<\n]+)/);
    if (transportMatch) {
      transportInfo = transportMatch[1].trim();
    }

    const specialInstructions = this.extractSpecialInstructions(allContext);

    // Geocoding simulation / sector assignment
    const { pickupCoords, destCoords } = this.estimateCoordinates(pickupAddress, destination);

    const course: Course = {
      date: targetDateStr,
      time,
      patient_name: patientName,
      phone,
      pickup_address: pickupAddress || 'Nice Centre',
      destination,
      exoneration,
      transport_info: transportInfo || 'BT AU RETOUR',
      special_instructions: specialInstructions,
      raw_text: mainLine,
      pickup_lat: pickupCoords.lat,
      pickup_lng: pickupCoords.lng,
      destination_lat: destCoords.lat,
      destination_lng: destCoords.lng
    };

    return course;
  }

  private normalizeTime(timeStr: string): string {
    let clean = timeStr.toUpperCase().replace('H', ':');
    if (!clean.includes(':')) {
      clean += ':00';
    }
    const parts = clean.split(':');
    const hh = parts[0].padStart(2, '0');
    const mm = parts[1] ? parts[1].padEnd(2, '0') : '00';
    return `${hh}:${mm}`;
  }

  private extractSpecialInstructions(line: string): string {
    const instructions: string[] = [];
    const upper = line.toUpperCase();
    if (upper.includes('OUVRIR LES PORTES')) {
      instructions.push('Ouvrir les portes à la personne');
    }
    if (upper.includes('DOIT ETRE A L HEURE') || upper.includes('DOIT ETRE A L\'HEURE')) {
      instructions.push("Doit être à l'heure");
    }
    if (upper.includes('CHIMIO')) {
      instructions.push('Chimiothérapie');
    }
    if (upper.includes('IMMUNOTHERAPIE') || upper.includes('IMMUNO')) {
      instructions.push('Immunothérapie');
    }
    if (upper.includes('FAUTEUIL')) {
      instructions.push('Fauteuil roulant');
    }
    return instructions.join('; ');
  }

  private estimateCoordinates(pickupAddress: string, destination: string): {
    pickupCoords: { lat: number; lng: number };
    destCoords: { lat: number; lng: number };
  } {
    // Coordonnées de base pour Nice
    const knownLocations: Record<string, { lat: number; lng: number }> = {
      'lacassagne': { lat: 43.7123, lng: 7.2456 },
      'archet': { lat: 43.7500, lng: 7.2833 },
      'pasteur': { lat: 43.6892, lng: 7.2707 },
      'cyclotron': { lat: 43.7184, lng: 7.2677 },
      'iufc': { lat: 43.7034, lng: 7.2663 },
      'sources': { lat: 43.7200, lng: 7.3000 },
      'lenval': { lat: 43.6875, lng: 7.2348 },
      'cimiez': { lat: 43.7198, lng: 7.2770 },
      'gambetta': { lat: 43.7011, lng: 7.2530 },
      'promenade': { lat: 43.6936, lng: 7.2450 },
      'gorbella': { lat: 43.7250, lng: 7.2560 },
      'gare': { lat: 43.7040, lng: 7.2620 },
      'port': { lat: 43.6980, lng: 7.2850 }
    };

    let pickupCoords = { lat: 43.7034, lng: 7.2663 }; // Nice centre par défaut
    let destCoords = { lat: 43.6892, lng: 7.2707 }; // Pasteur 2 par défaut

    const pLower = pickupAddress.toLowerCase();
    for (const [key, coords] of Object.entries(knownLocations)) {
      if (pLower.includes(key)) {
        pickupCoords = { ...coords };
        break;
      }
    }

    const dLower = destination.toLowerCase();
    for (const [key, coords] of Object.entries(knownLocations)) {
      if (dLower.includes(key)) {
        destCoords = { ...coords };
        break;
      }
    }

    // Petite variation pour différencier les adresses similaires
    if (pickupCoords.lat === 43.7034) {
      const hash = this.simpleHash(pickupAddress);
      pickupCoords.lat += ((hash % 100) - 50) * 0.0003;
      pickupCoords.lng += (((hash >> 2) % 100) - 50) * 0.0003;
    }

    return { pickupCoords, destCoords };
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}

export class PlanningAlgorithm {
  private minIntervalMinutes = 30;
  private maxIntervalMinutes = 60;

  constructor(mapboxApiKey: string = '') {
    // mapboxApiKey optionnel
  }

  public createPlanning(courses: Course[], targetDate: Date): Planning {
    const targetDateStr = targetDate.toISOString().split('T')[0];
    const availableTaxis = dbManager.getAvailableTaxis(targetDate);

    if (availableTaxis.length === 0) {
      // Si aucun taxi n'est disponible (ex: configuration restrictive), prendre tous les taxis actifs
      const allActive = dbManager.getAllTaxis();
      for (const t of allActive) {
        availableTaxis.push({
          id: t.id,
          name: t.name,
          phone: t.phone,
          sectors: t.sector_preference ? t.sector_preference.split(',').map(s => s.trim()) : []
        });
      }
    }

    // Tri des courses par ordre chronologique
    const sortedCourses = [...courses].sort((a, b) => a.time.localeCompare(b.time));

    const taxisState: Record<string, TaxiSchedule> = {};
    for (const taxi of availableTaxis) {
      taxisState[taxi.id] = {
        name: taxi.name,
        phone: taxi.phone,
        sectors: taxi.sectors,
        courses: [],
        current_location: null,
        current_time: null,
        total_km: 0,
        total_duration_minutes: 0
      };
    }

    const unassignedCourses: Course[] = [];

    for (const course of sortedCourses) {
      const bestTaxiId = this.findBestTaxi(course, taxisState, targetDate);

      if (bestTaxiId && taxisState[bestTaxiId]) {
        this.assignCourseToTaxi(course, bestTaxiId, taxisState, targetDate);
      } else {
        unassignedCourses.push(course);
      }
    }

    const planning: Planning = {
      date: targetDateStr,
      taxis: taxisState,
      unassigned_courses: unassignedCourses,
      statistics: this.calculateStatistics(taxisState, unassignedCourses)
    };

    return planning;
  }

  private findBestTaxi(course: Course, taxis: Record<string, TaxiSchedule>, targetDate: Date): string | null {
    const [hours, minutes] = course.time.split(':').map(Number);
    const courseDatetime = new Date(targetDate);
    courseDatetime.setHours(hours, minutes, 0, 0);

    let bestTaxiId: string | null = null;
    let bestScore = Infinity;

    for (const [taxiId, taxiInfo] of Object.entries(taxis)) {
      const score = this.calculateTaxiScore(course, taxiInfo, courseDatetime);
      if (score < bestScore) {
        bestScore = score;
        bestTaxiId = taxiId;
      }
    }

    return bestScore < Infinity ? bestTaxiId : null;
  }

  private calculateTaxiScore(course: Course, taxiInfo: TaxiSchedule, courseDatetime: Date): number {
    let score = 0;

    // Vérifier la disponibilité horaire
    if (taxiInfo.current_time) {
      const [currH, currM] = taxiInfo.current_time.split(':').map(Number);
      const taxiCurrDatetime = new Date(courseDatetime);
      taxiCurrDatetime.setHours(currH, currM, 0, 0);

      if (taxiCurrDatetime > courseDatetime) {
        return Infinity; // Taxi pas encore libéré
      }

      const waitTimeMinutes = (courseDatetime.getTime() - taxiCurrDatetime.getTime()) / (60 * 1000);
      if (waitTimeMinutes >= this.minIntervalMinutes && waitTimeMinutes <= this.maxIntervalMinutes) {
        score -= 30; // Timing optimal
      } else if (waitTimeMinutes < this.minIntervalMinutes) {
        score += (this.minIntervalMinutes - waitTimeMinutes) * 3; // Pénalité si trop serré
      }
    }

    // Proximité géographique
    if (course.pickup_lat !== undefined && course.pickup_lng !== undefined) {
      if (taxiInfo.current_location) {
        const dist = this.calculateHaversine(
          taxiInfo.current_location.lat,
          taxiInfo.current_location.lng,
          course.pickup_lat,
          course.pickup_lng
        );
        score += dist * 10;
      }

      const pickupSector = this.getSectorForCoordinates(course.pickup_lat, course.pickup_lng);
      if (taxiInfo.sectors.includes(pickupSector)) {
        score -= 50; // Bonus secteur favori
      }
    }

    // Équilibrage de la charge
    score += taxiInfo.courses.length * 20;

    return score;
  }

  private assignCourseToTaxi(
    course: Course,
    taxiId: string,
    taxis: Record<string, TaxiSchedule>,
    targetDate: Date
  ): void {
    const taxiInfo = taxis[taxiId];
    if (!taxiInfo) return;

    let distanceKm = 8.5;
    let durationMinutes = 25;

    if (
      course.pickup_lat !== undefined &&
      course.pickup_lng !== undefined &&
      course.destination_lat !== undefined &&
      course.destination_lng !== undefined
    ) {
      const haversineDist = this.calculateHaversine(
        course.pickup_lat,
        course.pickup_lng,
        course.destination_lat,
        course.destination_lng
      );
      // Facteur de détour urbain à Nice (~1.3x à 1.4x)
      distanceKm = Math.max(2.0, Math.round(haversineDist * 1.35 * 10) / 10);
      // Vitesse moyenne urbaine ~22 km/h + 5 min prise en charge
      durationMinutes = Math.max(15, Math.round((distanceKm / 22) * 60 + 5));
    }

    const assignedCourse: Course = {
      ...course,
      estimated_distance_km: distanceKm,
      estimated_duration_minutes: durationMinutes
    };

    taxiInfo.courses.push(assignedCourse);

    const [h, m] = course.time.split(':').map(Number);
    const endMinutesTotal = h * 60 + m + durationMinutes;
    const endH = Math.floor(endMinutesTotal / 60) % 24;
    const endM = endMinutesTotal % 60;
    const endHStr = endH.toString().padStart(2, '0');
    const endMStr = endM.toString().padStart(2, '0');

    taxiInfo.current_location = {
      lat: course.destination_lat ?? course.pickup_lat ?? 43.70,
      lng: course.destination_lng ?? course.pickup_lng ?? 7.26
    };
    taxiInfo.current_time = `${endHStr}:${endMStr}`;
    taxiInfo.total_km = Math.round((taxiInfo.total_km + distanceKm) * 10) / 10;
    taxiInfo.total_duration_minutes += durationMinutes;
  }

  private calculateHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private getSectorForCoordinates(lat: number, lng: number): string {
    if (lat > 43.74) return 'S22'; // Archet
    if (lng < 7.24) return 'S40';  // Nice Ouest
    if (lng > 7.28) return 'S30';  // Nice Est
    if (lat < 43.69) return 'S60'; // Nice Sud / Pasteur
    return 'S20';                  // Nice Nord
  }

  private calculateStatistics(taxis: Record<string, TaxiSchedule>, unassigned: Course[]): PlanningStats {
    let assignedCount = 0;
    let taxisUsed = 0;
    let totalKm = 0;
    let totalDurationMinutes = 0;

    for (const taxi of Object.values(taxis)) {
      if (taxi.courses.length > 0) {
        taxisUsed++;
        assignedCount += taxi.courses.length;
        totalKm += taxi.total_km;
        totalDurationMinutes += taxi.total_duration_minutes;
      }
    }

    const totalCourses = assignedCount + unassigned.length;
    const avgPerTaxi = taxisUsed > 0 ? Math.round((assignedCount / taxisUsed) * 10) / 10 : 0;

    return {
      total_courses: totalCourses,
      assigned_courses: assignedCount,
      unassigned_courses: unassigned.length,
      taxis_used: taxisUsed,
      total_km: Math.round(totalKm * 10) / 10,
      total_duration_hours: Math.round((totalDurationMinutes / 60) * 10) / 10,
      average_courses_per_taxi: avgPerTaxi
    };
  }
}

export function generatePlanningText(planning: Planning, targetDateStr: string): string {
  const lines: string[] = [];
  lines.push(`PLANNING TAXI MEDICAL - ${targetDateStr}`);
  lines.push('==================================================');
  lines.push('');

  const stats = planning.statistics;
  if (stats) {
    lines.push(`Total courses: ${stats.assigned_courses}`);
    lines.push(`Taxis utilisés: ${stats.taxis_used}`);
    lines.push(`Courses non assignées: ${stats.unassigned_courses}`);
    lines.push(`Distance totale: ${stats.total_km.toFixed(1)} km`);
    lines.push('');
  }

  for (const taxi of Object.values(planning.taxis)) {
    if (taxi.courses.length > 0) {
      lines.push(`---------------- ${taxi.name}`);
      lines.push('');

      const sortedCourses = [...taxi.courses].sort((a, b) => a.time.localeCompare(b.time));
      for (const course of sortedCourses) {
        lines.push(
          `${course.time} (${course.patient_name}) ${course.pickup_address} - ${course.phone} DEST ${course.destination} <<${course.transport_info || 'BT AU RETOUR'}`
        );

        if (course.exoneration) {
          lines.push('EXO OUI');
        }

        if (course.special_instructions) {
          lines.push(`Instructions: ${course.special_instructions}`);
        }

        lines.push('');
      }
      lines.push('');
    }
  }

  if (planning.unassigned_courses && planning.unassigned_courses.length > 0) {
    lines.push('---------------- COURSES NON ASSIGNEES');
    lines.push('');
    for (const course of planning.unassigned_courses) {
      lines.push(`${course.time} (${course.patient_name}) ${course.pickup_address} -> ${course.destination}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
