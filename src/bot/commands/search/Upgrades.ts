import { EmbedBuilder, CommandInteraction, StringSelectMenuBuilder, ActionRowBuilder, ComponentType, User } from 'discord.js';
import { Player } from 'clashofclans.js';
import { BUILDER_TROOPS, EMOJIS, HOME_TROOPS, SUPER_TROOPS, TOWN_HALLS } from '../../util/Emojis.js';
import RAW_TROOPS_DATA from '../../util/Troops.js';
import { Args, Command } from '../../lib/index.js';
import { Util } from '../../util/index.js';
import { TroopJSON } from '../../types/index.js';

export const EN_ESCAPE = '\u2002';

export const resourceMap = {
	'Elixir': EMOJIS.ELIXIR,
	'Dark Elixir': EMOJIS.DARK_ELIXIR,
	'Gold': EMOJIS.GOLD,
	'Builder Elixir': EMOJIS.BUILDER_ELIXIR,
	'Builder Gold': EMOJIS.BUILDER_GOLD
};

export default class UpgradesCommand extends Command {
	public constructor() {
		super('upgrades', {
			category: 'search',
			channel: 'guild',
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			description: {
				content: 'Remaining upgrades of troops, spells and heroes.'
			},
			defer: true
		});
	}

	public args(): Args {
		return {
			player_tag: {
				id: 'tag',
				match: 'STRING'
			}
		};
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; user?: User }) {
		const data = await this.client.resolver.resolvePlayer(interaction, args.tag ?? args.user?.id);
		if (!data) return;

		const embed = this.embed(data).setColor(this.client.embed(interaction));
		const msg = await interaction.editReply({ embeds: [embed] });

		if (!data.user) return;
		const players = await this.client.resolver.getPlayers(data.user.id);
		if (!players.length) return;

		const options = players.map((op) => ({
			description: op.tag,
			label: op.name,
			value: op.tag,
			emoji: TOWN_HALLS[op.townHallLevel]
		}));

		const customID = this.client.uuid(interaction.user.id);
		const menu = new StringSelectMenuBuilder().setCustomId(customID).setPlaceholder('Select an account!').addOptions(options);

		await interaction.editReply({ components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)] });

		const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
			filter: (action) => [customID].includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === customID && action.isStringSelectMenu()) {
				const data = players.find((en) => en.tag === action.values[0])!;
				const embed = this.embed(data).setColor(this.client.embed(interaction));
				await action.update({ embeds: [embed] });
			}
		});

		collector.on('end', async (_, reason) => {
			this.client.components.delete(customID);
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
	}

	public embed(data: Player) {
		const embed = new EmbedBuilder()
			.setAuthor({ name: `${data.name} (${data.tag})` })
			.setDescription(
				[
					`Remaining upgrades at TH ${data.townHallLevel} ${data.builderHallLevel ? `& BH ${data.builderHallLevel}` : ''}`,
					'Total time & cost of the remaining units',
					'for the current TH/BH level.',
					'R = Rushed (Not maxed for the previous TH/BH)'
				].join('\n')
			);

		const apiTroops = this.apiTroops(data);
		const Troops = RAW_TROOPS_DATA.TROOPS.filter((unit) => !unit.seasonal && !(unit.name in SUPER_TROOPS))
			.filter((unit) => {
				const apiTroop = apiTroops.find((u) => u.name === unit.name && u.village === unit.village && u.type === unit.category);
				const homeTroops = unit.village === 'home' && unit.levels[data.townHallLevel - 1] > (apiTroop?.level ?? 0);
				const builderTroops = unit.village === 'builderBase' && unit.levels[data.builderHallLevel! - 1] > (apiTroop?.level ?? 0);
				return Boolean(homeTroops || builderTroops);
			})
			.reduce<TroopJSON>((prev, curr) => {
				const unlockBuilding =
					curr.category === 'hero'
						? curr.village === 'home'
							? curr.name === 'Grand Warden'
								? 'Elixir Hero'
								: 'Dark Hero'
							: 'Builder Hall'
						: curr.unlock.building;
				if (!(unlockBuilding in prev)) prev[unlockBuilding] = [];
				prev[unlockBuilding].push(curr);
				return prev;
			}, {});

		const rem = RAW_TROOPS_DATA.TROOPS.filter((unit) => !unit.seasonal && !(unit.name in SUPER_TROOPS)).reduce(
			(prev, unit) => {
				const apiTroop = apiTroops.find((u) => u.name === unit.name && u.village === unit.village && u.type === unit.category);
				if (unit.village === 'home') {
					prev.levels += apiTroop?.level ?? 0;
					prev.total += unit.levels[data.townHallLevel - 1];
				}
				return prev;
			},
			{ total: 0, levels: 0 }
		);
		const remaining = Number((100 - (rem.levels * 100) / rem.total).toFixed(2));

		const titles: Record<string, string> = {
			'Barracks': `${EMOJIS.ELIXIR} Elixir Troops`,
			'Dark Barracks': `${EMOJIS.DARK_ELIXIR} Dark Troops`,
			'Spell Factory': `${EMOJIS.ELIXIR} Elixir Spells`,
			'Dark Spell Factory': `${EMOJIS.DARK_ELIXIR} Dark Spells`,
			'Dark Hero': `${EMOJIS.DARK_ELIXIR} Heroes`,
			'Elixir Hero': `${EMOJIS.ELIXIR} Heroes`,
			'Pet House': `${EMOJIS.DARK_ELIXIR} Pets`,
			'Workshop': `${EMOJIS.ELIXIR} Siege Machines`,
			'Builder Hall': `${EMOJIS.BUILDER_ELIXIR} Builder Base Hero`
			// 'Builder Barracks': `${EMOJIS.BUILDER_ELIXIR} Builder Troops`,
		};

		const units = [];
		const indexes = Object.values(titles);
		for (const [key, value] of Object.entries(Troops)) {
			const title = titles[key];
			units.push({
				index: indexes.indexOf(title),
				title,
				key,
				units: value
			});
		}

		for (const category of units.sort((a, b) => a.index - b.index)) {
			const unitsArray = category.units.map((unit) => {
				const apiTroop = apiTroops.find((u) => u.name === unit.name && u.village === unit.village && u.type === unit.category);
				const maxLevel = apiTroop?.maxLevel ?? unit.levels[unit.levels.length - 1];
				const _level = apiTroop?.level ?? 0;
				const hallLevel = unit.village === 'home' ? data.townHallLevel : data.builderHallLevel ?? 0;
				const level = _level === 0 ? 0 : Math.max(_level, unit.minLevel ?? _level);
				const isRushed = unit.levels[hallLevel - 2] > level;
				const hallMaxLevel = unit.levels[hallLevel - 1];

				const remainingCost = level
					? unit.upgrade.cost.slice(level - (unit.minLevel ?? 1), hallMaxLevel - 1).reduce((prev, curr) => prev + curr, 0)
					: unit.unlock.cost + unit.upgrade.cost.slice(0, hallMaxLevel - 1).reduce((prev, curr) => prev + curr, 0);

				const remainingTime = level
					? unit.upgrade.time.slice(level - (unit.minLevel ?? 1), hallMaxLevel - 1).reduce((prev, curr) => prev + curr, 0)
					: unit.unlock.time + unit.upgrade.time.slice(0, hallMaxLevel - 1).reduce((prev, curr) => prev + curr, 0);

				return {
					type: unit.category,
					village: unit.village,
					name: unit.name,
					level,
					isRushed,
					hallMaxLevel,
					maxLevel: Math.max(unit.levels[unit.levels.length - 1], maxLevel),
					resource: unit.upgrade.resource,
					upgradeCost: level ? unit.upgrade.cost[level - (unit.minLevel ?? 1)] : unit.unlock.cost,
					upgradeTime: level ? unit.upgrade.time[level - (unit.minLevel ?? 1)] : unit.unlock.time,
					remainingCost,
					remainingTime
				};
			});

			const _totalTime = unitsArray.reduce((prev, curr) => prev + curr.remainingTime, 0);
			const _totalCost = unitsArray.reduce((prev, curr) => prev + curr.remainingCost, 0);
			const totalTime = this.dur(_totalTime).padStart(5, ' ');
			const totalCost = this.format(_totalCost).padStart(6, ' ');

			const descriptionTexts = [
				`**${category.title}**`,
				unitsArray
					.map((unit) => {
						const unitIcon = (unit.village === 'home' ? HOME_TROOPS : BUILDER_TROOPS)[unit.name];
						const level = this.padStart(unit.level);
						const maxLevel = this.padEnd(unit.hallMaxLevel);
						const upgradeTime = this.dur(unit.remainingTime).padStart(5, ' ');
						const upgradeCost = this.format(unit.remainingCost).padStart(6, ' ');
						const rushed = unit.isRushed ? `\` R \`` : '`   `';
						return `\u200e${unitIcon} \` ${level}/${maxLevel} \` \` ${upgradeTime} \` \` ${upgradeCost} \` ${rushed}`;
					})
					.join('\n'),
				unitsArray.length > 1 ? `\u200e${EMOJIS.CLOCK} \`   -   \` \` ${totalTime} \` \` ${totalCost} \` \`   \`` : ''
			];

			if (category.key === 'Barracks' && unitsArray.length) {
				embed.setDescription([embed.data.description, '', ...descriptionTexts].join('\n'));
			}

			if (unitsArray.length && category.key !== 'Barracks') {
				embed.addFields([
					{
						name: '\u200b',
						value: [...descriptionTexts].join('\n')
					}
				]);
			}
		}

		if (!embed.data.fields?.length && embed.data.description?.length) {
			embed.setDescription(
				`No remaining upgrades at TH ${data.townHallLevel} ${data.builderHallLevel ? ` and BH ${data.builderHallLevel}` : ''}`
			);
		}

		if (remaining > 0) {
			embed.setFooter({
				text: [`Remaining ~${remaining}% (Home Village)`].join('\n')
			});
		}

		return embed;
	}

	private padEnd(num: number) {
		return num.toString().padEnd(2, ' ');
	}

	private padStart(num: number) {
		return num.toString().padStart(2, ' ');
	}

	private apiTroops(data: Player) {
		return [
			...data.troops.map((u) => ({
				name: u.name,
				level: u.level,
				maxLevel: u.maxLevel,
				type: 'troop',
				village: u.village
			})),
			...data.heroes.map((u) => ({
				name: u.name,
				level: u.level,
				maxLevel: u.maxLevel,
				type: 'hero',
				village: u.village
			})),
			...data.spells.map((u) => ({
				name: u.name,
				level: u.level,
				maxLevel: u.maxLevel,
				type: 'spell',
				village: u.village
			}))
		];
	}

	private format(num = 0) {
		// Nine Zeroes for Billions
		return Math.abs(num) >= 1.0e9
			? `${(Math.abs(num) / 1.0e9).toFixed(Math.abs(num) / 1.0e9 >= 100 ? 1 : 2)}B`
			: // Six Zeroes for Millions
			Math.abs(num) >= 1.0e6
			? `${(Math.abs(num) / 1.0e6).toFixed(Math.abs(num) / 1.0e6 >= 100 ? 1 : 2)}M`
			: // Three Zeroes for Thousands
			Math.abs(num) >= 1.0e3
			? `${(Math.abs(num) / 1.0e3).toFixed(Math.abs(num) / 1.0e3 >= 100 ? 1 : 2)}K`
			: Math.abs(num).toFixed(0);
	}

	private dur(sec: number) {
		if (!sec) return '  -  ';
		return Util.ms(sec * 1000);
	}

	private toGameString(num: number) {
		return num.toLocaleString('en-US').replace(/,/g, ' ');
	}
}
