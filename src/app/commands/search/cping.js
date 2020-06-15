const { Command } = require('discord-akairo');

class ThCompoCommand extends Command {
	constructor() {
		super('cping', {
			aliases: ['cping'],
			category: 'hidden',
			description: {
				content: 'Pings Clash of Clans API',
				usage: '<clanTag>',
				examples: ['#2Q98URCGY', '2Q98URCGY']
			}
		});
	}

	async exec(message) {
		const hrStart = process.hrtime();
		try {
			await this.client.coc.locations({ limit: 1 });
		} catch (e) {
			console.log(e.toString());
			return message.util.send('**Clash API Ping Failed!**');
		}

		const diff = process.hrtime(hrStart);
		const sec = diff[0] > 0 ? `${diff[0].toFixed(2)} sec` : null;
		return message.util.send(`**Clash API Ping~ ${sec || `${(diff[1] / 1000000).toFixed(2)} ms`}**`);
	}
}

module.exports = ThCompoCommand;
