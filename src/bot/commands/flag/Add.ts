import { COLLECTIONS } from '../../util/Constants';
import { Util, Message } from 'discord.js';
import { Player } from 'clashofclans.js';
import { Command } from 'discord-akairo';

export default class FlagCommand extends Command {
	public constructor() {
		super('flag-add', {
			category: '_hidden',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			description: {},
			args: [
				{
					id: 'data',
					type: (msg, tag) => this.client.resolver.getPlayer(msg, tag)
				},
				{
					id: 'reason',
					match: 'rest',
					type: 'string'
				}
			]
		});
	}

	public async exec(message: Message, { data, reason }: { data: Player; reason: string }) {
		if (!reason) return message.util!.send('You must provide a reason to flag.');
		if (reason.length > 900) return message.util!.send('Reason must be 1024 or fewer in length.');

		const flags = await this.client.db.collection(COLLECTIONS.FLAGGED_USERS)
			.find({ guild: message.guild!.id })
			.toArray();

		if (flags.length >= 200 && !this.client.patrons.get(message.guild!.id)) {
			const embed = this.client.util.embed()
				.setDescription([
					'You can only flag 200 players per guild!',
					'',
					'**Want more than that?**',
					'Please consider supporting us on patreon!',
					'',
					'[Become a Patron](https://www.patreon.com/clashperk)'
				]);

			return message.util!.send({ embed });
		}

		await this.client.db.collection(COLLECTIONS.FLAGGED_USERS)
			.findOneAndUpdate({ guild: message.guild!.id, tag: data.tag }, {
				$set: {
					guild: message.guild!.id,
					user: message.author.id,
					user_tag: message.author.tag,
					tag: data.tag,
					name: data.name,
					reason: Util.cleanContent(reason, message),
					createdAt: new Date()
				}
			}, { upsert: true });

		return message.util!.send(`Successfully flagged **${data.name} (${data.tag})**`);
	}
}
