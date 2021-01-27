import { COLLECTIONS } from '../../util/Constants';
import { Player } from 'clashofclans.js';
import { Command, PrefixSupplier } from 'discord-akairo';
import { Message } from 'discord.js';

export default class VerifyPlayerCommand extends Command {
	public constructor() {
		super('verify', {
			aliases: ['verify'],
			category: 'profile',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: [
					'Verify & link a player using in-game API Token.',
					'',
					'A token can only be used just for once. So don\'t worry, others can\'t use it again.'
				],
				image: {
					text: [
						'**How to get this token?**',
						'',
						'- Go to **Settings >> More Settings**',
						'- Scroll down and find **API Token**',
						'- Tap **Show** and then **Copy**',
						'- That\'s it!'
					],
					url: 'https://i.imgur.com/8dsoUB8.jpg'
				},
				usage: '<#playerTag> <token>',
				examples: ['#9Q92C8R20 pd3NN9x2']
			},
			args: [
				{
					id: 'data',
					type: (msg, tag) => this.client.resolver.getPlayer(msg, tag)
				},
				{
					'id': 'token',
					'type': 'string',
					'default': ''
				}
			]
		});
	}

	public async exec(message: Message, { data, token }: { data: Player; token: string }) {
		const prefix = (this.handler.prefix as PrefixSupplier)(message) as string;
		const post = await this.client.http.verifyPlayerToken(data.tag, token);
		if (post.status !== 'ok') {
			return message.util!.send([
				'**You must provide a valid token!**',
				'',
				'**Usage**',
				`\`${prefix}verify <#playerTag> <token>\``,
				'',
				'**How to get this token?**',
				'',
				'- Go to **Settings >> More Settings**',
				'- Scroll down and find **API Token**',
				'- Tap **Show** and then **Copy**',
				'- That\'s it!'
			], { files: ['https://i.imgur.com/8dsoUB8.jpg'] });
		}

		await this.client.db.collection(COLLECTIONS.LINKED_USERS)
			.updateOne(
				{ user: { $ne: message.author.id } },
				{ $pull: { entries: { tag: data.tag } } }
			);
		const up = await this.client.db.collection(COLLECTIONS.LINKED_USERS)
			.updateOne({ 'user': message.author.id, 'entries.tag': data.tag }, {
				$set: {
					'user': message.author.id,
					'entries.$.verified': true,
					'createdAt': new Date()
				}
			});

		if (!up.modifiedCount) {
			await this.client.db.collection(COLLECTIONS.LINKED_USERS)
				.updateOne({ user: message.author.id }, {
					$set: {
						user: message.author.id,
						createdAt: new Date()
					},
					$push: {
						entries: {
							tag: data.tag, verified: true
						}
					}
				}, { upsert: true });
		}

		await this.client.http.unlinkPlayerTag(data.tag);
		await this.client.http.linkPlayerTag(message.author.id, data.tag);

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setDescription([
				`Linked **${message.author.tag}** to **${data.name}** (${data.tag})`,
				'',
				'If you don\'t provide the tag for other lookup commands, the bot will use the first one you linked.'
			]);
		return message.util!.send({ embed });
	}
}
