const { Command } = require('discord-akairo');
const fetch = require('node-fetch');
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CWL = require('../../core/CWLWarTags');
const { Excel } = require('../../struct/ExcelHandler');

class CWLExport extends Command {
	constructor() {
		super('cwl-export', {
			aliases: ['cwl-export'],
			category: 'cwl-hidden',
			clientPermissions: ['ATTACH_FILES', 'EMBED_LINKS'],
			args: [
				{
					id: 'method',
					type: ['clans', 'all', 'members'],
					default: 'clans'
				}
			],
			description: {
				content: 'Export war stats to excel for all clans.',
				examples: ['']
			}
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { }) {
		const patron = this.client.patron.check(message.author, message.guild);
		if (!patron) {
			return message.channel.send({
				embed: {
					description: '[Become a Patron](https://www.patreon.com/clashperk) to export CWL data to Excel.'
				}
			});
		}

		const clans = await this.client.mongodb.collection('clanwarlogs').find({ guild: message.guild.id }).toArray();
		const chunks = [];
		for (const clan of clans) {
			const res = await this.client.coc.clanWarLeague(clan.tag).catch(() => null);
			if (!res?.ok) {
				const data = await CWL.get(clan.tag);
				if (!data) continue;
				const members = await this.rounds(data, clan);
				if (!members.length) continue;
				chunks.push({
					name: clan.name, members,
					id: `${months[new Date(data.season).getMonth()]} ${new Date().getFullYear(data.season)}`
				});
				continue;
			}
			const members = await this.rounds(res, clan);
			if (!members.length) continue;
			chunks.push({ name: clan.name, members, id: `${months[new Date().getMonth()]} ${new Date().getFullYear()}` });
		}

		if (!chunks.length) return message.util.send('Nobody attacked in your clan yet, try again after sometime.');

		const workbook = Excel();
		for (const { members, name, id } of chunks) {
			const sheet = workbook.addWorksheet(`${name} (${id})`);
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
			];

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
		return message.util.send({
			files: [{
				attachment: Buffer.from(buffer),
				name: 'clan_war_league_stars.xlsx'
			}]
		});
	}

	starCount(stars = [], count) {
		return stars.filter(star => star === count).length;
	}

	async rounds(body, clan) {
		const rounds = body.rounds.filter(r => !r.warTags.includes('#0'));
		const [members, clanTag] = [{}, clan.tag];

		for (const { warTags } of rounds) {
			for (const warTag of warTags) {
				const res = await fetch(`https://api.clashofclans.com/v1/clanwarleagues/wars/${encodeURIComponent(warTag)}`, {
					method: 'GET', headers: { accept: 'application/json', authorization: `Bearer ${process.env.DEVELOPER_TOKEN}` }
				});
				const data = await res.json();

				if ((data.clan && data.clan.tag === clanTag) || (data.opponent && data.opponent.tag === clanTag)) {
					const clan = data.clan.tag === clanTag ? data.clan : data.opponent;
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
								member.starTypes.push(member.stars);
							}

							if (m.bestOpponentAttack) {
								member.defStars += m.bestOpponentAttack.stars;
								member.defDestruction += m.bestOpponentAttack.destructionPercentage;
								member.defCount += 1;
							}
						}
					}
					break;
				}
			}
		}

		return Object.values(members).sort((a, b) => b.dest - a.dest).sort((a, b) => b.stars - a.stars);
	}

	destruction(dest) {
		return dest.toFixed()
			.toString()
			.concat('%')
			.padEnd(4, ' ');
	}

	attacks(num, team) {
		return num.toString().concat(`/${team}`);
	}

	winner(clan, opponent) {
		if (clan.stars > opponent.stars) {
			return true;
		} else if (clan.stars < opponent.stars) {
			return false;
		}
		if (clan.destructionPercentage > opponent.destructionPercentage) {
			return true;
		} else if (clan.destructionPercentage < opponent.destructionPercentage) {
			return false;
		}
	}
}

module.exports = CWLExport;
