import { MessageEmbed, Message, MessageSelectMenu, User, MessageActionRow } from 'discord.js';
import { BUILDER_TROOPS, HOME_TROOPS, TOWN_HALLS } from '../../util/Emojis';
import { STOP_REASONS, TroopJSON } from '../../util/Constants';
import RAW_TROOPS_DATA from '../../util/TroopsInfo';
import { Command, Argument } from 'discord-akairo';
import { Player, Clan } from 'clashofclans.js';
import { Util } from '../../util/Util';

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

		const customID = this.client.uuid(message.author.id);
		const menu = new MessageSelectMenu()
			.setCustomId(customID)
			.setPlaceholder('Select an account!')
			.addOptions(options);

		await msg.edit({ components: [new MessageActionRow({ components: [menu] })] });
		const collector = msg.createMessageComponentCollector({
			filter: action => action.customId === customID && action.user.id === message.author.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async action => {
			if (action.customId === customID && action.isSelectMenu()) {
				const data = players.find(en => en.tag === action.values[0])!;
				const embed = this.embed(data).setColor(this.client.embed(message));
				await action.update({ embeds: [embed] });
			}
		});

		collector.on('end', async (_, reason) => {
			this.client.components.delete(customID);
			if (STOP_REASONS.includes(reason)) return;
			if (!msg.deleted) await msg.edit({ components: [] });
		});
	}

	private embed(data: Player) {
		const embed = new MessageEmbed()
			.setAuthor(`${data.name} (${data.tag})`);

		const apiTroops = this.apiTroops(data);
		const Troops = RAW_TROOPS_DATA.TROOPS
			.filter(troop => !troop.seasonal)
			.filter(unit => {
				const apiTroop = apiTroops.find(u => u.name === unit.name && u.village === unit.village && u.type === unit.category);
				const homeTroops = unit.village === 'home' && unit.levels[data.townHallLevel - 2] > (apiTroop?.level ?? 0);
				// const builderTroops = unit.village === 'builderBase' && unit.levels[data.builderHallLevel! - 2] > (apiTroop?.level ?? 0);
				// return Boolean(homeTroops || builderTroops);
				return Boolean(homeTroops);
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
			'Workshop': 'Siege Machines'
			// 'Builder Hall': 'Builder Base Hero',
			// 'Builder Barracks': 'Builder Troops'
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
					Util.chunk(unitsArray, 4)
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
			`Rushed units for Town Hall ${data.townHallLevel}`,
			'',
			'**Percentage**',
			`${this.rushedPercentage(data)}% (Lab)`,
			`${this.heroRushed(data)}% (Hero)`,
			`${this.rushedOverall(data)}% (Overall)`,
			'\u200b'
		].join('\n'));

		if (embed.fields.length) {
			embed.setFooter(`Total ${this.totalPercentage(data.townHallLevel, Troops.length)}`);
		} else {
			embed.setDescription(
				`No rushed units for Town Hall ${data.townHallLevel}`
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
				'Rushed Percentage',
				'```\u200eTH   LAB  HERO  NAME',
				members
					.sort((a, b) => Number(b.rushed.overall) - Number(a.rushed.overall))
					.map(
						en => `${this.padding(en.townHallLevel)}  ${this.per(en.rushed.lab)}  ${this.per(en.rushed.hero)}  ${en.name}`
					)
					.join('\n'),
				'```'
			].join('\n'));

		return message.util!.send({ embeds: [embed] });
	}

	private per(num: string) {
		if (Number(num) === 100) return '100';
		return Number(num).toFixed(1).padStart(4, ' ');
	}

	private padding(num: number) {
		return num.toFixed(0).padStart(2, ' ');
	}

	private reduce(data: Player) {
		return {
			overall: this.rushedOverall(data),
			lab: this.rushedPercentage(data),
			hero: this.heroRushed(data)
		};
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

	private rushedPercentage(data: Player) {
		const apiTroops = this.apiTroops(data);
		const rem = RAW_TROOPS_DATA.TROOPS.filter(unit => !unit.seasonal)
			.reduce((prev, unit) => {
				const apiTroop = apiTroops.find(u => u.name === unit.name && u.village === unit.village && u.type === unit.category);
				if (unit.village === 'home' && unit.category !== 'hero') {
					prev.levels += Math.min(apiTroop?.level ?? 0, unit.levels[data.townHallLevel - 2]);
					prev.total += unit.levels[data.townHallLevel - 2];
				}
				return prev;
			}, { total: 0, levels: 0 });
		if (rem.total === 0) return (0).toFixed(2);
		return (100 - ((rem.levels * 100) / rem.total)).toFixed(2);
	}

	private heroRushed(data: Player) {
		const apiTroops = this.apiTroops(data);
		const rem = RAW_TROOPS_DATA.TROOPS.filter(unit => !unit.seasonal)
			.reduce((prev, unit) => {
				const apiTroop = apiTroops.find(u => u.name === unit.name && u.village === unit.village && u.type === unit.category);
				if (unit.category === 'hero' && unit.village === 'home') {
					prev.levels += Math.min(apiTroop?.level ?? 0, unit.levels[data.townHallLevel - 2]);
					prev.total += unit.levels[data.townHallLevel - 2];
				}
				return prev;
			}, { total: 0, levels: 0 });
		if (rem.total === 0) return (0).toFixed(2);
		return (100 - ((rem.levels * 100) / rem.total)).toFixed(2);
	}

	private rushedOverall(data: Player) {
		const apiTroops = this.apiTroops(data);
		const rem = RAW_TROOPS_DATA.TROOPS.filter(unit => !unit.seasonal)
			.reduce((prev, unit) => {
				const apiTroop = apiTroops.find(u => u.name === unit.name && u.village === unit.village && u.type === unit.category);
				if (unit.village === 'home') {
					prev.levels += Math.min(apiTroop?.level ?? 0, unit.levels[data.townHallLevel - 2]);
					prev.total += unit.levels[data.townHallLevel - 2];
				}
				return prev;
			}, { total: 0, levels: 0 });
		if (rem.total === 0) return (0).toFixed(2);
		return (100 - ((rem.levels * 100) / rem.total)).toFixed(2);
	}

	private totalPercentage(hallLevel: number, rushed: number) {
		const totalTroops = RAW_TROOPS_DATA.TROOPS.filter(troop => !troop.seasonal)
			.filter(unit => unit.village === 'home' && unit.levels[hallLevel - 2] > 0);
		return `${rushed}/${totalTroops.length} (${((rushed * 100) / totalTroops.length).toFixed(2)}%)`;
	}
}
