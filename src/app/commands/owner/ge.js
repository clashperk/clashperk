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
						arr.push({ guild: guild.id, size });
					}
				});
		}
		return message.channel.send(`nigga`, { files: [{ attachment: Buffer.from(JSON.stringify(arr), 'utf8'), name: `servers.txt` }] });
	}
}

module.exports = GitPullCommand;
