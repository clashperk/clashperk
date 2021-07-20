import { Command, PrefixSupplier } from 'discord-akairo';
import { Collections } from '../../util/Constants';
import { Message, GuildMember } from 'discord.js';
import { Player } from 'clashofclans.js';

export default class LinkPlayerCommand extends Command {
	public constructor() {
		super('link-add', {
			category: 'profile',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {},
			flags: ['--default'],
			optionFlags: ['--tag', '--user']
		});
	}

	public *args(msg: Message): unknown {
		const data = yield {
			flag: '--tag',
			match: msg.interaction ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.getPlayer(msg, tag)
		};

		const member = yield {
			'flag': '--user',
			'type': 'member',
			'default': (m: Message) => m.member,
			'match': msg.interaction ? 'option' : 'phrase'
		};

		const def = yield {
			match: 'flag',
			flag: ['--default']
		};

		return { data, member, def };
	}

	public async exec(message: Message, { data, member, def }: { data: Player; member: GuildMember; def: boolean }) {
		if (member.user.bot) return message.util!.send('Bots can\'t link accounts.');

		const doc = await this.getPlayer(data.tag);
		// only owner can set default account
		if (doc && doc.user === member.id && ((def && member.id !== message.author.id) || !def)) {
			return message.util!.send(
				`**${member.user.tag}** is already linked to **${data.name} (${data.tag})**`
			);
		}

		if (doc && doc.user !== member.id) {
			const prefix = (this.handler.prefix as PrefixSupplier)(message) as string;
			return message.util!.send([
				`**${data.name} (${data.tag})** is already linked to another Discord account.`,
				'',
				'If you own this player account, you can Force-Link using Player API Token.',
				`Type \`${prefix}help verify\` to know more about the Player API Token.`
			].join('\n'));
		}

		if (doc && doc.entries.length >= 25) {
			return message.util!.send({
				embeds: [{
					description: 'You can only link 25 player accounts.'
				}]
			});
		}

		// only owner can set default account
		if (def && member.id === message.author.id) {
			await this.client.db.collection(Collections.LINKED_PLAYERS)
				.updateOne({ user: member.id }, { $set: { user_tag: member.user.tag }, $pull: { entries: { tag: data.tag } } });
		}

		await this.client.db.collection(Collections.LINKED_PLAYERS)
			.updateOne({ user: member.id }, {
				$set: {
					user_tag: member.user.tag,
					user: member.id,
					createdAt: new Date()
				},
				$push: def && member.id === message.author.id // only owner can set default account
					? {
						entries: {
							$each: [{ tag: data.tag, name: data.name, verified: this.isVerified(doc, data.tag) }],
							$position: 0
						}
					}
					: {
						entries: { tag: data.tag, name: data.name, verified: false }
					}
			}, { upsert: true });

		// Fix Conflicts
		this.resetLinkAPI(member.id, data.tag);
		// Update Role
		if (data.clan) this.client.rpcHandler.roleManager.newLink(data);

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setDescription([
				`Linked **${member.user.tag}** to **${data.name}** (${data.tag})`,
				'',
				'If you don\'t provide the tag for other lookup commands, the bot will use the first one you linked.'
			].join('\n'));
		return message.util!.send({ embeds: [embed] });
	}

	private isVerified(data: any, tag: string) {
		return Boolean(data?.entries.find((en: any) => en.tag === tag && en.verified));
	}

	private async getPlayer(tag: string) {
		return this.client.db.collection(Collections.LINKED_PLAYERS).findOne({ 'entries.tag': tag });
	}

	private async resetLinkAPI(user: string, tag: string) {
		await this.client.http.unlinkPlayerTag(tag);
		await this.client.http.linkPlayerTag(user, tag);
	}
}
