const { Command } = require('discord-akairo');
const Google = require('../../struct/Google');
const moment = require('moment');
const { mongodb } = require('../../struct/Database');

class TimeOffsetCommand extends Command {
	constructor() {
		super('time-offset', {
			aliases: ['t'],
			category: 'hidden',
			clientPermissions: ['EMBED_LINKS'],
			channel: 'guild',
			description: {
				content: 'Links your timezone offset.',
				usage: '<location>',
				examples: ['Kolkata', 'New York']
			},
			args: [
				{
					id: 'query',
					type: 'string',
					match: 'content',
					prompt: {
						start: 'What would you like to search for?'
					}
				}
			]
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { query }) {
		const raw = await Google.timezone(query);
		if (!raw) return message.util.send('Location not found, make your search more specific and try again.');
		await mongodb.db('clashperk')
			.collection('timezoneoffset')
			.updateOne({ user: message.author.id }, {
				$set: {
					user: message.author.id,
					timezone: {
						id: raw.timezone.timeZoneId,
						offset: raw.timezone.rawOffset,
						name: raw.timezone.timeZoneName,
						location: raw.location.results[0].formatted_address
					}
				}
			}, { upsert: true });
		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setTitle(`${raw.location.results[0].formatted_address}`)
			.setDescription([
				`**${raw.timezone.timeZoneName}**`,
				moment(new Date(Date.now() + (raw.timezone.rawOffset * 1000))).format('MM/DD/YYYY hh:mm A'),
				'',
				'**Offset**',
				`${raw.timezone.rawOffset < 0 ? '-' : '+'}${this.timeString(raw.timezone.rawOffset * 1000)}`
			])
			.setFooter(`${message.author.tag}`, message.author.displayAvatarURL());
		return message.util.send(`Time zone set to **${raw.timezone.timeZoneName}**`, { embed });
	}

	timeString(seconds, ms = true) {
		seconds = Math.abs(seconds);
		if (ms) seconds /= 1000;
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor(seconds % 3600 / 60);
		return `${hours >= 1 ? `${hours}:` : ''}${hours >= 1 ? `0${minutes}`.slice(-2) : minutes}`;
	}
}

module.exports = TimeOffsetCommand;
