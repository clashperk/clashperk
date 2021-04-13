import { EMOJIS, SUPER_TROOPS } from '../../util/Emojis';
import RAW_TROOPS_DATA from '../../util/TroopsInfo';
import { MessageEmbed, Message } from 'discord.js';
import { Command } from 'discord-akairo';
import { Clan, Player } from 'clashofclans.js';

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

		// @ts-expect-error
		const boosting = members.filter(mem => mem.troops.filter(en => en.superTroopIsActive).length);
		if (!boosting.length) return message.util!.send('No members found with active Super Troops!');

		const memObj = members.reduce((pre, curr) => {
			for (const troop of curr.troops) {
				// @ts-expect-error
				if (troop.name in SUPER_TROOPS && troop.superTroopIsActive) {
					if (!(troop.name in pre)) pre[troop.name] = [];
					pre[troop.name].push({ name: curr.name });
				}
			}
			return pre;
		}, {} as { [key: string]: { name: string }[] });

		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.small)
			.setDescription('Members with Active Super Troops\n\u200b')
			.setFooter(`${boosting.length}/${this.boostable(members)} Booster${boosting.length === 1 ? '' : 's'}`);

		for (const [key, val] of Object.entries(memObj)) {
			embed.addField(`${SUPER_TROOPS[key]} ${key}`, `${val.map(mem => `\u200e${mem.name}`).join('\n')}`);
		}

		return message.util!.send({ embed });
	}

	private boostable(players: Player[]) {
		const superTrops = RAW_TROOPS_DATA.SUPER_TROOPS;
		return players.reduce((pre, curr) => {
			const troops = superTrops.filter(
				unit => curr.troops.find(un => un.village === 'home' && un.name === unit.original && un.level >= unit.minOriginalLevel)
			);
			return pre + (troops.length ? 1 : 0);
		}, 0);
	}
}
