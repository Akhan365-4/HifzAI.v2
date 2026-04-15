import { type PageStatus } from '@/data/mock-juz-data';

export type Difficulty = 'Novice' | 'Easy' | 'Medium' | 'Pro';

export const DIFFICULTIES: Difficulty[] = ['Novice', 'Easy', 'Medium', 'Pro'];

export const MAX_MISTAKES: Record<Difficulty, number> = {
  Novice: Infinity,
  Easy: 5,
  Medium: 3,
  Pro: 1,
};

export function evaluateTest(mistakeCount: number, difficulty: Difficulty): PageStatus {
  if (mistakeCount === 0) return 'Strong';
  if (difficulty === 'Novice') return 'Needs Review';
  if (mistakeCount < MAX_MISTAKES[difficulty]) return 'Needs Review';
  return 'Retest Needed';
}
