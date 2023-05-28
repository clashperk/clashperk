import { EmbedBuilder, CommandInteraction, StringSelectMenuBuilder, ActionRowBuilder, ComponentType, User } from 'discord.js';
import { Player, Clan } from 'clashofclans.js';
import { BUILDER_TROOPS, HOME_TROOPS, SUPER_TROOPS, TOWN_HALLS } from '../../util/Emojis.js';
import RAW_TROOPS_DATA from '../../util/Troops.js';
import { Args, Command } from '../../lib/index.js';
import { Util } from '../../util/index.js';
import { TroopJSON } from '../../types/index.js';

export default class RushedCommand extends Command {
	public constructor() {
		super('rushed', {
			category: 'search',
			channel: 'guild',
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			description: {
				content: [
					'Rushed troops, spells, and heroes.',
					'',
					'• `rushed clan <clanTag>` - list of rushed and non-rushed clan members.'
				]
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

	public async exec(interaction: CommandInteraction<'cached'>, args: { clan_tag?: string; tag?: string; user?: User }) {
		if (args.clan_tag) {
			const clan = await this.client.resolver.resolveClan(interaction, args.clan_tag);
			if (!clan) return null;
			return this.clan(interaction, clan);
		}

		const data = await this.client.resolver.resolvePlayer(interaction, args.tag ?? args.user?.id);
		if (!data) return null;

		const embed = this.embed(data as Player, interaction).setColor(this.client.embed(interaction));
		const msg = await interaction.editReply({ embeds: [embed] });

		if (!data.user) return null;
		const players = await this.client.resolver.getPlayers(data.user.id);
		if (!players.length) return null;

		const options = players.map((op) => ({
			description: op.tag,
			label: op.name,
			value: op.tag,
			emoji: TOWN_HALLS[op.townHallLevel]
		}));

		const customID = this.client.uuid(interaction.user.id);
		const menu = new StringSelectMenuBuilder().setCustomId(customID).setPlaceholder('Select an account!').addOptions(options);

		await interaction.editReply({ components: [new ActionRowBuilder<StringSelectMenuBuilder>({ components: [menu] })] });
		const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
			filter: (action) => action.customId === customID && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === customID && action.isStringSelectMenu()) {
				const data = players.find((en) => en.tag === action.values[0])!;
				const embed = this.embed(data, interaction).setColor(this.client.embed(interaction));
				await action.update({ embeds: [embed] });
			}
		});

		collector.on('end', async (_, reason) => {
			this.client.components.delete(customID);
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
	}

	private embed(data: Player, interaction: CommandInteraction) {
		const embed = new EmbedBuilder().setAuthor({ name: `${data.name} (${data.tag})` });

		const apiTroops = this.apiTroops(data);
		const Troops = RAW_TROOPS_DATA.TROOPS.filter((troop) => !troop.seasonal && !(troop.name in SUPER_TROOPS)).filter((unit) => {
			const apiTroop = apiTroops.find((u) => u.name === unit.name && u.village === unit.village && u.type === unit.category);
			const homeTroops = unit.village === 'home' && unit.levels[data.townHallLevel - 2] > (apiTroop?.level ?? 0);
			// const builderTroops = unit.village === 'builderBase' && unit.levels[data.builderHallLevel! - 2] > (apiTroop?.level ?? 0);
			// return Boolean(homeTroops || builderTroops);
			return Boolean(homeTroops);
		});

		const TroopsObj = Troops.reduce<TroopJSON>((prev, curr) => {
			const unlockBuilding =
				curr.category === 'hero' ? (curr.village === 'home' ? 'Town Hall' : 'Builder Hall') : curr.unlock.building;
			if (!(unlockBuilding in prev)) prev[unlockBuilding] = [];
			prev[unlockBuilding].push(curr);
			return prev;
		}, {});

		const titles: Record<string, string> = {
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
			const unitsArray = category.units.map((unit) => {
				const hallLevel = unit.village === 'home' ? data.townHallLevel : data.builderHallLevel;
				const { maxLevel, level: _level } = apiTroops.find(
					(u) => u.name === unit.name && u.village === unit.village && u.type === unit.category
				) ?? { maxLevel: unit.levels[unit.levels.length - 1], level: 0 };

				const level = _level === 0 ? 0 : Math.max(_level, unit.minLevel ?? _level);

				return {
					type: unit.category,
					village: unit.village,
					name: unit.name,
					level,
					hallMaxLevel: unit.levels[hallLevel! - 2],
					maxLevel: Math.max(unit.levels[unit.levels.length - 1], maxLevel)
				};
			});

			if (unitsArray.length) {
				embed.addFields([
					{
						name: `${category.title} (${unitsArray.length})`,
						value: Util.chunk(unitsArray, 4)
							.map((chunks) =>
								chunks
									.map((unit) => {
										const unitIcon = (unit.village === 'home' ? HOME_TROOPS : BUILDER_TROOPS)[unit.name];
										const level = this.padStart(unit.level);
										const maxLevel = this.padEnd(unit.hallMaxLevel);
										return `${unitIcon} \`\u200e${level}/${maxLevel}\u200f\``;
									})
									.join(' ')
							)
							.join('\n')
					}
				]);
			}
		}

		embed.setDescription(
			[
				`Rushed units for Town Hall ${data.townHallLevel}`,
				'Rushed = Not maxed for the previous Town Hall level.',
				'',
				'**Percentage**',
				`${this.rushedPercentage(data)}% (Lab)`,
				`${this.heroRushed(data)}% (Hero)`,
				`${this.rushedOverall(data)}% (Overall)`,
				'\u200b'
			].join('\n')
		);

		if (embed.data.fields?.length) {
			embed.setFooter({ text: `Total ${this.totalPercentage(data.townHallLevel, Troops.length)}` });
		} else {
			embed.setDescription(
				this.i18n('command.rushed.no_rushed', { lng: interaction.locale, townhall: data.townHallLevel.toString() })
			);
		}
		return embed;
	}

	private async clan(interaction: CommandInteraction, data: Clan) {
		if (data.members < 1) {
			return interaction.editReply(this.i18n('common.no_clan_members', { lng: interaction.locale, clan: data.name }));
		}

		const fetched = await this.client.http.detailedClanMembers(data.memberList);
		const members = [];
		for (const obj of fetched.filter((res) => res.ok)) {
			members.push({ name: obj.name, rushed: this.reduce(obj), townHallLevel: obj.townHallLevel });
		}

		const embed = new EmbedBuilder().setAuthor({ name: `${data.name} (${data.tag})` }).setDescription(
			[
				'Rushed Percentage',
				'```\u200eTH   LAB  HERO  NAME',
				members
					.sort((a, b) => Number(b.rushed.overall) - Number(a.rushed.overall))
					.map((en) => `${this.padding(en.townHallLevel)}  ${this.per(en.rushed.lab)}  ${this.per(en.rushed.hero)}  ${en.name}`)
					.join('\n'),
				'```'
			].join('\n')
		);

		return interaction.editReply({ embeds: [embed] });
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

	private rushedPercentage(data: Player) {
		const apiTroops = this.apiTroops(data);
		const rem = RAW_TROOPS_DATA.TROOPS.filter((unit) => !unit.seasonal && !(unit.name in SUPER_TROOPS)).reduce(
			(prev, unit) => {
				const apiTroop = apiTroops.find((u) => u.name === unit.name && u.village === unit.village && u.type === unit.category);
				if (unit.village === 'home' && unit.category !== 'hero') {
					prev.levels += Math.min(apiTroop?.level ?? 0, unit.levels[data.townHallLevel - 2]);
					prev.total += unit.levels[data.townHallLevel - 2];
				}
				return prev;
			},
			{ total: 0, levels: 0 }
		);
		if (rem.total === 0) return (0).toFixed(2);
		return (100 - (rem.levels * 100) / rem.total).toFixed(2);
	}

	private heroRushed(data: Player) {
		const apiTroops = this.apiTroops(data);
		const rem = RAW_TROOPS_DATA.TROOPS.filter((unit) => !unit.seasonal && !(unit.name in SUPER_TROOPS)).reduce(
			(prev, unit) => {
				const apiTroop = apiTroops.find((u) => u.name === unit.name && u.village === unit.village && u.type === unit.category);
				if (unit.category === 'hero' && unit.village === 'home') {
					prev.levels += Math.min(apiTroop?.level ?? 0, unit.levels[data.townHallLevel - 2]);
					prev.total += unit.levels[data.townHallLevel - 2];
				}
				return prev;
			},
			{ total: 0, levels: 0 }
		);
		if (rem.total === 0) return (0).toFixed(2);
		return (100 - (rem.levels * 100) / rem.total).toFixed(2);
	}

	private rushedOverall(data: Player) {
		const apiTroops = this.apiTroops(data);
		const rem = RAW_TROOPS_DATA.TROOPS.filter((unit) => !unit.seasonal && !(unit.name in SUPER_TROOPS)).reduce(
			(prev, unit) => {
				const apiTroop = apiTroops.find((u) => u.name === unit.name && u.village === unit.village && u.type === unit.category);
				if (unit.village === 'home') {
					prev.levels += Math.min(apiTroop?.level ?? 0, unit.levels[data.townHallLevel - 2]);
					prev.total += unit.levels[data.townHallLevel - 2];
				}
				return prev;
			},
			{ total: 0, levels: 0 }
		);
		if (rem.total === 0) return (0).toFixed(2);
		return (100 - (rem.levels * 100) / rem.total).toFixed(2);
	}

	private totalPercentage(hallLevel: number, rushed: number) {
		const totalTroops = RAW_TROOPS_DATA.TROOPS.filter((unit) => !unit.seasonal && !(unit.name in SUPER_TROOPS)).filter(
			(unit) => unit.village === 'home' && unit.levels[hallLevel - 2] > 0
		);
		return `${rushed}/${totalTroops.length} (${((rushed * 100) / totalTroops.length).toFixed(2)}%)`;
	}
}
