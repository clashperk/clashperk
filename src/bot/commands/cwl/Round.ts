import { ClanWar, ClanWarLeagueGroup, ClanWarMember } from 'clashofclans.js';
import { EmbedBuilder, CommandInteraction, SelectMenuBuilder, ActionRowBuilder, ComponentType } from 'discord.js';
import moment from 'moment';
import { EMOJIS, TOWN_HALLS, ORANGE_NUMBERS } from '../../util/Emojis.js';
import { Command } from '../../lib/index.js';
import { Util } from '../../util/index.js';

export default class CWLRoundCommand extends Command {
	public constructor() {
		super('cwl-round', {
			name: 'round',
			category: 'war',
			channel: 'guild',
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			description: {
				content: 'Shows info about the current round.'
			},
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string }) {
		const clan = await this.client.resolver.resolveClan(interaction, args.tag);
		if (!clan) return;

		const body = await this.client.http.clanWarLeague(clan.tag);
		if (body.statusCode === 504 || body.state === 'notInWar') {
			return interaction.editReply(
				this.i18n('command.cwl.still_searching', { lng: interaction.locale, clan: `${clan.name} (${clan.tag})` })
			);
		}

		if (!body.ok) {
			const cw = await this.client.storage.getWarTags(clan.tag);
			if (cw) return this.rounds(interaction, cw, clan.tag);

			return interaction.editReply(
				this.i18n('command.cwl.not_in_season', { lng: interaction.locale, clan: `${clan.name} (${clan.tag})` })
			);
		}

		this.client.storage.pushWarTags(clan.tag, body);
		return this.rounds(interaction, body, clan.tag);
	}

	private async rounds(interaction: CommandInteraction<'cached'>, body: ClanWarLeagueGroup, clanTag: string) {
		const rounds = body.rounds.filter((d) => !d.warTags.includes('#0'));

		const chunks: { state: string; embed: EmbedBuilder; round: number }[] = [];
		let index = 0;
		for (const { warTags } of rounds) {
			for (const warTag of warTags) {
				const data: ClanWar = await this.client.http.clanWarLeagueWar(warTag);
				if (!data.ok || data.state === 'notInWar') continue;

				if (data.clan.tag === clanTag || data.opponent.tag === clanTag) {
					const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
					const opponent = data.clan.tag === clan.tag ? data.opponent : data.clan;
					const embed = new EmbedBuilder().setColor(this.client.embed(interaction));
					embed.setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.medium }).addFields([
						{
							name: 'War Against',
							value: `\u200e${opponent.name} (${opponent.tag})`
						},
						{
							name: 'Team Size',
							value: `${data.teamSize}`
						}
					]);
					if (data.state === 'warEnded') {
						const endTimestamp = new Date(moment(data.endTime).toDate()).getTime();
						embed.addFields([
							{
								name: 'War State',
								value: ['War Ended', `Ended: ${Util.getRelativeTime(endTimestamp)}`].join('\n')
							},
							{
								name: 'Stats',
								value: [
									`\`\u200e${clan.stars.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${
										EMOJIS.STAR
									} \u2002 \`\u200e ${opponent.stars.toString().padEnd(8, ' ')}\u200f\``,
									`\`\u200e${clan.attacks.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${
										EMOJIS.SWORD
									} \u2002 \`\u200e ${opponent.attacks.toString().padEnd(8, ' ')}\u200f\``,
									`\`\u200e${`${clan.destructionPercentage.toFixed(2)}%`.padStart(8, ' ')} \u200f\`\u200e \u2002 ${
										EMOJIS.FIRE
									} \u2002 \`\u200e ${`${opponent.destructionPercentage.toFixed(2)}%`.padEnd(8, ' ')}\u200f\``
								].join('\n')
							}
						]);
					}
					if (data.state === 'inWar') {
						const endTimestamp = new Date(moment(data.endTime).toDate()).getTime();
						embed.addFields([
							{
								name: 'War State',
								value: ['Battle Day', `End Time: ${Util.getRelativeTime(endTimestamp)}`].join('\n')
							}
						]);
						embed.addFields([
							{
								name: 'Stats',
								value: [
									`\`\u200e${clan.stars.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${
										EMOJIS.STAR
									} \u2002 \`\u200e ${opponent.stars.toString().padEnd(8, ' ')}\u200f\``,
									`\`\u200e${clan.attacks.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${
										EMOJIS.SWORD
									} \u2002 \`\u200e ${opponent.attacks.toString().padEnd(8, ' ')}\u200f\``,
									`\`\u200e${`${clan.destructionPercentage.toFixed(2)}%`.padStart(8, ' ')} \u200f\`\u200e \u2002 ${
										EMOJIS.FIRE
									} \u2002 \`\u200e ${`${opponent.destructionPercentage.toFixed(2)}%`.padEnd(8, ' ')}\u200f\``
								].join('\n')
							}
						]);
					}
					if (data.state === 'preparation') {
						const startTimestamp = new Date(moment(data.startTime).toDate()).getTime();
						embed.addFields([
							{
								name: 'War State',
								value: ['Preparation Day', `War Start Time: ${Util.getRelativeTime(startTimestamp)}`].join('\n')
							}
						]);
					}
					embed.addFields([
						{
							name: 'Rosters',
							value: [`\u200e**${clan.name}**`, `${this.count(clan.members)}`].join('\n')
						},
						{
							name: '\u200e',
							value: [`\u200e**${opponent.name}**`, `${this.count(opponent.members)}`].join('\n')
						}
					]);
					embed.setFooter({ text: `Round #${++index}` });

					chunks.push({ state: data.state, embed, round: index });
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
		const customID = this.client.uuid(interaction.user.id);
		const menu = new SelectMenuBuilder().addOptions(options).setCustomId(customID).setPlaceholder('Select a round!');

		const msg = await interaction.editReply({
			embeds: [round.embed],
			components: [new ActionRowBuilder<SelectMenuBuilder>({ components: [menu] })]
		});
		const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
			filter: (action) => action.customId === customID && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === customID && action.isSelectMenu()) {
				const round = chunks.find((ch) => ch.round === Number(action.values[0]));
				await action.update({ embeds: [round!.embed] });
			}
		});

		collector.on('end', async (_, reason) => {
			this.client.components.delete(customID);
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
	}

	private count(members: ClanWarMember[]) {
		const reduced = members.reduce<{ [key: string]: number }>((count, member) => {
			const townHall = member.townhallLevel;
			count[townHall] = (count[townHall] || 0) + 1;
			return count;
		}, {});

		const townHalls = Object.entries(reduced)
			.map((entry) => ({ level: Number(entry[0]), total: entry[1] }))
			.sort((a, b) => b.level - a.level);

		return Util.chunk(townHalls, 5)
			.map((chunks) => chunks.map((th) => `${TOWN_HALLS[th.level]} ${ORANGE_NUMBERS[th.total]}`).join(' '))
			.join('\n');
	}
}
