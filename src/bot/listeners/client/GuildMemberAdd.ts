import { GuildMember } from 'discord.js';
import { Collections } from '../../util/Constants.js';
import { Listener } from '../../lib/index.js';
import { PlayerLinks } from '../../types/index.js';

export default class GuildMemberAddListener extends Listener {
	public constructor() {
		super('guildMemberAdd', {
			emitter: 'client',
			event: 'guildMemberAdd',
			category: 'client'
		});
	}

	public async exec(member: GuildMember) {
		const clans = await this.client.db
			.collection<{ tag: string }>(Collections.CLAN_STORES)
			.find({ guild: member.guild.id, active: true, paused: false }, { projection: { tag: 1, _id: 0 } })
			.toArray();
		if (!clans.length) return;

		const links = await this.client.db.collection<PlayerLinks>(Collections.PLAYER_LINKS).find({ userId: member.id }).toArray();
		if (!links.length) return;

		const clanTags = clans.map((clan) => clan.tag);
		const players = (await this.client.http.detailedClanMembers(links))
			.filter((res) => res.ok)
			.filter((en) => en.clan && clanTags.includes(en.clan.tag));

		for (const data of players) {
			await this.client.rpcHandler.roleManager.newLink(data);
		}
	}
}
