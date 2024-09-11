export interface CapitalContributionsEntity {
  name: string;
  tag: string;
  season: string;
  initial: number;
  current: number;
  clans: { name: string; tag: string; contributed: number; timestamp: number }[];
  __clans: string[];
  completedAt: Date;
  updatedAt: Date;
  createdAt: Date;
}
