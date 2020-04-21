const { Command } = require('discord-akairo');


class GitPullCommand extends Command {
	constructor() {
		super('gi', {
			aliases: ['gi'],
			category: 'owner',
			ownerOnly: true,
			description: {
				content: 'You can\'t use this anyway, so why explain?'
			}
		});
	}

	async exec(message) {
		const { firestore } = require('../../struct/Database');
		const arr = [];
		for (const guild of this.client.guilds.cache.values()) {
			if (this.client.patron.get(guild.id, 'guild', false)) continue;
			await firestore.collection('tracking_clans')
				.where('guild', '==', guild.id)
				.get()
				.then(snap => snap.size)
				.then(size => {
					if (size && size > 2) {
						arr.push(guild.id);
					}
				});
		}
		return message.channel.send(arr, { code: true, split: true });
	}
}

module.exports = GitPullCommand;
