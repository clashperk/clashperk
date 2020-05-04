const { Command } = require('discord-akairo');
const { firestore } = require('../../struct/Database');

class StopAllCommand extends Command {
	constructor() {
		super('stop-all', {
			aliases: ['stop-all'],
			category: 'activity',
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

	cooldown(message) {
		if (this.client.patron.get(message.guild.id, 'guild', false) || this.client.patron.get(message.author.id, 'user', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { confirm }) {
		if (!confirm) {
			return message.util.reply('command has been cancelled.');
		}
		const clans = await this.delete(message);

		return message.util.send({
			embed: {
				title: `Successfully deleted ${clans} clan${clans === 1 ? '' : 's'}`,
				color: 5861569
			}
		});
	}

	async delete(message) {
		const clans = await firestore.collection('tracking_clans')
			.where('guild', '==', message.guild.id)
			.get()
			.then(snapshot => {
				snapshot.forEach(async doc => {
					const data = await doc.data();
					this.client.tracker.delete(message.guild.id, data.tag);
					doc.ref.delete();
				});
				return snapshot.size;
			});
		return clans;
	}
}

// module.exports = StopAllCommand;
