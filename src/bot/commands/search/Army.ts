/* eslint-disable @typescript-eslint/prefer-regexp-exec */
import RAW_TROOPS from '../../util/TroopsInfo';
import { Command } from 'discord-akairo';
import { Message } from 'discord.js';
import { URL } from 'url';
import { DARK_ELIXIR_TROOPS, DARK_SPELLS, ELIXIR_SPELLS, ELIXIR_TROOPS, EMOJIS, SEIGE_MACHINES, SUPER_TROOPS } from '../../util/Emojis';
import { TROOPS_HOUSING } from '../../util/Constants';

export default class ArmyCommand extends Command {
	public constructor() {
		super('army', {
			aliases: ['army'],
			category: 'test',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Parse army composition from a shared link.',
				usage: '<url>'
			},
			optionFlags: ['--url'],
			regex: /^https?:\/\/link.clashofclans.com\/en\?action=CopyArmy&army=u(?<units>(?:[\d+x-]+))(?:s(?<spells>(?:[\d+x-]+)))*$/i
		});
	}

	public *args(msg: Message): unknown {
		const url = yield {
			flag: '--url',
			type: 'url',
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase'
		};

		return { url };
	}

	public async exec(message: Message, { url, match }: { url?: URL; match?: string[] }) {
		if (match?.length) url = new URL(match[0]);
		if (match?.length && !['524672414261444623', '509784317598105619'].includes(message.guild!.id)) return;

		if (!url) return;
		const army = url.searchParams.get('army');
		if (!army) return;

		const matches = /u(?<units>(?:(?:[\d+x-])+))(?:s(?<spells>(?:[\d+x-]+)))*/i.exec(army);
		const TROOP_COMPOS = (matches?.groups?.units as string | null)?.split('-') ?? [];
		const SPELL_COMPOS = (matches?.groups?.spells as string | null)?.split('-') ?? [];

		const TROOP_IDS = TROOP_COMPOS.map(parts => parts.split(/x/))
			.map(parts => ({ id: parts.length > 2 ? 0 : Number(parts[1]), total: Number(parts[0]) }));

		const SPELL_IDS = SPELL_COMPOS.map(parts => parts.split(/x/))
			.map(parts => ({ id: parts.length > 2 ? 0 : Number(parts[1]), total: Number(parts[0]) }));

		const malformed = ![...TROOP_IDS, ...SPELL_IDS].every(en => typeof en.id === 'number' && typeof en.total === 'number');
		if (malformed) return message.util!.send(`'**This army composition URL is invalid!**'`);

		const uniqueSpells = SPELL_IDS.reduce((prev, curr) => {
			if (!prev.includes(curr.id)) prev.push(curr.id);
			return prev;
		}, [] as number[]);
		const uniqueTroops = TROOP_IDS.reduce((prev, curr) => {
			if (!prev.includes(curr.id)) prev.push(curr.id);
			return prev;
		}, [] as number[]);
		const duplicate = uniqueSpells.length !== SPELL_IDS.length || uniqueTroops.length !== TROOP_IDS.length;

		const SPELLS: { [key: string]: string } = {
			...DARK_SPELLS,
			...ELIXIR_SPELLS
		};
		const TROOPS: { [key: string]: string } = {
			...ELIXIR_TROOPS,
			...DARK_ELIXIR_TROOPS
		};

		const troops = TROOP_IDS.filter(
			parts => RAW_TROOPS.TROOPS.find(
				en => en.id === parts.id && en.category === 'troop' && en.name in TROOPS
			)
		).map(parts => {
			const unit = RAW_TROOPS.TROOPS.find(
				en => en.id === parts.id && en.category === 'troop' && en.name in TROOPS
			)!;
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

		const spells = SPELL_IDS.filter(
			parts => RAW_TROOPS.TROOPS.find(
				en => en.id === parts.id && en.category === 'spell' && en.name in SPELLS
			)
		).map(parts => {
			const unit = RAW_TROOPS.TROOPS.find(
				en => en.id === parts.id && en.category === 'spell' && en.name in SPELLS
			)!;
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

		const superTroops = TROOP_IDS.filter(
			parts => RAW_TROOPS.SUPER_TROOPS.find(
				en => en.id === parts.id && en.name in SUPER_TROOPS
			)
		).map(parts => {
			const unit = RAW_TROOPS.SUPER_TROOPS.find(
				en => en.id === parts.id && en.name in SUPER_TROOPS
			)!;
			return {
				id: parts.id,
				total: parts.total,
				name: unit.name,
				category: 'troop',
				subCategory: 'super',
				hallLevel: RAW_TROOPS.TROOPS.find(
					en => en.name === unit.original
				)!.levels.findIndex(
					en => en >= unit.minOriginalLevel
				) + 1,
				housing: unit.housingSpace
			};
		});

		const seigeMachines = TROOP_IDS.filter(
			parts => RAW_TROOPS.TROOPS.find(
				en => en.id === parts.id && en.category === 'troop' && en.name in SEIGE_MACHINES
			)
		).map(parts => {
			const unit = RAW_TROOPS.TROOPS.find(
				en => en.id === parts.id && en.category === 'troop' && en.name in SEIGE_MACHINES
			)!;
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

		if (!spells.length && !troops.length && !superTroops.length && !seigeMachines.length) {
			if (match?.length) return;
			return message.util!.send('**This army composition URL is invalid!**');
		}

		const hallByUnlockTH = Math.max(
			...troops.map(en => en.hallLevel),
			...spells.map(en => en.hallLevel),
			...seigeMachines.map(en => en.hallLevel),
			...superTroops.map(en => en.hallLevel)
		);

		const [totalTroop, totalSpell, totalSeige] = [
			troops.reduce(
				(pre, cur) => pre + (cur.housing * cur.total), 0
			) + superTroops.reduce(
				(pre, curr) => pre + (curr.housing * curr.total), 0
			),
			spells.reduce(
				(pre, cur) => pre + (cur.housing * cur.total), 0
			),
			seigeMachines.reduce(
				(pre, cur) => pre + (cur.housing * cur.total), 0
			)
		];

		const hallByTroops = TROOPS_HOUSING.find(en => en.troops >= Math.min(totalTroop, 300))?.hall ?? 0;
		const hallBySpells = TROOPS_HOUSING.find(en => en.spells >= Math.min(totalSpell, 11))?.hall ?? 0;

		const townHallLevel = Math.max(hallByUnlockTH, hallByTroops, hallBySpells);

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setDescription([
				`**TH ${townHallLevel}${townHallLevel === 14 ? '' : '+'} Army Composition**`,
				`[Click to Copy](${url.href})`,
				'',
				`${EMOJIS.TROOPS} **${totalTroop}** ${EMOJIS.SEPLLS} **${totalSpell}**`
			].join('\n'));

		if (troops.length) {
			embed.addField(
				'Troops',
				troops.map(
					en => `\u200e\`${en.total.toString().padStart(2, ' ')}${en.total > 99 ? '' : 'x'}\` ${TROOPS[en.name]}  ${en.name}`
				).join('\n')
			);
		}

		if (spells.length) {
			embed.addField(
				'Spells',
				spells.map(
					en => `\u200e\`${en.total.toString().padStart(2, ' ')}${en.total > 99 ? '' : 'x'}\` ${SPELLS[en.name]} ${en.name}`
				).join('\n')
			);
		}

		if (superTroops.length) {
			embed.addField(
				'Super Troops',
				superTroops.map(
					en => `\u200e\`${en.total.toString().padStart(2, ' ')}${en.total > 99 ? '' : 'x'}\` ${SUPER_TROOPS[en.name]}  ${en.name}`
				).join('\n')
			);
		}

		if (seigeMachines.length) {
			embed.addField(
				'Seige Machines',
				seigeMachines.map(
					en => `\u200e\`${en.total.toString().padStart(2, ' ')}${en.total > 99 ? '' : 'x'}\` ${SEIGE_MACHINES[en.name]}  ${en.name}`
				).join('\n')
			);
		}

		embed.setFooter(message.author.tag, message.author.displayAvatarURL({ dynamic: true }));
		const mismatch = (troops.length + spells.length + superTroops.length + seigeMachines.length) !== (TROOP_IDS.length + SPELL_IDS.length);

		const invalid = mismatch || duplicate || totalTroop > 300 || totalSpell > 11 || totalSeige > 1 || superTroops.length > 2;
		if (message.deletable && match?.length) await message.delete().catch(() => null);
		return message.util!.send((invalid) ? 'This URL is invalid and may not work!' : '', { embed });
	}
}
