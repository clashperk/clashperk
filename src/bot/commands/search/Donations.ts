import { CommandInteraction, ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } from 'discord.js';
import { Collections } from '../../util/Constants.js';
import { Season, Util } from '../../util/index.js';
import { Args, Command } from '../../lib/index.js';
import { EMOJIS } from '../../util/Emojis.js';
import { PlayerSeasonModel } from '../../types/index.js';

export default class DonationsCommand extends Command {
	public constructor() {
		super('donations', {
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			description: {
				content: [
					'Clan members with donations for current / last season.',
					'',
					'• **Season ID must be under 6 months old and must follow `YYYY-MM` format.**'
				]
			},
			defer: true
		});
	}

	public args(): Args {
		return {
			season: {
				match: 'ENUM',
				enums: [...Util.getSeasonIds(), [Util.getLastSeasonId(), 'last']],
				default: Season.ID
			}
		};
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		{ tag, season, reverse }: { tag?: string; season: string; reverse?: boolean }
	) {
		const clan = await this.client.resolver.resolveClan(interaction, tag);
		if (!clan) return;
		if (clan.members < 1) {
			return interaction.editReply(this.i18n('common.no_clan_members', { lng: interaction.locale, clan: clan.name }));
		}

		if (!season) season = Season.ID;
		const sameSeason = Season.ID === Season.generateID(season);

		// TODO: projection
		const dbMembers = await this.client.db
			.collection<PlayerSeasonModel>(Collections.PLAYER_SEASONS)
			.find({ season, __clans: clan.tag, tag: { $in: clan.memberList.map((m) => m.tag) } })
			.toArray();

		if (!dbMembers.length && !sameSeason) {
			return interaction.editReply(this.i18n('command.donations.no_season_data', { lng: interaction.locale, season }));
		}

		const members: { tag: string; name: string; donated: number; received: number }[] = [];
		for (const mem of clan.memberList) {
			if (!dbMembers.find((m) => m.tag === mem.tag) && sameSeason) {
				members.push({ name: mem.name, tag: mem.tag, donated: mem.donations, received: mem.donationsReceived });
			}

			const m = dbMembers.find((m) => m.tag === mem.tag);
			if (m) {
				members.push({
					name: mem.name,
					tag: mem.tag,
					donated: sameSeason
						? mem.donations >= m.clans[clan.tag].donations.current
							? m.clans[clan.tag].donations.total + (mem.donations - m.clans[clan.tag].donations.current)
							: Math.max(mem.donations, m.clans[clan.tag].donations.total)
						: m.clans[clan.tag].donations.total,

					received: sameSeason
						? mem.donationsReceived >= m.clans[clan.tag].donationsReceived.current
							? m.clans[clan.tag].donationsReceived.total +
							  (mem.donationsReceived - m.clans[clan.tag].donationsReceived.current)
							: Math.max(mem.donationsReceived, m.clans[clan.tag].donationsReceived.total)
						: m.clans[clan.tag].donationsReceived.total
				});
			}
		}

		const receivedMax = Math.max(...members.map((m) => m.received));
		const rs = receivedMax > 99999 ? 6 : receivedMax > 999999 ? 7 : 5;
		const donatedMax = Math.max(...members.map((m) => m.donated));
		const ds = donatedMax > 99999 ? 6 : donatedMax > 999999 ? 7 : 5;

		members.sort((a, b) => b.donated - a.donated);
		const donated = members.reduce((pre, mem) => mem.donated + pre, 0);
		const received = members.reduce((pre, mem) => mem.received + pre, 0);
		if (reverse) members.sort((a, b) => b.received - a.received);

		const getEmbed = () => {
			const embed = new EmbedBuilder()
				.setColor(this.client.embed(interaction))
				.setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.medium })
				.setDescription(
					[
						'```',
						`\u200e # ${'DON'.padStart(ds, ' ')} ${'REC'.padStart(rs, ' ')}  ${'NAME'}`,
						members
							.map((mem, index) => {
								const donation = `${this.donation(mem.donated, ds)} ${this.donation(mem.received, rs)}`;
								return `${(index + 1).toString().padStart(2, ' ')} ${donation}  \u200e${this.padEnd(
									mem.name.substring(0, 15)
								)}`;
							})
							.join('\n'),
						'```'
					].join('\n')
				);

			return embed.setFooter({ text: `[DON ${donated} | REC ${received}] (Season ${season})` });
		};

		const embed = getEmbed();
		const customId = {
			sort: sameSeason ? JSON.stringify({ tag: clan.tag, cmd: this.id, reverse: true }) : this.client.uuid(interaction.user.id),
			refresh: JSON.stringify({ tag: clan.tag, cmd: this.id, reverse: false })
		};

		const row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(
				new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setCustomId(customId.refresh)
					.setEmoji(EMOJIS.REFRESH)
					.setDisabled(!sameSeason)
			)
			.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Secondary).setCustomId(customId.sort).setLabel('Sort by Received'));

		const msg = await interaction.editReply({ embeds: [embed], components: [row] });
		if (sameSeason) return;

		const collector = msg.createMessageComponentCollector({
			filter: (action) => action.customId === customId.sort && action.user.id === interaction.user.id,
			max: 1,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === customId.sort) {
				members.sort((a, b) => b.received - a.received);
				const embed = getEmbed();
				await action.update({ embeds: [embed] });
			}
		});

		collector.on('end', async (_, reason) => {
			this.client.components.delete(customId.sort);
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
	}

	private padEnd(name: string) {
		return name.replace(/\`/g, '\\');
	}

	private donation(num: number, space: number) {
		return num.toString().padStart(space, ' ');
	}
}
