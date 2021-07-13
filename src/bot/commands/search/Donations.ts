import { Message, MessageActionRow, MessageButton, MessageEmbed } from 'discord.js';
import { Collections } from '../../util/Constants';
import { Season, Util } from '../../util/Util';
import { Command } from 'discord-akairo';
import { Clan } from 'clashofclans.js';

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
					'• **Season ID must be under 6 months old and must follow `YYYY-MM` format.**'
				],
				usage: '<#clanTag> [seasonId|last]',
				examples: ['#8QU8J9LP', '#8QU8J9LP LAST', '#8QU8J9LP 2021-02']
			},
			optionFlags: ['--tag', '--season']
		});
	}

	public *args(msg: Message): unknown {
		const season = yield {
			flag: '--season',
			type: [...Util.getSeasonIds(), [Util.getLastSeasonId(), 'last']],
			unordered: msg.interaction ? false : [0, 1],
			match: msg.interaction ? 'option' : 'phrase'
		};

		const data = yield {
			flag: '--tag',
			unordered: msg.interaction ? false : [0, 1],
			match: msg.interaction ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolveClan(msg, tag)
		};

		return { data, season };
	}

	public async exec(message: Message, { data, season }: { data: Clan; season: string }) {
		if (data.members < 1) return message.util!.send(`\u200e**${data.name}** does not have any clan members...`);

		if (!season) season = Season.ID;
		const sameSeason = Boolean(Season.ID === Season.generateID(season));

		const dbMembers = await this.client.db.collection(Collections.CLAN_MEMBERS)
			.find({ season, clanTag: data.tag, tag: { $in: data.memberList.map(m => m.tag) } })
			.toArray();

		if (!dbMembers.length && !sameSeason) {
			return message.util!.send(`**No data found for the season \`${season}\`**`);
		}

		const members: { tag: string; name: string; donated: number; received: number }[] = [];
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

		const receivedMax = Math.max(...members.map(m => m.received));
		const rs = receivedMax > 99999 ? 6 : receivedMax > 999999 ? 7 : 5;
		const donatedMax = Math.max(...members.map(m => m.donated));
		const ds = donatedMax > 99999 ? 6 : donatedMax > 999999 ? 7 : 5;

		members.sort((a, b) => b.donated - a.donated);
		const donated = members.reduce((pre, mem) => mem.donated + pre, 0);
		const received = members.reduce((pre, mem) => mem.received + pre, 0);

		const getEmbed = () => {
			const embed = new MessageEmbed()
				.setColor(this.client.embed(message))
				.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium)
				.setDescription([
					'```',
					`\u200e # ${'DON'.padStart(ds, ' ')} ${'REC'.padStart(rs, ' ')}  ${'NAME'}`,
					members.map((mem, index) => {
						const donation = `${this.donation(mem.donated, ds)} ${this.donation(mem.received, rs)}`;
						return `${(index + 1).toString().padStart(2, ' ')} ${donation}  \u200e${this.padEnd(mem.name.substring(0, 15))}`;
					}).join('\n'),
					'```'
				].join('\n'));

			return embed.setFooter(`[DON ${donated} | REC ${received}] (Season ${season})`);
		};

		const embed = getEmbed();
		const customId = {
			sort: sameSeason ? `DONATION${data.tag}_DESC` : this.client.uuid(message.author.id),
			refresh: `DONATION${data.tag}_ASC`
		};

		const row = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setStyle('SECONDARY')
					.setCustomId(customId.sort)
					.setLabel('Sort by Received')
			)
			.addComponents(
				new MessageButton()
					.setStyle('SECONDARY')
					.setCustomId(customId.refresh)
					.setLabel('Refresh')
					.setDisabled(!sameSeason)
			);

		const msg = await message.util!.send({ embeds: [embed], components: [row] });
		if (sameSeason) return;

		const collector = msg.createMessageComponentCollector({
			filter: action => action.customId === customId.sort && action.user.id === message.author.id,
			max: 1, time: 15 * 60 * 1000
		});

		collector.on('collect', async action => {
			if (action.customId === customId.sort) {
				members.sort((a, b) => b.received - a.received);
				const embed = getEmbed();
				return action.update({ embeds: [embed] });
			}
		});

		collector.on('end', async () => {
			this.client.components.delete(customId.sort);
			if (!msg.deleted) await msg.edit({ components: [] });
		});
	}

	private padEnd(name: string) {
		return name.replace(/\`/g, '\\');
	}

	private donation(num: number, space: number) {
		return num.toString().padStart(space, ' ');
	}
}
