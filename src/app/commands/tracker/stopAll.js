const { Command } = require('discord-akairo');
const Clans = require('../../models/Clans');

class StopAllCommand extends Command {
	constructor() {
		super('stop-all', {
			aliases: ['stop-all'],
			category: 'tracker',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			description: {
				content: 'Stops tracking all clans on the server.'
			}
		});
	}

	*args() {
		const confirm = yield {
			match: 'none',
			type: (msg, phrase) => {
				if (!phrase) return null;
				if (/^y(?:e(?:a|s)?)?$/i.test(phrase)) return true;
				return false;
			},
			prompt: {
				start: 'Are you sure you want to stop all? (Y/N)',
				retry: ''
			}
		};
		return { confirm };
	}

	async exec(message, { confirm }) {
		if (!confirm) {
			return message.util.reply('command has been cancelled.');
		}
		const clans = await Clans.findAll({ where: { guild: message.guild.id } });

		if (!clans) return message.util.reply('no clans found!');

		for (const clan of clans) {
			this.client.tracker.delete(message.guild.id, clan.tag);
		}

		await Clans.destroy({ where: { guild: message.guild.id } });

		return message.util.send({
			embed: {
				title: 'Successfully deleted.',
				color: 5861569
			}
		});
	}
}

module.exports = StopAllCommand;
