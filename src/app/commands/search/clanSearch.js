const { Command, Argument } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const qs = require('querystring');
const { emoji } = require('../../util/emojis');
const { status } = require('../../util/constants');

class ClanSearchCommand extends Command {
	constructor() {
		super('clan-search', {
			aliases: ['clan-search', 'cs'],
			category: 'search',
			description: {
				content: 'Search in-game clans by name.',
				usage: '<clanName>',
				examples: ['air hounds']
			},
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			args: [
				{
					id: 'name',
					match: 'content',
					type: Argument.validate('string', (msg, name) => name.length >= 3),
					prompt: {
						start: 'What would you like to search for?',
						retry: 'Clan name has to be at least 3 characters long.'
					}
				}
			]
		});
	}

	cooldown(message) {
		if (this.client.patron.isPatron(message.author, message.guild) || this.client.voteHandler.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { name }) {
		const data = await this.client.coc.clans(name, { limit: 12 })
			.catch(error => ({ ok: false, status: error.code }));
		console.log(data);

		if (!data.ok) return message.util.reply(status(data.status));

		const embed = new MessageEmbed()
			.setColor(0x5970c1)
			.setAuthor(`Showing Top ${data.items.length} Results`)
			.setTitle(`Searching clans with name ${name}`);

		for (const clan of data.items) {
			let clan_type = '';
			if (clan.type === 'inviteOnly') {
				clan_type = 'Invite Only';
			} else if (clan.type === 'closed') {
				clan_type = 'Closed';
			} else if (clan.type === 'open') {
				clan_type = 'Open';
			}

			embed.addField(`${clan.name} (${clan.tag})`, [
				`Level: ${clan.clanLevel}`,
				`Members: ${clan.members}`,
				`Points: ${clan.clanPoints}`,
				`Status: ${clan_type} ${emoji.trophy} ${clan.requiredTrophies}`,
				`${clan.location ? `Location: ${clan.location.name}` : ''}`
			], true);
		}

		return message.util.send({ embed });
	}
}

module.exports = ClanSearchCommand;
