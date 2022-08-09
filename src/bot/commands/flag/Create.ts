import { Util, CommandInteraction, MessageEmbed } from 'discord.js';
import { Player } from 'clashofclans.js';
import { Collections } from '../../util/Constants.js';
import { Command } from '../../lib/index.js';

export default class FlagCreateCommand extends Command {
	public constructor() {
		super('flag-create', {
			category: 'none',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { reason?: string; tag?: string }) {
		const tags = this.client.resolver.resolveArgs(args.tag);

		if (!args.reason) return interaction.editReply('You must provide a reason to flag.');
		if (args.reason.length > 900) return interaction.editReply('Reason must be 1024 or fewer in length.');

		const flags = await this.client.db.collection(Collections.FLAGS).countDocuments({ guild: interaction.guild.id });

		if (flags >= 200 && !this.client.patrons.get(interaction.guild.id)) {
			const embed = new MessageEmbed().setDescription(
				[
					'You can only flag 200 players per guild!',
					'',
					'**Want more than that?**',
					'Please consider supporting us on patreon!',
					'',
					'[Become a Patron](https://www.patreon.com/clashperk)'
				].join('\n')
			);

			return interaction.editReply({ embeds: [embed] });
		}

		const players: Player[] = await Promise.all(tags.map((en) => this.client.http.player(this.fixTag(en))));
		const newFlags = [] as { name: string; tag: string }[];
		for (const data of players.filter((en) => en.ok)) {
			const { value } = await this.client.db.collection(Collections.FLAGS).findOneAndUpdate(
				{ guild: interaction.guild.id, tag: data.tag },
				{
					$set: {
						guild: interaction.guild.id,
						user: interaction.user.id,
						user_tag: interaction.user.tag,
						tag: data.tag,
						name: data.name,
						reason: Util.cleanContent(args.reason, interaction.channel!),
						createdAt: new Date()
					}
				},
				{ upsert: true, returnDocument: 'after' }
			);

			newFlags.push({ name: value!.name, tag: value!.tag });
		}
		return interaction.editReply(
			this.i18n('command.flag.create.success', {
				lng: interaction.locale,
				count: `${newFlags.length}`,
				players: newFlags.map((en) => en.name).join(', ')
			})
		);
	}

	private fixTag(tag: string) {
		return `#${tag.toUpperCase().replace(/^#/g, '').replace(/O/g, '0')}`;
	}
}
