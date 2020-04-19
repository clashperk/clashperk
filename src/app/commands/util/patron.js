const { Command } = require('discord-akairo');
const { firestore } = require('../../struct/Database');
const { oneLine } = require('common-tags');

class PatronCommand extends Command {
	constructor() {
		super('patron', {
			aliases: ['patron', 'donate', 'patreon'],
			category: 'util',
			clientPermissions: ['EMBED_LINKS'],
			cooldown: 1000,
			description: {
				content: 'Get information about the ClashPerk\'s Patreon.'
			}
		});
	}

	async exec(message) {
		const patrons = await this.patrons();
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setTitle('ClashPerk Patron')
			.setURL('https://www.patreon.com/bePatron?u=14584309')
			.setDescription([
				oneLine`ClashPerk & it\'s donation tracking system requires a lot of processing power & monthly expenditure.
				Keeping ClashPerk alive is a draining project. So any and all help is beyond appreciated.`,
				'',
				'Subscribing to ClashPerk\'s Patreon will help to keep this service alive and enable future development.',
				'',
				oneLine`As a patron, you will get a few special rewards like ability to claim more than 2 clans per server,
				faster updates, no cooldown, a special hoisted role on support server and much more.`,
				'',
				'[Become a Patron](https://www.patreon.com/bePatron?u=14584309)'
				// '',
				// '**Our Current Patrons**',
				// patrons.map(id => `» ${this.client.users.cache.get(id).username}`).join('\n')
			]);

		return message.util.send({ embed });
	}

	async patrons(patrons = []) {
		await firestore.collection('patron_users')
			.get()
			.then(snapshot => {
				snapshot.forEach(snap => {
					patrons.push(snap.id);
				});
				if (!snapshot.size) patrons = null;
			});
		return patrons;
	}
}

module.exports = PatronCommand;
