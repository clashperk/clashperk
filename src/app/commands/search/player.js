const { Command, Flag } = require('discord-akairo');
const { MessageEmbed, Util } = require('discord.js');
const moment = require('moment');
const { mongodb } = require('../../struct/Database');
const Resolver = require('../../struct/Resolver');
const { leagueId } = require('../../util/constants');
const { emoji, townHallEmoji, heroEmoji, leagueEmoji, starEmoji } = require('../../util/emojis');

class PlayerCommand extends Command {
	constructor() {
		super('player', {
			aliases: ['player', 'p'],
			category: 'search',
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
			.setThumbnail(data.league ? data.league.iconUrls.small : `https://cdn.clashperk.com/assets/townhalls/${data.townHallLevel}.png`);

		embed.addField('Town Hall & XP', [
			`${townHallEmoji[data.townHallLevel]} ${data.townHallLevel}`,
			`${emoji.xp} ${data.expLevel}`
		], true);
		embed.addField('Current League', [
			`${emoji.trophy} ${data.trophies}`,
			`${leagueEmoji[data.league ? data.league.id : 29000000]} ${data.league ? data.league.name : 'Unranked'}`
		], true);

		embed.addField('Best Trophies', `${leagueEmoji[leagueId(data.bestTrophies)]} **${data.bestTrophies}**`, true);

		embed.addField('War Stars', `${emoji.warstar} ${data.warStars}`, true);
		embed.addField('Attacks/Defenses', `${emoji.attacksword} ${data.attackWins} ${emoji.shield} ${data.defenseWins}`, true);

		embed.addField('Donations/Receives', [
			`${emoji.troopsdonation} ${data.donations}${emoji.donated} ${data.donationsReceived}${emoji.received}`
		], true);

		data.achievements.forEach(achievement => {
			if (achievement.name === 'Friend in Need') {
				embed.addField('Friend in Need', `${starEmoji[achievement.stars]} ${achievement.value}`, true);
			}
			if (achievement.name === 'Games Champion') {
				embed.addField('Clan Games Points', `${starEmoji[achievement.stars]} ${achievement.value}`, true);
			}
			if (achievement.name === 'War League Legend') {
				embed.addField('CWL Stars', `${starEmoji[achievement.stars]} ${achievement.value}`, true);
			}
		});

		if (data.clan) {
			const role = data.role.replace(/admin/g, 'Elder')
				.replace(/coLeader/g, 'Co-Leader')
				.replace(/member/g, 'Member')
				.replace(/leader/g, 'Leader');
			embed.addField(`Clan ${role}`, `${emoji.clan} [${data.clan.name}](https://link.clashofclans.com/?action=OpenClanProfile&tag=${encodeURIComponent(data.clan.tag)})`);
		}

		let heroLevels = '';
		data.heroes.forEach(hero => {
			if (hero.village === 'home') {
				if (hero.level === hero.maxLevel) {
					heroLevels += `${heroEmoji[hero.name]} **${hero.level}**\u2002\u2002`;
				} else {
					heroLevels += `${heroEmoji[hero.name]} ${hero.level}\u2002\u2002`;
				}
			}
		});
		if (heroLevels) embed.addField('Heroes', heroLevels);


		const body = await this.note(message, data.tag);
		if (body) {
			const user = await this.client.users.fetch(body.user, false).catch(() => null);
			embed.addField('Flag', [
				body.reason,
				`\`${user ? user.tag : 'Unknown#0000'} (${moment(body.createdAt).format('DD-MM-YYYY hh:mm')})\``
			]);
		}

		return message.util.send({ embed });
	}

	async note(message, tag) {
		const data = await mongodb.db('clashperk')
			.collection('flaggedusers')
			.findOne({ guild: message.guild.id, tag });
		return data;
	}
}

module.exports = PlayerCommand;
