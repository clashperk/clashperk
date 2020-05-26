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
				content: 'Get info about the our Patreon.'
			}
		});
	}

	async exec(message) {
		// const patrons = await this.patrons();
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setTitle('ClashPerk Patron')
			.setURL('https://www.patreon.com/clashperk')
			.setDescription([
				oneLine`ClashPerk\'s tracking system requires a lot of processing power & monthly expenditure.
				Keeping the bot alive is a draining project. So any and all help is beyond appreciated.`,
				'',
				oneLine`As a patron, you will get a few special rewards like ability to claim more than 2 clans per server,
				access to beta commands, faster updates, reduces cooldowns, a special hoisted role on support server and much more.`,
				'',
				'[Become a Patron](https://www.patreon.com/clashperk)'
				/* '',
				'**Our Current Patrons**',
				patrons.map(name => `» ${name}`).join('\n')*/
			]);

		return message.util.send({ embed });
	}

	async patrons(patrons = []) {
		await firestore.collection('patrons')
			.get()
			.then(snapshot => {
				snapshot.forEach(snap => {
					const data = snap.data();
					if (data.active) patrons.push(data.name);
				});
				if (!snapshot.size) patrons = null;
			});
		return patrons;
	}
}

module.exports = PatronCommand;
