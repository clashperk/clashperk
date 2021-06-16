import RAW_TROOPS from '../../util/TroopsInfo';
import { Command } from 'discord-akairo';
import { Message } from 'discord.js';
import { URL } from 'url';
import { DARK_ELIXIR_TROOPS, DARK_SPELLS, ELIXIR_SPELLS, ELIXIR_TROOPS, SEIGE_MACHINES, SUPER_TROOPS } from '../../util/Emojis';

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
			regex: /^https?:\/\/link.clashofclans.com\/en\?action=CopyArmy&army=([u|s]([0-9]{1,2}x[0-9]{1,2}-?)+)+/gi
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
		const combination = url.searchParams.get('army');
		if (!combination) return;

		const TROOP_COMPOS = combination.match(/u([0-9]{1,2}x[0-9]{1,2}-?)*/gi)?.[0]?.substr(1)?.split(/-/) ?? [];
		const SPELL_COMPOS = combination.match(/s([0-9]{1,2}x[0-9]{1,2}-?)*/gi)?.[0]?.substr(1)?.split(/-/) ?? [];

		const TROOP_IDS = TROOP_COMPOS.map(parts => parts.split(/x/))
			.map(parts => ({ id: Number(parts[1]), total: Number(parts[0]) }));

		const SPELL_IDS = SPELL_COMPOS.map(parts => parts.split(/x/))
			.map(parts => ({ id: Number(parts[1]), total: Number(parts[0]) }));

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
				hallLevel: unit.unlock.hall
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
				hallLevel: unit.unlock.hall
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
				) + 1
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
				hallLevel: unit.unlock.hall
			};
		});

		if (!spells.length && !troops.length && !superTroops.length && !seigeMachines.length) {
			if (match?.length) return;
			return message.util!.send('**This army composition URL is invalid!**');
		}

		const townHallLevel = Math.max(
			...troops.map(en => en.hallLevel),
			...spells.map(en => en.hallLevel),
			...seigeMachines.map(en => en.hallLevel),
			...superTroops.map(en => en.hallLevel)
		);

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setDescription([
				`**TH ${townHallLevel}${townHallLevel === 14 ? '' : '+'} Army Composition**`,
				`[Click to Copy](${url.href})`
			].join('\n'));

		if (troops.length) {
			embed.addField(
				'Troops',
				troops.map(
					en => `\`\u200e${en.total.toString().padStart(3, ' ')}x\u200f\` ${TROOPS[en.name]}  ${en.name.padEnd(15, ' ')}`
				).join('\n')
			);
		}

		if (spells.length) {
			embed.addField(
				'Spells',
				spells.map(
					en => `\`\u200e${en.total.toString().padStart(3, ' ')}x\u200f\` ${SPELLS[en.name]}  ${en.name.padEnd(15, ' ')}`
				).join('\n')
			);
		}

		if (superTroops.length) {
			embed.addField(
				'Super Troops',
				superTroops.map(
					en => `\`\u200e${en.total.toString().padStart(3, ' ')}x\u200f\` ${SUPER_TROOPS[en.name]}  ${en.name.padEnd(15, ' ')}`
				).join('\n')
			);
		}

		if (seigeMachines.length) {
			embed.addField(
				'Seige Machines',
				seigeMachines.map(
					en => `\`\u200e${en.total.toString().padStart(3, ' ')}x\u200f\` ${SEIGE_MACHINES[en.name]}  ${en.name.padEnd(15, ' ')}\u200f`
				).join('\n')
			);
		}

		embed.setFooter(message.author.tag, message.author.displayAvatarURL({ dynamic: true }));
		const mismatch = (troops.length + spells.length + superTroops.length + seigeMachines.length) !== (TROOP_IDS.length + SPELL_IDS.length);

		if (message.deletable && match?.length) await message.delete().catch(() => null);
		return message.util!.send(`${(mismatch || duplicate) ? 'This URL is invalid and may not work!' : ''}`, { embed });
	}
}
