import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://api.alquran.cloud/v1';
const STORAGE_KEY = 'hifzai:quran:uthmani:v2';
const STORAGE_VERSION = 2;

export interface StoredAyah {
  number: number;
  numberInSurah: number;
  juz: number;
  page: number;
  text: string;
}

export interface StoredSurah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  numberOfAyahs: number;
  ayahs: StoredAyah[];
}

export interface QuranData {
  version: number;
  fetchedAt: number;
  surahs: StoredSurah[];
}

export interface AyahWithSurah extends StoredAyah {
  surahNumber: number;
  surahName: string;
  surahEnglishName: string;
  surahEnglishNameTranslation: string;
}

interface FullQuranApiAyah {
  number: number;
  numberInSurah: number;
  juz: number;
  page: number;
  text: string;
}

interface FullQuranApiSurah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  numberOfAyahs: number;
  ayahs: FullQuranApiAyah[];
}

interface FullQuranApiResponse {
  code: number;
  status: string;
  data: { surahs: FullQuranApiSurah[] };
}

interface QuranIndexes {
  byPage: Map<number, AyahWithSurah[]>;
  byJuz: Map<number, AyahWithSurah[]>;
  surahsByNumber: Map<number, StoredSurah>;
}

let memoryCache: QuranData | null = null;
let memoryIndexes: QuranIndexes | null = null;
let inFlight: Promise<QuranData> | null = null;

function normalize(json: FullQuranApiResponse): QuranData {
  const surahs: StoredSurah[] = json.data.surahs.map((s) => ({
    number: s.number,
    name: s.name,
    englishName: s.englishName,
    englishNameTranslation: s.englishNameTranslation,
    revelationType: s.revelationType,
    numberOfAyahs: s.numberOfAyahs,
    ayahs: s.ayahs.map((a) => ({
      number: a.number,
      numberInSurah: a.numberInSurah,
      juz: a.juz,
      page: a.page,
      text: a.text,
    })),
  }));
  return { version: STORAGE_VERSION, fetchedAt: Date.now(), surahs };
}

function buildIndexes(data: QuranData): QuranIndexes {
  const byPage = new Map<number, AyahWithSurah[]>();
  const byJuz = new Map<number, AyahWithSurah[]>();
  const surahsByNumber = new Map<number, StoredSurah>();

  for (const surah of data.surahs) {
    surahsByNumber.set(surah.number, surah);
    for (const ayah of surah.ayahs) {
      const enriched: AyahWithSurah = {
        ...ayah,
        surahNumber: surah.number,
        surahName: surah.name,
        surahEnglishName: surah.englishName,
        surahEnglishNameTranslation: surah.englishNameTranslation,
      };
      const pageBucket = byPage.get(ayah.page);
      if (pageBucket) pageBucket.push(enriched);
      else byPage.set(ayah.page, [enriched]);

      const juzBucket = byJuz.get(ayah.juz);
      if (juzBucket) juzBucket.push(enriched);
      else byJuz.set(ayah.juz, [enriched]);
    }
  }

  // Ayahs were inserted in canonical order (surah by surah, ayah by ayah),
  // so each bucket is already ordered correctly.
  return { byPage, byJuz, surahsByNumber };
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
    // Cache write failures are non-fatal; data is still in memory.
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
      memoryIndexes = buildIndexes(cached);
      return cached;
    }
    const fresh = await fetchFromApi();
    memoryCache = fresh;
    memoryIndexes = buildIndexes(fresh);
    void writeToStorage(fresh);
    return fresh;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

async function ensureIndexes(): Promise<QuranIndexes> {
  if (memoryIndexes) return memoryIndexes;
  await fetchFullQuranUthmani();
  if (!memoryIndexes) {
    throw new Error('Quran indexes were not built');
  }
  return memoryIndexes;
}

export async function getAyahsByPage(pageNumber: number): Promise<AyahWithSurah[]> {
  const indexes = await ensureIndexes();
  return indexes.byPage.get(pageNumber) ?? [];
}

export async function getAyahsByJuz(juzNumber: number): Promise<AyahWithSurah[]> {
  const indexes = await ensureIndexes();
  return indexes.byJuz.get(juzNumber) ?? [];
}

export async function getSurahs(): Promise<StoredSurah[]> {
  const data = await fetchFullQuranUthmani();
  return data.surahs;
}

export async function getSurahByNumber(surahNumber: number): Promise<StoredSurah | null> {
  const indexes = await ensureIndexes();
  return indexes.surahsByNumber.get(surahNumber) ?? null;
}
