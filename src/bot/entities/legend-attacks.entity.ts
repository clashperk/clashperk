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
  }[];
}
