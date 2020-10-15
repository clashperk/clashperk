const { Command, Flag } = require('discord-akairo');
const { MessageEmbed, Util } = require('discord.js');
const moment = require('moment');
const { mongodb } = require('../../struct/Database');
const Resolver = require('../../struct/Resolver');
const { leagueId } = require('../../util/constants');
const { emoji, townHallEmoji, heroEmoji, leagueEmoji, starEmoji } = require('../../util/emojis');

const roles = {
	member: 'Member',
	admin: 'Elder',
	coLeader: 'Co-Leader',
	leader: 'Leader'
};

class PlayerCommand extends Command {
	constructor() {
		super('player2', {
			aliases: ['player2', 'p2'],
			category: 'search2',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Shows info about your in-game profile.',
				usage: '<playerTag>',
				examples: ['#9Q92C8R20']
			}
		});
	}

	*args() {
		const data = yield {
			type: async (message, args) => {
				const resolved = await Resolver.resolve(message, args, true);
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
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message, { data }) {
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setTitle(`${Util.escapeMarkdown(data.name)} (${data.tag})`)
			.setURL(`https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${encodeURIComponent(data.tag)}`)
			.setDescription([
				`${townHallEmoji[data.townHallLevel]} **${data.townHallLevel}** ${emoji.trophy} **${data.trophies}** ${emoji.warstar} **${data.warStars}**`,
				'',
				'**Season Stats**',
				`Donated\n${emoji.troopsdonation} ${data.donations}`,
				`Received\n${emoji.troopsdonation} ${data.donationsReceived}`,
				`Attacks Won\n${emoji.attacksword} ${data.attackWins}`,
				`Defense Won\n${emoji.shield} ${data.defenseWins}`,
				'',
				'**Other Stats**',
				`${emoji.trophy} Best Trophies: ${data.bestTrophies}`,
				`${emoji.clock_small} Last Seen: ${2} days ago`,
				'',
				'**Achievement Stats**',
				`${emoji.troopsdonation} Troops Donated: ${data.achievements.find(d => d.name === 'Friend in Need').value}`,
				`${emoji.spelldonation} Spells Donated: ${data.achievements.find(d => d.name === 'Sharing is caring').value}`,
				`<:cg:765244426444079115> Clan Games Points: ${data.achievements.find(d => d.name === 'Games Champion').value}`,
				'',
				`${emoji.warstar} CWL War Stars: ${data.achievements.find(d => d.name === 'War League Legend').value}`
			]);

		return message.util.send({ embed });
	}

	async flag(message, tag) {
		const data = await mongodb.db('clashperk')
			.collection('flaggedusers')
			.findOne({ guild: message.guild.id, tag });
		return data;
	}

	async offset(message) {
		const data = await mongodb.db('clashperk').collection('timezoneoffset').findOne({ user: message.author.id });
		const prefix = data?.timezone?.offset < 0 ? '-' : '+';
		const seconds = Math.abs(data?.timezone?.offset ?? 0);
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor(seconds % 3600 / 60);
		return `${prefix}${hours >= 1 ? `0${hours}`.slice(-2) : '00'}:${minutes >= 1 ? `0${minutes}`.slice(-2) : '00'}`;
	}
}

module.exports = PlayerCommand;
