export interface PlayerLinksEntity {
	userId: string;
	username: string;
	displayName: string;
	discriminator: string;
	tag: string;
	name: string;
	order: number;
	verified: boolean;
	createdAt: Date;
}
