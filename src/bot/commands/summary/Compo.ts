import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, ComponentType, EmbedBuilder } from 'discord.js';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
import { Season, Util } from '../../util/index.js';

export default class FamilyCompoCommand extends Command {
	public constructor() {
		super('family-compo', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>) {
		const clans = await this.client.storage.find(interaction.guildId);
		if (!clans.length) {
			return interaction.editReply(this.i18n('common.no_clans_linked', { lng: interaction.locale }));
		}

		const allClans = (await Promise.all(clans.map((clan) => this.client.http.clan(clan.tag)))).filter((clan) => clan.ok);

		const texts: string[] = [];
		const allPlayers: { tag: string; townHallLevel: number }[] = [];
		for (const clan of allClans) {
			const players = await this.client.db
				.collection<{ tag: string; townHallLevel: number }>(Collections.PLAYER_SEASONS)
				.find(
					{ season: Season.ID, tag: { $in: clan.memberList.map((mem) => mem.tag) } },
					{ projection: { tag: 1, townHallLevel: 1 } }
				)
				.toArray();

			allPlayers.push(...players);

			const reduced = players.reduce<{ [key: string]: number }>((count, member) => {
				const townHall = member.townHallLevel;
				count[townHall] = (count[townHall] || 0) + 1;
				return count;
			}, {});
			const townHalls = Object.entries(reduced)
				.map((arr) => ({ level: Number(arr[0]), total: Number(arr[1]) }))
				.sort((a, b) => b.level - a.level);
			const avg = townHalls.reduce((p, c) => p + c.total * c.level, 0) / townHalls.reduce((p, c) => p + c.total, 0) || 0;

			texts.push(
				[
					`\u200e**${clan.name} (${clan.tag})**`,
					'```',
					'TH  |  COUNT',
					townHalls.map((th) => `${th.level.toString().padStart(2, ' ')}  |  ${th.total.toString().padStart(2, ' ')}`).join('\n'),
					`\`\`\` [Total ${clan.members}/50, Avg. ${avg.toFixed(2)}]`,
					'\u200b'
				].join('\n')
			);
		}

		const embed = new EmbedBuilder();
		embed.addFields([{ name: 'Overall Family Compo', value: this.compo(allPlayers) }]);

		const customIds = {
			action: this.client.uuid(),
			active: this.client.uuid()
		};
		const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
			new ButtonBuilder().setLabel("Show All Clan's Compo").setStyle(ButtonStyle.Primary).setCustomId(customIds.action)
		);

		const msg = await interaction.editReply({ embeds: [embed], components: [row] });
		const collector = msg.createMessageComponentCollector<ComponentType.Button>({
			filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === customIds.action) {
				const embed = new EmbedBuilder();
				const [description] = Util.splitMessage(texts.join('\n'), { maxLength: 4000, char: '\u200b' });
				embed.setDescription(description);
				await action.update({ embeds: [embed], components: [] });
			}
		});

		collector.on('end', async (_, reason) => {
			for (const id of Object.values(customIds)) this.client.components.delete(id);
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
	}

	private compo(players: { tag: string; townHallLevel: number }[]) {
		const reduced = players.reduce<{ [key: string]: number }>((count, member) => {
			const townHall = member.townHallLevel;
			count[townHall] = (count[townHall] || 0) + 1;
			return count;
		}, {});
		const townHalls = Object.entries(reduced)
			.map((arr) => ({ level: Number(arr[0]), total: Number(arr[1]) }))
			.sort((a, b) => b.level - a.level);
		const avg = townHalls.reduce((p, c) => p + c.total * c.level, 0) / townHalls.reduce((p, c) => p + c.total, 0) || 0;

		return [
			'```',
			'TH  |  COUNT',
			townHalls.map((th) => `${th.level.toString().padStart(2, ' ')}  |  ${th.total.toString().padStart(2, ' ')}`).join('\n'),
			`\`\`\`[Total: ${players.length} | Avg. ${avg.toFixed(2)}]`
		].join('\n');
	}
}
