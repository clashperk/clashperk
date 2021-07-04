import { BUILDER_TROOPS, HOME_TROOPS, SUPER_TROOPS, TOWN_HALLS } from '../../util/Emojis';
import { MessageEmbed, Message, MessageButton, User, MessageSelectMenu } from 'discord.js';
import { TroopInfo, TroopJSON } from '../../util/Constants';
import RAW_TROOPS_DATA from '../../util/TroopsInfo';
import { Command, Argument } from 'discord-akairo';
import { Player } from 'clashofclans.js';

export default class UnitsCommand extends Command {
	public constructor() {
		super('units', {
			aliases: ['units', 'troops', 'u'],
			category: 'search',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'MANAGE_MESSAGES', 'ADD_REACTIONS', 'READ_MESSAGE_HISTORY'],
			description: {
				content: 'Levels of troops, spells and heroes.',
				usage: '<playerTag>',
				examples: ['#9Q92C8R20']
			},
			optionFlags: ['--tag', '--base']
		});
	}

	public *args(msg: Message): unknown {
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
			type: (msg: Message, tag: string) => this.client.resolver.resolvePlayer(msg, tag, base ?? 1)
		};

		return { data };
	}

	public async exec(message: Message, { data }: { data: Player & { user?: User } }) {
		const embed = this.embed(data, true);
		embed.setColor(this.client.embed(message))
			.setDescription(`Units for TH${data.townHallLevel} Max ${data.builderHallLevel ? `and BH${data.builderHallLevel} Max` : ''}`);

		const CUSTOM_ID = {
			MAX_LEVEL: this.client.uuid(),
			TOWN_HALL_MAX: this.client.uuid(),
			SELECT_ACCOUNT: this.client.uuid()
		};

		const component = new MessageButton()
			.setCustomID(CUSTOM_ID.MAX_LEVEL)
			.setLabel('Max Level')
			.setStyle('SECONDARY');

		const msg = await message.util!.send({ embeds: [embed], components: [[component]] });

		const players = data.user ? await this.client.links.getPlayers(data.user) : [];
		if (players.length) {
			const options = players.map(op => ({
				description: op.tag,
				label: op.name, value: op.tag,
				emoji: TOWN_HALLS[op.townHallLevel]
			}));

			const menu = new MessageSelectMenu()
				.setCustomID(CUSTOM_ID.SELECT_ACCOUNT)
				.setPlaceholder('Select an account!')
				.addOptions(options);

			await msg.edit({ components: [[component], [menu]] });
		}

		const collector = msg.createMessageComponentCollector({
			filter: action => Object.values(CUSTOM_ID).includes(action.customID) && action.user.id === message.author.id,
			time: 15 * 60 * 1000
		});

		collector.on('collect', async action => {
			if (action.customID === CUSTOM_ID.MAX_LEVEL) {
				const embed = this.embed(data, false);
				embed.setColor(this.client.embed(message));
				embed.setDescription(
					`Units for TH${data.townHallLevel} ${data.builderHallLevel ? `and BH${data.builderHallLevel}` : ''}`
				);

				const msg = action.message as Message;
				(msg.components[0].components[0] as MessageButton)
					.setLabel('Town Hall Max Level')
					.setCustomID(CUSTOM_ID.TOWN_HALL_MAX);

				await action.update({ embeds: [embed], components: msg.components });
			}

			if (action.customID === CUSTOM_ID.TOWN_HALL_MAX) {
				const embed = this.embed(data, true);
				embed.setColor(this.client.embed(message));
				embed.setDescription(
					`Units for TH${data.townHallLevel} Max ${data.builderHallLevel ? `and BH${data.builderHallLevel} Max` : ''}`
				);

				const msg = action.message as Message;
				(msg.components[0].components[0] as MessageButton)
					.setLabel('Max Level')
					.setCustomID(CUSTOM_ID.MAX_LEVEL);

				await action.update({ embeds: [embed], components: msg.components });
			}

			if (action.customID === CUSTOM_ID.SELECT_ACCOUNT && action.isSelectMenu()) {
				data = players.find(en => en.tag === action.values![0])!;
				const embed = this.embed(data).setColor(this.client.embed(message));
				await action.update({ embeds: [embed] });
			}
		});

		collector.on('end', async () => {
			for (const customID of Object.values(CUSTOM_ID)) {
				this.client.components.delete(customID);
			}
			if (msg.deletable) await msg.edit({ components: [] });
		});
	}

	private embed(data: Player, option = true) {
		const embed = new MessageEmbed()
			.setAuthor(`${data.name} (${data.tag})`);

		const Troops = RAW_TROOPS_DATA.TROOPS
			.filter(unit => {
				const homeTroops = unit.village === 'home' && unit.levels[data.townHallLevel - 1] > 0;
				const builderTroops = unit.village === 'builderBase' && unit.levels[data.builderHallLevel! - 1] > 0;
				return Boolean(homeTroops || builderTroops);
			})
			.reduce((prev, curr) => {
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

		const apiTroops = this.apiTroops(data);
		const units = [];
		const indexes = Object.values(titles);
		for (const [key, value] of Object.entries(Troops)) {
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
					const { maxLevel, level } = apiTroops
						.find(u => u.name === unit.name && u.village === unit.village && u.type === unit.category) ?? { maxLevel: unit.levels[unit.levels.length - 1], level: 0 };
					const hallLevel = unit.village === 'home' ? data.townHallLevel : data.builderHallLevel;

					return {
						type: unit.category,
						village: unit.village,
						name: unit.name,
						level,
						hallMaxLevel: unit.levels[hallLevel! - 1],
						maxLevel
					};
				}
			);

			if (unitsArray.length) {
				embed.addField(
					category.title,
					this.chunk(unitsArray)
						.map(
							chunks => chunks.map(unit => {
								const unitIcon = (unit.village === 'home' ? HOME_TROOPS : BUILDER_TROOPS)[unit.name];
								const level = this.padStart(unit.level);
								const maxLevel = option ? this.padEnd(unit.hallMaxLevel) : this.padEnd(unit.maxLevel);
								return `${unitIcon} \`\u200e${level}/${maxLevel}\u200f\``;
							}).join(' ')
						)
						.join('\n')
				);
			}
		}

		const superTrops = RAW_TROOPS_DATA.SUPER_TROOPS
			.filter(unit => apiTroops.find(un => un.name === unit.original && un.village === unit.village && un.level >= unit.minOriginalLevel))
			.map(
				unit => {
					const { maxLevel, level, name } = apiTroops
						.find(u => u.name === unit.original && u.village === unit.village) ?? { maxLevel: 0, level: 0 };
					const hallLevel = data.townHallLevel;

					const originalTroop = RAW_TROOPS_DATA.TROOPS
						.find(un => un.name === name && un.category === 'troop' && un.village === 'home');

					return {
						village: unit.village,
						name: unit.name,
						level,
						hallMaxLevel: originalTroop!.levels[hallLevel - 1],
						maxLevel
					};
				}
			);

		const activeSuperTroops = data.troops.filter(en => en.superTroopIsActive).map(en => en.name);
		if (superTrops.length && data.townHallLevel >= 11) {
			embed.addField(`Super Troops (${activeSuperTroops.length ? 'Active' : 'Usable'})`, [
				this.chunk(superTrops.filter(en => activeSuperTroops.length ? activeSuperTroops.includes(en.name) : true))
					.map(
						chunks => chunks.map(unit => {
							const unitIcon = SUPER_TROOPS[unit.name];
							const level = this.padStart(unit.level);
							const maxLevel = option ? this.padEnd(unit.hallMaxLevel) : this.padEnd(unit.maxLevel);
							return `${unitIcon} \`\u200e${level}/${maxLevel}\u200f\``;
						}).join(' ')
					)
					.join('\n')
			].join('\n'));
		}

		return embed;
	}

	private chunk(items: TroopInfo[] | Omit<TroopInfo, 'type'>[] = [], chunk = 4) {
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
}
