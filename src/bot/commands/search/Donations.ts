import { Season, Collections } from '@clashperk/node';
import { Command } from 'discord-akairo';
import { Clan } from 'clashofclans.js';
import { Message } from 'discord.js';

interface Member {
	tag: string;
	name: string;
	donated: number;
	received: number;
}

export default class DonationsCommand extends Command {
	public constructor() {
		super('donations', {
			aliases: ['donations', 'don'],
			category: 'activity',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: [
					'Clan members with donations for current / last season.',
					'',
					'• **Season ID must be under 3 months old and must follow `YYYY-MM` format.**'
				],
				usage: '<#clanTag> [season]',
				examples: ['#8QU8J9LP', '#8QU8J9LP 2021-02']
			},
			flags: ['--sort'],
			optionFlags: ['--tag', '--season']
		});
	}

	public *args(msg: Message) {
		const season = yield {
			flag: '--season',
			type: [
				Season.ID,
				...Array(3).fill('').map((_, i) => {
					const now = new Date();
					now.setHours(0, 0, 0, 0);
					now.setMonth(now.getMonth() - i, 0);
					return Season.generateID(now);
				})
			],
			unordered: msg.hasOwnProperty('token') ? false : [0, 1],
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase'
		};

		const data = yield {
			flag: '--tag',
			unordered: msg.hasOwnProperty('token') ? false : [0, 1],
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolveClan(msg, tag)
		};

		const rev = yield {
			match: 'flag',
			flag: '--sort'
		};

		return { data, season, rev };
	}

	public async exec(message: Message, { data, rev, season }: { data: Clan; rev: boolean; season: string }) {
		if (data.members < 1) return message.util!.send(`\u200e**${data.name}** does not have any clan members...`);

		if (!season) season = Season.ID;
		const sameSeason = Boolean(Season.ID === Season.generateID(season));

		const dbMembers = await this.client.db.collection(Collections.CLAN_MEMBERS)
			.find({ season, clanTag: data.tag, tag: { $in: data.memberList.map(m => m.tag) } })
			.toArray();

		if (!dbMembers.length && !sameSeason) {
			return message.util!.send(`**No record found for the specified season ID \`${season}\`**`);
		}

		const members: Member[] = [];
		for (const mem of data.memberList) {
			if (!dbMembers.find(m => m.tag === mem.tag) && sameSeason) {
				members.push({ name: mem.name, tag: mem.tag, donated: mem.donations, received: mem.donationsReceived });
			}

			if (dbMembers.find(m => m.tag === mem.tag)) {
				const m = dbMembers.find(m => m.tag === mem.tag);
				members.push({
					name: mem.name,
					tag: mem.tag,
					donated: sameSeason
						? m.donations?.gained >= mem.donations
							? m.donations.gained
							: mem.donations
						: m.donations.gained,
					received: sameSeason
						? m.donationsReceived?.gained >= mem.donationsReceived
							? m.donationsReceived.gained
							: mem.donationsReceived
						: m.donationsReceived.gained
				});
			}
		}

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium);

		let [ds, rs] = [5, 5];
		const receivedMax = Math.max(...members.map(m => m.received));
		if (receivedMax > 99999) rs = 6;
		if (receivedMax > 999999) rs = 7;

		const donatedMax = Math.max(...members.map(m => m.donated));
		if (donatedMax > 99999) ds = 6;
		if (donatedMax > 999999) ds = 7;

		members.sort((a, b) => b.donated - a.donated);
		if (rev) members.sort((a, b) => b.received - a.received);

		const donated = members.reduce((pre, mem) => mem.donated + pre, 0);
		const received = members.reduce((pre, mem) => mem.received + pre, 0);

		embed.setDescription([
			'```',
			`\u200e # ${'DON'.padStart(ds, ' ')} ${'REC'.padStart(rs, ' ')}  ${'NAME'.padEnd(16, ' ')}`,
			members.map((mem, index) => {
				const donation = `${this.donation(mem.donated, ds)} ${this.donation(mem.received, rs)}`;
				return `${(index + 1).toString().padStart(2, ' ')} ${donation}  ${this.padEnd(mem.name.substring(0, 15))}`;
			}).join('\n'),
			'```'
		]);
		embed.setFooter(`[DON ${donated} | REC ${received}] (Season ${season})`);

		return message.util!.send({ embed });
	}

	private padEnd(name: string) {
		return name.replace(/\`/g, '\\').padEnd(16, ' ');
	}

	private donation(num: number, space: number) {
		return num.toString().padStart(space, ' ');
	}

	private paginate(items: Member[], start: number, end: number) {
		return { items: items.slice(start, end) };
	}
}
