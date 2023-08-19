import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../lib/index.js';
import { Util } from '../../util/index.js';
import { EMOJIS } from '../../util/Emojis.js';

export default class SummaryTrophiesCommand extends Command {
	public constructor() {
		super('summary-trophies', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { limit?: number; clans?: string; clans_only?: boolean }) {
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

		const allClans = await this.client.http._getClans(clans);
		const members = allClans
			.map((clan) => clan.memberList.map((mem) => ({ clan: clan.name, name: mem.name, trophies: mem.trophies })))
			.flat();
		const grouped = Object.values(
			allClans.reduce<
				Record<
					string,
					{ clanPoints: number; totalTrophies: number; legends: number; name: string; tag: string; preLegends: number }
				>
			>((acc, clan) => {
				acc[clan.tag] = {
					name: clan.name,
					tag: clan.tag,
					clanPoints: clan.clanPoints,
					preLegends: clan.memberList.filter((mem) => [29000021, 29000020, 29000019].includes(mem.league.id)).length,
					totalTrophies: clan.memberList.reduce((prev, mem) => prev + mem.trophies, 0),
					legends: clan.memberList.filter((mem) => mem.league.id === 29000022).length
				};
				return acc;
			}, {})
		).sort((a, b) => b.clanPoints - a.clanPoints);
		members.sort((a, b) => b.trophies - a.trophies);

		const embed = new EmbedBuilder().setColor(this.client.embed(interaction));

		if (args.clans_only) {
			embed.setAuthor({ name: `${interaction.guild.name} Best Trophies` }).setDescription(
				[
					'```',
					`\u200e # >4K >5K ${'POINTS'.padStart(6, ' ')} NAME`,
					grouped
						.map((clan, index) => {
							const preLegends = `${clan.preLegends.toString().padStart(3, ' ')}`;
							const legends = `${clan.legends.toString().padStart(3, ' ')}`;
							const clanPoints = `${clan.clanPoints.toString().padStart(6, ' ')}`;

							return `${(index + 1).toString().padStart(2, ' ')} ${preLegends} ${legends} ${clanPoints} \u200e${clan.name}`;
						})
						.join('\n'),
					'```'
				].join('\n')
			);
		} else {
			embed.setAuthor({ name: `${interaction.guild.name} Best Trophies` }).setDescription(
				[
					members
						.slice(0, Math.min(69, Math.max(5, args.limit ?? 69)))
						.map((member, index) => {
							const trophies = `${member.trophies.toString().padStart(4, ' ')}`;
							const rank = (index + 1).toString().padStart(2, ' ');
							return `\u200e\`${rank}\` \` ${trophies}\` \u200b ${Util.escapeBackTick(`${member.name}`)}`;
						})
						.join('\n')
				].join('\n')
			);
		}

		const payload = {
			cmd: this.id,
			uuid: interaction.id,
			clans: tags.join(','),
			limit: args.limit,
			clans_only: args.clans_only
		};
		const customIds = {
			refresh: this.createId(payload),
			toggle: this.createId({ ...payload, clans_only: !args.clans_only })
		};

		const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
			new ButtonBuilder().setEmoji(EMOJIS.REFRESH).setStyle(ButtonStyle.Secondary).setCustomId(customIds.refresh),
			new ButtonBuilder()
				.setLabel(args.clans_only ? 'Players Summary' : 'Clans Summary')
				.setStyle(ButtonStyle.Primary)
				.setCustomId(customIds.toggle)
		);

		await interaction.editReply({ embeds: [embed], components: [row] });
		return this.clearId(interaction);
	}
}
