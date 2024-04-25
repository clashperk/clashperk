export interface RoleDeletionDelaysEntity {
	guildId: string;
	userId: string;
	roles: Record<string, number>;
	createdAt: Date;
}
