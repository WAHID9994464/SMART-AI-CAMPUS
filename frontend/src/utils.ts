// Utility helpers for NexusEco with the new Warm Sustainability Design System

export function statusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'normal':
    case 'healthy':
      return '#2E6B45'; // Robin Hood green
    case 'warning':
    case 'inefficient':
      return '#D89A35'; // Amber warning
    case 'critical':
      return '#C94A42'; // Restrained Red
    case 'idle':
    case 'inactive':
      return '#6D716A'; // Secondary grey
    default:
      return '#6D716A';
  }
}

export function statusBadgeClass(status: string): string {
  switch (status?.toLowerCase()) {
    case 'normal':
    case 'healthy':
      return 'badge badge-green';
    case 'warning':
    case 'inefficient':
      return 'badge badge-yellow';
    case 'critical':
      return 'badge badge-red';
    case 'idle':
    case 'inactive':
      return 'badge badge-gray';
    default:
      return 'badge badge-gray';
  }
}

export function severityBadgeClass(severity: string): string {
  switch (severity?.toLowerCase()) {
    case 'low':
      return 'badge badge-green';
    case 'medium':
      return 'badge badge-yellow';
    case 'high':
    case 'critical':
      return 'badge badge-red';
    default:
      return 'badge badge-gray';
  }
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'N/A';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return 'Invalid date';
  }
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return 'N/A';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return 'Invalid date';
  }
}

export function formatNumber(n: number | string | null | undefined, decimals = 2): string {
  if (n === null || n === undefined || n === '') return '0';
  const val = typeof n === 'number' ? n : Number(n);
  if (isNaN(val)) return '0';
  return val.toLocaleString('en-IN', { maximumFractionDigits: decimals });
}

export function getAssetPath(imageKey: string | null | undefined): string | null {
  if (!imageKey) return null;
  const cleanKey = imageKey.trim();
  if (cleanKey.startsWith('http://') || cleanKey.startsWith('https://')) return cleanKey;

  const normalized = cleanKey.replace(/^(\/)?(assets\/)?campus\/(labs\/)?/, '');

  const map: Record<string, string> = {
    // Cafeteria
    'cafeteria': '/assets/campus/Cafeteria.jpg',
    'Cafeteria.jpg': '/assets/campus/Cafeteria.jpg',
    'Campus Cafeteria': '/assets/campus/Cafeteria.jpg',

    // Computer Lab
    'Dennis M. Ritchie Common Computer Lab(3).jpg': '/assets/campus/labs/Dennis M. Ritchie Common Computer Lab(3).jpg',
    'Dennis M. Ritchie Common Computer Lab.jpg': '/assets/campus/labs/Dennis M. Ritchie Common Computer Lab.jpg',
    'Dennis M. Ritchie Common Computer Lab': '/assets/campus/labs/Dennis M. Ritchie Common Computer Lab(3).jpg',
    'computer-lab': '/assets/campus/labs/Dennis M. Ritchie Common Computer Lab(3).jpg',

    // Chemistry Lab
    'Venkatraman Ramakrishnan Chemistry Lab (1)(1).jpg': '/assets/campus/labs/Venkatraman Ramakrishnan Chemistry Lab (1)(1).jpg',
    'Venkatraman Ramakrishnan Chemistry Lab (1).jpg': '/assets/campus/labs/Venkatraman Ramakrishnan Chemistry Lab (1).jpg',
    'Venkatraman Ramakrishnan Chemistry Lab.jpg': '/assets/campus/labs/Venkatraman Ramakrishnan Chemistry Lab.jpg',
    'Venkatraman Ramakrishnan Chemistry Lab': '/assets/campus/labs/Venkatraman Ramakrishnan Chemistry Lab (1)(1).jpg',
    'chemistry-lab': '/assets/campus/labs/Venkatraman Ramakrishnan Chemistry Lab (1)(1).jpg',
    'chemistry-lab-alt': '/assets/campus/labs/Venkatraman Ramakrishnan Chemistry Lab (1)(1).jpg',

    // Physics Lab
    'Subrahmanyan Chandrasekhar Physics Lab(1).jpg': '/assets/campus/labs/Subrahmanyan Chandrasekhar Physics Lab(1).jpg',
    'Subrahmanyan Chandrasekhar Physics Lab.jpg': '/assets/campus/labs/Subrahmanyan Chandrasekhar Physics Lab.jpg',
    'Subrahmanyan Chandrasekhar Physics Lab': '/assets/campus/labs/Subrahmanyan Chandrasekhar Physics Lab(1).jpg',
    'physics-lab': '/assets/campus/labs/Subrahmanyan Chandrasekhar Physics Lab(1).jpg',

    // Hospital & Health Sciences (Smart AI Campus)
    'school-of-health-sciences': '/assets/campus/School Of Health Sciences.jpg',
    'School Of Health Sciences.jpg': '/assets/campus/School Of Health Sciences.jpg',
    'School Of Health Sciences': '/assets/campus/School Of Health Sciences.jpg',
    'cdsimer-entrance': '/assets/campus/CDSIMER Entrance.jpg',
    'CDSIMER Entrance.jpg': '/assets/campus/CDSIMER Entrance.jpg',
    'CDSIMER Hospital': '/assets/campus/CDSIMER Entrance.jpg',
    'CDSIMER Entrance': '/assets/campus/CDSIMER Entrance.jpg',
    'hospital-emergency-block': '/assets/campus/Hospital Emergency Block.jpg',
    'Hospital Emergency Block.jpg': '/assets/campus/Hospital Emergency Block.jpg',
    'Hospital (2).jpg': '/assets/campus/Hospital Emergency Block.jpg',
    'Hospital Emergency Block': '/assets/campus/Hospital Emergency Block.jpg',
    'hospital-building-a': '/assets/campus/Hospital Building A.jpg',
    'Hospital Building A.jpg': '/assets/campus/Hospital Building A.jpg',
    'Hospital.jpg': '/assets/campus/Hospital Building A.jpg',
    'Hospital Building A': '/assets/campus/Hospital Building A.jpg',
    'hospital-building-b': '/assets/campus/Hospital Building B.jpg',
    'Hospital Building B.jpg': '/assets/campus/Hospital Building B.jpg',
    'Hospital (1).jpg': '/assets/campus/Hospital Building B.jpg',
    'Hospital Building B': '/assets/campus/Hospital Building B.jpg',

    // Academic & Buildings
    'school-of-engineering': '/assets/campus/School Of Engineering (2).jpg',
    'School Of Engineering.jpg': '/assets/campus/School Of Engineering (2).jpg',
    'School Of Engineering (2).jpg': '/assets/campus/School Of Engineering (2).jpg',
    'DAYANANDA SAGAR UNIVERSITY.jpg': '/assets/campus/DAYANANDA SAGAR UNIVERSITY.jpg',
    'library': '/assets/campus/library.jpg',
    'Library.jpg': '/assets/campus/library.jpg',
    'classroom': '/assets/campus/classroom.jpg',
    'Classroom.jpg': '/assets/campus/classroom.jpg',
    'tutorial-room': '/assets/campus/tutorial-room.jpg',
    'Tutorial Room.jpg': '/assets/campus/tutorial-room.jpg',
  };

  if (map[cleanKey]) return map[cleanKey];
  if (map[normalized]) return map[normalized];
  if (cleanKey.startsWith('/')) return cleanKey;
  return `/assets/campus/${cleanKey}`;
}

export function typeIcon(type: string): string {
  switch (type?.toLowerCase()) {
    case 'energy': return '⚡';
    case 'water': return '💧';
    case 'waste': return '♻️';
    case 'ticket': return '🔧';
    case 'ai': return '🤖';
    default: return '📋';
  }
}

// ============================================================================
// SHARED CAMPUS TIME-RANGE CONFIGURATION (8:00 AM – 4:00 PM / Asia/Kolkata)
// ============================================================================

export const CAMPUS_HOURS = {
  start: 8,  // 8:00 AM
  end: 16,   // 4:00 PM (16:00)
  timezone: 'Asia/Kolkata',
  // Canonical hourly slot labels across all campus charts
  labels: ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM'],
  slots: [8, 9, 10, 11, 12, 13, 14, 15, 16],
};

/**
 * Filter an array of time-stamped points to only include those between 08:00 and 16:00 in Asia/Kolkata.
 */
export function filterToCampusHours<T extends { time: string }>(data: T[]): T[] {
  if (!Array.isArray(data)) return [];
  return data.filter((item) => {
    try {
      const d = new Date(item.time);
      if (isNaN(d.getTime())) return false;
      const istStr = d.toLocaleTimeString('en-US', {
        timeZone: CAMPUS_HOURS.timezone,
        hour12: false,
        hour: 'numeric',
      });
      const hour = parseInt(istStr, 10);
      return hour >= CAMPUS_HOURS.start && hour <= CAMPUS_HOURS.end;
    } catch {
      return true;
    }
  });
}

/**
 * Format any ISO time string to standard campus 12-hour format in Asia/Kolkata (e.g. "9 AM", "12 PM", "3 PM").
 */
export function formatHourLabel(isoTime: string): string {
  try {
    const d = new Date(isoTime);
    if (isNaN(d.getTime())) return isoTime;
    return d.toLocaleTimeString('en-IN', {
      timeZone: CAMPUS_HOURS.timezone,
      hour: 'numeric',
      hour12: true,
    }).toUpperCase();
  } catch {
    return isoTime;
  }
}

/**
 * Check if current campus time is within the active operating window (8:00 AM - 4:00 PM IST).
 */
export function isWithinCampusHours(): boolean {
  try {
    const now = new Date();
    const istStr = now.toLocaleTimeString('en-US', {
      timeZone: CAMPUS_HOURS.timezone,
      hour12: false,
      hour: 'numeric',
    });
    const hour = parseInt(istStr, 10);
    return hour >= CAMPUS_HOURS.start && hour <= CAMPUS_HOURS.end;
  } catch {
    return true;
  }
}

// Baseline demonstration cost savings shared across Dashboard, Reports, and AI
export const ESTIMATED_DEMO_COST_SAVED_INR = 20000;

export function formatRupees(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return '₹20,000';
  const val = Math.round(Number(amount));
  return `₹${val.toLocaleString('en-IN')}`;
}

