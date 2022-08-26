import { URL } from 'node:url';
import { CommandInteraction, EmbedBuilder } from 'discord.js';
import { DARK_ELIXIR_TROOPS, DARK_SPELLS, ELIXIR_SPELLS, ELIXIR_TROOPS, EMOJIS, SIEGE_MACHINES, SUPER_TROOPS } from '../../util/Emojis.js';
import RAW_TROOPS from '../../util/Troops.js';
import { Command } from '../../lib/index.js';

const [TOTAL_UNITS, TOTAL_SPELLS, TOTAL_SUPER_TROOPS, TOTAL_SIEGE] = [300, 11, 2, 1];
const ARMY_URL_REGEX = /https?:\/\/link.clashofclans.com\/[a-z]{1,2}\?action=CopyArmy&army=[u|s]([\d+x-])+[s|u]?([\d+x-])+/g;

export default class ArmyCommand extends Command {
	public constructor() {
		super('army', {
			category: 'search',
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			description: {
				content: 'Parse army composition from a shared link.'
			},
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction, args: { link?: string; message?: string; name?: string }) {
		const url = this.getURL(args.link ?? args.message!);
		const army = url?.searchParams.get('army');
		if (!army) return interaction.editReply(this.i18n('command.army.no_link', { lng: interaction.locale }));

		const { prefix, suffix } = army.startsWith('s')
			? {
					prefix: {
						id: 's',
						name: 'spells'
					},
					suffix: {
						id: 'u',
						name: 'units'
					}
			  }
			: {
					prefix: {
						id: 'u',
						name: 'units'
					},
					suffix: {
						id: 's',
						name: 'spells'
					}
			  };
		const matches = new RegExp(
			`^${prefix.id}(?<${prefix.name}>(?:(?:[\\d+x-])+))(?:${suffix.id}(?<${suffix.name}>(?:[\\d+x-]+)))*$`
		).exec(army);
		const TROOP_COMPOS = (matches?.groups?.units as string | null)?.split('-') ?? [];
		const SPELL_COMPOS = (matches?.groups?.spells as string | null)?.split('-') ?? [];

		if (!TROOP_COMPOS.length && !SPELL_COMPOS.length) {
			return interaction.editReply(this.i18n('command.army.invalid_link', { lng: interaction.locale }));
		}

		const TROOP_IDS = TROOP_COMPOS.map((parts) => parts.split(/x/)).map((parts) => ({
			id: parts.length > 2 ? 0 : Number(parts[1]),
			total: Number(parts[0])
		}));

		const SPELL_IDS = SPELL_COMPOS.map((parts) => parts.split(/x/)).map((parts) => ({
			id: parts.length > 2 ? 0 : Number(parts[1]),
			total: Number(parts[0])
		}));

		const malformed = ![...TROOP_IDS, ...SPELL_IDS].every(
			(en) => typeof en.id === 'number' && typeof en.total === 'number' && en.total <= TOTAL_UNITS
		);
		if (malformed) return interaction.editReply(this.i18n('command.army.invalid_link', { lng: interaction.locale }));

		const uniqueSpells = SPELL_IDS.reduce<number[]>((prev, curr) => {
			if (!prev.includes(curr.id)) prev.push(curr.id);
			return prev;
		}, []);
		const uniqueTroops = TROOP_IDS.reduce<number[]>((prev, curr) => {
			if (!prev.includes(curr.id)) prev.push(curr.id);
			return prev;
		}, []);
		const duplicate = uniqueSpells.length !== SPELL_IDS.length || uniqueTroops.length !== TROOP_IDS.length;

		const SPELLS: Record<string, string> = {
			...DARK_SPELLS,
			...ELIXIR_SPELLS
		};
		const TROOPS: Record<string, string> = {
			...ELIXIR_TROOPS,
			...DARK_ELIXIR_TROOPS
		};

		const troops = TROOP_IDS.filter((parts) =>
			RAW_TROOPS.TROOPS.find((en) => en.id === parts.id && en.category === 'troop' && en.name in TROOPS)
		).map((parts) => {
			const unit = RAW_TROOPS.TROOPS.find((en) => en.id === parts.id && en.category === 'troop' && en.name in TROOPS)!;
			return {
				id: parts.id,
				total: parts.total,
				name: unit.name,
				category: unit.category,
				housing: unit.housingSpace,
				hallLevel: unit.unlock.hall,
				subCategory: unit.subCategory
			};
		});

		const spells = SPELL_IDS.filter((parts) =>
			RAW_TROOPS.TROOPS.find((en) => en.id === parts.id && en.category === 'spell' && en.name in SPELLS)
		).map((parts) => {
			const unit = RAW_TROOPS.TROOPS.find((en) => en.id === parts.id && en.category === 'spell' && en.name in SPELLS)!;
			return {
				id: parts.id,
				total: parts.total,
				name: unit.name,
				category: unit.category,
				subCategory: unit.subCategory,
				hallLevel: unit.unlock.hall,
				housing: unit.housingSpace
			};
		});

		const superTroops = TROOP_IDS.filter((parts) =>
			RAW_TROOPS.SUPER_TROOPS.find((en) => en.id === parts.id && en.name in SUPER_TROOPS)
		).map((parts) => {
			const unit = RAW_TROOPS.SUPER_TROOPS.find((en) => en.id === parts.id && en.name in SUPER_TROOPS)!;
			return {
				id: parts.id,
				total: parts.total,
				name: unit.name,
				category: 'troop',
				subCategory: 'super',
				hallLevel:
					RAW_TROOPS.TROOPS.find((en) => en.name === unit.original)!.levels.findIndex((en) => en >= unit.minOriginalLevel) + 1,
				housing: unit.housingSpace
			};
		});

		const siegeMachines = TROOP_IDS.filter((parts) =>
			RAW_TROOPS.TROOPS.find((en) => en.id === parts.id && en.category === 'troop' && en.name in SIEGE_MACHINES)
		).map((parts) => {
			const unit = RAW_TROOPS.TROOPS.find((en) => en.id === parts.id && en.category === 'troop' && en.name in SIEGE_MACHINES)!;
			return {
				id: parts.id,
				total: parts.total,
				name: unit.name,
				category: unit.category,
				subCategory: unit.subCategory,
				hallLevel: unit.unlock.hall,
				housing: unit.housingSpace
			};
		});

		if (!spells.length && !troops.length && !superTroops.length && !siegeMachines.length) {
			return interaction.editReply(this.i18n('command.army.invalid_link', { lng: interaction.locale }));
		}

		const hallByUnlockTH = Math.max(
			...troops.map((en) => en.hallLevel),
			...spells.map((en) => en.hallLevel),
			...siegeMachines.map((en) => en.hallLevel),
			...superTroops.map((en) => en.hallLevel)
		);

		const [totalTroop, totalSpell, totalSiege] = [
			troops.reduce((pre, cur) => pre + cur.housing * cur.total, 0) +
				superTroops.reduce((pre, curr) => pre + curr.housing * curr.total, 0),
			spells.reduce((pre, cur) => pre + cur.housing * cur.total, 0),
			siegeMachines.reduce((pre, cur) => pre + cur.housing * cur.total, 0)
		];

		const hallByTroops = RAW_TROOPS.TROOPS_HOUSING.find((en) => en.troops >= Math.min(totalTroop, TOTAL_UNITS))?.hall ?? 0;
		const hallBySpells = RAW_TROOPS.TROOPS_HOUSING.find((en) => en.spells >= Math.min(totalSpell, TOTAL_SPELLS))?.hall ?? 0;
		const townHallLevel = Math.max(hallByUnlockTH, hallByTroops, hallBySpells);

		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setDescription(
				[
					`**${args.name ?? 'Shared Army Composition'} [TH ${townHallLevel}${townHallLevel === 14 ? '' : '+'}]**`,
					`[Click to Copy](${url!.href})`,
					'',
					`${EMOJIS.TROOPS} **${totalTroop}** ${EMOJIS.SPELLS} **${totalSpell}**`
				].join('\n')
			);

		if (troops.length) {
			embed.setDescription(
				[
					embed.data.description,
					'',
					'**Troops**',
					troops.map((en) => `\u200e\`${this.padding(en.total)}\` ${TROOPS[en.name]}  ${en.name}`).join('\n')
				].join('\n')
			);
		}

		if (spells.length) {
			embed.addFields([
				{
					name: '\u200b',
					value: [
						'**Spells**',
						spells.map((en) => `\u200e\`${this.padding(en.total)}\` ${SPELLS[en.name]} ${en.name}`).join('\n')
					].join('\n')
				}
			]);
		}

		if (superTroops.length) {
			embed.addFields([
				{
					name: '\u200b',
					value: [
						'**Super Troops**',
						superTroops.map((en) => `\u200e\`${this.padding(en.total)}\` ${SUPER_TROOPS[en.name]}  ${en.name}`).join('\n')
					].join('\n')
				}
			]);
		}

		if (siegeMachines.length) {
			embed.addFields([
				{
					name: '\u200b',
					value: [
						'**Siege Machines**',
						siegeMachines.map((en) => `\u200e\`${this.padding(en.total)}\` ${SIEGE_MACHINES[en.name]}  ${en.name}`).join('\n')
					].join('\n')
				}
			]);
		}

		embed.setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ forceStatic: false }) });
		const mismatch = troops.length + spells.length + superTroops.length + siegeMachines.length !== TROOP_IDS.length + SPELL_IDS.length;

		const invalid =
			mismatch ||
			duplicate ||
			totalTroop > TOTAL_UNITS ||
			totalSpell > TOTAL_SPELLS ||
			totalSiege > TOTAL_SIEGE ||
			superTroops.length > TOTAL_SUPER_TROOPS;
		return interaction.editReply({
			embeds: [embed],
			content: invalid ? this.i18n('command.army.possibly_invalid_link', { lng: interaction.locale }) : null
		});
	}

	private padding(num: number) {
		return `${num.toString().padStart(2, ' ')}${num > 99 ? '' : 'x'}`;
	}

	private getURL(url: string) {
		if (!ARMY_URL_REGEX.test(url)) return null;
		return new URL(url.match(ARMY_URL_REGEX)![0]!);
	}
}
