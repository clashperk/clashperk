export interface LegendAttacksEntity {
  tag: string;
  name: string;
  initial: number;
  trophies: number;
  seasonId: string;
  logs: {
    start: number;
    end: number;
    inc: number;
    timestamp: number;
    type?: string;
  }[];
  streak: number;
  attackLogs?: Record<string, number>;
  defenseLogs?: Record<string, number>;
}
