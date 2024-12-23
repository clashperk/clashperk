import { WarType } from '@app/constants';
import { APIClanWar } from 'clashofclans.js';

export interface ClanWarsEntity extends Omit<APIClanWar, 'startTime'> {
  id: number;
  warType: WarType;
  startTime: Date | string;
}
