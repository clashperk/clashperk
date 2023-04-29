import { EmbedBuilder, CommandInteraction, User, escapeInlineCode, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { ClanWar, WarClan, ClanWarAttack, ClanWarMember } from 'clashofclans.js';
import moment from 'moment';
import { Collections, WarLeagueMap } from '../../util/Constants.js';
import { BLUE_NUMBERS, CWL_LEAGUES, EMOJIS, ORANGE_NUMBERS, WAR_STAR_COMBINATIONS, WHITE_NUMBERS } from '../../util/Emojis.js';
import { Command } from '../../lib/index.js';

const stars: Record<string, string> = {
	0: '☆☆☆',
	1: '★☆☆',
	2: '★★☆',
	3: '★★★'
};

export default class CWLHistoryCommand extends Command {
	public constructor() {
		super('cwl-history', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['UseExternalEmojis', 'EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { player_tag?: string; user?: User }) {
		const player = args.player_tag ? await this.client.resolver.resolvePlayer(interaction, args.player_tag) : null;
		if (args.player_tag && !player) return null;
		const playerTags = player ? [player.tag] : await this.client.resolver.getLinkedPlayerTags(args.user?.id ?? interaction.user.id);

		const _wars = await this.getWars(playerTags);

		const groups = await this.client.db
			.collection<{ leagues?: Record<string, number>; season: string }>(Collections.CWL_GROUPS)
			.find({ id: { $in: [...new Set(_wars.map((a) => a.leagueGroupId))] } }, { projection: { season: 1, leagues: 1 } })
			.toArray();

		const groupMap = groups.reduce<Record<string, number>>((acc, group) => {
			Object.entries(group.leagues ?? {}).map(([tag, leagueId]) => {
				acc[`${group.season}-${tag}`] = leagueId;
			});
			return acc;
		}, {});

		const warMap = _wars.reduce<Record<string, IWar[]>>((acc, war) => {
			const key = `${war.member.name} (${war.member.tag})`;
			acc[key] ??= []; // eslint-disable-line
			acc[key].push(war);
			return acc;
		}, {});

		const embeds: EmbedBuilder[] = [];
		Object.entries(warMap)
			.sort(([, a], [, b]) => b.length - a.length)
			.map(([key, userGroups]) => {
				const embed = new EmbedBuilder().setColor(this.client.embed(interaction));

				const _warsMap = userGroups.reduce<Record<string, IWar[]>>((acc, war) => {
					const seasonId = war.endTime.toISOString().substring(0, 7);
					acc[seasonId] ??= []; // eslint-disable-line
					acc[seasonId].push(war);
					return acc;
				}, {});

				const __wars = Object.entries(_warsMap);
				const value = __wars
					.sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
					.map(([seasonId, wars], i) => {
						wars.sort((a, b) => a.endTime.getTime() - b.endTime.getTime());
						const participated = wars.filter((war) => war.attack).length;
						const totalStars = wars.reduce((acc, war) => acc + (war.attack?.stars ?? 0), 0);
						const totalDestruction = wars.reduce((acc, war) => acc + (war.attack?.destructionPercentage ?? 0), 0);
						const season = moment(seasonId).format('MMM YYYY').toString();
						const [{ member, clan }] = wars;
						const leagueId = groupMap[`${seasonId}-${clan.tag}`];
						const leagueName = WarLeagueMap[leagueId];
						const leagueIcon = CWL_LEAGUES[leagueName];
						return [
							`**${season}** (#${member.mapPosition}, TH${member.townhallLevel})${
								leagueName ? `\n${leagueIcon} ${clan.name}` : ''
							}`,
							wars
								.filter((war) => war.attack)
								.map(({ attack, defender }, i) => {
									return `${WHITE_NUMBERS[i + 1]} ${stars[attack!.stars]} \`${this.percentage(
										attack!.destructionPercentage
									)}\` \u200b → ${BLUE_NUMBERS[defender!.mapPosition]}${ORANGE_NUMBERS[defender!.townhallLevel]}`;
								})
								.join('\n'),
							`${EMOJIS.CROSS_SWORD} ${participated}/${wars.length} wars, ${totalStars} stars, ${totalDestruction}%`,
							i === __wars.length - 1 ? '' : '\u200b'
						].join('\n');
					})
					.join('\n');

				if (args.user && !player) {
					embed.setAuthor({ name: `${args.user.tag} (${args.user.id})`, iconURL: args.user.displayAvatarURL() });
				}
				embed.setTitle('**CWL attack history (last 3 months)**');
				embed.setDescription(`**${key}**\n\n${value}`);
				embeds.push(embed);
			});

		if (!embeds.length) {
			return interaction.editReply('No CWL history found.');
		}

		const customIds = {
			next: this.client.uuid(interaction.user.id),
			prev: this.client.uuid(interaction.user.id)
		};

		if (embeds.length === 1) {
			return interaction.editReply({ embeds: [...embeds], components: [] });
		}

		const row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(new ButtonBuilder().setCustomId(customIds.prev).setLabel(`Prev`).setStyle(ButtonStyle.Primary))
			.addComponents(new ButtonBuilder().setCustomId(customIds.next).setLabel(`Next`).setStyle(ButtonStyle.Primary))
			.addComponents(
				new ButtonBuilder()
					.setCustomId(customIds.next)
					.setLabel(`${1}/${embeds.length}`)
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(true)
					.setCustomId('disabled')
			);

		await interaction.editReply({ embeds: [embeds[0]], components: [row] });

		const collector = interaction.channel!.createMessageComponentCollector({
			filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
			time: 10 * 60 * 1000
		});

		let index = 0;
		collector.on('collect', async (action) => {
			if (action.customId === customIds.next) {
				index++;
				if (index >= embeds.length) index = 0;
				const row = new ActionRowBuilder<ButtonBuilder>()
					.addComponents(new ButtonBuilder().setCustomId(customIds.prev).setLabel(`Prev`).setStyle(ButtonStyle.Primary))
					.addComponents(new ButtonBuilder().setCustomId(customIds.next).setLabel(`Next`).setStyle(ButtonStyle.Primary))
					.addComponents(
						new ButtonBuilder()
							.setCustomId(customIds.next)
							.setLabel(`${index + 1}/${embeds.length}`)
							.setStyle(ButtonStyle.Secondary)
							.setDisabled(true)
							.setCustomId('disabled')
					);

				await action.update({ embeds: [embeds[index]], components: [row] });
			}

			if (action.customId === customIds.prev) {
				index--;
				if (index < 0) index = embeds.length - 1;
				const row = new ActionRowBuilder<ButtonBuilder>()
					.addComponents(new ButtonBuilder().setCustomId(customIds.prev).setLabel(`Prev`).setStyle(ButtonStyle.Primary))
					.addComponents(new ButtonBuilder().setCustomId(customIds.next).setLabel(`Next`).setStyle(ButtonStyle.Primary))
					.addComponents(
						new ButtonBuilder()
							.setCustomId(customIds.next)
							.setLabel(`${index + 1}/${embeds.length}`)
							.setStyle(ButtonStyle.Secondary)
							.setDisabled(true)
							.setCustomId('disabled')
					);

				await action.update({ embeds: [embeds[index]], components: [row] });
			}
		});
	}

	private getStars(oldStars: number, newStars: number) {
		const WAR_STARS = {
			OLD: 'O-',
			NEW: 'N-',
			EMPTY: 'E-'
		};

		if (oldStars > newStars) {
			const key = [WAR_STARS.OLD.repeat(newStars), WAR_STARS.EMPTY.repeat(3 - newStars)]
				.join('')
				.split('-')
				.filter((_) => _.length)
				.join('');
			return WAR_STAR_COMBINATIONS[key];
		}

		const key = [WAR_STARS.OLD.repeat(oldStars), WAR_STARS.NEW.repeat(newStars - oldStars), WAR_STARS.EMPTY.repeat(3 - newStars)]
			.join('')
			.split('-')
			.filter((_) => _.length)
			.join('');
		return WAR_STAR_COMBINATIONS[key];
	}

	private getWarResult(clan: WarClan, opponent: WarClan) {
		if (clan.stars === opponent.stars) {
			if (clan.destructionPercentage === opponent.destructionPercentage) return 'tied';
			if (clan.destructionPercentage > opponent.destructionPercentage) return 'won';
		}
		if (clan.stars > opponent.stars) return 'won';
		return 'lost';
	}

	private padEnd(name: string) {
		return escapeInlineCode(name).padEnd(15, ' ');
	}

	private async getWars(tags: string[]) {
		const cursor = this.client.db.collection(Collections.CLAN_WARS).aggregate<ClanWar>([
			{
				$match: {
					preparationStartTime: {
						$gte: moment()
							.startOf('month')
							.subtract(new Date().getDate() >= 10 ? 2 : 3, 'month')
							.toDate()
					},
					warType: 3,
					$or: [{ 'clan.members.tag': { $in: tags } }, { 'opponent.members.tag': { $in: tags } }]
				}
			},
			{ $sort: { _id: -1 } }
		]);

		const attacks = [];
		for await (const data of cursor) {
			data.clan.members.sort((a, b) => a.mapPosition - b.mapPosition);
			data.opponent.members.sort((a, b) => a.mapPosition - b.mapPosition);

			for (const tag of tags) {
				const __member = data.clan.members.map((mem, i) => ({ ...mem, mapPosition: i + 1 })).find((m) => m.tag === tag);
				const member =
					__member ?? data.opponent.members.map((mem, i) => ({ ...mem, mapPosition: i + 1 })).find((m) => m.tag === tag);
				if (!member) continue;

				const clan = __member ? data.clan : data.opponent;
				const opponent = clan.tag === data.clan.tag ? data.opponent : data.clan;
				const __attacks = clan.members.flatMap((m) => m.attacks ?? []);

				const memberAttacks = __attacks.filter((atk) => atk.attackerTag === tag);
				if (!memberAttacks.length) {
					attacks.push({
						attack: null,
						previousBestAttack: null,
						defender: null,
						clan: {
							name: clan.name,
							tag: clan.tag
						},
						endTime: new Date(data.endTime),
						member,
						// @ts-expect-error
						leagueGroupId: data.leagueGroupId as number
					});
				}

				for (const atk of memberAttacks) {
					const { previousBestAttack, defender } = this.getPreviousBestAttack(__attacks, opponent, atk);

					attacks.push({
						attack: atk,
						previousBestAttack,
						defender,
						clan: {
							name: clan.name,
							tag: clan.tag
						},
						endTime: new Date(data.endTime),
						member,
						// @ts-expect-error
						leagueGroupId: data.leagueGroupId as number
					});
				}
			}
		}

		return attacks;
	}

	private index(num: number | string) {
		return num.toString().padStart(2, ' ');
	}

	private percentage(num: number) {
		return `${num}%`.toString().padStart(4, ' ');
	}

	private getPreviousBestAttack(attacks: ClanWarAttack[], opponent: WarClan, atk: ClanWarAttack) {
		const defender = opponent.members.find((m) => m.tag === atk.defenderTag)!;
		const defenderDefenses = attacks.filter((atk) => atk.defenderTag === defender.tag);
		const isFresh = defenderDefenses.length === 0 || atk.order === Math.min(...defenderDefenses.map((d) => d.order));
		const previousBestAttack = isFresh
			? null
			: [...attacks]
					.filter((_atk) => _atk.defenderTag === defender.tag && _atk.order < atk.order && _atk.attackerTag !== atk.attackerTag)
					.sort((a, b) => b.destructionPercentage ** b.stars - a.destructionPercentage ** a.stars)
					.at(0) ?? null;
		return { previousBestAttack: isFresh ? null : previousBestAttack, defender, isFresh };
	}
}

interface IWar {
	attack: ClanWarAttack | null;
	previousBestAttack: ClanWarAttack | null;
	defender: ClanWarMember | null;
	clan: {
		name: string;
		tag: string;
	};
	endTime: Date;
	member: ClanWarMember;
}
