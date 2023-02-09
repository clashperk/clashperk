import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, ComponentType, EmbedBuilder } from 'discord.js';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
import { Season } from '../../util/index.js';

export default class SummaryAttacksCommand extends Command {
	public constructor() {
		super('summary-attacks', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction, { season }: { season?: string }) {
		if (!season) season = Season.ID;
		const clans = await this.client.db.collection(Collections.CLAN_STORES).find({ guild: interaction.guild!.id }).toArray();

		if (!clans.length) {
			return interaction.editReply(this.i18n('common.no_clans_linked', { lng: interaction.locale }));
		}

		const allClans = (await Promise.all(clans.map((clan) => this.client.http.clan(clan.tag)))).filter((clan) => clan.ok);

		const members: { name: string; tag: string; attackWins: number; clan: { name: string; tag: string } }[] = [];
		for (const clan of allClans) {
			const players = await this.client.db
				.collection<{ name: string; tag: string; attackWins: number }>(Collections.PLAYER_SEASONS)
				.find({ season, tag: { $in: clan.memberList.map((mem) => mem.tag) } }, { projection: { tag: 1, attackWins: 1, name: 1 } })
				.toArray();

			members.push(...players.map((spread) => ({ ...spread, clan: { name: clan.name, tag: clan.tag } })));
		}

		// group by clan
		const grouped = Object.values(
			members.reduce<Record<string, { attackWins: number; clan: { name: string; tag: string } }>>((acc, member) => {
				acc[member.clan.tag] ??= {
					clan: {
						name: member.clan.name,
						tag: member.clan.tag
					},
					attackWins: 0
				};
				acc[member.clan.tag].attackWins += member.attackWins;
				return acc;
			}, {})
		).sort((a, b) => b.attackWins - a.attackWins);

		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `${interaction.guild!.name} Attack Wins` })
			.setDescription(
				[
					'```',
					` # ${'CLAN'.padEnd(14, ' ')} ${'ATTACK'.padStart(5, ' ')}`,
					grouped
						.map(({ clan, attackWins }, index) => {
							const attacks = `${attackWins.toString().padStart(5, ' ')}`;
							return `\u200e${(index + 1).toString().padStart(2, ' ')} ${clan.name.padEnd(15, ' ')} ${attacks}`;
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
			new ButtonBuilder().setLabel('Show Top Attackers').setStyle(ButtonStyle.Primary).setCustomId(customIds.action)
		);

		const msg = await interaction.editReply({ embeds: [embed], components: [row] });
		const collector = msg.createMessageComponentCollector<ComponentType.Button>({
			filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === customIds.action) {
				members.sort((a, b) => b.attackWins - a.attackWins);
				const embed = new EmbedBuilder()
					.setColor(this.client.embed(interaction))
					.setAuthor({ name: `${interaction.guild!.name} Attack Wins` })
					.setDescription(
						[
							'```',
							' # ATTACK  PLAYER',
							members
								.slice(0, 99)
								.map((member, index) => {
									const attackWins = `${member.attackWins.toString().padStart(5, ' ')}`;
									return `${(index + 1).toString().padStart(2, ' ')}  ${attackWins}  \u200e${member.name}`;
								})
								.join('\n'),
							'```'
						].join('\n')
					)
					.setFooter({ text: `Season ${season!}` });

				await action.update({ embeds: [embed], components: [] });
			}
		});

		collector.on('end', async (_, reason) => {
			for (const id of Object.values(customIds)) this.client.components.delete(id);
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
	}
}
