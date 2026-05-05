const BASE_URL = 'https://api.alquran.cloud/v1';

export interface Ayah {
  number: number;
  numberInSurah: number;
  text: string;
}

interface SurahApiResponse {
  code: number;
  status: string;
  data: {
    ayahs: { number: number; numberInSurah: number; text: string }[];
  };
}

const cache = new Map<number, Ayah[]>();

export async function fetchSurahUthmani(surahNumber: number): Promise<Ayah[]> {
  const cached = cache.get(surahNumber);
  if (cached) return cached;

  const res = await fetch(`${BASE_URL}/surah/${surahNumber}/quran-uthmani`);
  if (!res.ok) {
    throw new Error(`Failed to fetch surah ${surahNumber}: ${res.status}`);
  }

  const json: SurahApiResponse = await res.json();
  const ayahs: Ayah[] = json.data.ayahs.map((a) => ({
    number: a.number,
    numberInSurah: a.numberInSurah,
    text: a.text,
  }));

  cache.set(surahNumber, ayahs);
  return ayahs;
}

/**
 * Temporary page-to-surah mapping for development.
 * Real mushaf page mapping (page → surah + ayah ranges) will replace this later.
 */
export const PAGE_TO_SURAH: Record<number, number> = {
  1: 1,
  2: 2,
};
