const { Command } = require('discord-akairo');

class Export extends Command {
	constructor() {
		super('export', {
			aliases: ['export'],
			category: 'activity',
			clientPermissions: ['ATTACH_FILES', 'EMBED_LINKS'],
			description: {
				content: 'Export wars/war attacks/season stats to excel for all clans.',
				usage: '<days|missed|season>',
				examples: ['20', 'missed', 'season']
			}
		});
	}

	*args() {
		const limit = yield {
			type: (msg, num) => {
				if (!num) return null;
				if (num.toLowerCase() === 'missed') return 'missed';
				if (num.toLowerCase() === 'season') return 'season';
				return (Number(num) || 30) >= 30 ? 30 : Number(num);
			},
			default: 30
		};

		const next = yield {
			type: 'string',
			match: 'rest',
			default: ''
		};

		return { limit, next };
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { limit, next }) {
		if (limit === 'missed') {
			const command = this.handler.modules.get('export-missed-attacks');
			return this.client.commandHandler.handleDirectCommand(
				message,
				next,
				command,
				false
			);
		}

		if (limit === 'season') {
			const command = this.handler.modules.get('export-season');
			return this.client.commandHandler.handleDirectCommand(
				message,
				next,
				command,
				false
			);
		}

		const command = this.handler.modules.get('export-wars');
		return this.client.commandHandler.handleDirectCommand(
			message,
			next,
			command,
			false
		);
	}
}

module.exports = Export;
