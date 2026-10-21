export interface PlayerLeagueSeasonsEntity {
  tag: string;
  name: string;
  seasonId: string;
  leagueId?: number;
  trophies: {
    initial: number;
    current: number;
  };
  versusTrophies: {
    initial: number;
    current: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
