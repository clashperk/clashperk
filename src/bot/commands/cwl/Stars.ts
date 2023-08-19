import { APIClan, APIClanWarLeagueGroup } from 'clashofclans.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, StringSelectMenuBuilder, User } from 'discord.js';
import { Command } from '../../lib/index.js';
import { EMOJIS } from '../../util/Emojis.js';
import { Util } from '../../util/index.js';

export default class CWLStarsCommand extends Command {
	public constructor() {
		super('cwl-stars', {
			category: 'cwl',
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			description: {
				content: 'Shows total CWL stars and attacks.'
			},
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; user?: User }) {
		const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
		if (!clan) return;

		const { body, res } = await this.client.http.getClanWarLeagueGroup(clan.tag);
		if (res.status === 504 || body.state === 'notInWar') {
			return interaction.editReply(
				this.i18n('command.cwl.still_searching', { lng: interaction.locale, clan: `${clan.name} (${clan.tag})` })
			);
		}

		if (!res.ok) {
			const group = await this.client.storage.getWarTags(clan.tag);
			if (group) return this.rounds(interaction, { body: group, clan, args });

			return interaction.editReply(
				this.i18n('command.cwl.not_in_season', { lng: interaction.locale, clan: `${clan.name} (${clan.tag})` })
			);
		}

		this.client.storage.pushWarTags(clan.tag, body);
		return this.rounds(interaction, { body, clan, args });
	}

	private async rounds(
		interaction: CommandInteraction<'cached'>,
		{
			body,
			clan,
			args
		}: {
			body: APIClanWarLeagueGroup;
			clan: APIClan;
			args: {
				tag?: string;
				user?: User;
				list_view?: 'TOTAL' | 'GAINED';
			};
		}
	) {
		const clanTag = clan.tag;
		const rounds = body.rounds.filter((r) => !r.warTags.includes('#0'));

		const members: {
			[key: string]: {
				name: string;
				tag: string;
				of: number;
				attacks: number;
				stars: number;
				dest: number;
				lost: number;
				townhallLevel: number;
			};
		} = {};

		for (const { warTags } of rounds) {
			for (const warTag of warTags) {
				const { body: data, res } = await this.client.http.getClanWarLeagueRound(warTag);
				if (!res.ok || data.state === 'notInWar') continue;

				if (data.clan.tag === clanTag || data.opponent.tag === clanTag) {
					const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
					if (['inWar', 'warEnded'].includes(data.state)) {
						for (const m of clan.members) {
							// eslint-disable-next-line
							members[m.tag] ??= {
								name: m.name,
								tag: m.tag,
								of: 0,
								attacks: 0,
								stars: 0,
								dest: 0,
								lost: 0,
								townhallLevel: m.townhallLevel
							};
							const member = members[m.tag];
							member.of += 1;

							if (m.attacks) {
								member.attacks += 1;
								member.stars += m.attacks[0].stars;
								member.dest += m.attacks[0].destructionPercentage;
							}
							if (m.bestOpponentAttack) {
								member.lost += m.bestOpponentAttack.stars;
							}
						}
					}
					break;
				}
			}
		}

		const leaderboard = Object.values(members);
		if (!leaderboard.length && body.season !== Util.getCWLSeasonId()) {
			return interaction.editReply(
				this.i18n('command.cwl.not_in_season', { lng: interaction.locale, clan: `${clan.name} (${clan.tag})` })
			);
		}
		if (!leaderboard.length) return interaction.editReply(this.i18n('command.cwl.no_rounds', { lng: interaction.locale }));
		leaderboard.sort((a, b) => b.dest - a.dest).sort((a, b) => b.stars - a.stars);

		const comparisonMode = args.list_view === 'GAINED';
		const listView = comparisonMode ? 'GAINED' : 'TOTAL';

		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.small });

		if (comparisonMode) {
			embed.setDescription(
				[
					'**Clan War League Stars**',
					`**\`\u200e # STR GAIN ${'NAME'.padEnd(15, ' ')}\`**`,
					leaderboard
						.filter((m) => m.of > 0)
						.map((m, i) => {
							const gained = m.stars - m.lost >= 0 ? `+${m.stars - m.lost}` : `${m.stars - m.lost}`;
							return `\`\u200e${this.pad(++i)} ${this.pad(m.stars)}  ${gained.padStart(3, ' ')}  ${Util.escapeBackTick(
								m.name
							).padEnd(15, ' ')}\``;
						})
						.join('\n')
				].join('\n')
			);
		} else {
			embed.setDescription(
				[
					'**Clan War League Stars**',
					`\u200e\` # STR DEST HIT  ${'NAME'.padEnd(15, ' ')}\u200f\``,
					leaderboard
						.filter((m) => m.of > 0)
						.map(
							(m, i) =>
								`\u200e\`${this.pad(++i)} ${this.pad(m.stars, 3)} ${`${Math.floor(m.dest)}%`.padStart(4, ' ')} ${[
									m.attacks,
									m.of
								].join('/')}  ${Util.escapeBackTick(m.name).padEnd(15, ' ')}\u200f\``
						)
						.join('\n')
				].join('\n')
			);
		}

		const payload = {
			cmd: this.id,
			tag: clanTag,
			list_view: args.list_view
		};

		const customIds = {
			refresh: this.createId(payload),
			toggle: this.createId({ ...payload, string_key: 'list_view' })
		};

		const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setEmoji(EMOJIS.REFRESH).setStyle(ButtonStyle.Secondary).setCustomId(customIds.refresh)
		);

		const menu = new StringSelectMenuBuilder()
			.setCustomId(customIds.toggle)
			.setPlaceholder('Select a filter!')
			.addOptions(
				[
					{
						label: 'Total Stars (Offense)',
						value: 'TOTAL',
						description: 'Total offense stars comparison.'
					},
					{
						label: 'Offense vs/ Defense',
						value: 'GAINED',
						description: '[Offense - Defense] stars comparison.'
					}
				].map((option) => ({
					...option,
					default: option.value === listView
				}))
			);
		const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);

		await interaction.editReply({ embeds: [embed], components: [buttonRow, menuRow] });
		return this.clearId(interaction);
	}

	private pad(num: number, depth = 2) {
		return num.toString().padStart(depth, ' ');
	}
}
