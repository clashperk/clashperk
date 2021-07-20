import { Message, MessageButton, MessageActionRow } from 'discord.js';
import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';
import { Clan } from 'clashofclans.js';

export default class BoostsCommand extends Command {
	public constructor() {
		super('boosts', {
			aliases: ['boosts', 'boost', 'boosters'],
			category: 'search',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Clan members with active super troops.',
				usage: '<#clanTag>',
				examples: ['#8QU8J9LP']
			},
			optionFlags: ['--tag']
		});
	}

	public *args(msg: Message): unknown {
		const data = yield {
			flag: '--tag',
			match: msg.interaction ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolveClan(msg, tag)
		};

		return { data };
	}

	public async exec(message: Message, { data }: { data: Clan }) {
		if (data.members < 1) return message.util!.send(`\u200e**${data.name}** does not have any clan members...`);
		await message.util!.send(`**Fetching data... ${EMOJIS.LOADING}**`);

		const res = await this.client.automaton.getBoosterEmbed(message, data);
		if (!res.embeds.length) return message.util!.send('**No members found with active super troops!');

		const button = new MessageButton()
			.setLabel('Refresh')
			.setStyle('SECONDARY')
			.setCustomId(`BOOSTER${data.tag}_ASC`);

		return message.util!.send({ embeds: res.embeds, components: [new MessageActionRow({ components: [button] })] });
	}
}
