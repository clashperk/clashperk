import { BLUE_NUMBERS } from '../../util/NumEmojis';
import { MessageEmbed, Message } from 'discord.js';
import { Collections } from '../../util/Constants';
import { Season, Util } from '../../util/Util';
import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';
import { Clan } from 'clashofclans.js';

export default class PlayerDonationSummaryCommand extends Command {
	public constructor() {
		super('player-donation-summary', {
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {},
			optionFlags: ['--season']
		});
	}

	public *args(msg: Message): unknown {
		const season = yield {
			flag: '--season',
			type: [...Util.getSeasonIds(), ['last']],
			match: msg.interaction ? 'option' : 'phrase'
		};

		return { season };
	}

	public async exec(message: Message, { season }: { season?: string }) {
		if (season === 'last') season = Season.generateID(Season.startTimestamp);
		if (!season) season = Season.ID;
		await message.util!.send(`**Fetching data... ${EMOJIS.LOADING}**`);

		const clans = await this.client.db.collection(Collections.CLAN_STORES)
			.find({ guild: message.guild!.id })
			.toArray();
		if (!clans.length) {
			return message.util!.send(`**${message.guild!.name} does not have any clans. Why not add some?**`);
		}

		const fetched: Clan[] = (await Promise.all(clans.map(en => this.client.http.clan(en.tag)))).filter(res => res.ok);
		if (!fetched.length) {
			return message.util!.send('**Something went wrong. I couldn\'t fetch all clans!**');
		}

		const players = await this.globalDonations(clans);
		players.sort((a, b) => b.receives - a.receives).sort((a, b) => b.donations - a.donations);
		const [mem_dp, mem_rp] = [
			this.predict(Math.max(...players.map(m => m.donations))),
			this.predict(Math.max(...players.map(m => m.receives)))
		];

		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor('Top Players among Clan Family')
			.setDescription([
				`${EMOJIS.HASH} \u200e\`${'DON'.padStart(mem_dp, ' ')} ${'REC'.padStart(mem_rp, ' ')}  ${'PLAYER'.padEnd(15, ' ')}\u200f\``,
				Util.splitMessage(
					players.map(
						(mem, i) => `${BLUE_NUMBERS[++i]} \`\u200e${this.donation(mem.donations, mem_dp)} ${this.donation(mem.receives, mem_rp)}  ${mem.name.padEnd(15, ' ')}\u200f\``
					).join('\n'),
					{ maxLength: 4000 }
				)[0]
			].join('\n'))
			.setFooter(`Season ${season}`);

		return message.util!.send({ embeds: [embed] });
	}

	private donation(num: number, space: number) {
		return num.toString().padStart(space, ' ');
	}

	private predict(num: number) {
		return num > 999999 ? 7 : num > 99999 ? 6 : 5;
	}

	private async globalDonations(clans: any[]) {
		return this.client.db.collection(Collections.CLAN_MEMBERS).aggregate<{ name: string; tag: string; donations: number; receives: number }>([
			{
				$match: {
					clanTag: { $in: clans.map(clan => clan.tag) },
					season: Season.ID
				}
			}, {
				$sort: {
					'donations.gained': -1
				}
			}, {
				$limit: 50
			}, {
				$group: {
					_id: '$tag',
					name: {
						$first: '$name'
					},
					tag: {
						$first: '$tag'
					},
					donations: {
						$sum: '$donations.gained'
					},
					receives: {
						$sum: '$donationsReceived.gained'
					}
				}
			}
		]).toArray();
	}
}
