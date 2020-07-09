const { Command, Flag } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');

class PingCommand extends Command {
	constructor() {
		super('pin_g', {
			aliases: ['pin_g', 'pog'],
			category: 'hidden',
			ownerOnly: true,
			description: {
				content: 'Pings me!'
			}
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message) {
		await mongodb.db('clashperk').collection('donationlogs')
			.updateMany({}, {
				$set: {
					active: true,
					patron: false
				}
			})
			.then(console.log());

		await mongodb.db('clashperk').collection('donationlogs')
			.updateMany({ frozen: true }, {
				$set: {
					active: false,
					patron: false
				},
				$unset: { frozen: '' }
			})
			.then(console.log());

		for (const guild of this.client.guilds.cache.values()) {
			if (!this.client.patron.get(guild.id, 'guild', false)) continue;

			await mongodb.db('clashperk').collection('donationlogs')
				.updateMany({ guild: guild.id }, {
					$set: {
						active: true,
						patron: true
					}
				})
				.then(console.log());
		}
	}
}

module.exports = PingCommand;
