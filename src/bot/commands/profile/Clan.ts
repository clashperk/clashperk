import { COLLECTIONS } from '../../util/Constants';
import { Message, GuildMember } from 'discord.js';
import { Command } from 'discord-akairo';
import { Clan } from 'clashofclans.js';

export default class LinkClanCommand extends Command {
	public constructor() {
		super('link-clan', {
			aliases: ['link-clan', 'save-clan'],
			category: 'hidden',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS'],
			description: {
				content: 'Saves a clan to your discord account.',
				usage: '<tag> [member]',
				examples: ['#9Q92C8R20', '#9Q92C8R20 Suvajit']
			},
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
		await this.client.db.collection(COLLECTIONS.LINKED_CLANS)
			.updateOne({ user: member.id }, {
				$set: {
					user: member.id,
					tag: data.tag,
					createdAt: new Date(),
					hidden: false
				}
			}, { upsert: true });

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setDescription([
				`Linked **${member.user.tag}** to **${data.name}** (${data.tag})`,
				'',
				'If you don\'t provide the tag for other lookup commands, the bot will use the last one you linked.'
			]);
		return message.util!.send({ embed });
	}
}
