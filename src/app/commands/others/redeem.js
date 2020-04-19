const { Command } = require('discord-akairo');
const fetch = require('node-fetch');

class RedeemCommand extends Command {
	constructor() {
		super('redeem', {
			aliases: ['redeem'],
			category: 'others',
			description: {
				content: 'Redeems your premium perks.'
			}
		});
	}

	async exec(message) {
		const res = await fetch('https://www.patreon.com/api/oauth2/api/campaigns/2589569/pledges?include=patron.null', {
			headers: {
				authorization: `Bearer ${process.env.PATREON_API}`
			}
		});

		const data = await res.json();

		const user = data.included.find(entry => entry.attributes &&
			entry.attributes.social_connections &&
			entry.attributes.social_connections.discord &&
			entry.attributes.social_connections.discord.user_id === message.author.id);

		if (!user) {
			const embed = this.client.util.embed()
				.setColor(16345172)
				.setAuthor('Oh my!')
				.setDescription([
					'I could not find any patreon account connected to your discord.'
				])
				.addField('How to connect?', [
					'https://www.patreon.com/settings/apps'
				])
				.setImage('https://i.imgur.com/APME0CX.png');

			return message.util.send({ embed });
		}

		if (user) {
			return message;
		}
	}
}

module.exports = RedeemCommand;
