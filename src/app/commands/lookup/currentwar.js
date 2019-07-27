const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment');
require('moment-duration-format');

class CurrentWarCommand extends Command {
	constructor() {
		super('current-war', {
			aliases: ['current-war', 'war'],
			category: 'beta',
			clientPermissions: ['USE_EXTERNAL_EMOJIS', 'EMBED_LINKS'],
			description: {
				content: 'Shows info about currentwar.',
				usage: '<tag>',
				examples: ['#8QU8J9LP', '8QU8J9LP']
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
			.setThumbnail(data.badgeUrls.medium);

		if (data.isWarLogPublic === false) {
			embed.setDescription('War log is Private');
			return message.util.send({ embed });
		}

		const body = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(data.tag)}/currentwar`,
			{
				method: 'GET', headers: {
					Accept: 'application/json', authorization: `Bearer ${process.env.CLASH_API}`
				}
			}).then(res => res.json());

		if (body.state === 'notInWar') {
			embed.setDescription('Not In War');
		} else if (body.state === 'preparation') {
			embed.addField(`Preparation day against **${body.opponent.name} ${body.opponent.tag}**`, body.opponent.description)
				.addField('War State', 'Preparation Day')
				.addField('War Size', `${body.teamSize} vs ${body.teamSize}`)
				.addField('Start Time', moment.duration(new Date(body.startTime) - Date.now()).format('D [days], H [hours] m [minutes]', { trim: 'both mid' }));
		} else if (body.state === 'inWar') {
			embed.addField(`Battle day against **${body.opponent.name} ${body.opponent.tag}**`, body.opponent.description)
				.addField('War State', 'Battle Day')
				.addField('War Size', `${body.teamSize} vs ${body.teamSize}`)
				.addField('War Stats', [
					`\\⭐ ${body.clan.stars} / ${body.opponent.stars} \\🔥 ${body.clan.destructionPercentage}% / ${body.opponent.destructionPercentage}% \\⚔ ${body.clan.attacks} / ${body.opponent.attacks}`
				])
				.addField('End Time', moment.duration(new Date(body.endTime) - Date.now()).format('D [days], H [hours] m [minutes]', { trim: 'both mid' }));
		} else if (body.state === 'warEnded') {
			embed.addField(`War ended against **${body.opponent.name} ${body.opponent.tag}**`, body.opponent.description)
				.addField('War State', 'War Ended')
				.addField('War Size', `${body.teamSize} vs ${body.teamSize}`)
				.addField('War Stats', [
					`\\⭐ ${body.clan.stars} / ${body.opponent.stars} \\🔥 ${body.clan.destructionPercentage}% / ${body.opponent.destructionPercentage}% \\⚔ ${body.clan.attacks} / ${body.opponent.attacks}`
				])
				.addField('Ended', moment.duration(Date.now() - new Date(body.endTime)).format('D [days], H [hours] m [minutes]', { trim: 'both mid' }));
		}
		return message.util.send({ embed });
	}
}

module.exports = CurrentWarCommand;
