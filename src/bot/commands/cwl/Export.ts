import { Clan, ClanWarLeague, ClanWar, ClanWarClan } from 'clashofclans.js';
import { Collections } from '@clashperk/node';
import { Util } from '../../util/Constants';
import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';
import Excel from '../../struct/Excel';
import { Message } from 'discord.js';

const months = [
	'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
	'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export default class CWLExport extends Command {
	public constructor() {
		super('cwl-export', {
			aliases: ['cwl-export'],
			category: 'cwl',
			clientPermissions: ['ATTACH_FILES', 'EMBED_LINKS'],
			description: {
				content: 'Export war stats to excel for all clans.',
				examples: [''],
				usage: '[...#clanTag|...aliases]'
			},
			optionFlags: ['--tag']
		});
	}

	public *args(msg: Message): unknown {
		const clans = yield {
			'flag': '--tag',
			'default': [],
			'match': msg.hasOwnProperty('token') ? 'option' : 'content',
			'type': (msg: Message, args?: string) => args?.split(/ +/g)
		};

		return { clans };
	}

	private async getClans(message: Message, aliases: string[]) {
		const cursor = this.client.db.collection(Collections.CLAN_STORES)
			.find({
				guild: message.guild!.id,
				$or: [
					{
						tag: { $in: aliases.map(tag => this.fixTag(tag)) }
					},
					{
						alias: { $in: aliases.map(alias => alias.toLowerCase()) }
					}
				]
			});

		return cursor.toArray();
	}

	private fixTag(tag: string) {
		return `#${tag.toUpperCase().replace(/^#/g, '').replace(/O|o/g, '0')}`;
	}

	public async exec(message: Message, { tags }: { tags?: string[] }) {
		if (!this.client.patrons.get(message)) {
			return message.channel.send({ embed: { description: '[Become a Patron](https://www.patreon.com/clashperk) to export CWL data to Excel.' } });
		}

		let clans = [];
		if (tags?.length) {
			clans = await this.getClans(message, tags);
			if (!clans.length) return message.util!.send(`*No clans found in my database for the specified argument.*`);
		} else {
			clans = await this.client.storage.findAll(message.guild!.id);
		}

		const msg = await message.util!.send(`**Fetching data... ${EMOJIS.LOADING}**`);
		const chunks = [];
		for (const clan of clans) {
			const res = await this.client.http.clanWarLeague(clan.tag).catch(() => null);
			if (!res?.ok) {
				const data = await this.client.storage.getWarTags(clan.tag);
				if (!data) continue;
				const { members, perRound } = await this.rounds(data, clan);
				if (!members.length) continue;
				chunks.push({
					name: clan.name, members, perRound,
					id: `${months[new Date(data.season).getMonth()]} ${new Date(data.season).getFullYear()}`
				});
				continue;
			}

			const { members, perRound } = await this.rounds(res, clan);
			if (!members.length) continue;
			chunks.push({
				name: clan.name, members, perRound,
				id: `${months[new Date().getMonth()]} ${new Date().getFullYear()}`
			});
		}

		if (!chunks.length) return message.util!.send('Nobody attacked in your clan yet, try again after sometime.');

		const workbook = new Excel();
		for (const { members, name, id } of chunks) {
			const sheet = workbook.addWorksheet(`${Util.escapeSheetName(name)} (${id})`);
			sheet.columns = [
				{ header: 'Name', width: 16 },
				{ header: 'Tag', width: 16 },
				{ header: 'Total Attacks', width: 8 },
				{ header: 'Total Stars', width: 8 },
				{ header: 'Avg Stars', width: 8 },
				{ header: 'Total Dest', width: 8 },
				{ header: 'Avg Dest', width: 8 },
				{ header: 'Three Stars', width: 8 },
				{ header: 'Two Stars', width: 8 },
				{ header: 'One Stars', width: 8 },
				{ header: 'Zero Stars', width: 8 },
				{ header: 'Missed', width: 8 },
				{ header: 'Def Stars', width: 8 },
				{ header: 'Avg Def Stars', width: 8 },
				{ header: 'Total Def Dest', width: 8 },
				{ header: 'Avg Def Dest', width: 8 }
			] as any;

			sheet.getRow(1).font = { bold: true, size: 10 };
			sheet.getRow(1).height = 40;

			for (let i = 1; i <= sheet.columns.length; i++) {
				sheet.getColumn(i).alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
			}

			sheet.addRows(members.filter(m => m.of > 0)
				.map(m => [
					m.name,
					m.tag,
					m.of,
					m.stars,
					(m.stars / m.of).toFixed(2),
					m.dest.toFixed(2),
					(m.dest / m.of).toFixed(2),
					this.starCount(m.starTypes, 3),
					this.starCount(m.starTypes, 2),
					this.starCount(m.starTypes, 1),
					this.starCount(m.starTypes, 0),
					m.of - m.attacks,
					m.defStars,
					(m.defStars / m.defCount).toFixed(),
					m.defDestruction.toFixed(2),
					(m.defDestruction / m.defCount).toFixed(2)
				]));
		}

		const buffer = await workbook.xlsx.writeBuffer();
		if (!msg.deleted) await msg.delete();
		return message.util!.send({
			files: [
				{
					attachment: Buffer.from(buffer),
					name: 'clan_war_league_stars.xlsx'
				},
				{
					attachment: Buffer.from(await this.perRoundStats(chunks).xlsx.writeBuffer()),
					name: 'clan_war_league_per_round_stats.xlsx'
				}
			]
		});
	}

	private perRoundStats(clans: { perRound: { clan: ClanWarClan; opponent: ClanWarClan }[] }[]) {
		const workbook = new Excel();
		for (const { perRound } of clans) {
			let i = 0;
			for (const round of perRound) {
				// eslint-disable-next-line
				const sheet = workbook.addWorksheet(
					`Round ${++i} (${Util.escapeSheetName(round.clan.name)})`
				);

				sheet.columns = [
					{ header: 'Clan', width: 18 },
					{ header: 'Opponent', width: 18 },
					{ header: 'Attacker', width: 18 },
					{ header: 'Attacker Tag', width: 13 },
					{ header: 'Stars', width: 8 },
					{ header: 'Gained', width: 8 },
					{ header: 'Destruction', width: 10 },
					{ header: 'Defender', width: 18 },
					{ header: 'Defender Tag', width: 13 },
					{ header: 'Attacker Map', width: 10 },
					{ header: 'Attacker TH', width: 10 },
					{ header: 'Defender Map', width: 10 },
					{ header: 'Defender TH', width: 10 },
					{ header: 'Defender Stars', width: 10 },
					{ header: 'Defender Destruction', width: 10 }
				] as any;

				sheet.getRow(1).font = { bold: true, size: 10 };
				sheet.getRow(1).height = 40;

				for (let i = 1; i <= sheet.columns.length; i++) {
					sheet.getColumn(i).alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
				}

				sheet.addRows(
					round.clan.members.map(m => {
						const opponent = round.opponent.members.find(en => en.tag === m.attacks?.[0]?.defenderTag);
						const gained = m.bestOpponentAttack && m.attacks?.length ? m.attacks[0].stars - m.bestOpponentAttack.stars : '';
						return [
							round.clan.name,
							round.opponent.name,
							m.name,
							m.tag,
							m.attacks?.length ? m.attacks[0].stars : '',
							gained,
							m.attacks?.length ? m.attacks[0].destructionPercentage.toFixed(2) : '',
							opponent ? opponent.name : '',
							opponent ? opponent.tag : '',
							round.clan.members.findIndex(en => en.tag === m.tag) + 1,
							m.townhallLevel,
							opponent ? round.opponent.members.findIndex(en => en.tag === opponent.tag) + 1 : '',
							opponent ? opponent.townhallLevel : '',
							m.bestOpponentAttack?.stars ?? '',
							m.bestOpponentAttack?.stars.toFixed(2) ?? ''
						];
					})
				);
			}
		}

		return workbook;
	}

	private starCount(stars = [], count: number) {
		return stars.filter(star => star === count).length;
	}

	private async rounds(body: ClanWarLeague, clan: Clan) {
		const rounds = body.rounds.filter(r => !r.warTags.includes('#0'));
		const clanTag = clan.tag;
		const members: { [key: string]: any } = {};

		const perRound = [];
		for (const { warTags } of rounds) {
			for (const warTag of warTags) {
				const data: ClanWar = await this.client.http.clanWarLeagueWar(warTag);
				if (!data.ok) continue;

				if ((data.clan.tag === clanTag) || (data.opponent.tag === clanTag)) {
					const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
					const opponent = data.clan.tag === clanTag ? data.opponent : data.clan;
					if (['inWar', 'warEnded'].includes(data.state)) {
						for (const m of clan.members) {
							const member = members[m.tag]
								? members[m.tag]
								: members[m.tag] = {
									name: m.name,
									tag: m.tag,
									of: 0,
									attacks: 0,
									stars: 0,
									dest: 0,
									defStars: 0,
									defDestruction: 0,
									starTypes: [],
									defCount: 0
								};
							member.of += 1;

							if (m.attacks) {
								member.attacks += 1;
								member.stars += m.attacks[0].stars;
								member.dest += m.attacks[0].destructionPercentage;
								member.starTypes.push(m.attacks[0].stars);
							}

							if (m.bestOpponentAttack) {
								member.defStars += m.bestOpponentAttack.stars;
								member.defDestruction += m.bestOpponentAttack.destructionPercentage;
								member.defCount += 1;
							}
						}

						perRound.push({ clan, opponent });
					}
					break;
				}
			}
		}

		return {
			perRound,
			members: Object.values(members).sort((a, b) => b.dest - a.dest).sort((a, b) => b.stars - a.stars)
		};
	}
}
