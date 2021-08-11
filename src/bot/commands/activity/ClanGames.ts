import { Message, MessageActionRow, MessageButton } from 'discord.js';
import { Collections, STOP_REASONS } from '../../util/Constants';
import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';
import { Clan } from 'clashofclans.js';

export default class ClanGamesCommand extends Command {
	public constructor() {
		super('clangames', {
			aliases: ['points', 'clangames', 'cg'],
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: [
					'Clan Games points of all clan members.',
					'',
					'**[How does it work?](https://clashperk.com/faq)**'
				],
				usage: '<#clanTag>',
				examples: ['#8QU8J9LP']
			},
			flags: ['--max', '--filter'],
			optionFlags: ['--tag']
		});
	}

	public *args(msg: Message): unknown {
		const data = yield {
			flag: '--tag',
			match: msg.interaction ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolveClan(msg, tag)
		};

		const force = yield {
			match: 'flag',
			flag: ['--max']
		};

		const filter = yield {
			match: 'flag',
			flag: ['--filter']
		};

		return { data, force, filter };
	}

	public async exec(message: Message, { data, force, filter }: { data: Clan; force: boolean; filter: boolean }) {
		await message.util!.send(`**Fetching data... ${EMOJIS.LOADING}**`);

		const fetched = await this.client.http.detailedClanMembers(data.memberList);
		const memberList = fetched.filter(res => res.ok).map(m => {
			const value = m.achievements.find(a => a.name === 'Games Champion')?.value ?? 0;
			return { tag: m.tag, name: m.name, points: value };
		});

		const queried = await this.query(data.tag, data);
		const members = this.filter(queried, memberList);
		const embed = this.embed(data, members, force, filter)
			.setColor(this.client.embed(message));

		const CUSTOM_ID = {
			MAX_POINTS: this.client.uuid(message.author.id),
			PERMISSIBLE_POINTS: this.client.uuid(message.author.id)
		};
		const row = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setCustomId(CUSTOM_ID.MAX_POINTS)
					.setLabel('Maximum Points')
					.setStyle('SECONDARY')
			)
			.addComponents(
				new MessageButton()
					.setCustomId(CUSTOM_ID.PERMISSIBLE_POINTS)
					.setStyle('SECONDARY')
					.setLabel('Permissible Points')
					.setDisabled(true)
			);
		const msg = await message.util!.send({ embeds: [embed], components: [row] });
		const collector = msg.createMessageComponentCollector({
			filter: action => Object.values(CUSTOM_ID).includes(action.customId) && action.user.id === message.author.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async action => {
			if (action.customId === CUSTOM_ID.MAX_POINTS) {
				const embed = this.embed(data, members, true)
					.setColor(this.client.embed(message));

				row.components[0].setDisabled(true);
				row.components[1].setDisabled(false);
				return action.update({ embeds: [embed], components: [row] });
			}

			if (action.customId === CUSTOM_ID.PERMISSIBLE_POINTS) {
				const embed = this.embed(data, members, false)
					.setColor(this.client.embed(message));

				row.components[0].setDisabled(false);
				row.components[1].setDisabled(true);
				return action.update({ embeds: [embed], components: [row] });
			}
		});

		collector.on('end', async (_, reason) => {
			for (const customID of Object.values(CUSTOM_ID)) {
				this.client.components.delete(customID);
			}
			if (STOP_REASONS.includes(reason)) return;
			if (!msg.deleted) await msg.edit({ components: [] });
		});
	}

	private embed(data: Clan, members: Member[], force = false, filter = false) {
		const total = members.reduce((prev, mem) => prev + (force ? mem.points : Math.min(mem.points, this.MAX)), 0);
		const embed = this.client.util.embed()
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium)
			.setDescription([
				`**[Clan Games Scoreboard (${this.seasonId})](https://clashperk.com/faq)**`,
				`\`\`\`\n\u200e\u2002# POINTS \u2002 ${'NAME'.padEnd(20, ' ')}`,
				members.slice(0, 55)
					.filter(d => filter ? d.points > 0 : d.points >= 0)
					.map((m, i) => {
						const points = this.padStart(force ? m.points : Math.min(this.MAX, m.points));
						return `\u200e${(++i).toString().padStart(2, '\u2002')} ${points} \u2002 ${m.name}`;
					})
					.join('\n'),
				'```'
			].join('\n'))
			.setFooter(
				`Total Points: ${total} [Avg: ${(total / data.members).toFixed(2)}]`
			);
		return embed;
	}

	private get MAX() {
		const now = new Date();
		return now.getDate() >= 22 && now.getMonth() === 7 ? 5000 : 4000;
	}

	private padStart(num: number) {
		return num.toString().padStart(6, ' ');
	}

	private get seasonId() {
		const now = new Date();
		if (now.getDate() < 20) now.setMonth(now.getMonth() - 1);
		return now.toISOString().substring(0, 7);
	}

	private query(clanTag: string, clan: Clan) {
		const cursor = this.client.db.collection(Collections.CLAN_MEMBERS)
			.aggregate([
				{
					$match: { clanTag }
				},
				{
					$match: {
						season: this.seasonId
					}
				},
				{
					$match: {
						$or: [
							{
								tag: {
									$in: clan.memberList.map(m => m.tag)
								}
							},
							{
								clanGamesTotal: { $gt: 0 }
							}
						]
					}
				},
				{
					$limit: 60
				}
			]);

		return cursor.toArray<DBMember>();
	}

	private filter(dbMembers: DBMember[] = [], clanMembers: Member[] = []) {
		const members = clanMembers.map(member => {
			const mem = dbMembers.find(m => m.tag === member.tag);
			const ach = mem?.achievements.find(m => m.name === 'Games Champion');
			return {
				name: member.name,
				tag: member.tag,
				points: mem ? member.points - ach!.value : 0,
				endedAt: mem?.clanGamesEndTime
			};
		});

		const missingMembers: Member[] = dbMembers.filter(mem => !members.find(m => m.tag === mem.tag))
			.map(mem => ({
				name: mem.name,
				tag: mem.tag,
				points: mem.achievements.find(m => m.name === 'Games Champion')!.gained,
				endedAt: mem.clanGamesEndTime
			}));

		return [...members, ...missingMembers].sort((a, b) => b.points - a.points)
			.sort((a, b) => {
				if (a.endedAt && b.endedAt) {
					return a.endedAt.getTime() - b.endedAt.getTime();
				}
				return 0;
			});
	}
}

interface DBMember {
	tag: string;
	name: string;
	achievements: {
		gained: number;
		name: string;
		value: number;
	}[];
	clanGamesEndTime?: Date;
}

interface Member {
	tag: string;
	name: string;
	points: number;
	endedAt?: Date;
}
