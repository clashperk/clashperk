const { Command } = require('discord-akairo');
const { firestore } = require('../../struct/Database');

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

	cooldown(message) {
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { confirm }) {
		if (!confirm) {
			return message.util.reply('command has been cancelled.');
		}
		const clans = await this.delete(message);

		if (!clans) return message.util.reply(`no clans found! ${this.client.emojis.get('545968755423838209')}`);

		return message.util.send({
			embed: {
				title: `Successfully deleted ${clans} clans ${this.client.emojis.get('545874377523068930')}`,
				color: 5861569
			}
		});
	}

	async delete(message) {
		const batch = firestore.batch();
		const clans = await firestore.collection('tracking_clans')
			.where('guild', '==', message.guild.id)
			.get()
			.then(snapshot => {
				snapshot.forEach(doc => {
					this.client.tracker.delete(message.guild.id, doc.data().tag);
					batch.delete(doc.ref);
				});
				return batch.commit() && snapshot.size;
			});
		return clans;
	}
}

module.exports = StopAllCommand;
