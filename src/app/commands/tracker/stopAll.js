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
				start: 'are you sure you want to stop all? (Y/N)',
				retry: ''
			}
		};
		return { confirm };
	}

	cooldown(message) {
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { confirm }) {
		if (!confirm) {
			return message.util.reply('command has been cancelled.');
		}
		const clans = await Clans.findAll({ where: { guild: message.guild.id } });

		if (!clans) return message.util.reply(`no clans found! ${this.client.emojis.get('545968755423838209')}`);

		for (const clan of clans) {
			this.client.tracker.delete(message.guild.id, clan.tag);
		}

		await Clans.destroy({ where: { guild: message.guild.id } });

		return message.util.send({
			embed: {
				title: `Successfully deleted ${clans.length} clans ${this.client.emojis.get('545874377523068930')}`,
				color: 5861569
			}
		});
	}
}

module.exports = StopAllCommand;
