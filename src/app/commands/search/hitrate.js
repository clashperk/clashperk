const { Command, Flag } = require('discord-akairo');
const Resolver = require('../../struct/Resolver');
const { hitrate } = require('../../core/WarHitarte');
const { townHallEmoji } = require('../../util/emojis');

class HitrateCommand extends Command {
	constructor() {
		super('hitrate', {
			aliases: ['hitrate'],
			category: 'hidden',
			description: {
				content: 'Shows hitrate!'
			}
		});
	}

	*args() {
		const data = yield {
			type: async (message, args) => {
				const resolved = await Resolver.resolve(message, args);
				if (resolved.status !== 200) {
					await message.channel.send({ embed: resolved.embed });
					return Flag.cancel();
				}
				return resolved;
			}
		};

		return { data };
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { data }) {
		const body = await this.client.coc.currentWar(data.tag).catch(() => null);
		if (!body) return;
		if (!body.ok) return;
		const hit = hitrate(body.clan, body.opponent);
		const { clan, opponent } = hitrate(body.clan, body.opponent);
		const combinations = Object.assign(clan.hitrate, opponent.hitrate).map(({ th, vs }) => ({ th, vs }));

		const arrrr = [];
		for (const { th, vs } of combinations) {
			const clan = hit.clan.hitrate.find(o => o.th === th && o.vs === vs);
			const opponent = hit.opponent.hitrate.find(o => o.th === th && o.vs === vs);

			const d = {};
			if (clan) d.clan = clan;
			else d.clan = { th, vs, attacks: 0, star: 0, hitrate: '0' };

			if (opponent) d.opponent = opponent;
			else d.opponent = { th, vs, attacks: 0, star: 0, hitrate: '0' };

			arrrr.push(d);
		}
		return message.util.send([
			`**${body.clan.name} vs ${body.opponent.name} Hitrates**`,
			`${arrrr.map(d => `\`\u200e${d.clan.hitrate.padStart(3, ' ')}% ${`${d.clan.star}/${d.clan.attacks}`.padStart(5, ' ')} \u200f\`\u200e ${townHallEmoji[d.clan.th]} vs ${townHallEmoji[d.clan.vs]} \`\u200e ${`${d.opponent.star}/${d.opponent.attacks}`.padStart(5, ' ')} ${d.opponent.hitrate.padStart(3, ' ')}% \u200f\``).join('\n')}`
		]);
	}
}

module.exports = HitrateCommand;
