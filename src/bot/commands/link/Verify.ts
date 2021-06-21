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
					'Verify and Link a Player using API Token.',
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
			optionFlags: ['--tag', '--token']
		});
	}

	public *args(msg: Message): unknown {
		const tag = yield {
			flag: '--tag',
			type: 'string',
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase'
		};

		const token = yield {
			flag: '--token',
			type: 'string',
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase'
		};

		return { tag, token };
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
			'https://i.imgur.com/8dsoUB8.jpg'
		].join('\n'));
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
				{ $pull: { entries: { tag: data.tag } }, $set: { user_tag: message.author.tag } }
			);
		const up = await this.client.db.collection(COLLECTIONS.LINKED_USERS)
			.updateOne({ 'user': message.author.id, 'entries.tag': data.tag }, {
				$set: {
					'user': message.author.id, 'user_tag': message.author.tag,
					'entries.$.verified': true, 'entries.$.name': data.name,
					'createdAt': new Date()
				}
			});

		if (!up.modifiedCount) {
			await this.client.db.collection(COLLECTIONS.LINKED_USERS)
				.updateOne({ user: message.author.id }, {
					$set: {
						user_tag: message.author.tag,
						user: message.author.id,
						createdAt: new Date()
					},
					$push: {
						entries: { tag: data.tag, name: data.name, verified: true }
					}
				}, { upsert: true });
		}

		// Rest Link API
		this.resetLinkAPI(message.author.id, data.tag);
		// Update Roles
		if (data.clan) this.client.rpcHandler.roleManager.newLink(data);

		return message.util!.send(
			`**Verification successful! ${data.name} (${data.tag})** ${EMOJIS.VERIFIED}`
		);
	}

	private async resetLinkAPI(user: string, tag: string) {
		await this.client.http.unlinkPlayerTag(tag);
		await this.client.http.linkPlayerTag(user, tag);
	}
}
