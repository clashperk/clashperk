import { Collections } from '../../util/Constants';
import { Command } from 'discord-akairo';
import { Message, GuildMember } from 'discord.js';
import { Clan } from 'clashofclans.js';

export default class LinkClanCommand extends Command {
	public constructor() {
		super('link-clan', {
			category: 'profile',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {},
			args: [
				{
					id: 'data',
					type: (msg, tag) => this.client.resolver.getClan(msg, tag)
				},
				{
					'id': 'member',
					'type': 'member',
					'default': (msg: Message) => msg.member
				}
			]
		});
	}

	public async exec(message: Message, { data, member }: { data: Clan; member: GuildMember }) {
		if (member.user.bot) return message.util!.send('Bots can\'t link accounts.');
		await this.client.db.collection(Collections.LINKED_PLAYERS)
			.updateOne({ user: member.id }, {
				$set: {
					clan: {
						tag: data.tag,
						name: data.name
					},
					user_tag: member.user.tag
				},
				$setOnInsert: {
					entries: [],
					createdAt: new Date()
				}
			}, { upsert: true });

		return message.util!.send(`Linked **${member.user.tag}** to **${data.name}** (${data.tag})`);
	}
}
