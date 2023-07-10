import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../lib/index.js';
import { Collections } from '../../util/Constants.js';
import { Season, Util } from '../../util/index.js';
import { EMOJIS } from '../../util/Emojis.js';

export default class SummaryMissedWarsCommand extends Command {
	public constructor() {
		super('summary-missed-wars', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { clans?: string; season?: string; is_reversed?: boolean }) {
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

		if (args.is_reversed) {
			members.sort((a, b) => b.wars - a.wars);
			members.sort((a, b) => a.missed - b.missed);
		} else {
			members.sort((a, b) => b.wars - a.wars);
			members.sort((a, b) => b.missed - a.missed);
		}

		const embed = this.getEmbed(members, season);

		const payload = {
			cmd: this.id,
			clans: args.clans,
			is_reversed: args.is_reversed
		};
		const customIds = {
			refresh: this.createId(payload),
			toggle: this.createId({ ...payload, is_reversed: !args.is_reversed })
		};

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setEmoji(EMOJIS.REFRESH).setStyle(ButtonStyle.Secondary).setCustomId(customIds.refresh),
			new ButtonBuilder()
				.setCustomId(customIds.toggle)
				.setStyle(ButtonStyle.Secondary)
				.setEmoji('🔃')
				.setLabel(args.is_reversed ? 'High to Low' : 'Low to High')
		);
		await interaction.editReply({ embeds: [embed], components: [row] });
		return this.clearIds(interaction);
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
