const { Command } = require('discord-akairo');
const moment = require('moment');
const Events = require('../../models/Events');
const TimeZone = require('../../models/TimeZone');

class SetEventCommand extends Command {
	constructor() {
		super('set-event', {
			aliases: ['set-event'],
			category: 'owner',
			clientPermissions: ['EMBED_LINKS', 'MANAGE_MESSAGES'],
			description: {
				content: 'Sets events.',
				usage: '<time> <event mame>',
				examples: ['2019-07-24T00:39 Next Sync']
			},
			userPermissions: ['MANAGE_GUILD'],
			args: [
				{
					id: 'time',
					type: 'date',
					prompt: {
						start: 'what time would you like to set?',
						retry: 'please provide a valid date format.'
					}
				},
				{
					id: 'name',
					match: 'rest'
				}
			]
		});
	}

	async exec(message, { time, name }) {
		const user = await TimeZone.findOne({ where: { guild: message.guild.id, user: message.author.id } });
		if (!user) {
			return message.util.send(`**Please set your TimeZone! For more info, type \`${this.handler.prefix(message)}help set-tz\`**`);
		}

		const date = moment.tz(time, user.timezone).format('D MMMM YYYY, hh:mm A z');
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor(message.author.tag, message.author.displayAvatarURL())
			.addField('Event Time', date);
		if (name) embed.setDescription(name);

		const msg = await message.util.send({ embed });
		for (const emoji of ['✅', '❌']) {
			msg.react(emoji);
		}
		let react;
		try {
			react = await msg.awaitReactions(
				(reaction, user) => (reaction.emoji.name === '❌' || reaction.emoji.name === '✅') && user.id === message.author.id,
				{ max: 1, time: 30000, errors: ['time'] }
			);
		} catch (error) {
			msg.reactions.removeAll();
			return message;
		}

		if (react.first().emoji.name === '❌') {
			msg.reactions.removeAll();
			react.first().message.edit('Command has been cancelled');
			return message;
		}

		if (react.first().emoji.name === '✅') {
			const event = await Events.findOne({ where: { guild: message.guild.id } });
			if (event) {
				await event.update({ time: moment.utc(moment.tz(time, user.timezone).format()), name, user: message.author.id });
			} else {
				await Events.create({
					guild: message.guild.id,
					user: message.author.id,
					time: moment.utc(moment.tz(time, user.timezone).format()),
					name
				});
			}
			msg.reactions.removeAll();
			react.first().message.edit('**Successfully Scheduled**');
			return message;
		}
	}
}

module.exports = SetEventCommand;
