import { parseHits } from '../../core/WarHitarte';
import { Command, Argument } from 'discord-akairo';
import { Clan, ClanWar } from 'clashofclans.js';
import { Message } from 'discord.js';
import { ORANGE_NUMBERS } from '../../util/NumEmojis';
import { EMOJIS } from '../../util/Emojis';

export default class HitrateCommand extends Command {
	public constructor() {
		super('hitrate', {
			aliases: ['hitrate'],
			category: 'beta',
			description: {
				content: 'Shows hitrate!'
			},
			args: [
				{
					id: 'data',
					type: (msg, tag) => this.client.resolver.resolveClan(msg, tag)
				},
				{
					'id': 'stars',
					'type': Argument.range('integer', 1, 3, true),
					'default': 3
				}
			]
		});
	}

	public async exec(message: Message, { data, stars }: { data: Clan; stars: number }) {
		const body: ClanWar = await this.client.http.currentClanWar(data.tag);
		if (!body.ok) return;
		if (['inWar', 'warEnded'].includes(body.state)) {
			return message.util!.send({
				split: true, content: [
					`**${body.clan.name} vs ${body.opponent.name}**`,
					'',
					parseHits(body.clan, body.opponent, stars).map(d => {
						const vs = `${ORANGE_NUMBERS[d.clan.townHall]}${EMOJIS.VS}${ORANGE_NUMBERS[d.clan.defTownHall]}`;
						return `\`\u200e ${d.clan.rate.toFixed().padStart(3, ' ')}% ${`${d.clan.stars}/${d.clan.attacks}`.padStart(5, ' ')} \u200f\`\u200e ${vs} \`\u200e ${`${d.opponent.stars}/${d.opponent.attacks}`.padStart(5, ' ')} ${d.opponent.rate.toFixed().padStart(3, ' ')}% \u200f\``;
					}).join('\n')
				].join('\n')
			});
		}
	}
}
