import { EMOJIS, SUPER_TROOPS } from '../../util/Emojis';
import RAW_TROOPS_DATA from '../../util/TroopsInfo';
import { MessageEmbed, Message } from 'discord.js';
import { Command } from 'discord-akairo';
import { Clan, Player } from 'clashofclans.js';
import { Collections, Season } from '@clashperk/node';
import moment from 'moment';
import 'moment-duration-format';

const BOOST_DURATION = 3 * 24 * 60 * 60 * 1000;

export default class BoostsCommand extends Command {
	public constructor() {
		super('boosts', {
			aliases: ['boosts', 'boost', 'boosters'],
			category: 'search',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Clan members with active super troops.',
				usage: '<#clanTag>',
				examples: ['#8QU8J9LP']
			},
			optionFlags: ['--tag']
		});
	}

	public *args(msg: Message): unknown {
		const data = yield {
			flag: '--tag',
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolveClan(msg, tag)
		};

		return { data };
	}

	public async exec(message: Message, { data }: { data: Clan }) {
		if (data.members < 1) return message.util!.send(`\u200e**${data.name}** does not have any clan members...`);
		await message.util!.send(`**Fetching data... ${EMOJIS.LOADING}**`);

		const members = (await this.client.http.detailedClanMembers(data.memberList))
			.filter(res => res.ok);

		const boosting = members.filter(mem => mem.troops.filter(en => en.superTroopIsActive).length);
		if (!boosting.length) return message.util!.send('No members found with active Super Troops!');

		const boostTimes = await this.client.db.collection(Collections.CLAN_MEMBERS)
			.find({ season: Season.ID, clanTag: data.tag, tag: { $in: data.memberList.map(mem => mem.tag) } })
			.toArray() as { tag: string; superTroops?: { name: string; timestamp: number }[] }[];

		const memObj = boosting.reduce((pre, curr) => {
			for (const troop of curr.troops) {
				if (troop.name in SUPER_TROOPS && troop.superTroopIsActive) {
					if (!(troop.name in pre)) pre[troop.name] = [];
					const boosted = boostTimes.find(mem => mem.tag === curr.tag)?.superTroops?.find(en => en.name === troop.name);
					const duration = boosted?.timestamp ? (BOOST_DURATION - (Date.now() - boosted.timestamp)) : 0;
					pre[troop.name].push({ name: curr.name, duration });
				}
			}
			return pre;
		}, {} as { [key: string]: { name: string; duration: number }[] });

		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.small)
			.setDescription('**Members with Active Super Troops**\n\u200b')
			.setFooter(`Total ${boosting.length}/${this.boostable(members)}`);

		for (const [key, val] of Object.entries(memObj)) {
			embed.addField(
				`${SUPER_TROOPS[key]} ${key}`,
				`${val.map(mem => `\u200e${mem.name}${mem.duration ? ` (${this.ms(mem.duration)})` : ''}`).join('\n')}\n\u200b`
			);
		}

		return message.util!.send({ embed });
	}

	private boostable(players: Player[]) {
		const superTrops = RAW_TROOPS_DATA.SUPER_TROOPS;
		return players.filter(en => en.townHallLevel >= 11).reduce((pre, curr) => {
			const troops = superTrops.filter(
				unit => curr.troops.find(un => un.village === 'home' && un.name === unit.original && un.level >= unit.minOriginalLevel)
			);
			return pre + (troops.length ? 1 : 0);
		}, 0);
	}

	private ms(ms: number) {
		if (ms > 864e5) {
			return moment.duration(ms).format('d[d] H[h]', { trim: 'both mid' });
		} else if (ms > 36e5) {
			return moment.duration(ms).format('H[h] m[m]', { trim: 'both mid' });
		}
		return moment.duration(ms).format('m[m] s[s]', { trim: 'both mid' });
	}
}
