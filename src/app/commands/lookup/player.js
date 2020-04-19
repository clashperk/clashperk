const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const moment = require('moment');
const { firestore } = require('../../struct/Database');
const Fetch = require('../../struct/Fetch');
const { geterror, fetcherror } = require('../../util/constants');
const { leagueId } = require('../../util/constants');
const { emoji, townHallEmoji, heroEmoji, leagueEmoji, starEmoji } = require('../../util/emojis');

class PlayerCommand extends Command {
	constructor() {
		super('player', {
			aliases: ['player'],
			category: 'lookup',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Clash of clans player lookup commnad.',
				usage: '<#tag>',
				examples: ['#9Q92C8R20']
			}
		});
	}

	*args() {
		const data = yield {
			type: async (msg, str) => {
				const resolver = this.handler.resolver.type('guildMember')(msg, str || msg.member.id);
				if (!resolver && !str) return null;
				if (!resolver && str) {
					return Fetch.player(str).then(data => {
						if (data.status !== 200) return msg.util.send({ embed: fetcherror(data.status) }) && Flag.cancel();
						return data;
					});
				}
				const data = await firestore.collection('linked_accounts')
					.doc(resolver.id)
					.get()
					.then(snap => snap.data());
				if (!data) return msg.util.send({ embed: geterror(resolver, 'player') }) && Flag.cancel();
				if (!data.tags.length) return msg.util.send({ embed: geterror(resolver, 'player') }) && Flag.cancel();
				return Fetch.player(data.tags[0]).then(data => {
					if (data.status !== 200) return msg.util.send({ embed: fetcherror(data.status) }) && Flag.cancel();
					return data;
				});
			},
			prompt: {
				start: 'what would you like to search for?',
				retry: 'what would you like to search for?'
			}
		};
		return { data };
	}

	cooldown(message) {
		if (this.client.patron.get(message.guild.id, 'guild', false) || this.client.patron.get(message.author.id, 'user', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { data }) {
		if (data.status !== 200) return message.util.send({ embed: fetcherror(data.status) });

		const embed = new MessageEmbed()
			.setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag})`, data.league ? data.league.iconUrls.small : null)
			.setTitle('Open In-Game')
			.setURL(`https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${data.tag.replace(/#/g, '')}`)
			.setThumbnail(`https://coc.guide/static/imgs/other/town-hall-${data.townHallLevel}.png`);

		embed.addField('Town Hall', `${townHallEmoji[data.townHallLevel]} ${data.townHallLevel}`, true);
		embed.addField('Current League', [
			`${leagueEmoji[data.league ? data.league.id : 29000000]} ${data.league ? data.league.name : 'Unranked'} (${data.trophies})`
		], true);
		embed.addField('XP Level', `${emoji.xp} ${data.expLevel}`, true);

		embed.addField('Best Trophies', `${leagueEmoji[leagueId(data.bestTrophies)]} **${data.bestTrophies}**`, true);

		embed.addField('War Stars', `${emoji.warstar} ${data.warStars}`, true);
		embed.addField('Attacks/Defenses', `${emoji.attacksword} ${data.attackWins} ${emoji.shield} ${data.defenseWins}`, true);

		embed.addField('Donations/Receives', [
			`${data.donations} / ${data.donationsReceived}`
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
			embed.addField('Clan', [
				`${emoji.clan} ${role} of **${data.clan.name}** [${data.clan.tag}](https://link.clashofclans.com/?action=OpenClanProfile&tag=${data.clan.tag.replace(/#/g, '')})`
			]);
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
			const user = this.client.users.cache.get(body.user);
			embed.addField('Note', [
				body.note,
				'',
				`**${user ? user.tag : body.user}** created on **${moment(body.createdAt).format('MMMM D, YYYY, hh:mm')}**`
			]);
		}

		return message.util.send({ embed });
	}

	async note(message, tag) {
		const data = await firestore.collection('player_notes')
			.doc(`${message.guild.id}${tag}`)
			.get()
			.then(snap => snap.data());
		return data;
	}
}

module.exports = PlayerCommand;
