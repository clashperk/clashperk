import { BLUE_NUMBERS, ORANGE_NUMBERS } from '../../util/NumEmojis';
import { MessageEmbed, Util, Message } from 'discord.js';
import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';
import { Clan } from 'clashofclans.js';

export default class LineupCommand extends Command {
	public constructor() {
		super('lineup', {
			aliases: ['lineup'],
			category: 'war',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'EMBED_LINKS'],
			description: {
				content: ['Shows current war lineup details.'],
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
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setAuthor(`${data.name} (${data.tag})`, data.badgeUrls.medium);

		if (!data.isWarLogPublic) {
			const res = await this.client.http.clanWarLeague(data.tag);
			if (res.ok) {
				return this.handler.handleDirectCommand(message, data.tag, this.handler.modules.get('cwl-lineup')!, false);
			}
			embed.setDescription('Private WarLog');
			return message.util!.send({ embeds: [embed] });
		}

		const body = await this.client.http.currentClanWar(data.tag);
		if (!body.ok) return message.util!.send('**504 Request Timeout!');
		if (body.state === 'notInWar') {
			const res = await this.client.http.clanWarLeague(data.tag);
			if (res.ok) {
				return this.handler.handleDirectCommand(message, data.tag, this.handler.modules.get('cwl-lineup')!, false);
			}
			embed.setDescription('Not in War');
			return message.util!.send({ embeds: [embed] });
		}

		const chunks = Util.splitMessage([
			`\u200e**${Util.escapeMarkdown(body.clan.name)} (${body.clan.tag})**`,
			`${EMOJIS.HASH}${EMOJIS.TOWNHALL} **NAME**`,
			body.clan.members.sort((a, b) => a.mapPosition - b.mapPosition).map(
				mem => `\u200e${BLUE_NUMBERS[mem.mapPosition]}${ORANGE_NUMBERS[mem.townhallLevel]} ${Util.escapeMarkdown(mem.name)}`
			).join('\n'),
			'',
			`\u200e**${Util.escapeMarkdown(body.opponent.name)} (${body.opponent.tag})**`,
			`${EMOJIS.HASH}${EMOJIS.TOWNHALL} **NAME**`,
			body.opponent.members.sort((a, b) => a.mapPosition - b.mapPosition).map(
				mem => `\u200e${BLUE_NUMBERS[mem.mapPosition]}${ORANGE_NUMBERS[mem.townhallLevel]} ${Util.escapeMarkdown(mem.name)}`
			).join('\n')
		].join('\n'));

		if (chunks.length === 1) return message.util!.send(chunks[0]);
		return chunks.slice(1).map(text => message.channel.send(text));
	}
}
