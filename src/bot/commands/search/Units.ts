import { BUILDER_TROOPS, HOME_TROOPS, SUPER_TROOPS, TOWN_HALLS } from '../../util/Emojis';
import { MessageEmbed, CommandInteraction, MessageButton, MessageSelectMenu, MessageActionRow, Message } from 'discord.js';
import RAW_TROOPS_DATA from '../../util/Troops';
import { Command } from '../../lib';
import { Player } from 'clashofclans.js';
import { TroopInfo, TroopJSON } from '../../types';

export default class UnitsCommand extends Command {
	public constructor() {
		super('units', {
			category: 'search',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Levels of troops, spells and heroes.'
			},
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string }) {
		let data = await this.client.resolver.resolvePlayer(interaction, args.tag, 1);
		if (!data) return;

		const embed = this.embed(data, true)
			.setColor(this.client.embed(interaction))
			.setDescription(`Units for TH${data.townHallLevel} Max ${data.builderHallLevel ? `and BH${data.builderHallLevel} Max` : ''}`);

		const CUSTOM_ID = {
			MAX_LEVEL: this.client.uuid(interaction.user.id),
			TOWN_HALL_MAX: this.client.uuid(interaction.user.id),
			SELECT_ACCOUNT: this.client.uuid(interaction.user.id)
		};

		const button = new MessageButton().setCustomId(CUSTOM_ID.MAX_LEVEL).setLabel('Max Level').setStyle('SECONDARY');
		const msg = await interaction.editReply({ embeds: [embed], components: [new MessageActionRow({ components: [button] })] });

		const players = data.user ? await this.client.resolver.getPlayers(data.user.id) : [];
		if (players.length) {
			const options = players.map((op) => ({
				description: op.tag,
				label: op.name,
				value: op.tag,
				emoji: TOWN_HALLS[op.townHallLevel]
			}));

			const menu = new MessageSelectMenu()
				.setCustomId(CUSTOM_ID.SELECT_ACCOUNT)
				.setPlaceholder('Select an account!')
				.addOptions(options);

			await msg.edit({
				components: [new MessageActionRow({ components: [button] }), new MessageActionRow({ components: [menu] })]
			});
		}

		const collector = msg.createMessageComponentCollector({
			filter: (action) => Object.values(CUSTOM_ID).includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === CUSTOM_ID.MAX_LEVEL) {
				// TODO: Fix !
				const embed = this.embed(data!, false);
				embed.setColor(this.client.embed(interaction));
				embed.setDescription(
					`Units for TH${data!.townHallLevel} ${data!.builderHallLevel ? `and BH${data!.builderHallLevel}` : ''}`
				);

				const msg = action.message as Message;
				(msg.components[0].components[0] as MessageButton).setLabel('Town Hall Max Level').setCustomId(CUSTOM_ID.TOWN_HALL_MAX);

				await action.update({ embeds: [embed], components: msg.components });
			}

			if (action.customId === CUSTOM_ID.TOWN_HALL_MAX) {
				const embed = this.embed(data!, true);
				embed.setColor(this.client.embed(interaction));
				embed.setDescription(
					`Units for TH${data!.townHallLevel} Max ${data!.builderHallLevel ? `and BH${data!.builderHallLevel} Max` : ''}`
				);

				const msg = action.message as Message;
				(msg.components[0].components[0] as MessageButton).setLabel('Max Level').setCustomId(CUSTOM_ID.MAX_LEVEL);

				await action.update({ embeds: [embed], components: msg.components });
			}

			if (action.customId === CUSTOM_ID.SELECT_ACCOUNT && action.isSelectMenu()) {
				data = players.find((en) => en.tag === action.values[0])!;
				const option = (action.message as Message).components[0].components[0].customId === CUSTOM_ID.MAX_LEVEL;
				const embed = this.embed(data, option).setColor(this.client.embed(interaction));
				await action.update({ embeds: [embed] });
			}
		});

		collector.on('end', async (_, reason) => {
			for (const customID of Object.values(CUSTOM_ID)) {
				this.client.components.delete(customID);
			}
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
	}

	private embed(data: Player, option = true) {
		const embed = new MessageEmbed().setAuthor({ name: `${data.name} (${data.tag})` });

		const Troops = RAW_TROOPS_DATA.TROOPS.filter((troop) => !troop.seasonal)
			.filter((unit) => {
				const homeTroops = unit.village === 'home' && unit.levels[data.townHallLevel - 1] > 0;
				const builderTroops = unit.village === 'builderBase' && unit.levels[data.builderHallLevel! - 1] > 0;
				return Boolean(homeTroops || builderTroops);
			})
			.reduce<TroopJSON>((prev, curr) => {
				if (!(curr.unlock.building in prev)) prev[curr.unlock.building] = [];
				prev[curr.unlock.building].push(curr);
				return prev;
			}, {});

		const titles: Record<string, string> = {
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
					maxLevel
				};
			});

			if (unitsArray.length) {
				embed.addField(
					category.title,
					this.chunk(unitsArray)
						.map((chunks) =>
							chunks
								.map((unit) => {
									const unitIcon = (unit.village === 'home' ? HOME_TROOPS : BUILDER_TROOPS)[unit.name];
									const level = this.padStart(unit.level);
									const maxLevel = option ? this.padEnd(unit.hallMaxLevel) : this.padEnd(unit.maxLevel);
									return `${unitIcon} \`\u200e${level}/${maxLevel}\u200f\``;
								})
								.join(' ')
						)
						.join('\n')
				);
			}
		}

		const superTroops = RAW_TROOPS_DATA.SUPER_TROOPS.filter((unit) =>
			apiTroops.find((un) => un.name === unit.original && un.village === unit.village && un.level >= unit.minOriginalLevel)
		).map((unit) => {
			const { maxLevel, level, name } = apiTroops.find((u) => u.name === unit.original && u.village === unit.village) ?? {
				maxLevel: 0,
				level: 0
			};
			const hallLevel = data.townHallLevel;

			const originalTroop = RAW_TROOPS_DATA.TROOPS.find((un) => un.name === name && un.category === 'troop' && un.village === 'home');

			return {
				village: unit.village,
				name: unit.name,
				level,
				hallMaxLevel: originalTroop!.levels[hallLevel - 1],
				maxLevel
			};
		});

		const activeSuperTroops = data.troops.filter((en) => en.superTroopIsActive).map((en) => en.name);
		if (superTroops.length && data.townHallLevel >= 11) {
			embed.addField(
				`Super Troops (${activeSuperTroops.length ? 'Active' : 'Usable'})`,
				[
					this.chunk(superTroops.filter((en) => (activeSuperTroops.length ? activeSuperTroops.includes(en.name) : true)))
						.map((chunks) =>
							chunks
								.map((unit) => {
									const unitIcon = SUPER_TROOPS[unit.name];
									const level = this.padStart(unit.level);
									const maxLevel = option ? this.padEnd(unit.hallMaxLevel) : this.padEnd(unit.maxLevel);
									return `${unitIcon} \`\u200e${level}/${maxLevel}\u200f\``;
								})
								.join(' ')
						)
						.join('\n')
				].join('\n')
			);
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
}
