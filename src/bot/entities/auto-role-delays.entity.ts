export interface AutoRoleDelaysEntity {
  guildId: string;
  userId: string;
  additionDelays: Record<string, number>;
  deletionDelays: Record<string, number>;
  createdAt: Date;
}
