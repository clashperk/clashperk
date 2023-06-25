import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, CommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../lib/index.js';
import { LEGEND_LEAGUE_ID } from '../../util/Constants.js';
import { EMOJIS } from '../../util/Emojis.js';
import { Util } from '../../util/index.js';

export default class LegendLeaderboardCommand extends Command {
	public constructor() {
		super('legend-leaderboard', {
			category: 'search',
			channel: 'guild',
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>, args: { clans?: string; season?: string }) {
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

		const cachedClans = await this.client.redis.getClans(clans.map((clan) => clan.tag));
		const memberTags = cachedClans.map((clan) => clan.memberList.map((member) => member.tag)).flat();
		const players = await this.client.redis.getPlayers(memberTags);

		const legends = players.filter((player) => player.trophies >= 5000 || player.league?.id === LEGEND_LEAGUE_ID);
		legends.sort((a, b) => b.trophies - a.trophies);

		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: 'Legend Leaderboard', iconURL: interaction.guild.iconURL()! })
			.setTimestamp()
			.setDescription(
				[
					'```',
					`\u200e #        WON  NAME`,
					...legends.slice(0, 99).map((player, n) => {
						const trophies = this.pad(player.trophies, 4);
						const attacks = this.pad(player.attackWins, 3);
						const name = Util.escapeBackTick(player.name);
						return `\u200e${this.pad(n + 1)}  ${trophies}  ${attacks}  ${name}`;
					}),
					'```'
				].join('\n')
			);

		const customId = interaction.isButton()
			? interaction.customId
			: this.client.redis.setCustomId({ cmd: this.id, clans: args.clans ? clans.map((clan) => clan.tag).join(',') : args.clans });
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setEmoji(EMOJIS.REFRESH).setStyle(ButtonStyle.Secondary).setCustomId(customId)
		);
		return interaction.editReply({ embeds: [embed], components: [row] });
	}

	private pad(num: string | number, padding = 2) {
		return String(num).padStart(padding, ' ');
	}
}
