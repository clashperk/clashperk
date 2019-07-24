const { Command } = require('discord-akairo');
const moment = require('moment');
const Events = require('../../models/Events');
const TimeZone = require('../../models/TimeZone');

class EventCommand extends Command {
	constructor() {
		super('sync', {
			aliases: ['event', 'sync'],
			category: 'owner',
			clientPermissions: ['EMBED_LINKS', 'MANAGE_MESSAGES'],
			description: {
				content: 'Shows you the current event according to your TimeZone.',
				examples: ['']
			}
		});
	}

	async exec(message) {
		const user = await TimeZone.findOne({ where: { guild: message.guild.id, user: message.author.id } });
		if (!user) {
			return message.util.send(`**Please set your TimeZone! For more info, type \`${this.handler.prefix(message)}help set-tz\`**`);
		}

		const event = await Events.findOne({ where: { guild: message.guild.id } });
		if (!event) return message.util.send('**No Event Set!**');
		const utcTime = moment.utc(event.time);
		const date = utcTime.tz(user.timezone).format('D MMMM YYYY, hh:mm A z');

		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor('Event')
			.addField(`${user.timezone.replace(/\//g, ', ').replace(/_/g, ' ')} Time`, date)
			.addField('UTC Time', moment.utc(utcTime.tz(user.timezone).format()).format('D MMMM YYYY, hh:mm A z'));
		if (event.name) embed.setDescription(event.name);
		return message.util.send({ embed });
	}
}

module.exports = EventCommand;
