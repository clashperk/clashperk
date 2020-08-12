const { Command } = require('discord-akairo');
const { firestore } = require('../../struct/Database');
const { oneLine } = require('common-tags');

class PatronCommand extends Command {
	constructor() {
		super('patron', {
			aliases: ['patron', 'donate', 'patreon'],
			category: 'util',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Get information about the bot\'s patreon.'
			}
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message) {
		const patrons = await this.patrons();
		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor('ClashPerk', this.client.user.displayAvatarURL(), 'https://www.patreon.com/clashperk')
			.setDescription([
				oneLine`Help us with our hosting related expenses. Any help is beyond appreciated.`,
				'',
				'**Benefits**',
				'• Faster updates and 1 sec cooldown',
				'• Claim more than 2 clans per server',
				'• Unlocks all patron only commands',
				'• Patron role on our support discord',
				'',
				'[Become a Patron](https://www.patreon.com/clashperk)',
				'',
				'**Our Current Patrons**',
				patrons.map(name => `• ${name}`).join('\n')
			]);

		return message.util.send({ embed });
	}

	async patrons(patrons = []) {
		await firestore.collection('patrons')
			.orderBy('createdAt', 'asc')
			.get()
			.then(snapshot => {
				snapshot.forEach(snap => {
					const data = snap.data();
					if (data.active) {
						if (data.discord_username) patrons.push(data.discord_username);
						else patrons.push(data.name);
					}
				});
				if (!snapshot.size) patrons = null;
			});
		return patrons;
	}
}

module.exports = PatronCommand;
