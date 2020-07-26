const { Command, Flag } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');
const Resolver = require('../../struct/Resolver');
require('moment-duration-format');
const Chart = require('../../core/Chart');

class ActivityCommand extends Command {
	constructor() {
		super('activity', {
			aliases: ['activity', 'av'],
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['ADD_REACTIONS', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Shows an approximate last-online time of clan members.',
				usage: '<clanTag>',
				examples: ['#8QU8J9LP']
			}
		});
	}

	*args() {
		const data = yield {
			type: async (message, args) => {
				const resolved = await Resolver.resolve(message, args);
				if (resolved.status !== 200) {
					await message.channel.send({ embed: resolved.embed });
					return Flag.cancel();
				}
				return resolved;
			}
		};

		return { data };
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 3000;
		return 5000;
	}

	async exec(message, { data }) {
		const db = await mongodb.db('clashperk')
			.collection('clanactivities')
			.find({ tag: data.tag })
			.toArray()
			.then(collection => {
				if (!collection.length) return null;
				const item = collection.find(d => d.guild === message.guild.id);
				if (item) return item;
				return collection[0];
			});
		if (!db) {
			return message.util.send({
				embed: { description: 'Setup a clan last-online board to use this command.' }
			});
		}

		const chart = new Chart(this.client);
		const buffer = await chart.chart(db, this.client.embed(message));
		return message.util.send('__**Number of Active or Online Members Over Time**__', { files: [{ attachment: Buffer.from(buffer), name: 'activity.png' }] });
	}
}

module.exports = ActivityCommand;
