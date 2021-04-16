import { Collections } from '@clashperk/node';
import { Message, MessageEmbed } from 'discord.js';
import { Command } from 'discord-akairo';
import { Clan } from 'clashofclans.js';

export default class ClanSummaryCommand extends Command {
	public constructor() {
		super('trophy-summary', {
			category: 'search',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {}
		});
	}

	public async exec(message: Message) {
		const clans: { name: string; tag: string }[] = await this.client.db.collection(Collections.CLAN_STORES)
			.find({ guild: message.guild!.id })
			.toArray();

		if (!clans.length) {
			return message.util!.send(`**No clans are linked to ${message.guild!.name}**`);
		}

		const collection: Clan[] = await Promise.all(clans.map(clan => this.client.http.clan(clan.tag)));
		const members = collection.map(clan => clan.memberList).flat();
		members.sort((a, b) => b.trophies - a.trophies);

		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`${message.guild!.name} Best Trophies`)
			.setDescription([
				'```',
				`\u200e # TROPHY  ${'NAME'}`,
				members.slice(0, 50).map((member, index) => {
					const trophies = `${member.trophies.toString().padStart(5, ' ')}`;
					return `${(index + 1).toString().padStart(2, ' ')}  ${trophies}  \u200e${member.name}`;
				}).join('\n'),
				'```'
			]);

		return message.util!.send({ embed });
	}
}
