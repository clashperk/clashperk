import { Command } from 'discord-akairo';
import { Clan } from 'clashofclans.js';
import { Message } from 'discord.js';

interface Member {
	tag: string;
	name: string;
	donated: number;
	received: number;
}

export default class DonationBoardCommand extends Command {
	public constructor() {
		super('donations', {
			aliases: ['donations', 'donationboard', 'db', 'don'],
			category: 'activity',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'MANAGE_MESSAGES'],
			description: {
				content: 'List of clan members with donations.',
				usage: '<clanTag>',
				examples: ['#2Q98URCGY', '2Q98URCGY']
			},
			args: [
				{
					id: 'data',
					type: (msg, tag) => this.client.resolver.resolveClan(msg, tag)
				}
			]
		});
	}

	public fetch(clan: Clan) {
		const db = this.client.db.collection('clanmembers');

		const bulk = db.initializeUnorderedBulkOp();
		for (const m of clan.memberList) {
			bulk.find(m);
		}

		return bulk.execute();
	}

	public async exec(message: Message, { data }: { data: Clan }) {
		if (data.members < 1) return message.util!.send(`\u200e**${data.name}** does not have any clan members...`);

		const dbMembers = await this.client.db.collection('clanmembers')
			.find({ tag: { $in: data.memberList.map(m => m.tag) } })
			.toArray();

		const members: Member[] = [];
		for (const mem of data.memberList) {
			if (!dbMembers.find(m => m.tag === mem.tag)) {
				members.push({ name: mem.name, tag: mem.tag, donated: mem.donations, received: mem.donationsReceived });
			}

			if (dbMembers.find(m => m.tag === mem.tag)) {
				const m = dbMembers.find(m => m.tag === mem.tag);
				members.push({
					name: mem.name,
					tag: mem.tag,
					donated: mem.donations >= m.donations ? mem.donations : m.donations,
					received: mem.donationsReceived >= m.donationsReceived ? mem.donationsReceived : m.donationsReceived
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

		const sorted = members.sort((a, b) => b.received - a.received)
			.sort((a, b) => b.donated - a.donated);

		const donated = members.reduce((pre, mem) => mem.donated + pre, 0);
		const received = members.reduce((pre, mem) => mem.received + pre, 0);

		const header = `**\`\u200e # ${'DON'.padStart(ds, ' ')} ${'REC'.padStart(rs, ' ')}  ${'NAME'.padEnd(16, ' ')}\`**`;
		const pages = [
			this.paginate(sorted, 0, 25)
				.items.map((member, index) => {
					const donation = `${this.donation(member.donated, ds)} ${this.donation(member.received, rs)}`;
					return `\`\u200e${(index + 1).toString().padStart(2, ' ')} ${donation}  ${this.padEnd(member.name.substring(0, 15))}\``;
				}),
			this.paginate(sorted, 25, 50)
				.items.map((member, index) => {
					const donation = `${this.donation(member.donated, ds)} ${this.donation(member.received, rs)}`;
					return `\`\u200e${(index + 26).toString().padStart(2, ' ')} ${donation}  ${this.padEnd(member.name.substring(0, 15))}\``;
				})
		];

		const total = `TOTAL: DON ${donated} | REC ${received}`;

		if (!pages[1].length) {
			return message.util!.send({
				embed: embed.setDescription([
					header,
					pages[0].join('\n'),
					`\`\u200e${total.padEnd(3 + ds + rs + 18, ' ')} \u200f\``
				]).setFooter(`Page 1/1 (${data.members}/50)`)
			});
		}

		const msg = await message.channel.send({
			embed: embed.setDescription([
				header,
				pages[0].join('\n')
			]).setFooter(`Page 1/2 (${data.members}/50)`)
		});

		await msg.react('➕');
		const collector = await msg.awaitReactions(
			(reaction, user) => reaction.emoji.name === '➕' && user.id === message.author.id,
			{ max: 1, time: 30000, errors: ['time'] }
		).catch(() => null);
		if (!msg.deleted) await msg.reactions.removeAll().catch(() => null);
		if (!collector || !collector.size) return;

		return message.channel.send({
			embed: embed.setFooter(`Page 2/2 (${data.members}/50)`)
				.setDescription([
					header, pages[1].join('\n'),
					`\`\u200e${total.padEnd(3 + ds + rs + 18, ' ')} \u200f\``
				])
		});
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
