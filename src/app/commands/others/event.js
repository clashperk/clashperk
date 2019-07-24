const { Command } = require('discord-akairo');
const moment = require('moment');
const Events = require('../../models/Events');
const TimeZone = require('../../models/TimeZone');

class EventCommand extends Command {
	constructor() {
		super('sync', {
			aliases: ['event', 'sync'],
			category: 'owner',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Shows you the current event according to your TimeZone.',
				examples: ['']
			}
		});
	}

	userPermissions(message) {
		if (message.guild.id === '600794042472595516') {
			if (!message.member.roles.has('600804761045958666') || !message.member.permissions.has('MANAGE_GUILD')) return 'MANAGE GUILD';
			return null;
		}
		return null;
	}

	async exec(message) {
		const user = await TimeZone.findOne({ where: { guild: message.guild.id, user: message.author.id } });
		if (!user) {
			return message.util.send(`**Please set your TimeZone! For more info, type \`${this.handler.prefix(message)}help set-tz\`**`);
		}

		const event = await Events.findOne({ where: { guild: message.guild.id } });
		if (!event) return message.util.send('**No Event Set!**');
		const utcTime = moment.utc(event.time);
		const date = utcTime.tz(event.timezone).format('D MMMM YYYY, hh:mm A z');

		const embed = this.client.util.embed()
			.setAuthor('Event')
			.addField(`${event.timezone.replace(/\//g, ', ').replace(/_/g, ' ')} Time`, date)
			.addField('UTC Time', utcTime.format('D MMMM YYYY, hh:mm A z'))
			.setTimestamp();
		if (event.name) embed.setDescription(event.name);
		return message.util.send({ embed });
	}
}

module.exports = EventCommand;
