const { Command } = require('discord-akairo');
const { stripIndents } = require('common-tags');

class GuideCommand extends Command {
	constructor() {
		super('guide', {
			aliases: ['guide'],
			category: 'util',
			cooldown: 3000,
			clientPermissions: ['EMBED_LINKS'],
			description: { content: 'Shows info about how to use bot.' }
		});
	}

	async exec(message) {
		const prefix = this.handler.prefix(message);
		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor('Guide', this.client.user.displayAvatarURL(), 'https://clashperk.xyz')
			.setDescription([
				'\u200e**Required Permissions**',
				'• \`Read Messages\`',
				'• \`View Channels\`',
				'• \`Embed Links\`',
				'• \`Read Message History\`',
				'• \`User External Emojis\`',
				'• \`Add Reaction\`',
				'',
				'**Clan Management**',
				'• _**Clan Log**_',
				`\u2002\`${prefix}clanlog <clanTag>\``,
				`\u2002\`${prefix}clanlog <clanTag> [channel]\``,
				'• _**Donation Log**_',
				`\u2002\`${prefix}donationlog <clanTag>\``,
				`\u2002\`${prefix}donationlog <clanTag> [hexColor]\``,
				`\u2002\`${prefix}donationlog <clanTag> [channel]\``,
				'• _**Last Online Board**_',
				`\u2002\`${prefix}onlineboard <clanTag>\``,
				`\u2002\`${prefix}onlineboard <clanTag> [channel]\``,
				'• _**Clan Games Board**_',
				`\u2002\`${prefix}cgboard <clanTag>\``,
				`\u2002\`${prefix}cgboard <clanTag> [channel]\``,
				'',
				'**Stop Logs and Boards**',
				'• _**Clan Log**_',
				`\u2002\`${prefix}stop clanlog <clanTag>\``,
				'• _**Donationlog Log**_',
				`\u2002\`${prefix}stop donationlog <clanTag>\``,
				'• _**Last Online Board**_',
				`\u2002\`${prefix}stop lastonline <clanTag>\``,
				'• _**Clan Games Board**_',
				`\u2002\`${prefix}stop cgboard <clanTag>\``,
				'',
				'**Linked Clans**',
				`\`${prefix}clans\` This command shows all linked clans related to your discord server / guild.`,
				'',
				'**Remove Clan**',
				`\`${prefix}stop all <clanTag>\` This command deletes all logs, boards and all data for the specified clan. So be careful!`,
				'',
				'**Link Comamnd**',
				'• _**Link Clan**_',
				`\u2002\`${prefix}link clan <clanTag>\``,
				`\u2002\`${prefix}link clan <clanTag> [@user]\``,
				'• _**Link Player**_',
				`\u2002\`${prefix}link player <playerTag>\``,
				`\u2002\`${prefix}link player <playerTag> [@user]\``,
				'• _**Unlink Player**_',
				`\u2002\`${prefix}unlink <playerTag>\``,
				'• _**Unlink Clan**_',
				'You can link only one clan to your discord account, so link a new clan to delete your previous clan.',
				'',
				'**Required: `<>` | Optional: `[]`**'
			]);
		return message.util.send({ embed });
	}
}

module.exports = GuideCommand;
