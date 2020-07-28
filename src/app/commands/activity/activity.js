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
			clientPermissions: ['EMBED_LINKS', 'ATTACH_FILES'],
			description: {
				content: [
					'Shows online members per hour graph for clans.',
					'',
					'Maximum 3 clan tags are accepted.',
					'',
					'Set your time zone using **offset** command for better experience.'
				],
				usage: '<clanTag>',
				examples: ['#8QU8J9LP', '#8QU8J9LP #8UUYQ92L']
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

		const raw = await mongodb.db('clashperk')
			.collection('timezoneoffset')
			.findOne({ user: message.author.id });
		const hrStart = process.hrtime();
		const buffer = await Chart.chart(clans, raw ? raw.timezone.offset : 0, dark);
		const diff = process.hrtime(hrStart);
		const sec = diff[0] > 0 ? `${diff[0].toFixed(2)} sec` : null;
		return message.util.send({
			files: [{ attachment: Buffer.from(buffer), name: 'activity.png' }],
			content: [
				raw
					? `**Rendered in ${sec || `${(diff[1] / 1000000).toFixed(2)} ms`}**`
					: `**Set your time zone using \`${this.handler.prefix(message)}offset <location>\` for better experience.**`
			].join('\n')
		});
	}
}

module.exports = ActivityCommand;
