export interface Taxi {
  id: number;
  name: string;
  phone: string;
  sector_preference: string;
  disponibility_semaine: Record<string, boolean>;
  disponibility_weekend: Record<string, boolean>;
  active: boolean;
  created_at?: string;
}

export interface Sector {
  id: number;
  code: string;
  name: string;
  center_lat: number;
  center_lng: number;
  radius: number;
}

export interface LocationItem {
  id: number;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  sector_id?: number;
  location_type: 'pickup' | 'destination' | 'hospital';
  is_frequent: boolean;
}

export interface Course {
  id?: number;
  date: string;
  time: string;
  patient_name: string;
  phone: string;
  pickup_address: string;
  destination: string;
  exoneration: boolean;
  transport_info: string;
  special_instructions: string;
  raw_text?: string;
  pickup_lat?: number;
  pickup_lng?: number;
  destination_lat?: number;
  destination_lng?: number;
  estimated_duration_minutes?: number;
  estimated_distance_km?: number;
}

export interface TaxiSchedule {
  name: string;
  phone: string;
  sectors: string[];
  courses: Course[];
  current_location: { lat: number; lng: number } | null;
  current_time: string | null;
  total_km: number;
  total_duration_minutes: number;
}

export interface PlanningStats {
  total_courses: number;
  assigned_courses: number;
  unassigned_courses: number;
  taxis_used: number;
  total_km: number;
  total_duration_hours: number;
  average_courses_per_taxi: number;
}

export interface Planning {
  date: string;
  taxis: Record<string, TaxiSchedule>;
  unassigned_courses: Course[];
  statistics?: PlanningStats;
}

export interface PlanningArchive {
  id: number;
  date: string;
  planning_data: Planning;
  total_courses: number;
  taxis_used: number;
  created_at: string;
}

export interface DatabaseStats {
  taxis_actifs: number;
  secteurs: number;
  locations: number;
  courses: number;
  plannings_archives: number;
  doublons_taxis: number;
  doublons_locations: number;
}
