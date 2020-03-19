const { Command, Flag } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const moment = require('moment');
const { firestore } = require('../../struct/Database');
const Fetch = require('../../struct/Fetch');
const { geterror, fetcherror } = require('../../util/constants');
const { TownHallEmoji, HeroEmojis, leagueStrings, StarEmoji, leagueId } = require('../../util/constants');

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
				if (!data.tags.length) return msg.util.send({ embed: geterror(resolver, 'clan') }) && Flag.cancel();
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
		if (this.client.patron.users.get(message.author, 'patron', false) || this.client.voter.isVoter(message.author.id)) return 1000;
		return 3000;
	}

	async exec(message, { data }) {
		if (data.status !== 200) return message.util.send({ embed: fetcherror(data.status) });

		const embed = new MessageEmbed()
			.setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag})`, data.league ? data.league.iconUrls.small : null)
			.setTitle('Open In Game')
			.setURL(`https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${data.tag.replace(/#/g, '')}`)
			.setThumbnail(`https://coc.guide/static/imgs/other/town-hall-${data.townHallLevel}.png`);

		embed.addField('Town Hall', `${TownHallEmoji[data.townHallLevel]} ${data.townHallLevel}`, true);
		embed.addField('Current League', [
			`${leagueStrings[data.league ? data.league.id : 0]} ${data.league ? data.league.name : 'Unranked'} (${data.trophies})`
		], true);
		embed.addField('XP Level', `<:xp:534752059501838346> ${data.expLevel}`, true);

		embed.addField('Best Trophies', `${leagueStrings[leagueId(data.bestTrophies)]} **${data.bestTrophies}**`, true);

		embed.addField('War Stars', `<:warstars:534759020309774337> ${data.warStars}`, true);
		embed.addField('Attacks/Defenses', `<:attacks:534757491775504425> ${data.attackWins} <:defense:534757493029732363> ${data.defenseWins}`, true);

		embed.addField('Donations/Receives', [
			`<:donates:534758602691575838> ${data.donations} <:receives:534758309060804608> ${data.donationsReceived}`
		], true);

		data.achievements.forEach(achievement => {
			if (achievement.name === 'Friend in Need') {
				embed.addField('Friend in Need', `${StarEmoji[achievement.stars]} ${achievement.value}`, true);
			}
			if (achievement.name === 'Games Champion') {
				embed.addField('Clan Games Points', `${StarEmoji[achievement.stars]} ${achievement.value}`, true);
			}
			if (achievement.name === 'War League Legend') {
				embed.addField('CWL Stars', `${StarEmoji[achievement.stars]} ${achievement.value}`, true);
			}
		});

		if (data.clan) {
			const role = data.role.replace(/admin/g, 'Elder')
				.replace(/coLeader/g, 'Co-Leader')
				.replace(/member/g, 'Member')
				.replace(/leader/g, 'Leader');
			embed.addField('Clan', [
				`<:clans:534765878118449152> ${role} of **${data.clan.name}** [${data.clan.tag}](https://link.clashofclans.com/?action=OpenClanProfile&tag=${data.clan.tag.replace(/#/g, '')})`
			]);
		}

		let heroLevels = '';
		data.heroes.forEach(hero => {
			if (hero.village === 'home') {
				if (hero.level === hero.maxLevel) {
					heroLevels += `${HeroEmojis[hero.name]} **${hero.level}**\u2002\u2002`;
				} else {
					heroLevels += `${HeroEmojis[hero.name]} ${hero.level}\u2002\u2002`;
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
