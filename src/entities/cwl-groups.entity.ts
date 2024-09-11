import { APIClanWarLeagueGroup } from 'clashofclans.js';

export interface ClanWarLeagueGroupsEntity extends APIClanWarLeagueGroup {
  /** leagues are available for all entries from 2023-05 */
  leagues?: Record<string, number>;
}
