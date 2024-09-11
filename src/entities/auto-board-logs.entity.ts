export interface AutoBoardLogsEntity {
  guildId: string;
  name: string;
  channelId: string;
  webhook: {
    id: string;
    token: string;
  } | null;
  updatedAt: Date;
  createdAt: Date;
}
