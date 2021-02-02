import { MessageEmbed, Message } from 'discord.js';
import { Command } from 'discord-akairo';
import { Clan } from 'clashofclans.js';

export default class ClanBadgeCommand extends Command {
	public constructor() {
		super('clan-badge', {
			aliases: ['badge', 'clan-badge', 'cb'],
			category: 'search',
			description: {
				content: 'In-game clan badge in high resolution.',
				usage: '<clanTag>',
				examples: ['#2Q98URCGY', '2Q98URCGY']
			},
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			args: [
				{
					id: 'data',
					type: (msg, tag) => this.client.resolver.resolveClan(msg, tag)
				}
			]
		});
	}

	public exec(message: Message, { data }: { data: Clan }) {
		const embed = new MessageEmbed()
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium, `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${data.tag}`)
			.setColor(this.client.embed(message))
			.setImage(data.badgeUrls.large);

		return message.util!.send({ embed });
	}
}
