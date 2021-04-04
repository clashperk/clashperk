import { hitRate, HitRate } from '../../core/WarHitarte';
import { Command, Argument } from 'discord-akairo';
import { Clan, ClanWar } from 'clashofclans.js';
import { Message } from 'discord.js';
import { ORANGE_NUMBERS } from '../../util/NumEmojis';
import { EMOJIS } from '../../util/Emojis';

interface Data {
	clan: HitRate;
	opponent: HitRate;
}

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

		const hit = hitRate(body.clan, body.opponent, stars);
		const combinations = [...hit.clan.hitrate, ...hit.opponent.hitrate]
			.map(({ townHall, defTownHall }) => ({ townHall, defTownHall }))
			.reduce((a, b) => {
				if (a.findIndex(x => x.townHall === b.townHall && x.defTownHall === b.defTownHall) < 0) a.push(b);
				return a;
			}, [] as { townHall: number; defTownHall: number }[]);

		const arrrr = [];
		for (const { townHall, defTownHall } of combinations) {
			const clan = hit.clan.hitrate.find(o => o.townHall === townHall && o.defTownHall === defTownHall);
			const opponent = hit.opponent.hitrate.find(o => o.townHall === townHall && o.defTownHall === defTownHall);

			const d: Data = {
				clan: {
					townHall,
					defTownHall,
					stars: 0,
					attacks: 0,
					hitrate: '0'
				},
				opponent: {
					townHall,
					defTownHall,
					stars: 0,
					attacks: 0,
					hitrate: '0'
				}
			};

			if (clan) d.clan = clan;
			if (opponent) d.opponent = opponent;

			arrrr.push(d);
		}

		return message.util!.send([
			`**${body.clan.name} vs ${body.opponent.name}**`,
			`${arrrr.map(d => `\`\u200e${d.clan.hitrate.padStart(3, ' ')}% ${`${d.clan.stars}/${d.clan.attacks}`.padStart(5, ' ')} \u200f\`\u200e ${ORANGE_NUMBERS[d.clan.townHall]} ${EMOJIS.VS} ${ORANGE_NUMBERS[d.clan.defTownHall]} \`\u200e ${`${d.opponent.stars}/${d.opponent.attacks}`.padStart(5, ' ')} ${d.opponent.hitrate.padStart(3, ' ')}% \u200f\``).join('\n')}`
		]);
	}
}
