import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://api.alquran.cloud/v1';
const STORAGE_KEY = 'hifzai:quran:uthmani:v1';
const STORAGE_VERSION = 1;

export interface Ayah {
  number: number;
  numberInSurah: number;
  text: string;
}

export interface SurahData {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  numberOfAyahs: number;
  ayahs: Ayah[];
}

export interface QuranData {
  version: number;
  fetchedAt: number;
  surahs: SurahData[];
}

interface FullQuranApiResponse {
  code: number;
  status: string;
  data: {
    surahs: {
      number: number;
      name: string;
      englishName: string;
      englishNameTranslation: string;
      revelationType: string;
      numberOfAyahs: number;
      ayahs: { number: number; numberInSurah: number; text: string }[];
    }[];
  };
}

let memoryCache: QuranData | null = null;
let inFlight: Promise<QuranData> | null = null;

function normalize(json: FullQuranApiResponse): QuranData {
  const surahs: SurahData[] = json.data.surahs.map((s) => ({
    number: s.number,
    name: s.name,
    englishName: s.englishName,
    englishNameTranslation: s.englishNameTranslation,
    revelationType: s.revelationType,
    numberOfAyahs: s.numberOfAyahs,
    ayahs: s.ayahs.map((a) => ({
      number: a.number,
      numberInSurah: a.numberInSurah,
      text: a.text,
    })),
  }));
  return { version: STORAGE_VERSION, fetchedAt: Date.now(), surahs };
}

async function readFromStorage(): Promise<QuranData | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuranData;
    if (parsed?.version === STORAGE_VERSION && Array.isArray(parsed.surahs)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

async function writeToStorage(data: QuranData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Cache write failures are non-fatal; we still return the in-memory data.
  }
}

async function fetchFromApi(): Promise<QuranData> {
  const res = await fetch(`${BASE_URL}/quran/quran-uthmani`);
  if (!res.ok) {
    throw new Error(`Failed to fetch full Quran: ${res.status}`);
  }
  const json: FullQuranApiResponse = await res.json();
  return normalize(json);
}

export async function fetchFullQuranUthmani(): Promise<QuranData> {
  if (memoryCache) return memoryCache;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const cached = await readFromStorage();
    if (cached) {
      memoryCache = cached;
      return cached;
    }
    const fresh = await fetchFromApi();
    memoryCache = fresh;
    void writeToStorage(fresh);
    return fresh;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

export async function fetchSurahUthmani(surahNumber: number): Promise<SurahData> {
  const quran = await fetchFullQuranUthmani();
  const surah = quran.surahs.find((s) => s.number === surahNumber);
  if (!surah) {
    throw new Error(`Surah ${surahNumber} not found`);
  }
  return surah;
}

/**
 * Temporary page-to-surah mapping for development.
 * Real 604-page mushaf mapping (page → surah + ayah ranges) will replace this later.
 */
export const PAGE_TO_SURAH: Record<number, number> = {
  1: 1,
  2: 2,
};
