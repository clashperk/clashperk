const { Command } = require('discord-akairo');
const { mongodb } = require('../../struct/Database');
require('moment-duration-format');
const Chart = require('../../core/Chart');

class ActivityCommand extends Command {
	constructor() {
		super('activities', {
			aliases: ['activities', 'avs'],
			category: 'hidden',
			channel: 'guild',
			clientPermissions: ['ADD_REACTIONS', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Shows a graph of active members over time for clans.',
				usage: '<clanTags>',
				examples: ['#8QU8J9LP #YVVCC92G']
			},
			args: [
				{
					id: 'tags',
					type: (msg, args) => args ? args.split(/ +/g) : null,
					match: 'content'
				}
			]
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 3000;
		return 5000;
	}

	async exec(message, { tags }) {
		if (!tags.length) return;
		tags.splice(3);
		const db = mongodb.db('clashperk').collection('clanactivities');
		const clans = await Promise.all([
			...tags.map(tag => db.findOne({ tag }))
		]).then(clans => clans.filter(clan => clan !== null));

		if (!clans.length) {
			return message.util.send({
				embed: { description: 'Setup a clan last-online board to use this command.' }
			});
		}

		const chart = new Chart(this.client);
		const buffer = await chart.chart(clans, this.client.embed(message));
		return message.util.send('__**Number of Active or Online Members Over Time**__', { files: [{ attachment: Buffer.from(buffer), name: 'activity.png' }] });
	}
}

module.exports = ActivityCommand;
