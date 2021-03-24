import { Collections, Season } from '@clashperk/node';
import { Clan } from 'clashofclans.js';
import { Command } from 'discord-akairo';
import { MessageEmbed, Message } from 'discord.js';
import { EMOJIS } from '../../util/Emojis';
import { BLUE_NUMBERS } from '../../util/NumEmojis';

interface Aggregated {
	tag: string;
	name: string;
	donations: number;
	donationsReceived: number;
	members: {
		tag: string;
		name: string;
		clanTag: string;
		donations: number;
		donationsReceived: number;
	}[];
}

export default class DonationSummaryCommand extends Command {
	public constructor() {
		super('donation-summary', {
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {}
		});
	}

	public async exec(message: Message) {
		await message.util!.send(`**Fetching data... ${EMOJIS.LOADING}**`);

		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`${message.guild!.name} Top Donations`, message.guild!.iconURL({ dynamic: true })!);

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

		const aggregated: Aggregated[] = await this.client.db.collection(Collections.CLAN_MEMBERS)
			.aggregate([
				{
					$match: {
						season: Season.previousID,
						clanTag: {
							$in: fetched.map(clan => clan.tag)
						},
						tag: {
							$in: fetched.map(clan => clan.memberList).flat().map(mem => mem.tag)
						}
					}
				}, {
					$group: {
						_id: '$clanTag',
						donations: {
							$sum: '$donations.gained'
						},
						donationsReceived: {
							$sum: '$donationsReceived.gained'
						},
						name: {
							$first: '$clanName'
						},
						tag: {
							$first: '$clanTag'
						},
						members: {
							$addToSet: {
								tag: '$tag',
								name: '$name',
								clanTag: '$clanTag',
								donations: '$donations.gained',
								donationsReceived: '$donationsReceived.gained'
							}
						}
					}
				}
			]).toArray();
		if (!aggregated.length) {
			return message.util!.send('*Not enough data available a this moment!*');
		}

		aggregated.sort((a, b) => b.donations - a.donations);
		const members = aggregated.map(ag => ag.members)
			.flat()
			.map(en => ({
				name: en.name,
				clanTag: en.clanTag,
				donated: en.donations,
				received: en.donationsReceived,
				clanIndex: aggregated.findIndex(clan => clan.tag === en.clanTag) + 1
			}))
			.sort((a, b) => b.donated - a.donated)
			.slice(0, 15);

		const [mem_dp, mem_rp] = [
			this.predict(Math.max(...members.map(m => m.donated))),
			this.predict(Math.max(...members.map(m => m.received)))
		];
		const [clan_dp, clan_rp] = [
			this.predict(Math.max(...aggregated.map(m => m.donations))),
			this.predict(Math.max(...aggregated.map(m => m.donationsReceived)))
		];

		embed.setDescription([
			'**Top Clans**',
			`${EMOJIS.HASH} \`\u200e${'DON'.padStart(clan_dp, ' ')} ${'REC'.padStart(clan_rp, ' ')}  ${'CLAN'.padEnd(15, ' ')}\u200f\``,
			aggregated.map((clan, n) => `${BLUE_NUMBERS[++n]} \`\u200e${this.donation(clan.donations, clan_dp)} ${this.donation(clan.donationsReceived, clan_rp)}  ${clan.name.padEnd(15, ' ')}\u200f\``).join('\n')
		]);
		embed.addField('\u200b', [
			'**Top Players**',
			`${EMOJIS.CLAN} \u200e\`${'DON'.padStart(mem_dp, ' ')} ${'REC'.padStart(mem_rp, ' ')}  ${'PLAYER'.padEnd(15, ' ')}\u200f\``,
			members.map(mem => `${BLUE_NUMBERS[mem.clanIndex]} \`\u200e${this.donation(mem.donated, mem_dp)} ${this.donation(mem.received, mem_rp)}  ${mem.name.padEnd(15, ' ')}\u200f\``).join('\n')
		]);
		embed.setFooter(`Season ${Season.ID}`);

		return message.util!.send({ embed });
	}

	private donation(num: number, space: number) {
		return num.toString().padStart(space, ' ');
	}

	private predict(num: number) {
		return num > 999999 ? 7 : num > 99999 ? 6 : 5;
	}
}
