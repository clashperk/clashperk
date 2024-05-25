export interface PlayersEntity {
  name: string;
  tag: string;
  clan: Partial<{
    name: string;
    tag: string;
  }>;
  leagueId: number;
  townHallLevel: number;
  seasons: Record<string, number>;
  lastSeen: Date;
}
