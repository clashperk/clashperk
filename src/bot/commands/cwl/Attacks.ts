import {
	EmbedBuilder,
	CommandInteraction,
	StringSelectMenuBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	escapeInlineCode,
	ButtonStyle,
	escapeMarkdown,
	ComponentType,
	User
} from 'discord.js';
import { ClanWar, ClanWarLeagueGroup } from 'clashofclans.js';
import moment from 'moment';
import { RED_NUMBERS } from '../../util/Emojis.js';
import { Command } from '../../lib/index.js';
import { Util } from '../../util/index.js';

const stars: Record<string, string> = {
	0: '☆☆☆',
	1: '★☆☆',
	2: '★★☆',
	3: '★★★'
};

export default class CWLAttacksCommand extends Command {
	public constructor() {
		super('cwl-attacks', {
			category: 'cwl',
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; user?: User }) {
		const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
		if (!clan) return;

		const body = await this.client.http.clanWarLeague(clan.tag);
		if (body.statusCode === 504 || body.state === 'notInWar') {
			return interaction.editReply(
				this.i18n('command.cwl.still_searching', { lng: interaction.locale, clan: `${clan.name} (${clan.tag})` })
			);
		}

		if (!body.ok) {
			const group = await this.client.storage.getWarTags(clan.tag);
			if (group) return this.rounds(interaction, group, clan.tag);

			return interaction.editReply(
				this.i18n('command.cwl.not_in_season', { lng: interaction.locale, clan: `${clan.name} (${clan.tag})` })
			);
		}

		this.client.storage.pushWarTags(clan.tag, body);
		return this.rounds(interaction, body, clan.tag);
	}

	private async rounds(interaction: CommandInteraction<'cached'>, body: ClanWarLeagueGroup, clanTag: string) {
		const rounds = body.rounds.filter((round) => !round.warTags.includes('#0'));

		let i = 0;
		const missed: { [key: string]: { name: string; count: number } } = {};
		const chunks: { embed: EmbedBuilder; state: string; round: number }[] = [];
		for (const { warTags } of rounds) {
			for (const warTag of warTags) {
				const data: ClanWar = await this.client.http.clanWarLeagueWar(warTag);
				if (!data.ok || data.state === 'notInWar') continue;

				if (data.clan.tag === clanTag || data.opponent.tag === clanTag) {
					const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
					const opponent = data.clan.tag === clanTag ? data.opponent : data.clan;

					const embed = new EmbedBuilder()
						.setColor(this.client.embed(interaction))
						.setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.medium });

					if (['warEnded', 'inWar'].includes(data.state)) {
						const endTimestamp = new Date(moment(data.endTime).toDate()).getTime();
						const attackers: { name: string; stars: number; destruction: number; mapPosition: number }[] = [];
						const slackers: { name: string; mapPosition: number; townHallLevel: number }[] = [];

						const clanMembers = data.clan.tag === clan.tag ? data.clan.members : data.opponent.members;
						clanMembers
							.sort((a, b) => a.mapPosition - b.mapPosition)
							.forEach((member, index) => {
								if (member.attacks?.length) {
									attackers.push({
										name: member.name,
										mapPosition: index + 1,
										stars: member.attacks[0].stars,
										destruction: member.attacks[0].destructionPercentage
									});
								} else {
									slackers.push({
										name: member.name,
										mapPosition: index + 1,
										townHallLevel: member.townhallLevel
									});
								}
							});

						embed.setDescription(
							[
								'**War Against**',
								`\u200e${opponent.name} (${opponent.tag})`,
								'',
								`${data.state === 'inWar' ? 'Battle Day' : 'War Ended'} (${Util.getRelativeTime(endTimestamp)})`
							].join('\n')
						);

						if (attackers.length) {
							embed.setDescription(
								[
									embed.data.description,
									'',
									`**Total Attacks - ${clanMembers.filter((m) => m.attacks).length}/${data.teamSize}**`,
									attackers
										.map(
											(mem) =>
												`\`\u200e${this.index(mem.mapPosition)} ${stars[mem.stars]} ${this.percentage(
													mem.destruction
												)}% ${this.padEnd(mem.name)}\``
										)
										.join('\n')
								].join('\n')
							);
						}

						if (slackers.length) {
							embed.setDescription(
								[
									embed.data.description,
									'',
									`**${data.state === 'inWar' ? 'Remaining' : 'Missed'} Attacks**`,
									slackers.map((mem) => `\`\u200e${this.index(mem.mapPosition)} ${this.padEnd(mem.name)}\``).join('\n')
								].join('\n')
							);
						} else {
							embed.setDescription(
								[embed.data.description, '', `**No ${data.state === 'inWar' ? 'Remaining' : 'Missed'} Attacks**`].join('\n')
							);
						}
					}

					if (data.state === 'preparation') {
						const startTimestamp = new Date(moment(data.startTime).toDate()).getTime();
						embed.setDescription(
							[
								'**War Against**',
								`\u200e${opponent.name} (${opponent.tag})`,
								'',
								`Preparation (${Util.getRelativeTime(startTimestamp)})`,
								'',
								'Wait for the Battle day!'
							].join('\n')
						);
					}

					if (data.state === 'warEnded') {
						for (const mem of clan.members) {
							if (mem.attacks?.length) continue;
							missed[mem.tag] = {
								name: mem.name, // eslint-disable-next-line
								count: Number((missed[mem.tag] || { count: 0 }).count) + 1
							};
						}
					}

					embed.setFooter({ text: `Round #${++i}` });
					chunks.push({ state: data.state, round: i, embed });
					break;
				}
			}
		}

		const clan = body.clans.find((clan) => clan.tag === clanTag)!;
		if (!chunks.length && body.season !== Util.getCWLSeasonId()) {
			return interaction.editReply(
				this.i18n('command.cwl.not_in_season', { lng: interaction.locale, clan: `${clan.name} (${clan.tag})` })
			);
		}
		if (!chunks.length || chunks.length !== rounds.length)
			return interaction.editReply(this.i18n('command.cwl.no_rounds', { lng: interaction.locale }));
		const round = chunks.find((c) => c.state === 'inWar') ?? chunks.slice(-1)[0];
		if (chunks.length === 1) {
			return interaction.editReply({ embeds: [round.embed] });
		}

		const options = chunks.map((ch) => ({ label: `Round #${ch.round}`, value: ch.round.toString() }));
		const ids = {
			menu: this.client.uuid(interaction.user.id),
			button: this.client.uuid(interaction.user.id)
		};

		const menu = new StringSelectMenuBuilder().addOptions(options).setCustomId(ids.menu).setPlaceholder('Select a round!');

		const button = new ButtonBuilder()
			.setStyle(ButtonStyle.Secondary)
			.setCustomId(ids.button)
			.setLabel('Show Overall Missed Attacks')
			.setDisabled(!Object.keys(missed).length);

		const rows = [
			new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu),
			new ActionRowBuilder<ButtonBuilder>().addComponents(button)
		];

		const msg = await interaction.editReply({
			embeds: [round.embed],
			components: [...rows]
		});
		const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
			filter: (action) => Object.values(ids).includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === ids.menu && action.isStringSelectMenu()) {
				const round = chunks.find((ch) => ch.round === Number(action.values[0]));
				await action.update({ embeds: [round!.embed] });
			}

			if (action.customId === ids.button) {
				const members = Object.values(missed);
				const embed = new EmbedBuilder()
					.setColor(this.client.embed(interaction))
					.setDescription(
						[
							'**All Missed Attacks**',
							'',
							members.map((mem) => `${RED_NUMBERS[mem.count]} ${escapeMarkdown(mem.name)}`).join('\n')
						].join('\n')
					);
				embed.data.author = round.embed.data.author!;
				rows[1].components[0].setDisabled(true);

				await action.update({ components: [...rows] });
				await action.followUp({ embeds: [embed] });
			}
		});

		collector.on('end', async (_, reason) => {
			this.client.components.delete(ids.menu);
			this.client.components.delete(ids.button);
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
	}

	private padEnd(name: string) {
		return escapeInlineCode(name).padEnd(20, ' ');
	}

	private index(num: number) {
		return num.toString().padStart(2, ' ');
	}

	private percentage(num: number) {
		return num.toString().padStart(3, ' ');
	}
}
