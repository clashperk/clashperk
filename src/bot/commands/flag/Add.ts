import { COLLECTIONS } from '../../util/Constants';
import { Util, Message } from 'discord.js';
import { Player } from 'clashofclans.js';
import { Command } from 'discord-akairo';

export default class FlagAddCommand extends Command {
	public constructor() {
		super('flag-add', {
			category: '_hidden',
			channel: 'guild',
			description: {},
			userPermissions: ['MANAGE_GUILD'],
			optionFlags: ['--tag', '--reason']
		});
	}

	public *args(msg: Message): unknown {
		const tags = yield {
			flag: '--tag',
			match: msg.interaction ? 'option' : 'phrase',
			type: async (msg: Message, args: string) => {
				const tags = args ? args.split(/ +/g) : [];
				if (tags.length > 1) return args.split(/ +/g);
				return this.client.resolver.getPlayer(msg, args);
			}
		};

		const reason = yield {
			flag: '--reason',
			match: msg.interaction ? 'option' : 'rest'
		};

		return { tags, reason };
	}

	public async exec(message: Message, { reason, tags }: { reason: string; tags: string[] | string }) {
		// @ts-expect-error
		if (!Array.isArray(tags)) tags = [tags.tag];

		if (!reason) return message.util!.send('You must provide a reason to flag.');
		if (reason.length > 900) return message.util!.send('Reason must be 1024 or fewer in length.');

		const flags = await this.client.db.collection(COLLECTIONS.FLAGGED_USERS)
			.find({ guild: message.guild!.id })
			.count();

		if (flags >= 200 && !this.client.patrons.get(message.guild!.id)) {
			const embed = this.client.util.embed()
				.setDescription([
					'You can only flag 200 players per guild!',
					'',
					'**Want more than that?**',
					'Please consider supporting us on patreon!',
					'',
					'[Become a Patron](https://www.patreon.com/clashperk)'
				].join('\n'));

			return message.util!.send({ embeds: [embed] });
		}

		const players: Player[] = await Promise.all(tags.map(en => this.client.http.player(this.fixTag(en))));
		const newFlags = [] as { name: string; tag: string }[];
		for (const data of players.filter(en => en.ok)) {
			const { value } = await this.client.db.collection(COLLECTIONS.FLAGGED_USERS)
				.findOneAndUpdate({ guild: message.guild!.id, tag: data.tag }, {
					$set: {
						guild: message.guild!.id,
						user: message.author.id,
						user_tag: message.author.tag,
						tag: data.tag,
						name: data.name,
						reason: Util.cleanContent(reason, message.channel),
						createdAt: new Date()
					}
				}, { upsert: true, returnOriginal: false });

			newFlags.push({ name: value.name, tag: value.tag });
		}

		return message.util!.send(
			`Successfully flagged ${newFlags.length > 1 ? `${newFlags.length} players!\n\n` : ''}${newFlags.map(flag => `${flag.name} (${flag.tag})`).join('\n')}`
		);
	}

	private fixTag(tag: string) {
		return `#${tag.toUpperCase().replace(/^#/g, '').replace(/O|o/g, '0')}`;
	}
}
