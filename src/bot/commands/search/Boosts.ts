import { Message, MessageButton, MessageActionRow, MessageSelectMenu } from 'discord.js';
import { EMOJIS, SUPER_TROOPS } from '../../util/Emojis';
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
		if (!res.embeds.length) return message.util!.send('**No members found with active super troops!**');

		const buttons = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setEmoji(EMOJIS.REFRESH)
					.setStyle('SECONDARY')
					.setCustomId(JSON.stringify({ tag: data.tag, cmd: 'booster', sort: 1, menu: false }))
			)
			.addComponents(
				new MessageButton()
					.setLabel('Recently Active')
					.setStyle('SECONDARY')
					.setCustomId(JSON.stringify({ tag: data.tag, cmd: 'booster', sort: -1, menu: false }))
			);

		const menus = new MessageActionRow()
			.addComponents(
				new MessageSelectMenu()
					.setPlaceholder('Select a super troop!')
					.setCustomId(JSON.stringify({ tag: data.tag, cmd: 'booster', sort: 1, menu: true }))
					.addOptions(Object.entries(SUPER_TROOPS).map(([key, value]) => ({ label: key, value: key, emoji: value })))
			);

		return message.util!.send({ embeds: res.embeds, components: [buttons, menus] });
	}
}
