export interface FlagAlertLogsEntity {
  guildId: string;
  name: string;
  roleId: string | null;
  useAutoRole: boolean;
  channelId: string;
  webhook: {
    id: string;
    token: string;
  } | null;
  updatedAt: Date;
  createdAt: Date;
}
