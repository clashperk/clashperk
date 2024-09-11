export interface PlayerRanksEntity {
  countryCode: string;
  players: {
    tag: string;
    name: string;
    rank: number;
    trophies: number;
  }[];
  country: string;
  season: string;
}
