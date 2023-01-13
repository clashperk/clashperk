import { EmbedBuilder, CommandInteraction, StringSelectMenuBuilder, ActionRowBuilder, ComponentType } from 'discord.js';
import { Player } from 'clashofclans.js';
import { BUILDER_TROOPS, EMOJIS, HOME_TROOPS, SUPER_TROOPS, TOWN_HALLS } from '../../util/Emojis.js';
import RAW_TROOPS_DATA from '../../util/Troops.js';
import { Args, Command } from '../../lib/index.js';
import { Util } from '../../util/index.js';
import { TroopJSON } from '../../types/index.js';

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

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string }) {
		const data = await this.client.resolver.resolvePlayer(interaction, args.tag, 1);
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
			.setDescription(`Remaining upgrades at TH${data.townHallLevel} ${data.builderHallLevel ? `& BH${data.builderHallLevel}` : ''}`);

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
					curr.category === 'hero' ? (curr.village === 'home' ? 'Town Hall' : 'Builder Hall') : curr.unlock.building;
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
			'Town Hall': `${EMOJIS.DARK_ELIXIR} Heroes`,
			'Pet House': `${EMOJIS.DARK_ELIXIR} Pets`,
			'Workshop': `${EMOJIS.ELIXIR} Siege Machines`,
			'Builder Hall': `${EMOJIS.BUILDER_ELIXIR} Builder Base Hero`,
			'Builder Barracks': `${EMOJIS.BUILDER_ELIXIR} Builder Troops`
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
				const { maxLevel, level } = apiTroops.find(
					(u) => u.name === unit.name && u.village === unit.village && u.type === unit.category
				) ?? { maxLevel: unit.levels[unit.levels.length - 1], level: 0 };
				const hallLevel = unit.village === 'home' ? data.townHallLevel : data.builderHallLevel;

				return {
					type: unit.category,
					village: unit.village,
					name: unit.name,
					level,
					hallMaxLevel: unit.levels[hallLevel! - 1],
					maxLevel,
					resource: unit.upgrade.resource,
					upgradeCost: level ? unit.upgrade.cost[level - 1] : unit.unlock.cost,
					upgradeTime: level ? unit.upgrade.time[level - 1] : unit.unlock.time
				};
			});

			if (category.key === 'Barracks' && unitsArray.length) {
				embed.setDescription(
					[
						embed.data.description,
						'',
						`**${category.title}**`,
						unitsArray
							.map((unit) => {
								const unitIcon = (unit.village === 'home' ? HOME_TROOPS : BUILDER_TROOPS)[unit.name];
								const level = this.padStart(unit.level);
								const maxLevel = this.padEnd(unit.hallMaxLevel);
								const upgradeTime = Util.ms(unit.upgradeTime * 1000).padStart(5, ' ');
								const upgradeCost = this.format(unit.upgradeCost).padStart(6, ' ');
								return `${unitIcon} \u2002 \`\u200e${level}/${maxLevel}\u200f\` \u2002 \u200e\`${upgradeTime} \u200f\` \u2002 \u200e\` ${upgradeCost} \u200f\``;
							})
							.join('\n')
					].join('\n')
				);
			}

			if (unitsArray.length && category.key !== 'Barracks') {
				embed.addFields([
					{
						name: '\u200b',
						value: [
							`**${category.title}**`,
							unitsArray
								.map((unit) => {
									const unitIcon = (unit.village === 'home' ? HOME_TROOPS : BUILDER_TROOPS)[unit.name];
									const level = this.padStart(unit.level);
									const maxLevel = this.padEnd(unit.hallMaxLevel);
									const upgradeTime = Util.ms(unit.upgradeTime * 1000).padStart(5, ' ');
									const upgradeCost = this.format(unit.upgradeCost).padStart(6, ' ');
									return `${unitIcon} \u2002 \`\u200e${level}/${maxLevel}\u200f\` \u2002 \u200e\`${upgradeTime} \u200f\` \u2002 \u200e\` ${upgradeCost} \u200f\``;
								})
								.join('\n')
						].join('\n')
					}
				]);
			}
		}

		if (!embed.data.fields?.length && embed.data.description?.length) {
			embed.setDescription(
				`No remaining upgrades at TH${data.townHallLevel} ${data.builderHallLevel ? ` and BH${data.builderHallLevel}` : ''}`
			);
		}

		if (remaining > 0) {
			embed.setFooter({ text: `Remaining ~${remaining}% (Home)` });
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
			? `${(Math.abs(num) / 1.0e9).toFixed(2)}B`
			: // Six Zeroes for Millions
			Math.abs(num) >= 1.0e6
			? `${(Math.abs(num) / 1.0e6).toFixed(2)}M`
			: // Three Zeroes for Thousands
			Math.abs(num) >= 1.0e3
			? `${(Math.abs(num) / 1.0e3).toFixed(1)}K`
			: Math.abs(num).toFixed(0);
	}
}
