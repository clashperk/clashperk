import { WarType } from '@app/constants';
import { APIClanWar } from 'clashofclans.js';

export interface ClanWarsEntity extends Omit<APIClanWar, 'startTime' | 'endTime'> {
  id: number;
  warType: WarType;
  startTime: Date | string;
  endTime: Date | string;
}
