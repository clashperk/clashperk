import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';
import { Clan } from 'clashofclans.js';
import { Message } from 'discord.js';

const MAX_POINT = 4000;

interface Member {
	tag: string;
	name: string;
	achievements: {
		gained: number;
		name: string;
		endedAt?: any;
		value: number;
	}[];
}

interface Mem {
	tag: string;
	name: string;
	points: number;
	endedAt?: any;
}

export default class ClanGamesCommand extends Command {
	public constructor() {
		super('clangames', {
			aliases: ['clangames', 'points', 'cg'],
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['ADD_REACTIONS', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Shows clan game points of your clan members.',
				usage: '<clanTag>',
				examples: ['#8QU8J9LP']
			},
			flags: ['--max', '--filter'],
			args: [
				{
					id: 'data',
					type: (msg, tag) => this.client.resolver.resolveClan(msg, tag)
				},
				{
					id: 'force',
					match: 'flag',
					flag: ['--max']
				},
				{
					id: 'filter',
					match: 'flag',
					flag: ['--filter']
				}
			]
		});
	}

	public async exec(message: Message, { data, force, filter }: { data: Clan; force: boolean; filter: boolean }) {
		await message.util!.send(`**Fetching data... ${EMOJIS.LOADING}**`);

		const fetched = await this.client.http.detailedClanMembers(data.memberList);
		const memberList = fetched.filter(res => res.ok).map(m => {
			const value = m.achievements.find(a => a.name === 'Games Champion')?.value ?? 0;
			return { tag: m.tag, name: m.name, points: value };
		});

		const queried = await this.query(data.tag, data);
		const { members, total } = this.filter(queried, memberList);

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium)
			.setDescription([
				`Clan Games Scoreboard [${data.members}/50]`,
				`\`\`\`\n\u200e\u2002# POINTS \u2002 ${'NAME'.padEnd(20, ' ')}`,
				members.slice(0, 55)
					.filter(d => filter ? d.points > 0 : d.points >= 0)
					.map((m, i) => {
						const points = this.padStart(force ? m.points : Math.min(MAX_POINT, m.points));
						return `\u200e${(++i).toString().padStart(2, '\u2002')} ${points} \u2002 ${m.name}`;
					})
					.join('\n'),
				'```'
			])
			.setFooter(`Points: ${total} [Avg: ${(total / data.members).toFixed(2)}]`, this.client.user!.displayAvatarURL());

		return message.util!.send({ embed });
	}

	private padStart(num: number) {
		return num.toString().padStart(6, ' ');
	}

	private get seasonID() {
		const now = new Date();
		if (now.getDate() < 22) now.setMonth(now.getMonth() - 1);
		return now.toISOString().substring(0, 7);
	}

	private query(tag: string, clan: Clan) {
		return this.client.db.collection('clanmembers')
			.find({
				clanTag: tag,
				season: this.seasonID,
				$or: [
					{
						tag: {
							$in: clan.memberList.map(m => m.tag)
						}
					},
					{
						'achievements.name': 'Games Champion',
						'achievements.gained': { $gt: 0 }
					}
				]
			})
			.toArray();
	}


	private filter(dbMembers: Member[] = [], clanMembers: Mem[] = []) {
		const members = clanMembers.map(member => {
			const mem = dbMembers.find(m => m.tag === member.tag);
			if (mem) {
				const ach = mem.achievements.find(m => m.name === 'Games Champion');
				return {
					tag: mem.tag,
					name: mem.name,
					points: member.points - ach!.value,
					endedAt: ach?.endedAt
				};
			}

			return {
				name: member.name,
				tag: member.tag,
				points: 0
			};
		});

		const missingMembers: Mem[] = dbMembers.filter(mem => !members.find(m => m.tag === mem.tag))
			.map(mem => ({
				name: mem.name,
				tag: mem.tag,
				points: mem.achievements.find(m => m.name === 'Games Champion')!.gained,
				endedAt: mem.achievements.find(m => m.name === 'Games Champion')?.endedAt
			}));

		const allMembers = [...members, ...missingMembers];
		const total = allMembers.reduce((prev, mem) => prev + Math.min(mem.points, MAX_POINT), 0);

		return {
			total,
			members: allMembers.sort((a, b) => b.points - a.points).sort((a, b) => a.endedAt - b.endedAt)
		};
	}
}
