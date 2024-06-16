export interface CompeteBoardsEntity {
  guildId: string;
  type: 'LEGEND_LEAGUE_TROPHY';
  members: string[];
  players: {
    tag: string;
    name: string;
    userId: string;
    username: string;
  }[];
  updatedAt: Date;
  createdAt: Date;
}
