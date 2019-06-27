const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const qs = require('querystring');

const STATUS = {
	400: 'client provided incorrect parameters for the request.',
	403: 'access denied, either because of missing/incorrect credentials or used API token does not grant access to the requested resource.',
	404: 'invalid name, resource was not found.',
	429: 'request was throttled, because amount of requests was above the threshold defined for the used API token.',
	500: 'unknown error happened when handling the request.',
	503: 'service is temprorarily unavailable because of maintenance.'
};

class ClanSearchCommand extends Command {
	constructor() {
		super('clan-search', {
			aliases: ['clan-search'],
			category: 'lookup',
			description: {
				content: 'Clash of Clans clan search lookup command.',
				usage: '<tag>',
				examples: ['#2Q98URCGY', '2Q98URCGY']
			},
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			args: [
				{
					id: 'name',
					match: 'content',
					prompt: {
						start: 'what would you like to search for?',
						retry: 'please provide a name to search clans!'
					}
				}
			]
		});
	}

	async exec(message, { name }) {
		const query = qs.stringify({ name, limit: 10 });
		const uri = `https://api.clashofclans.com/v1/clans?${query}`;
		const res = await fetch(uri, { method: 'GET', headers: { Accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}` } });
		const data = await res.json();

		if (!res.ok) return message.util.reply(STATUS[res.status]);

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
				`Status: ${clan_type} \\🏆 ${clan.requiredTrophies}`,
				`${clan.location ? `Location: ${clan.location.name}` : ''}`
			], true);
		}

		return message.util.send({ embed });
	}
}

module.exports = ClanSearchCommand;
