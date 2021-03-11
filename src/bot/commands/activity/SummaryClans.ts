import { Collections } from '@clashperk/node';
import { Command } from 'discord-akairo';
import { MessageEmbed, Message } from 'discord.js';

export default class ClanSummaryCommand extends Command {
	public constructor() {
		super('clan-summary', {
			category: 'search',
			channel: 'guild',
			ownerOnly: true,
			clientPermissions: ['EMBED_LINKS'],
			description: {}
		});
	}

	public async exec(message: Message) {
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message));

		const clans = await this.client.db.collection(Collections.CLAN_STORES)
			.find({ guild: message.guild!.id })
			.toArray();

		for (const clan of clans) {
			this.client.db.collection(Collections.CLAN_WARS)
				.find(clan);
		}

		return message.util!.send({ embed });
	}
}
