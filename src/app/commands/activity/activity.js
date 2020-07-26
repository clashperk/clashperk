const { Command, Flag } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');
const Resolver = require('../../struct/Resolver');
require('moment-duration-format');
const Chart = require('../../core/Chart');

class ActivityCommand extends Command {
	constructor() {
		super('activity', {
			aliases: ['activity', 'av'],
			category: 'hidden',
			channel: 'guild',
			clientPermissions: ['ADD_REACTIONS', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Shows a graph of active members over time.',
				usage: '<clanTag>',
				examples: ['#8QU8J9LP']
			},
			flags: ['--dark']
		});
	}

	*args() {
		const tags = yield {
			type: async (message, args) => {
				const tags = args ? args.split(/ +/g) : [];
				if (args && tags.length > 1) return args.split(/ +/g);
				const resolved = await Resolver.resolve(message, args);
				if (resolved.status !== 200) {
					await message.channel.send({ embed: resolved.embed });
					return Flag.cancel();
				}
				return [resolved.tag];
			},
			match: 'content'
		};

		const dark = yield {
			match: 'flag',
			flag: ['--dark']
		};

		return { tags, dark };
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 3000;
		return 5000;
	}

	async exec(message, { tags, dark }) {
		if (!tags.length) return;
		tags.splice(3);
		const db = mongodb.db('clashperk').collection('clanactivities');
		const clans = await Promise.all([
			...tags.map(tag => db.findOne({ tag }))
		]).then(clans => clans.filter(clan => clan !== null));

		if (!clans.length) {
			return message.util.send({
				embed: { description: 'Setup a clan last online board to use this command.' }
			});
		}

		const buffer = await Chart.chart(clans, dark);
		return message.util.send('**Active Members Over Time**', { files: [{ attachment: Buffer.from(buffer), name: 'activity.png' }] });
	}
}

module.exports = ActivityCommand;
