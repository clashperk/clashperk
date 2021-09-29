import { MessageEmbed, Message, MessageButton, MessageActionRow } from 'discord.js';
import { Clan, ClanWarMember, ClanWar, WarClan } from 'clashofclans.js';
import { Collections, STOP_REASONS } from '../../util/Constants';
import { EMOJIS, TOWN_HALLS } from '../../util/Emojis';
import { WHITE_NUMBERS } from '../../util/NumEmojis';
import { Command, Argument } from 'discord-akairo';
import Workbook from '../../struct/Excel';
import { Util } from '../../util/Util';
import moment from 'moment';

export default class WarCommand extends Command {
	public constructor() {
		super('war', {
			aliases: ['war'],
			category: 'war',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'EMBED_LINKS'],
			description: {
				content: [
					'Current or previous clan war details.',
					'',
					'Get War ID from `warlog` command.'
				],
				usage: '<#clanTag|last|warID>',
				examples: ['36081', '#8QU8J9LP', '#8QU8J9LP last']
			},
			optionFlags: ['--tag', '--war-id']
		});
	}

	public *args(msg: Message): unknown {
		const warID = yield {
			flag: '--war-id',
			type: Argument.union([['last']], Argument.range('integer', 1001, 9e6)),
			unordered: msg.interaction ? false : true,
			match: msg.interaction ? 'option' : 'phrase'
		};

		const data = yield {
			flag: '--tag',
			unordered: msg.interaction ? false : true,
			match: msg.interaction ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolveClan(msg, tag)
		};

		return { data, warID };
	}

	public async exec(message: Message, { data, warID }: { data: Clan; warID?: number }) {
		if (warID) return this.getWar(message, warID, data.tag);

		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`\u200e${data.name} (${data.tag})`, data.badgeUrls.medium);

		if (!data.isWarLogPublic) {
			const res = await this.client.http.clanWarLeague(data.tag);
			if (res.ok) {
				return this.handler.runCommand(message, this.handler.modules.get('cwl-round')!, { data });
			}
			embed.setDescription('Private War Log');
			return message.util!.send({ embeds: [embed] });
		}

		const body = await this.client.http.currentClanWar(data.tag);
		if (!body.ok) {
			return message.util!.send('**504 Request Timeout!**');
		}
		if (body.state === 'notInWar') {
			const res = await this.client.http.clanWarLeague(data.tag);
			if (res.ok) {
				return this.handler.runCommand(message, this.handler.modules.get('cwl-round')!, { data });
			}
			embed.setDescription('Not in War');
			return message.util!.send({ embeds: [embed] });
		}

		return this.sendResult(message, body);
	}

	private async getWar(message: Message, id: number | string, tag: string) {
		let data: any = null;
		if (typeof id === 'string' && tag) {
			data = await this.client.db.collection(Collections.CLAN_WARS)
				.find({ 'clan.tag': tag, 'groupWar': false, 'state': 'warEnded' })
				.sort({ preparationStartTime: -1 })
				.limit(1)
				.next();
		} else if (typeof id === 'number') {
			data = await this.client.db.collection(Collections.CLAN_WARS).findOne({ id });
		}

		if (!data) {
			return message.util!.send('**No War found for the specified War ID.**');
		}

		return this.sendResult(message, data);
	}

	private async sendResult(message: Message, body: ClanWar) {
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`\u200e${body.clan.name} (${body.clan.tag})`, body.clan.badgeUrls.medium);

		if (body.state === 'preparation') {
			const startTimestamp = new Date(moment(body.startTime).toDate()).getTime();
			embed.setDescription([
				'**War Against**',
				`\u200e${Util.escapeMarkdown(body.opponent.name)} (${body.opponent.tag})`,
				'',
				'**War State**',
				'Preparation',
				`War Start Time: ${Util.getRelativeTime(startTimestamp)}`,
				'',
				'**War Size**',
				`${body.teamSize} vs ${body.teamSize}`
			].join('\n'));
		}

		if (body.state === 'inWar') {
			const endTimestamp = new Date(moment(body.endTime).toDate()).getTime();
			embed.setDescription([
				'**War Against**',
				`\u200e${Util.escapeMarkdown(body.opponent.name)} (${body.opponent.tag})`,
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
			].join('\n'));
		}

		if (body.state === 'warEnded') {
			const endTimestamp = new Date(moment(body.endTime).toDate()).getTime();
			embed.setDescription([
				'**War Against**',
				`\u200e${Util.escapeMarkdown(body.opponent.name)} (${body.opponent.tag})`,
				'',
				'**War State**',
				`War Ended (${body.teamSize} vs ${body.teamSize})`,
				`Ended: ${Util.getRelativeTime(endTimestamp)}`,
				'',
				'**War Stats**',
				`${this.getLeaderBoard(body.clan, body.opponent, body.attacksPerMember)}`
			].join('\n'));
		}

		embed.addField('Rosters', [
			`\u200e${Util.escapeMarkdown(body.clan.name)}`,
			`${this.count(body.clan.members)}`
		].join('\n'));
		embed.addField('\u200b', [
			`\u200e${Util.escapeMarkdown(body.opponent.name)}`,
			`${this.count(body.opponent.members)}`
		].join('\n'));

		if (body.hasOwnProperty('id')) {
			// @ts-expect-error
			embed.setFooter(`War ID #${body.id as number}`);
		}

		if (body.state === 'preparation') {
			return message.util!.send({ embeds: [embed] });
		}

		const customID = this.client.uuid(message.author.id);
		const button = new MessageButton()
			.setLabel('Download')
			.setEmoji('📥')
			.setStyle('SECONDARY')
			.setCustomId(customID);

		const msg = await message.util!.send({ embeds: [embed], components: [new MessageActionRow({ components: [button] })] });
		const collector = msg.createMessageComponentCollector({
			filter: action => action.customId === customID && action.user.id === message.author.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async action => {
			if (action.customId === customID) {
				if (this.client.patrons.get(message)) {
					await action.update({ components: [] });
					const buffer = await this.warStats(body);
					await action.followUp(
						{
							content: `**${body.clan.name} vs ${body.opponent.name}**`,
							files: [{ attachment: Buffer.from(buffer), name: 'war_stats.xlsx' }]
						}
					);
				} else {
					const embed = new MessageEmbed()
						.setDescription([
							'**Patron Only Command**',
							'This command is only available on Patron servers.',
							'Visit https://patreon.com/clashperk for more details.',
							'',
							'**Demo War Attacks Export**'
						].join('\n'))
						.setImage('https://i.imgur.com/Uc5G2oS.png'); // TODO: Update Image

					await action.reply({ embeds: [embed], ephemeral: true });
				}
			}
		});

		collector.on('end', async (_, reason) => {
			this.client.components.delete(customID);
			if (STOP_REASONS.includes(reason)) return;
			if (!msg.deleted) await msg.edit({ components: [] });
		});
	}

	private count(members: ClanWarMember[] = []) {
		const reduced = members.reduce((count, member) => {
			const townHall = member.townhallLevel;
			count[townHall] = (count[townHall] || 0) + 1;
			return count;
		}, {} as { [key: string]: number });

		const townHalls = Object.entries(reduced)
			.map(entry => ({ level: Number(entry[0]), total: Number(entry[1]) }))
			.sort((a, b) => b.level - a.level);

		return this.chunk(townHalls)
			.map(
				chunks => chunks.map(th => `${TOWN_HALLS[th.level]}${WHITE_NUMBERS[th.total]}`).join(' ')
			).join('\n');
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
			data.map(m => [
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
			`\`\u200e${clan.stars.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${EMOJIS.STAR} \u2002 \`\u200e ${opponent.stars.toString().padEnd(8, ' ')}\u200f\``,
			`\`\u200e${`${clan.attacks}/${attacksTotal}`.padStart(8, ' ')} \u200f\`\u200e \u2002 ${EMOJIS.SWORD} \u2002 \`\u200e ${`${opponent.attacks}/${attacksTotal}`.padEnd(8, ' ')}\u200f\``,
			`\`\u200e${`${clan.destructionPercentage.toFixed(2)}%`.padStart(8, ' ')} \u200f\`\u200e \u2002 ${EMOJIS.FIRE} \u2002 \`\u200e ${`${opponent.destructionPercentage.toFixed(2)}%`.padEnd(8, ' ')}\u200f\``
		].join('\n');
	}

	private flatHits(data: ClanWar) {
		return data.clan.members.sort((a, b) => a.mapPosition - b.mapPosition).reduce((previous, member) => {
			const atk = member.attacks?.map((attack, num) => ({
				attack,
				tag: member.tag,
				name: member.name,
				mapPosition: member.mapPosition,
				townhallLevel: member.townhallLevel,
				bestOpponentAttack: num === 0 ? member.bestOpponentAttack : {},
				defender: data.opponent.members.find(m => m.tag === attack.defenderTag)
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
		}, [] as any[]);
	}
}
