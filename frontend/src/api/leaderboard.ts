import { api } from './client';

export type LBRange = 'all' | 'week' | 'day';

export function getLeaderboard(range: LBRange = 'all') {
  return api(`/api/leaderboard?range=${range}`);
}
