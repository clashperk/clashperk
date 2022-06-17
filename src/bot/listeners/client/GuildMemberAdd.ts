import { GuildMember } from 'discord.js';
import { Collections } from '../../util/Constants';
import { Listener } from '../../lib';
import { UserInfo } from '../../types';

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
			.find({ guild: member.guild.id, autoRole: { $gt: 0 } }, { projection: { tag: 1, _id: 0 } })
			.toArray();
		if (!clans.length) return;

		const data = await this.client.db.collection<UserInfo>(Collections.LINKED_PLAYERS).findOne({ user: member.id });
		if (!data?.entries.length) return;

		const clanTags = clans.map((clan) => clan.tag);
		const players = (await this.client.http.detailedClanMembers(data.entries))
			.filter((res) => res.ok)
			.filter((en) => en.clan && clanTags.includes(en.clan.tag));

		for (const data of players) {
			await this.client.rpcHandler.roleManager.newLink(data);
		}
	}
}
