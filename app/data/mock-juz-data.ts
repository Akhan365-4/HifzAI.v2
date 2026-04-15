export type PageStatus = 'Strong' | 'Needs Review' | 'Retest Needed' | 'Not Tested';

export type MistakeType = 'missed word' | 'pronunciation' | 'wrong ayah' | 'hesitation';

export const MISTAKE_TYPES: MistakeType[] = ['missed word', 'pronunciation', 'wrong ayah', 'hesitation'];

export interface Mistake {
  id: string;
  position: number;
  type: MistakeType;
}

export interface PageData {
  pageNumber: number;
  status: PageStatus;
  mistakes: Mistake[];
}

export interface JuzData {
  juzNumber: number;
  pages: PageData[];
}

export const STATUS_CYCLE: PageStatus[] = ['Strong', 'Needs Review', 'Retest Needed', 'Not Tested'];

function generateJuzData(juzNumber: number): JuzData {
  const startPage = (juzNumber - 1) * 20 + 1;
  const pages: PageData[] = Array.from({ length: 20 }, (_, i) => ({
    pageNumber: startPage + i,
    status: STATUS_CYCLE[i % STATUS_CYCLE.length],
    mistakes: [],
  }));
  return { juzNumber, pages };
}

export const mockJuzData: JuzData[] = Array.from({ length: 30 }, (_, i) =>
  generateJuzData(i + 1),
);
