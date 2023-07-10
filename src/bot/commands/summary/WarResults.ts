import { CommandInteraction, EmbedBuilder } from 'discord.js';
import { EMOJIS, WHITE_NUMBERS } from '../../util/Emojis.js';
import { Collections } from '../../util/Constants.js';
import { Command } from '../../lib/index.js';
import { Season } from '../../util/index.js';

export default class SummaryClansCommand extends Command {
	public constructor() {
		super('summary-war-results', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { season?: string; clans?: string }) {
		const season = args.season ?? Season.ID;
		const tags = await this.client.resolver.resolveArgs(args.clans);
		const clans = tags.length
			? await this.client.storage.search(interaction.guildId, tags)
			: await this.client.storage.find(interaction.guildId);

		if (!clans.length && tags.length)
			return interaction.editReply(
				this.i18n('common.no_clans_found', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE })
			);
		if (!clans.length) {
			return interaction.editReply(
				this.i18n('common.no_clans_linked', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE })
			);
		}

		const collection: { name: string; tag: string; wars: number; won: number; lost: number }[] = [];
		for (const clan of clans) {
			const wars = await this.getWars(clan.tag, season);

			const won = wars.filter((war) => war.result).length;
			const lost = wars.filter((war) => !war.result).length;

			collection.push({
				won,
				lost,
				name: clan.name,
				tag: clan.tag,
				wars: wars.length
			});
		}
		collection.sort((a, b) => b.lost - a.lost);
		collection.sort((a, b) => b.won - a.won);

		const embed = new EmbedBuilder();
		embed.setAuthor({ name: 'War Results Summary', iconURL: interaction.guild.iconURL()! });
		embed.setDescription(
			[
				`${EMOJIS.HASH} \`WON LOST WARS ${'NAME'.padEnd(15, ' ')}\``,
				collection
					.map((en, i) => {
						const won = en.won.toLocaleString().padStart(2, ' ');
						const lost = en.lost.toLocaleString().padStart(2, ' ');
						const wars = en.wars.toLocaleString().padStart(3, ' ');

						return `${WHITE_NUMBERS[++i]} \`\u200e${won}  ${lost}  ${wars}   ${en.name.padEnd(15, ' ')}\u200f\``;
					})
					.join('\n')
			].join('\n')
		);
		embed.setFooter({ text: `Season ${season}` });

		return interaction.editReply({ embeds: [embed] });
	}

	private async getWars(tag: string, season: string): Promise<{ result: boolean; stars: number[] }[]> {
		return this.client.db
			.collection(Collections.CLAN_WARS)
			.aggregate<{ result: boolean; stars: number[] }>([
				{
					$match: {
						$or: [{ 'clan.tag': tag }, { 'opponent.tag': tag }],
						state: 'warEnded',
						season
					}
				},
				{
					$set: {
						clan: {
							$cond: [{ $eq: ['$clan.tag', tag] }, '$clan', '$opponent']
						},
						opponent: {
							$cond: [{ $eq: ['$clan.tag', tag] }, '$opponent', '$clan']
						}
					}
				},
				{
					$project: {
						result: {
							$switch: {
								branches: [
									{
										case: { $gt: ['$clan.stars', '$opponent.stars'] },
										then: true
									},
									{
										case: { $lt: ['$clan.stars', '$opponent.stars'] },
										then: false
									},
									{
										case: { $gt: ['$clan.destructionPercentage', '$opponent.destructionPercentage'] },
										then: true
									},
									{
										case: { $lt: ['$clan.destructionPercentage', '$opponent.destructionPercentage'] },
										then: false
									}
								],
								default: false
							}
						},
						stars: '$clan.members.attacks.stars'
					}
				}
			])
			.toArray();
	}
}
