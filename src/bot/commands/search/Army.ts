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
			regex: /https?:\/\/link.clashofclans.com\/en\?action=CopyArmy&army=([u|s]([0-9]{1,2}x[0-9]{1,2}-?)+)+/gi
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

		const troopCombs = combination.match(/u([0-9]{1,2}x[0-9]{1,2}-?)*/gi)?.[0]?.substr(1)?.split(/-/) ?? [];
		const spellCombs = combination.match(/s([0-9]{1,2}x[0-9]{1,2}-?)*/gi)?.[0]?.substr(1)?.split(/-/) ?? [];

		const SPELLS: { [key: string]: string } = {
			...DARK_SPELLS,
			...ELIXIR_SPELLS
		};
		const TROOPS: { [key: string]: string } = {
			...ELIXIR_TROOPS,
			...SUPER_TROOPS,
			...DARK_ELIXIR_TROOPS,
			...SUPER_TROOPS,
			...SEIGE_MACHINES
		};

		const troops = troopCombs.map(comb => comb.split(/x/))
			.map(parts => ({
				id: Number(parts[1]),
				total: Number(parts[0]),
				name: RAW_TROOPS.TROOPS.find(
					en => en.category === 'troop' && en.id === Number(parts[1])
				)?.name ?? RAW_TROOPS.SUPER_TROOPS.find(en => en.id === Number(parts[1]))?.name
			}))
			.filter(en => en.name)
			.map(en => `${TROOPS[en.name!]} \`x${en.total}\``);

		const spells = spellCombs.map(comb => comb.split(/x/))
			.map(parts => ({
				id: Number(parts[1]),
				total: Number(parts[0]),
				name: RAW_TROOPS.TROOPS.find(
					en => en.category === 'spell' && en.id === Number(parts[1])
				)?.name
			}))
			.filter(en => en.name)
			.map(en => `${SPELLS[en.name!]} \`x${en.total}\``);

		if (!spells.length && !troops.length) {
			if (match?.length) return;
			return message.util!.send('**Invalid Army Composition Link!**');
		}

		const embed = this.client.util.embed()
			.setFooter(message.author.tag, message.author.displayAvatarURL({ dynamic: true }))
			.setColor(this.client.embed(message))
			.setTitle('Army Composition')
			.setURL(url.href);
		if (troops.length) {
			embed.addField('Troops', this.chunk(troops).map(chunk => chunk.join(' ')).join('\n'));
		}

		if (spells.length) {
			embed.addField('Spells', this.chunk(spells).map(chunk => chunk.join(' ')).join('\n'));
		}

		if (message.deletable && match?.length) await message.delete();
		return message.util!.send({ embed });
	}

	private chunk<T>(items: T[], chunk = 4) {
		const array = [];
		for (let i = 0; i < items.length; i += chunk) {
			array.push(items.slice(i, i + chunk));
		}
		return array;
	}
}
