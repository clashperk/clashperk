import { APIPlayer } from 'clashofclans.js';
import { GuildMember, PermissionFlagsBits } from 'discord.js';
import { Collections, Settings } from '../util/Constants.js';
import Client from './Client.js';

const roles: Record<string, string> = {
	leader: 'Lead',
	coLeader: 'Co-Lead',
	admin: 'Eld',
	member: 'Mem'
};

export class NicknameHandler {
	public constructor(private readonly client: Client) {
		this.client = client;
	}

	public async exec(member: GuildMember, player: APIPlayer, reason?: string) {
		const isAuto = this.client.settings.get<boolean>(member.guild, Settings.AUTO_NICKNAME, false);
		if (!isAuto) return null;

		return this.handle(member, player, reason);
	}

	public async handle(member: GuildMember, player: APIPlayer, reason?: string) {
		if (member.id === member.guild.ownerId) return null;
		if (!member.guild.members.me?.permissions.has(PermissionFlagsBits.ManageNicknames)) return null;
		if (member.guild.members.me.roles.highest.position <= member.roles.highest.position) return null;

		const clan = player.clan
			? await this.client.db.collection(Collections.CLAN_STORES).findOne({ guild: member.guild.id, tag: player.clan.tag })
			: null;

		const alias = clan?.alias ?? null;
		const format = this.client.settings.get<string>(member.guild, Settings.NICKNAME_EXPRESSION, '{NAME}');
		const nickname = this.getName(
			{
				name: player.name,
				townHallLevel: player.townHallLevel,
				alias,
				clan: player.clan?.name ?? null,
				role: player.role,
				displayName: member.user.displayName,
				username: member.user.username
			},
			format
		);

		if (member.nickname === nickname) return nickname;
		reason ??= `- automatic nickname for ${player.name} (${player.tag})`;
		await member.setNickname(nickname.substring(0, 31), reason);
		return nickname;
	}

	public getName(
		player: {
			name: string;
			townHallLevel: number;
			role?: string | null;
			clan?: string | null;
			alias?: string | null;
			displayName: string;
			username: string;
		},
		format: string
	) {
		return format
			.replace(/{NAME}|{PLAYER_NAME}/gi, player.name)
			.replace(/{TH}|{TOWN_HALL}/gi, player.townHallLevel.toString())
			.replace(/{ROLE}|{CLAN_ROLE}/gi, player.role ? roles[player.role] : '')
			.replace(/{ALIAS}|{CLAN_ALIAS}/gi, player.alias ?? '')
			.replace(/{CLAN}|{CLAN_NAME}/gi, player.clan ?? '')
			.replace(/{DISCORD}|{DISCORD_NAME}/gi, player.displayName)
			.replace(/{USERNAME}|{DISCORD_USERNAME}/gi, player.username)
			.trim();
	}
}
