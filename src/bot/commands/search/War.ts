import {
	EmbedBuilder,
	CommandInteraction,
	ButtonBuilder,
	ActionRowBuilder,
	escapeMarkdown,
	ButtonStyle,
	ComponentType,
	User
} from 'discord.js';
import { ClanWarMember, ClanWar, WarClan } from 'clashofclans.js';
import moment from 'moment';
import { Collections, WarType } from '../../util/Constants.js';
import { EMOJIS, TOWN_HALLS, WHITE_NUMBERS } from '../../util/Emojis.js';
import { Command } from '../../lib/index.js';
import Workbook from '../../struct/Excel.js';
import { Util } from '../../util/index.js';

export default class WarCommand extends Command {
	public constructor() {
		super('war', {
			category: 'war',
			channel: 'guild',
			clientPermissions: ['UseExternalEmojis', 'EmbedLinks'],
			description: {
				content: ['Current or previous clan war details.', '', 'Get War ID from `warlog` command.']
			},
			defer: true
		});
	}

	// TODO : Args Parsing with last war id

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; war_id?: number; user?: User }) {
		const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
		if (!clan) return;
		if (args.war_id) return this.getWar(interaction, args.war_id, clan.tag);

		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `\u200e${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.medium });

		if (!clan.isWarLogPublic) {
			const res = await this.client.http.clanWarLeague(clan.tag);
			if (res.ok) {
				// TODO: Fix
				return this.handler.exec(interaction, this.handler.modules.get('cwl-round')!, { tag: clan.tag });
			}
			embed.setDescription('Private War Log');
			return interaction.editReply({ embeds: [embed] });
		}

		const body = await this.client.http.currentClanWar(clan.tag);
		if (!body.ok) {
			return interaction.editReply('**504 Request Timeout!**');
		}
		if (body.state === 'notInWar') {
			const res = await this.client.http.clanWarLeague(clan.tag);
			if (res.ok) {
				// TODO: Fix
				return this.handler.exec(interaction, this.handler.modules.get('cwl-round')!, { tag: clan.tag });
			}
			embed.setDescription(this.i18n('command.war.not_in_war', { lng: interaction.locale }));
			return interaction.editReply({ embeds: [embed] });
		}

		return this.sendResult(interaction, body);
	}

	private async getWar(interaction: CommandInteraction, id: number | string, tag: string) {
		const collection = this.client.db.collection(Collections.CLAN_WARS);
		const data =
			id === 'last'
				? await collection
						.find({
							$or: [{ 'clan.tag': tag }, { 'opponent.tag': tag }],
							warType: { $ne: WarType.CWL },
							state: 'warEnded'
						})
						.sort({ _id: -1 })
						.limit(1)
						.next()
				: await collection.findOne({ id: Number(id), $or: [{ 'clan.tag': tag }, { 'opponent.tag': tag }] });

		if (!data) {
			return interaction.editReply(this.i18n('command.war.no_war_id', { lng: interaction.locale }));
		}

		const clan = data.clan.tag === tag ? data.clan : data.opponent;
		const opponent = data.clan.tag === tag ? data.opponent : data.clan;
		// @ts-expect-error
		return this.sendResult(interaction, { ...data, clan, opponent });
	}

	private async sendResult(interaction: CommandInteraction<'cached'>, body: ClanWar) {
		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `\u200e${body.clan.name} (${body.clan.tag})`, iconURL: body.clan.badgeUrls.medium });

		if (body.state === 'preparation') {
			const startTimestamp = new Date(moment(body.startTime).toDate()).getTime();
			embed.setDescription(
				[
					'**War Against**',
					`\u200e${escapeMarkdown(body.opponent.name)} (${body.opponent.tag})`,
					'',
					'**War State**',
					'Preparation',
					`War Start Time: ${Util.getRelativeTime(startTimestamp)}`,
					'',
					'**War Size**',
					`${body.teamSize} vs ${body.teamSize}`
				].join('\n')
			);
		}

		if (body.state === 'inWar') {
			const endTimestamp = new Date(moment(body.endTime).toDate()).getTime();
			embed.setDescription(
				[
					'**War Against**',
					`\u200e${escapeMarkdown(body.opponent.name)} (${body.opponent.tag})`,
					'',
					'**War State**',
					`Battle Day (${body.teamSize} vs ${body.teamSize})`,
					`End Time: ${Util.getRelativeTime(endTimestamp)}`,
					'',
					'**War Size**',
					`${body.teamSize} vs ${body.teamSize}`,
					'',
					'**War Stats**',
					`${this.getLeaderBoard(body.clan, body.opponent, body.attacksPerMember)}`
				].join('\n')
			);
		}

		if (body.state === 'warEnded') {
			const endTimestamp = new Date(moment(body.endTime).toDate()).getTime();
			embed.setDescription(
				[
					'**War Against**',
					`\u200e${escapeMarkdown(body.opponent.name)} (${body.opponent.tag})`,
					'',
					'**War State**',
					`War Ended (${body.teamSize} vs ${body.teamSize})`,
					`Ended: ${Util.getRelativeTime(endTimestamp)}`,
					'',
					'**War Stats**',
					`${this.getLeaderBoard(body.clan, body.opponent, body.attacksPerMember)}`
				].join('\n')
			);
		}

		embed.addFields([
			{
				name: 'Rosters',
				value: [`\u200e${escapeMarkdown(body.clan.name)}`, `${this.count(body.clan.members)}`].join('\n')
			},
			{
				name: '\u200b',
				value: [`\u200e${escapeMarkdown(body.opponent.name)}`, `${this.count(body.opponent.members)}`].join('\n')
			}
		]);

		if (body.hasOwnProperty('id')) {
			// @ts-expect-error
			embed.setFooter({ text: `War ID #${body.id as number}` });
		}

		if (body.state === 'preparation') {
			return interaction.editReply({ embeds: [embed] });
		}

		const customID = this.client.uuid(interaction.user.id);
		const button = new ButtonBuilder().setLabel('Download').setEmoji('📥').setStyle(ButtonStyle.Secondary).setCustomId(customID);

		const msg = await interaction.editReply({
			embeds: [embed],
			components: [new ActionRowBuilder<ButtonBuilder>({ components: [button] })]
		});
		const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
			filter: (action) => action.customId === customID && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === customID) {
				if (this.client.patrons.get(interaction)) {
					await action.update({ components: [] });
					const buffer = await this.warStats(body);
					await action.followUp({
						content: `**${body.clan.name} vs ${body.opponent.name}**`,
						files: [{ attachment: Buffer.from(buffer), name: 'war_stats.xlsx' }]
					});
				} else {
					const embed = new EmbedBuilder()
						.setDescription(
							[
								'**Patron Only Command**',
								'This command is only available on Patron servers.',
								'Visit https://patreon.com/clashperk for more details.',
								'',
								'**Demo War Attacks Export**'
							].join('\n')
						)
						.setImage('https://i.imgur.com/Uc5G2oS.png'); // TODO: Update Image

					await action.reply({ embeds: [embed], ephemeral: true });
				}
			}
		});

		collector.on('end', async (_, reason) => {
			this.client.components.delete(customID);
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
	}

	private count(members: ClanWarMember[] = []) {
		const reduced = members.reduce<{ [key: string]: number }>((count, member) => {
			const townHall = member.townhallLevel;
			count[townHall] = (count[townHall] || 0) + 1;
			return count;
		}, {});

		const townHalls = Object.entries(reduced)
			.map((entry) => ({ level: Number(entry[0]), total: Number(entry[1]) }))
			.sort((a, b) => b.level - a.level);

		return this.chunk(townHalls)
			.map((chunks) => chunks.map((th) => `${TOWN_HALLS[th.level]}${WHITE_NUMBERS[th.total]}`).join(' '))
			.join('\n');
	}

	private chunk(items: { level: number; total: number }[] = []) {
		const chunk = 5;
		const array = [];
		for (let i = 0; i < items.length; i += chunk) {
			array.push(items.slice(i, i + chunk));
		}
		return array;
	}

	private warStats(round: ClanWar) {
		const data = this.flatHits(round);
		const workbook = new Workbook();
		const sheet = workbook.addWorksheet('Current War');

		sheet.columns = [
			{ header: 'NAME', width: 18 },
			{ header: 'TAG', width: 13 },
			{ header: 'STAR', width: 8 },
			{ header: 'DESTRUCTION', width: 12 },
			{ header: 'DEFENDER', width: 18 },
			{ header: 'DEFENDER TAG', width: 13 },
			{ header: 'ATTACKER MAP', width: 10 },
			{ header: 'ATTACKER TH', width: 10 },
			{ header: 'DEFENDER MAP', width: 10 },
			{ header: 'DEFENDER TH', width: 10 },
			{ header: 'DEFENSE STAR', width: 10 },
			{ header: 'DEFENSE DESTRUCTION', width: 12 }
		] as any;

		sheet.getRow(1).font = { bold: true, size: 10 };
		sheet.getRow(1).height = 40;

		for (let i = 1; i <= sheet.columns.length; i++) {
			sheet.getColumn(i).alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
		}

		sheet.addRows(
			data.map((m) => [
				m.name,
				m.tag,
				m.attack?.stars,
				m.attack?.destructionPercentage?.toFixed(2),
				m.defender?.name,
				m.defender?.tag,
				m.mapPosition,
				m.townhallLevel,
				m.defender?.mapPosition,
				m.defender?.townhallLevel,
				m.bestOpponentAttack?.stars,
				m.bestOpponentAttack?.destructionPercentage?.toFixed(2)
			])
		);

		return workbook.xlsx.writeBuffer();
	}

	private getLeaderBoard(clan: WarClan, opponent: WarClan, attacksPerMember: number) {
		const attacksTotal = Math.floor(clan.members.length * attacksPerMember);
		return [
			`\`\u200e${clan.stars.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${EMOJIS.STAR} \u2002 \`\u200e ${opponent.stars
				.toString()
				.padEnd(8, ' ')}\u200f\``,
			`\`\u200e${`${clan.attacks}/${attacksTotal}`.padStart(8, ' ')} \u200f\`\u200e \u2002 ${
				EMOJIS.SWORD
			} \u2002 \`\u200e ${`${opponent.attacks}/${attacksTotal}`.padEnd(8, ' ')}\u200f\``,
			`\`\u200e${`${clan.destructionPercentage.toFixed(2)}%`.padStart(8, ' ')} \u200f\`\u200e \u2002 ${
				EMOJIS.FIRE
			} \u2002 \`\u200e ${`${opponent.destructionPercentage.toFixed(2)}%`.padEnd(8, ' ')}\u200f\``
		].join('\n');
	}

	private flatHits(data: ClanWar) {
		return data.clan.members
			.sort((a, b) => a.mapPosition - b.mapPosition)
			.reduce<any[]>((previous, member) => {
				const atk = member.attacks?.map((attack, num) => ({
					attack,
					tag: member.tag,
					name: member.name,
					mapPosition: member.mapPosition,
					townhallLevel: member.townhallLevel,
					bestOpponentAttack: num === 0 ? member.bestOpponentAttack : {},
					defender: data.opponent.members.find((m) => m.tag === attack.defenderTag)
				}));

				if (atk) {
					previous.push(...atk);
				} else {
					previous.push({
						tag: member.tag,
						name: member.name,
						mapPosition: member.mapPosition,
						townhallLevel: member.townhallLevel,
						bestOpponentAttack: member.bestOpponentAttack
					});
				}

				previous.push({});
				return previous;
			}, []);
	}
}
