export const achievements = {
  'Most Valuable Clanmate': 'capitalGoldContributions',
  'Aggressive Capitalism': 'clanCapitalRaids',
  'Games Champion': 'clanGamesPoints',

  'Heroic Heist': 'darkElixirLoots',
  'Elixir Escapade': 'elixirLoots',
  'Gold Grab': 'goldLoots',

  // 'Well Seasoned': 'seasonChallengePoints',

  'Siege Sharer': 'siegeMachinesDonations',
  'Friend in Need': 'troopsDonations',
  'Sharing is caring': 'spellsDonations',

  'War Hero': 'clanWarStars',
  'War League Legend': 'clanWarLeagueStars'
} as const;

type GetDictValue<T extends string, O> = T extends keyof O ? O[T] : never;
type AchievementsValues = GetDictValue<keyof typeof achievements, typeof achievements>;
type AchievementsMap = { [key in AchievementsValues]: { initial: number; current: number } };

export interface PlayerSeasonsEntity extends AchievementsMap {
  name: string;
  tag: string;
  season: string;
  townHallLevel: number;
  builderHallLevel: number;
  attackWins: number;
  defenseWins: number;
  versusTrophies: {
    initial: number;
    current: number;
  };
  versusBattleWins: {
    initial: number;
    current: number;
  };
  builderBaseAttacksWon?: number;
  trophies: {
    initial: number;
    current: number;
  };
  clans?: Record<
    string,
    {
      tag: string;
      name: string;
      donations: {
        current: number;
        total: number;
      };
      donationsReceived: {
        current: number;
        total: number;
      };
      createdTimestamp: number;
      updatedTimestamp: number;
    }
  >;
  __clans: string[];
  updatedAt: Date;
  createdAt: Date;
}
