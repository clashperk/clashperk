export interface CapitalRaidSeasonsEntity {
  name: string;
  tag: string;
  state: string;
  weekId: string;
  members: RaidAttack[];
  updatedAt: Date;
  createdAt: Date;
  capitalTotalLoot: number;
  defensiveReward: number;
  endDate: Date;
  enemyDistrictsDestroyed: number;
  offensiveReward: number;
  raidsCompleted: number;
  startDate: Date;
  totalAttacks: number;
  _clanCapitalPoints?: number;
  clanCapitalPoints?: number;
  capitalLeague?: {
    id: number;
    name: string;
  };
  _capitalLeague?: {
    id: number;
    name: string;
  };
}

interface RaidAttack {
  name: string;
  tag: string;
  attacks: number;
  attackLimit: number;
  bonusAttackLimit: number;
  capitalResourcesLooted: number;
}
