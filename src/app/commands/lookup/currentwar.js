const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment');
require('moment-duration-format');

class CurrentWarCommand extends Command {
	constructor() {
		super('current-war', {
			aliases: ['current-war'],
			category: 'lookup',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'EMBED_LINKS'],
			description: {
				content: 'Clash of Clans war log lookup command.',
				usage: '<tag>',
				examples: ['#2Q98URCGY', '2Q98URCGY']
			},
			args: [
				{
					id: 'data',
					type: 'clan',
					prompt: {
						start: 'what would you like to search for?',
						retry: (message, { failure }) => failure.value
					}
				}
			]
		});
	}

	async exec(message, { data }) {
		const embed = new MessageEmbed()
			.setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag}) ↗`, data.badgeUrls.medium, `https://link.clashofclans.com/?action=OpenClanProfile&tag=${data.tag}`)
			.setTitle(`${data.warWins} wins, ${data.isWarLogPublic ? `${data.warLosses} losses,` : ''} win streak ${data.warWinStreak}`)
			.setThumbnail(data.badgeUrls.medium);

		if (data.isWarLogPublic === false) {
			embed.setDescription('War log is Private');
			return message.util.send({ embed });
		}

		const uri = `https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}`;
		const body = await fetch(`${uri}/warlog?limit=10`,
			{
				method: 'GET', headers: {
					Accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}`
				}
			}).then(res => res.json());
	}
}

module.exports = CurrentWarCommand;
