import { Collections } from '../../util/Constants';
import { CommandInteraction, MessageEmbed } from 'discord.js';
import { Command } from '../../lib';

export default class FlagSearchCommand extends Command {
	public constructor() {
		super('flag-search', {
			category: 'none',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string }) {
		const player = await this.client.resolver.resolvePlayer(interaction, args.tag);
		if (!player) return;
		const flag = await this.client.db.collection(Collections.FLAGS).findOne({ guild: interaction.guild.id, tag: player.tag });

		if (!flag) {
			return interaction.editReply(`**${player.name}** is not flagged!`);
		}

		const user = await this.client.users.fetch(flag.user).catch(() => null);
		const embed = new MessageEmbed()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `${player.name} (${player.tag})` })
			.setDescription(
				[
					'**Executor**',
					user ? user.tag : `Unknown#0000 (${flag.user as string})`,
					'',
					'**Reason**',
					`${flag.reason as string}`
				].join('\n')
			)
			.setFooter({ text: 'Date' })
			.setTimestamp(flag.createdAt);

		return interaction.editReply({ embeds: [embed] });
	}
}
