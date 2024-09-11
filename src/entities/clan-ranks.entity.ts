export interface ClanRanksEntity {
  countryCode: string;
  clans: {
    tag: string;
    name: string;
    rank: number;
    clanPoints: number;
  }[];
  country: string;
  season: string;
}
