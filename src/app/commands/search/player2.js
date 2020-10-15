const { Command, Flag } = require('discord-akairo');
const { MessageEmbed, Util } = require('discord.js');
const moment = require('moment');
const { mongodb } = require('../../struct/Database');
const Resolver = require('../../struct/Resolver');
const { leagueId } = require('../../util/constants');
const ms = require('ms');
const { emoji, townHallEmoji, heroEmoji, leagueEmoji } = require('../../util/emojis');

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
		const collection = await mongodb.db('clashperk')
			.collection('lastonlines')
			.aggregate([
				{
					'$match': {
						'tag': data.tag
					}
				},
				{
					'$project': {
						'tag': '$tag',
						'lastSeen': '$lastSeen'
					}
				}
			])
			.toArray();

		const lastSeen = collection[0]?.lastSeen
			? ms(new Date().getTime() - new Date(collection[0]?.lastSeen).getTime(), { long: true })
			: 'Unknown';
		const clan = data.clan
			? `**Clan Name**\n${emoji.clan} [${data.clan.name} (${data.clan.tag})](${this.clanURL(data.clan.tag)})\n**Clan Role**\n ${emoji.mem_blue} ${roles[data.role]}\n`
			: '';
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setTitle(`${Util.escapeMarkdown(data.name)} (${data.tag})`)
			.setURL(`https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${encodeURIComponent(data.tag)}`)
			.setDescription([
				`${townHallEmoji[data.townHallLevel]} **${data.townHallLevel}** ${emoji.xp} **${data.expLevel}** ${emoji.trophy} **${data.trophies}** ${emoji.warstar} **${data.warStars}**`
			]);
		embed.addField('**Season Stats**', [
			`**Donated**\n${emoji.troopsdonation} ${data.donations} ${emoji.donated}`,
			`**Received**\n${emoji.troopsdonation} ${data.donationsReceived} ${emoji.received}`,
			`**Attacks Won**\n${emoji.attacksword} ${data.attackWins}`,
			`**Defense Won**\n${emoji.shield} ${data.defenseWins}`,
			'\u200b\u2002'
		]);
		embed.addField('**Other Stats**', [
			`**Best Trophies**\n${leagueEmoji[leagueId(data.bestTrophies)]} ${data.bestTrophies}`,
			`${clan}**Last Seen**\n${emoji.clock_small} ${lastSeen} ago`,
			'\u200b\u2002'
		]);
		embed.addField('**Achievement Stats**', [
			`**Troops Donated**\n${emoji.troopsdonation} ${data.achievements.find(d => d.name === 'Friend in Need').value}`,
			`**Spells Donated**\n${emoji.spelldonation} ${data.achievements.find(d => d.name === 'Sharing is caring').value}`,
			`**Clan Games Points**\n${emoji.clangames || '<:cg:765244426444079115>'} ${data.achievements.find(d => d.name === 'Games Champion').value}`,
			`**CWL War Stars**\n${emoji.warstar} ${data.achievements.find(d => d.name === 'War League Legend').value}`,
			'\u200b\u2002'
		]);
		embed.addField('**Heroes**', [
			data.heroes.filter(hero => hero.village === 'home')
				.map(hero => `${heroEmoji[hero.name]} ${hero.level}`)
				.join(' ')
		]);

		const flag = await this.flag(message, data.tag);
		if (flag) {
			const user = await this.client.users.fetch(flag.user, false).catch(() => null);
			const offset = await this.offset(message);
			embed.addField('**Flag**', [
				`${flag.reason}`,
				`\`${user ? user.tag : 'Unknown#0000'} (${moment(flag.createdAt).utcOffset(offset).format('DD-MM-YYYY kk:mm')})\``
			]);
		}

		return message.util.send({ embed });
	}

	async flag(message, tag) {
		const data = await mongodb.db('clashperk')
			.collection('flaggedusers')
			.findOne({ guild: message.guild.id, tag });
		return data;
	}

	clanURL(tag) {
		return `https://link.clashofclans.com/?action=OpenClanProfile&tag=${encodeURIComponent(tag)}`;
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
