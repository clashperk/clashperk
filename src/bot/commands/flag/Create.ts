import { Player } from 'clashofclans.js';
import { cleanContent, CommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';

export default class FlagCreateCommand extends Command {
	public constructor() {
		super('flag-create', {
			category: 'none',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { reason?: string; tag?: string }) {
		const tags = this.client.resolver.resolveArgs(args.tag);

		if (!args.reason) return interaction.editReply('You must provide a reason to flag.');
		if (args.reason.length > 900) return interaction.editReply('Reason must be 1024 or fewer in length.');

		const flags = await this.client.db.collection(Collections.FLAGS).countDocuments({ guild: interaction.guild.id });

		if (flags >= 1000 && !this.client.patrons.get(interaction.guild.id)) {
			const embed = new EmbedBuilder().setDescription(
				[
					'You can only flag 1000 players per guild!',
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
			await this.client.db.collection(Collections.FLAGS).insertOne({
				guild: interaction.guild.id,
				user: interaction.user.id,
				user_tag: interaction.user.tag,
				tag: data.tag,
				name: data.name,
				reason: cleanContent(args.reason, interaction.channel!),
				createdAt: new Date()
			});

			newFlags.push({ name: data.name, tag: data.tag });
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
