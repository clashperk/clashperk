import { BUILDER_TROOPS, HOME_TROOPS, TOWN_HALLS } from '../../util/Emojis';
import { TroopInfo, TroopJSON } from '../../util/Constants';
import RAW_TROOPS_DATA from '../../util/TroopsInfo';
import { Command, Argument } from 'discord-akairo';
import { MessageEmbed, Message, MessageSelectMenu, User } from 'discord.js';
import { Player, Clan } from 'clashofclans.js';

const HEROES: { [key: string]: 'bk' | 'aq' | 'gw' | 'rc' } = {
	'Barbarian King': 'bk',
	'Archer Queen': 'aq',
	'Grand Warden': 'gw',
	'Royal Champion': 'rc'
};

export default class RushedCommand extends Command {
	public constructor() {
		super('rushed', {
			aliases: ['rushed', 'rush'],
			category: 'search',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: [
					'Rushed troops, spells, and heroes.',
					'',
					'• `rushed clan <clanTag>` - list of rushed and non-rushed clan members.'
				],
				usage: '<playerTag>',
				examples: ['#9Q92C8R20', 'clan #8QU8J9LP']
			},
			flags: ['--clan', 'clan'],
			optionFlags: ['--tag', '--base']
		});
	}

	public *args(msg: Message): unknown {
		const flag = yield {
			match: 'flag',
			flag: ['--clan', 'clan']
		};

		const base = yield {
			flag: '--base',
			unordered: true,
			type: Argument.range('integer', 1, 25),
			match: msg.interaction ? 'option' : 'phrase'
		};

		const data = yield {
			flag: '--tag',
			unordered: true,
			match: msg.interaction ? 'option' : 'phrase',
			type: async (message: Message, args: string) => {
				if (flag) return this.client.resolver.resolveClan(message, args);
				return this.client.resolver.resolvePlayer(message, args, base ?? 1);
			}
		};

		return { data, flag };
	}

	public async exec(message: Message, { data, flag }: { data: (Clan | Player) & { user?: User }; flag: boolean }) {
		if (flag) return this.clan(message, data as Clan);
		const embed = this.embed(data as Player).setColor(this.client.embed(message));
		const msg = await message.util!.send({ embeds: [embed] });

		if (!data.user) return;
		const players = await this.client.links.getPlayers(data.user);
		if (!players.length) return;

		const options = players.map(op => ({
			description: op.tag,
			label: op.name, value: op.tag,
			emoji: TOWN_HALLS[op.townHallLevel]
		}));

		const customID = this.client.uuid();
		const menu = new MessageSelectMenu()
			.setCustomID(customID)
			.setPlaceholder('Select an account!')
			.addOptions(options);

		await msg.edit({ components: [[menu]] });
		const collector = msg.createMessageComponentInteractionCollector({
			filter: action => action.customID === customID && action.user.id === message.author.id,
			time: 15 * 60 * 1000
		});

		collector.on('collect', async action => {
			if (action.customID === customID && action.isSelectMenu()) {
				const data = players.find(en => en.tag === action.values![0])!;
				const embed = this.embed(data).setColor(this.client.embed(message));
				await action.update({ embeds: [embed] });
			}
		});

		collector.on('end', async () => {
			this.client.components.delete(customID);
			if (msg.editable) await msg.edit({ components: [] });
		});
	}

	private embed(data: Player) {
		const embed = new MessageEmbed()
			.setAuthor(`${data.name} (${data.tag})`);

		const apiTroops = this.apiTroops(data);
		const Troops = RAW_TROOPS_DATA.TROOPS
			.filter(unit => {
				const apiTroop = apiTroops.find(u => u.name === unit.name && u.village === unit.village && u.type === unit.category);
				const homeTroops = unit.village === 'home' && unit.levels[data.townHallLevel - 2] > (apiTroop?.level ?? 0);
				const builderTroops = unit.village === 'builderBase' && unit.levels[data.builderHallLevel! - 2] > (apiTroop?.level ?? 0);
				return Boolean(homeTroops || builderTroops);
			});

		const TroopsObj = Troops.reduce((prev, curr) => {
			if (!(curr.unlock.building in prev)) prev[curr.unlock.building] = [];
			prev[curr.unlock.building].push(curr);
			return prev;
		}, {} as TroopJSON);

		const titles: { [key: string]: string } = {
			'Barracks': 'Elixir Troops',
			'Dark Barracks': 'Dark Troops',
			'Spell Factory': 'Elixir Spells',
			'Dark Spell Factory': 'Dark Spells',
			'Town Hall': 'Heroes',
			'Pet House': 'Pets',
			'Workshop': 'Siege Machines',
			'Builder Hall': 'Builder Base Hero',
			'Builder Barracks': 'Builder Troops'
		};

		const units = [];
		const indexes = Object.values(titles);
		for (const [key, value] of Object.entries(TroopsObj)) {
			const title = titles[key];
			units.push({
				index: indexes.indexOf(title),
				title,
				units: value
			});
		}

		for (const category of units.sort((a, b) => a.index - b.index)) {
			const unitsArray = category.units.map(
				unit => {
					const hallLevel = unit.village === 'home' ? data.townHallLevel : data.builderHallLevel;
					const { maxLevel, level } = apiTroops
						.find(u => u.name === unit.name && u.village === unit.village && u.type === unit.category) ?? { maxLevel: unit.levels[unit.levels.length - 1], level: 0 };

					return {
						type: unit.category,
						village: unit.village,
						name: unit.name,
						level,
						hallMaxLevel: unit.levels[hallLevel! - 2],
						maxLevel
					};
				}
			);

			if (unitsArray.length) {
				embed.addField(
					`${category.title} (${unitsArray.length})`,
					this.chunk(unitsArray)
						.map(
							chunks => chunks.map(unit => {
								const unitIcon = (unit.village === 'home' ? HOME_TROOPS : BUILDER_TROOPS)[unit.name];
								const level = this.padStart(unit.level);
								const maxLevel = this.padEnd(unit.hallMaxLevel);
								return `${unitIcon} \`\u200e${level}/${maxLevel}\u200f\``;
							}).join(' ')
						)
						.join('\n')
				);
			}
		}

		embed.setDescription([
			`Rushed units for TH${data.townHallLevel} ${data.builderHallLevel ? ` & BH${data.builderHallLevel}` : ''}`,
			'',
			'**Percentage**',
			`${this.troopsCount('home', data.townHallLevel, Troops.filter(u => u.village === 'home').length).padStart(5, '0')}% (Home Base)`,
			data.builderHallLevel
				? `${this.troopsCount('builderBase', data.builderHallLevel, Troops.filter(u => u.village === 'builderBase').length).padStart(5, '0')}% (Builder Base)\n\u200b`
				: '\u200b'
		].join('\n'));

		if (!embed.fields.length) {
			embed.setDescription(
				`No rushed units for TH${data.townHallLevel} ${data.builderHallLevel ? ` and BH${data.builderHallLevel}` : ''}`
			);
		}
		return embed;
	}

	private async clan(message: Message, data: Clan) {
		if (data.members < 1) return message.util!.send(`\u200e**${data.name}** does not have any clan members...`);

		const fetched = await this.client.http.detailedClanMembers(data.memberList);
		const members = [];
		for (const obj of fetched.filter(res => res.ok)) {
			members.push({ name: obj.name, rushed: this.reduce(obj), townHallLevel: obj.townHallLevel });
		}

		const embed = this.client.util.embed()
			.setAuthor(`${data.name} (${data.tag})`)
			.setDescription([
				'Total Home Base Rushed Units (\\👎)',
				'and Total Hero Levels Rushed (\\👑)',
				'```\u200eTH  👎 (👑)  NAME',
				members // .filter(m => m.rushed.homeBase)
					.sort((a, b) => b.rushed.homeBase - a.rushed.homeBase)
					.map(({ name, rushed, townHallLevel }) => `${this.padding(townHallLevel)}  ${this.padding(rushed.homeBase)}  ${rushed.heroes.toString().padStart(3, ' ')}  ${name}`)
					.join('\n'),
				'```'
			].join('\n'));

		return message.util!.send({ embeds: [embed] });
	}

	private padding(num: number) {
		return num.toFixed(0).padStart(2, ' ');
	}

	private reduce(data: Player) {
		const apiTroops = this.apiTroops(data);
		const Troop = RAW_TROOPS_DATA.TROOPS
			.filter(unit => {
				const apiTroop = apiTroops.find(u => u.name === unit.name && u.village === unit.village && u.type === unit.category);
				const homeTroops = unit.village === 'home' && unit.levels[data.townHallLevel - 2] > (apiTroop?.level ?? 0);
				const builderTroops = unit.village === 'builderBase' && unit.levels[data.builderHallLevel! - 2] > (apiTroop?.level ?? 0);
				return Boolean(homeTroops || builderTroops);
			});

		// const totalTroops = RAW_TROOPS_DATA.TROOPS.filter(unit => unit.village === 'home' && unit.levels[data.townHallLevel - 1]);
		const { heroes, homeBase } = Troop.reduce((pre, unit) => {
			if (unit.village === 'home') pre.homeBase += 1;
			if (unit.village === 'builderBase') pre.builderBase += 1;
			if (unit.village === 'home' && unit.category === 'hero') {
				const requiredLevel = unit.levels[data.townHallLevel - 2] - (apiTroops.find(en => en.name === unit.name)?.level ?? 0);
				pre.heroes[HEROES[unit.name]] += requiredLevel;
			}
			return pre;
		}, { homeBase: 0, builderBase: 0, heroes: { bk: 0, aq: 0, gw: 0, rc: 0 } });

		return {
			homeBase: homeBase,
			heroes: Object.values(heroes).reduce((pre, num) => pre + num, 0) // totalTroops.filter(en => en.type === 'hero').reduce((pre, unit) => pre + unit.levels[data.townHallLevel - 1], 0)
		};
	}

	private chunk(items: TroopInfo[] = [], chunk = 4) {
		const array = [];
		for (let i = 0; i < items.length; i += chunk) {
			array.push(items.slice(i, i + chunk));
		}
		return array;
	}

	private padEnd(num: number) {
		return num.toString().padEnd(2, ' ');
	}

	private padStart(num: number) {
		return num.toString().padStart(2, ' ');
	}

	private apiTroops(data: Player) {
		return [
			...data.troops.map(u => ({
				name: u.name,
				level: u.level,
				maxLevel: u.maxLevel,
				type: 'troop',
				village: u.village
			})),
			...data.heroes.map(u => ({
				name: u.name,
				level: u.level,
				maxLevel: u.maxLevel,
				type: 'hero',
				village: u.village
			})),
			...data.spells.map(u => ({
				name: u.name,
				level: u.level,
				maxLevel: u.maxLevel,
				type: 'spell',
				village: u.village
			}))
		];
	}

	private troopsCount(villageType: string, hallLevel: number, rushed: number) {
		const totalTroops = RAW_TROOPS_DATA.TROOPS.filter(unit => unit.village === villageType && unit.levels[hallLevel - 1]);
		return ((rushed * 100) / totalTroops.length).toFixed(2);
	}
}
