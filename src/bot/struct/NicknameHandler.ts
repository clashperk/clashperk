import { Player } from 'clashofclans.js';
import { GuildMember } from 'discord.js';
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

	public async exec(member: GuildMember, player: Player, reason?: string) {
		const isAuto = this.client.settings.get<boolean>(member.guild, Settings.AUTO_NICKNAME, false);
		if (!isAuto) return null;

		return this.handle(member, player, reason);
	}

	private async handle(member: GuildMember, player: Player, reason?: string) {
		if (member.id === member.guild.ownerId) return null;
		if (member.guild.members.me!.roles.highest.position <= member.roles.highest.position) return null;

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
				role: player.role
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
		},
		format: string
	) {
		return format
			.replace(/{NAME}/gi, player.name)
			.replace(/{TH}/gi, player.townHallLevel.toString())
			.replace(/{ROLE}/gi, player.role ? roles[player.role] : '')
			.replace(/{ALIAS}/gi, player.alias ?? '')
			.replace(/{CLAN}/gi, player.clan ?? '')
			.trim();
	}
}
