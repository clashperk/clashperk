export interface ClanGamesEntity {
  name: string;
  tag: string;
  season: string;
  initial: number;
  current: number;
  clans: { name: string; tag: string; score: number; timestamp: number }[];
  __clans: string[];
  completedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
}
