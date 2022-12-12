import { CommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
import { Util } from '../../util/index.js';

export default class FlagSearchCommand extends Command {
	public constructor() {
		super('flag-search', {
			category: 'none',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string }) {
		const player = await this.client.resolver.resolvePlayer(interaction, args.tag);
		if (!player) return;
		const flag = await this.client.db
			.collection(Collections.FLAGS)
			.aggregate<{
				name: string;
				tag: string;
				user: string;
				createdAt: Date;
				count: number;
				flags: { reason: string; userId: string; createdAt: Date }[];
			}>([
				{
					$match: { guild: interaction.guild.id, tag: player.tag }
				},
				{
					$sort: { _id: -1 }
				},
				{
					$group: {
						_id: '$tag',
						flags: {
							$push: {
								reason: '$reason',
								userId: '$user',
								createdAt: '$createdAt'
							}
						},
						name: { $last: '$name' },
						tag: { $last: '$tag' },
						user: { $last: '$user' },
						createdAt: { $last: '$createdAt' },
						count: {
							$sum: 1
						}
					}
				}
			])
			.next();

		if (!flag) {
			return interaction.editReply(this.i18n('command.flag.search.not_found', { lng: interaction.locale, tag: player.tag }));
		}

		const user = await this.client.users.fetch(flag.user).catch(() => null);
		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `${player.name} (${player.tag})` })
			.setDescription(
				[
					'**Author**',
					user ? user.tag : `Unknown#0000 (${flag.user})`,
					'',
					`**Flags (${flag.count})**`,
					flag.flags.map((fl, i) => `${i + 1}. ${Util.getRelativeTime(fl.createdAt.getTime())} ${fl.reason}`).join('\n\n')
				].join('\n')
			)
			.setFooter({ text: 'Latest' })
			.setTimestamp(flag.createdAt);

		return interaction.editReply({ embeds: [embed] });
	}
}
