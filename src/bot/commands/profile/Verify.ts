import { Command, PrefixSupplier } from 'discord-akairo';
import { COLLECTIONS } from '../../util/Constants';
import { EMOJIS } from '../../util/Emojis';
import { Player } from 'clashofclans.js';
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
					'Verify and link a player using API Token.',
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
					id: 'tag',
					type: 'string'
				},
				{
					id: 'token',
					type: 'string'
				}
			]
		});
	}

	private retry(message: Message, text: string) {
		const prefix = (this.handler.prefix as PrefixSupplier)(message) as string;

		return message.util!.send([
			`**${text}**`,
			'',
			'A token can only be used just for once. So don\'t worry, others can\'t use it again!',
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

	public async exec(message: Message, { tag, token }: { tag?: string; token: string }) {
		if (!tag) {
			return this.retry(message, `You must provide a player tag and a token!`);
		}

		const data: Player = await this.client.http.player(tag);
		if (!data.ok) {
			return this.retry(message, `You must provide a valid player tag${token ? '' : ' and a token'}!`);
		}

		const post = await this.client.http.verifyPlayerToken(data.tag, token);
		if (post.status !== 'ok') {
			return this.retry(message, `You must provide a valid API Token!`);
		}

		await this.client.db.collection(COLLECTIONS.LINKED_USERS)
			.updateOne(
				{ 'user': { $ne: message.author.id }, 'entries.tag': data.tag },
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

		this.resetLinkAPIData(message.author.id, data.tag);
		return message.util!.send([
			'**Verification successful!**',
			`**${data.name} (${data.tag})** ${EMOJIS.VERIFIED}`
		]);
	}

	private async resetLinkAPIData(user: string, tag: string) {
		await this.client.http.unlinkPlayerTag(tag);
		await this.client.http.linkPlayerTag(user, tag);
	}
}
