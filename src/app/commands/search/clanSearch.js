const { Command, Argument } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const qs = require('querystring');
const { emoji } = require('../../util/emojis');
const { status } = require('../../util/constants');

class ClanSearchCommand extends Command {
	constructor() {
		super('clan-search', {
			aliases: ['search', 'clan-search', 'cs'],
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
		if (this.client.patron.isPatron(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { name }) {
		const data = await this.client.coc.clans(name, { limit: 10 })
			.catch(error => ({ ok: false, status: error.code }));

		if (!data.ok) return message.util.send(status(data.status));

		const embed = new MessageEmbed()
			.setColor(0x5970c1)
			.setAuthor(`Showing Top ${data.items.length} Results`)
			.setTitle(`Searching clans with name ${name}`)
			.setDescription([
				data.items.map(clan => {
					const clanType = clan.type.replace(/inviteOnly/g, 'Invite Only')
						.replace(/closed/g, 'Closed')
						.replace(/open/g, 'Open');
					return [
						`**[${clan.name} (${clan.tag})](https://www.clashofstats.com/clans/${clan.tag.substr(1)})**`,
						`${clan.clanLevel} level, ${clan.members} member${clan.members > 1 ? 's' : ''}, ${clan.clanPoints} points`,
						`${clanType}, ${clan.requiredTrophies} required${clan.location ? `, ${clan.location.name}` : ''}`
					].join('\n');
				}).join('\n\n')
			]);

		return message.util.send({ embed });
	}
}

module.exports = ClanSearchCommand;
