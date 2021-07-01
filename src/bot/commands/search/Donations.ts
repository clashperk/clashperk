import { Collections } from '../../util/Constants';
import { Command } from 'discord-akairo';
import { Clan } from 'clashofclans.js';
import { Message } from 'discord.js';
import { Season, Util } from '../../util/Util';

interface Member {
	tag: string;
	name: string;
	donated: number;
	received: number;
}

export default class DonationsCommand extends Command {
	public constructor() {
		super('donations', {
			aliases: ['donations', 'donation', 'don'],
			category: 'activity',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: [
					'Clan members with donations for current / last season.',
					'',
					'• **Season ID must be under 3 months old and must follow `YYYY-MM` format.**'
				],
				usage: '<#clanTag> [season|last]',
				examples: ['#8QU8J9LP', '#8QU8J9LP LAST', '#8QU8J9LP 2021-02']
			},
			flags: ['--sort'],
			optionFlags: ['--tag', '--season']
		});
	}

	public *args(msg: Message): unknown {
		const season = yield {
			flag: '--season',
			type: [...Util.getSeasonIds(), ['last']],
			unordered: msg.interaction ? false : [0, 1],
			match: msg.interaction ? 'option' : 'phrase'
		};

		const data = yield {
			flag: '--tag',
			unordered: msg.interaction ? false : [0, 1],
			match: msg.interaction ? 'option' : 'phrase',
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
		if (season === 'last') season = Season.generateID(Season.startTimestamp);
		const sameSeason = Boolean(Season.ID === Season.generateID(season));

		const dbMembers = await this.client.db.collection(Collections.CLAN_MEMBERS)
			.find({ season, clanTag: data.tag, tag: { $in: data.memberList.map(m => m.tag) } })
			.toArray();

		if (!dbMembers.length && !sameSeason) {
			return message.util!.send(`**No data found for the season \`${season}\`**`);
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
						? mem.donations >= m.donations?.value
							? m.donations.gained as number + (mem.donations - m.donations.value)
							: mem.donations
						: m.donations.gained,

					received: sameSeason
						? mem.donationsReceived >= m.donationsReceived?.value
							? m.donationsReceived.gained as number + (mem.donationsReceived - m.donationsReceived.value)
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
			`\u200e # ${'DON'.padStart(ds, ' ')} ${'REC'.padStart(rs, ' ')}  ${'NAME'}`,
			members.map((mem, index) => {
				const donation = `${this.donation(mem.donated, ds)} ${this.donation(mem.received, rs)}`;
				return `${(index + 1).toString().padStart(2, ' ')} ${donation}  \u200e${this.padEnd(mem.name.substring(0, 15))}`;
			}).join('\n'),
			'```'
		].join('\n'));
		embed.setFooter(`[DON ${donated} | REC ${received}] (Season ${season})`, message.author.displayAvatarURL());

		const msg = await message.util!.send({ embeds: [embed] });
		const components = [
			{
				type: 2, style: 2,
				label: sameSeason ? 'Previous Season' : 'Current Season',
				custom_id: `don --tag ${data.tag} ${sameSeason ? '--season last' : ''}`
			},
			{ type: 2, style: 2, label: 'Refresh', custom_id: `don --tag ${data.tag}` }
		];

		if (message.interaction) {
			// @ts-expect-error
			return this.client.api.webhooks(this.client.user!.id, message.token)
				.messages[msg.id]
				.patch(
					{ data: { components: [{ type: 1, components }] } }
				);
		}

		// @ts-expect-error
		return this.client.api.channels[message.channel.id].messages[msg.id].patch(
			{ data: { components: [{ type: 1, components }] } }
		);
	}

	private padEnd(name: string) {
		return name.replace(/\`/g, '\\');
	}

	private donation(num: number, space: number) {
		return num.toString().padStart(space, ' ');
	}
}
