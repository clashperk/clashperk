import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, ComponentType, EmbedBuilder } from 'discord.js';
import { Command } from '../../lib/index.js';
import { Util } from '../../util/index.js';

export default class SummaryTrophiesCommand extends Command {
	public constructor() {
		super('summary-trophies', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>) {
		const clans = await this.client.storage.find(interaction.guild.id);

		if (!clans.length) {
			return interaction.editReply(this.i18n('common.no_clans_linked', { lng: interaction.locale }));
		}

		const allClans = (await Promise.all(clans.map((clan) => this.client.http.clan(clan.tag)))).filter((res) => res.ok);
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

		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `${interaction.guild.name} Best Trophies` })
			.setDescription(
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

		const customIds = {
			action: this.client.uuid(),
			active: this.client.uuid()
		};

		const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
			new ButtonBuilder().setLabel('Show Top Members').setStyle(ButtonStyle.Primary).setCustomId(customIds.action)
		);

		const msg = await interaction.editReply({ embeds: [embed], components: [row] });
		const collector = msg.createMessageComponentCollector<ComponentType.Button>({
			filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === customIds.action) {
				const embed = new EmbedBuilder()
					.setColor(this.client.embed(interaction))
					.setAuthor({ name: `${interaction.guild.name} Best Trophies` })
					.setDescription(
						[
							members
								.slice(0, 69)
								.map((member, index) => {
									const trophies = `${member.trophies.toString().padStart(4, ' ')}`;
									const rank = (index + 1).toString().padStart(2, ' ');
									return `\u200e\`${rank} ${trophies}\` \u200b ${Util.escapeBackTick(`${member.name}`)}`;
								})
								.join('\n')
						].join('\n')
					);

				await action.update({ embeds: [embed], components: [] });
			}
		});

		collector.on('end', async (_, reason) => {
			for (const id of Object.values(customIds)) this.client.components.delete(id);
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
	}
}
