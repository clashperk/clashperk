import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
import { Season, Util } from '../../util/index.js';

export default class SummaryWarsMissedCommand extends Command {
	public constructor() {
		super('summary-wars-missed', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { clans?: string; season?: string }) {
		const tags = this.client.resolver.resolveArgs(args.clans);
		const clans = tags.length
			? await this.client.storage.search(interaction.guildId, tags)
			: await this.client.storage.find(interaction.guildId);

		if (!clans.length && tags.length) return interaction.editReply(this.i18n('common.no_clans_found', { lng: interaction.locale }));
		if (!clans.length) {
			return interaction.editReply(this.i18n('common.no_clans_linked', { lng: interaction.locale }));
		}

		const missed: Record<string, { name: string; tag: string; wars: number; missed: number }> = {};
		const season = args.season ?? Season.ID;

		for (const { tag } of clans) {
			const wars = await this.client.db
				.collection(Collections.CLAN_WARS)
				.find({
					$or: [{ 'clan.tag': tag }, { 'opponent.tag': tag }],
					state: 'warEnded',
					season
				})
				.sort({ _id: -1 })
				.toArray();

			for (const war of wars) {
				const clan = war.clan.tag === tag ? war.clan : war.opponent;
				for (const m of clan.members) {
					const mem = missed[m.tag] // eslint-disable-line
						? missed[m.tag]
						: (missed[m.tag] = { name: m.name, tag: m.tag, wars: 0, missed: 0 });
					mem.wars += 1;
					if (m.attacks?.length === war.attacksPerMember) continue;
					mem.missed += war.attacksPerMember - (m.attacks?.length ?? 0);
				}
			}
		}

		const members = Object.values(missed)
			.filter((m) => m.missed > 0)
			.sort((a, b) => a.missed - b.missed);
		const embed = this.getEmbed(members, season);
		const customIds = {
			up: this.client.uuid(interaction.user.id)
		};
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setCustomId(customIds.up).setStyle(ButtonStyle.Secondary).setEmoji('🔃').setLabel('Reverse Order')
		);
		const msg = await interaction.editReply({ embeds: [embed], components: [row] });

		const collector = msg.createMessageComponentCollector({
			filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === customIds.up) {
				members.reverse();
				const embed = this.getEmbed(members, season);
				await action.update({ embeds: [embed] });
			}
		});

		collector.on('end', async (_, reason) => {
			Object.values(customIds).forEach((id) => this.client.components.delete(id));
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
	}

	private getEmbed(members: { name: string; tag: string; wars: number; missed: number }[], season: string) {
		const [content] = Util.splitMessage(
			[
				'\u200e # MISS WARS  NAME',
				...members.slice(0, 99).map((m, i) => `\u200e${this.pad(i + 1, 2)} ${this.pad(m.missed)} ${this.pad(m.wars)}  ${m.name}`)
			].join('\n'),
			{ maxLength: 4000 }
		);
		return new EmbedBuilder().setTitle(`Missed Wars Summary (${season})`).setDescription(`\`\`\`\n${content}\`\`\``);
	}

	private pad(num: number, padding = 4) {
		return num.toString().padStart(padding, ' ');
	}
}
