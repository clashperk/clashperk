export interface CapitalRanksEntity {
  countryCode: string;
  clans: {
    tag: string;
    name: string;
    rank: number;
    clanCapitalPoints: number;
  }[];
  country: string;
  season: string;
}
