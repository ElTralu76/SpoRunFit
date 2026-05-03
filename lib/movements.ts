import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'sporunfit_custom_movements';

export const DEFAULT_MOVEMENTS = [
  // Haltérophilie
  'Air Squat', 'Back Squat', 'Front Squat', 'Overhead Squat', 'Pistol',
  'Deadlift', 'Romanian Deadlift', 'Sumo Deadlift High Pull',
  'Bench Press', 'Strict Press', 'Push Press', 'Push Jerk', 'Split Jerk',
  'Clean', 'Power Clean', 'Hang Power Clean', 'Hang Clean',
  'Snatch', 'Power Snatch', 'Hang Power Snatch',
  'Clean & Jerk', 'Thruster', 'Wall Ball',
  'KB Swing', 'KB Goblet Squat', 'KB Press', 'KB Snatch',
  // Gymnastique
  'Pull-up', 'Chest-to-Bar', 'Muscle-up (barre)', 'Muscle-up (anneaux)',
  'Toes-to-Bar', 'Knees-to-Elbows',
  'Push-up', 'Dip (barre)', 'Dip (anneaux)',
  'Handstand Push-up', 'Handstand Walk', 'Wall Walk',
  'Box Jump', 'Box Step-up',
  'Burpee', 'Burpee Box Jump', 'Burpee Pull-up',
  'Double Under', 'Single Under',
  'Rope Climb', 'L-sit', 'Ring Row',
  'GHD Sit-up', 'Sit-up', 'V-up',
  // Cardio machine
  'Row (kcal)', 'Row (m)', 'Bike (kcal)', 'Ski Erg (kcal)',
  'Run (m)', 'Run (km)',
  // Renfo accessoire
  'Lunge', 'Step-up', 'Good Morning', 'Hip Thrust',
  'Nordic Curl', 'Back Extension',
  'Farmer Carry', 'Sandbag Clean', 'Atlas Stone',
];

// Cache mémoire
let _all: string[] = [...DEFAULT_MOVEMENTS];
let _loaded = false;

export async function loadMovements(): Promise<string[]> {
  if (_loaded) return _all;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const custom: string[] = JSON.parse(stored);
      const extra = custom.filter(m => !DEFAULT_MOVEMENTS.includes(m));
      _all = [...DEFAULT_MOVEMENTS, ...extra];
    }
  } catch {}
  _loaded = true;
  return _all;
}

export async function addMovement(name: string): Promise<string[]> {
  const trimmed = name.trim();
  if (!trimmed || _all.map(m => m.toLowerCase()).includes(trimmed.toLowerCase())) {
    return _all;
  }
  _all = [..._all, trimmed];
  try {
    const custom = _all.filter(m => !DEFAULT_MOVEMENTS.includes(m));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
  } catch {}
  return _all;
}

export function getMovements(): string[] {
  return _all;
}
