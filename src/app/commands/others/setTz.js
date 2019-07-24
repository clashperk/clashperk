const { Command } = require('discord-akairo');
const moment = require('moment');
const TimeZone = require('../../models/TimeZone');

class SetTZCommand extends Command {
	constructor() {
		super('set-timezone', {
			aliases: ['set-tz', 'set-timezone'],
			category: 'owner',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Visit <https://momentjs.com/timezone/> and locate yourself then type `set-tz <timezone name>` (timezone name is case sensitive).',
				usage: '<timezone name>',
				image: 'https://i.imgur.com/00oAKjT.png',
				examples: ['America/New_York', 'Asia/Kolkata']
			},
			args: [
				{
					id: 'timezone',
					type: (msg, str) => {
						if (!str) return null;
						const timezones = moment.tz.names();
						const index = timezones.indexOf(str);
						if (index === -1) return null;
						return timezones[index];
					},
					prompt: {
						start: 'what is your timezone?',
						retry: msg => `invalid timezone provided! For more info, type \`${this.handler.prefix(msg)}help set-tz\``
					}
				}
			]
		});
	}

	async exec(message, { timezone }) {
		const user = await TimeZone.findOne({ where: { guild: message.guild.id, user: message.author.id } });

		const utcTime = moment.utc();
		const date = utcTime.tz(timezone).format('D MMMM YYYY, hh:mm A z');

		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor(message.author.tag, message.author.displayAvatarURL())
			.addField(timezone.replace(/\//g, ', ').replace(/_/g, ' '), [
				date,
				'',
				'Confirm Your TimeZone and Time'
			]);

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
			if (user) {
				await user.update({ timezone });
			} else {
				await TimeZone.create({
					user: message.author.id,
					guild: message.guild.id,
					timezone
				});
			}
			msg.reactions.removeAll();
			react.first().message.edit('**Successfully Saved**');
			return message;
		}
	}
}

module.exports = SetTZCommand;
