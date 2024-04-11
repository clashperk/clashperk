export interface CustomBotsEntity {
	applicationId: string;
	token: string;
	name: string;
	userId: string;
	patronId: string;
	guildIds: string[];
	isLive: boolean;
	updatedAt: Date;
	createdAt: Date;
}
