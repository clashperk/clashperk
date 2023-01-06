import {
	CommandInteraction,
	ActionRowBuilder,
	ButtonBuilder,
	EmbedBuilder,
	ButtonStyle,
	StringSelectMenuBuilder,
	ComponentType
} from 'discord.js';
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
		args: { tag?: string; season: string; sortBy?: ('donated' | 'received' | 'townHall' | 'difference')[]; orderBy?: string }
	) {
		let { season, sortBy, orderBy } = args;
		const clan = await this.client.resolver.resolveClan(interaction, args.tag);
		if (!clan) return;
		if (clan.members < 1) {
			return interaction.editReply(this.i18n('common.no_clan_members', { lng: interaction.locale, clan: clan.name }));
		}

		if (!season) season = Season.ID;
		const isSameSeason = Season.ID === Season.generateID(season);

		const dbMembers = await this.client.db
			.collection<Pick<PlayerSeasonModel, 'tag' | 'clans' | 'townHallLevel'>>(Collections.PLAYER_SEASONS)
			.find(
				{ season, __clans: clan.tag, tag: { $in: clan.memberList.map((m) => m.tag) } },
				{ projection: { tag: 1, clans: 1, townHallLevel: 1 } }
			)
			.toArray();

		if (!dbMembers.length && !isSameSeason) {
			return interaction.editReply(this.i18n('command.donations.no_season_data', { lng: interaction.locale, season }));
		}

		const members: {
			tag: string;
			name: string;
			donated: number;
			received: number;
			townHall: number;
			difference: number;
			ratio: number;
		}[] = [];

		if (isSameSeason) {
			const notFound = clan.memberList.filter((m) => !dbMembers.some((d) => d.tag === m.tag));
			const notFoundMembers = (await this.client.http.detailedClanMembers(notFound)).filter((res) => res.ok);
			for (const member of notFoundMembers) {
				const { tag, name, townHallLevel, donations, donationsReceived } = member;
				members.push({
					tag,
					name,
					donated: donations,
					received: donationsReceived,
					townHall: townHallLevel,
					difference: donations - donationsReceived,
					ratio: donationsReceived === 0 ? 0 : donations / donationsReceived
				});
			}
		}

		for (const mem of clan.memberList) {
			const m = dbMembers.find((m) => m.tag === mem.tag);
			if (m) {
				const donated = isSameSeason
					? mem.donations >= m.clans[clan.tag].donations.current
						? m.clans[clan.tag].donations.total + (mem.donations - m.clans[clan.tag].donations.current)
						: Math.max(mem.donations, m.clans[clan.tag].donations.total)
					: m.clans[clan.tag].donations.total;
				const received = isSameSeason
					? mem.donationsReceived >= m.clans[clan.tag].donationsReceived.current
						? m.clans[clan.tag].donationsReceived.total + (mem.donationsReceived - m.clans[clan.tag].donationsReceived.current)
						: Math.max(mem.donationsReceived, m.clans[clan.tag].donationsReceived.total)
					: m.clans[clan.tag].donationsReceived.total;

				members.push({
					name: mem.name,
					tag: mem.tag,
					townHall: m.townHallLevel,
					donated,
					received,
					difference: donated - received,
					ratio: received === 0 ? 0 : donated / received
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

		for (const sort of sortBy ?? []) {
			members.sort((a, b) => (orderBy === 'asc' ? a[sort] - b[sort] : b[sort] - a[sort]));
		}

		const isTh = sortBy?.includes('townHall');
		const isDiff = sortBy?.includes('difference');
		const getEmbed = () => {
			const embed = new EmbedBuilder()
				.setColor(this.client.embed(interaction))
				.setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.medium });
			if (isDiff) {
				const ds = Math.max(...members.map((m) => m.difference)).toString().length + 1;
				embed.setDescription(
					[
						'```',
						`\u200e # ${'DIFF'.padStart(ds, ' ')} ${'RATIO'.padStart(5, ' ')}  ${'NAME'}`,
						members
							.map((mem, count) => {
								const ratio = mem.ratio.toFixed(2).padStart(5, ' ');
								const name = this.padEnd(mem.name.substring(0, 15));
								const rank = (count + 1).toString().padStart(2, ' ');
								return `${rank} ${this.donation(mem.difference, ds)} ${ratio}  \u200e${name}`;
							})
							.join('\n'),
						'```'
					].join('\n')
				);
			} else {
				embed.setDescription(
					[
						'```',
						`\u200e${isTh ? 'TH' : ' #'} ${'DON'.padStart(ds, ' ')} ${'REC'.padStart(rs, ' ')}  ${'NAME'}`,
						members
							.map((mem, count) => {
								const donation = `${this.donation(mem.donated, ds)} ${this.donation(mem.received, rs)}`;
								const name = this.padEnd(mem.name.substring(0, 15));
								const thOrIndex = (isTh ? mem.townHall : count + 1).toString().padStart(2, ' ');
								return `${thOrIndex} ${donation}  \u200e${name}`;
							})
							.join('\n'),
						'```'
					].join('\n')
				);
			}

			return embed.setFooter({ text: `[DON ${donated} | REC ${received}] (Season ${season})` });
		};

		const embed = getEmbed();
		const customId = {
			order: isSameSeason ? JSON.stringify({ tag: clan.tag, cmd: this.id, sortBy, _: 1 }) : this.client.uuid(interaction.user.id),
			sort: isSameSeason ? JSON.stringify({ tag: clan.tag, cmd: this.id, orderBy, _: 2 }) : this.client.uuid(interaction.user.id),
			refresh: JSON.stringify({ tag: clan.tag, cmd: this.id, sortBy, orderBy })
		};

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setStyle(ButtonStyle.Secondary)
				.setCustomId(customId.refresh)
				.setEmoji(EMOJIS.REFRESH)
				.setDisabled(!isSameSeason)
		);

		const sortingRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder()
				.setCustomId(customId.sort)
				.setPlaceholder('Sort by')
				.setMaxValues(2)
				.addOptions([
					{
						label: 'Donations',
						description: 'Sorted by donations',
						value: 'donated',
						default: sortBy?.includes('donated')
					},
					{
						label: 'Donations Received',
						description: 'Sorted by donations received',
						value: 'received',
						default: sortBy?.includes('received')
					},
					{
						label: 'Donation Difference',
						description: 'Donation difference and ratio',
						value: 'difference',
						default: sortBy?.includes('difference')
					},
					{
						label: 'Town-Hall Level',
						description: 'Sorted by Town-Hall level',
						value: 'townHall',
						default: sortBy?.includes('townHall')
					}
				])
		);

		const orderingRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder()
				.setCustomId(customId.order)
				.setPlaceholder('Order by')
				.addOptions([
					{
						label: 'Descending',
						description: 'High to Low',
						value: 'desc',
						default: orderBy === 'desc'
					},
					{
						label: 'Ascending',
						description: 'Low to High',
						value: 'asc',
						default: orderBy === 'asc'
					}
				])
		);

		const msg = await interaction.editReply({ embeds: [embed], components: [row, sortingRow, orderingRow] });
		if (isSameSeason) return;

		const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
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
