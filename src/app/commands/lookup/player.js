const { Command } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const moment = require('moment');
const Notes = require('../../model/Notes');

const TownHallEmoji = {
	2: '<:townhall2:534745498561806357>',
	3: '<:townhall3:534745539510534144>',
	4: '<:townhall4:534745571798286346>',
	5: '<:townhall5:534745574251954176>',
	6: '<:townhall6:534745574738624524>',
	7: '<:townhall7:534745575732805670>',
	8: '<:townhall8:534745576802353152>',
	9: '<:townhall9:534745577033039882>',
	10: '<:townhall10:534745575757709332>',
	11: '<:townhall11:534745577599270923>',
	12: '<:townhall12:534745574981894154>'
};

const HeroEmojis = {
	'Barbarian King': '<:barbarianking:524939911581663242>',
	'Archer Queen': '<:archerqueen:524939902408720394>',
	'Grand Warden': '<:grandwarden:524939931303411722>',
	'Battle Machine': '<:warmachine:524939920943349781>'
};

const leagueStrings = {
	0: '<:no_league:524912313531367424>',
	29000001: '<:bronze3:524912314332348416>',
	29000002: '<:bronze2:524912314500251651>',
	29000003: '<:bronze1:524912313535561731>',
	29000004: '<:silver3:524912314680475659>',
	29000005: '<:silver2:524104101043372033>',
	29000006: '<:silver1:524102934871670786>',
	29000007: '<:gold3:524102875505229835>',
	29000008: '<:gold2:524102825589080065>',
	29000009: '<:gold1:524102616125276160>',
	29000010: '<:crystal3:525624971456937984>',
	29000011: '<:crystal2:524096411927576596>',
	29000012: '<:crystal1:524094240658292746>',
	29000013: '<:master3:524096647366705152>',
	29000014: '<:master2:524096587224580115>',
	29000015: '<:master1:524096526499446794>',
	29000016: '<:champion3:524093027099344907>',
	29000017: '<:champion2:524091846226345984>',
	29000018: '<:champion1:524091132498411520>',
	29000019: '<:titan3:524084656790962186>',
	29000020: '<:titan2:524089454206386199>',
	29000021: '<:titan1:524087152183607329>',
	29000022: '<:legend:524089797023760388>',
	29000023: '<:legend:524089797023760388>',
	29000024: '<:legend:524089797023760388>',
	29000025: '<:legend:524089797023760388>'
};

const FINEmoji = {
	0: '\u200b',
	1: '<:1star:534763506227085322>',
	2: '<:2star:534763506185142272>',
	3: '<:3star:534763506067570705>'
};

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
			},
			args: [
				{
					id: 'data',
					type: 'player',
					prompt: {
						start: 'what would you like to search for?',
						retry: (msg, { failure }) => failure.value
					}
				}
			]
		});
	}

	async exec(message, { data }) {
		const embed = new MessageEmbed()
			.setColor(0x5970c1)
			.setAuthor(`${data.name} (${data.tag})`, data.league ? data.league.iconUrls.small : null, `https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${data.tag.replace(/#/g, '')}`)
			.setThumbnail(`https://coc.guide/static/imgs/other/town-hall-${data.townHallLevel}.png`);

		embed.addField('Town Hall', `${TownHallEmoji[data.townHallLevel]} ${data.townHallLevel}`, true);
		embed.addField('Current League', [
			`${leagueStrings[data.league ? data.league.id : 0]} ${data.league ? data.league.name : 'Unranked'} (${data.trophies})`
		], true);
		embed.addField('XP Level', `<:xp:534752059501838346> ${data.expLevel}`, true);

		let BestTrohies = '';
		if (data.bestTrophies <= 399) {
			BestTrohies += 0;
		} else if (data.bestTrophies >= 400 && data.bestTrophies <= 499) {
			BestTrohies += 29000001;
		} else if (data.bestTrophies >= 500 && data.bestTrophies <= 599) {
			BestTrohies += 29000002;
		} else if (data.bestTrophies >= 600 && data.bestTrophies <= 799) {
			BestTrohies += 29000003;
		} else if (data.bestTrophies >= 800 && data.bestTrophies <= 999) {
			BestTrohies += 29000004;
		} else if (data.bestTrophies >= 1000 && data.bestTrophies <= 1199) {
			BestTrohies += 29000005;
		} else if (data.bestTrophies >= 1200 && data.bestTrophies <= 1399) {
			BestTrohies += 29000006;
		} else if (data.bestTrophies >= 1400 && data.bestTrophies <= 1599) {
			BestTrohies += 29000007;
		} else if (data.bestTrophies >= 1600 && data.bestTrophies <= 1799) {
			BestTrohies += 29000008;
		} else if (data.bestTrophies >= 1800 && data.bestTrophies <= 1999) {
			BestTrohies += 29000009;
		} else if (data.bestTrophies >= 2000 && data.bestTrophies <= 2199) {
			BestTrohies += 29000010;
		} else if (data.bestTrophies >= 2200 && data.bestTrophies <= 2399) {
			BestTrohies += 29000011;
		} else if (data.bestTrophies >= 2400 && data.bestTrophies <= 2599) {
			BestTrohies += 29000012;
		} else if (data.bestTrophies >= 2600 && data.bestTrophies <= 2799) {
			BestTrohies += 29000013;
		} else if (data.bestTrophies >= 2800 && data.bestTrophies <= 2999) {
			BestTrohies += 29000014;
		} else if (data.bestTrophies >= 3000 && data.bestTrophies <= 3199) {
			BestTrohies += 29000015;
		} else if (data.bestTrophies >= 3200 && data.bestTrophies <= 3499) {
			BestTrohies += 29000016;
		} else if (data.bestTrophies >= 3500 && data.bestTrophies <= 3799) {
			BestTrohies += 29000017;
		} else if (data.bestTrophies >= 3800 && data.bestTrophies <= 4099) {
			BestTrohies += 29000018;
		} else if (data.bestTrophies >= 4100 && data.bestTrophies <= 4399) {
			BestTrohies += 29000019;
		} else if (data.bestTrophies >= 4400 && data.bestTrophies <= 4799) {
			BestTrohies += 29000020;
		} else if (data.bestTrophies >= 4800 && data.bestTrophies <= 4999) {
			BestTrohies += 29000021;
		} else if (data.bestTrophies >= 5000) {
			BestTrohies += 29000022;
		}
		embed.addField('Best Trophies', `${leagueStrings[BestTrohies]} **${data.bestTrophies}**`, true);

		embed.addField('War Stars', `<:warstars:534759020309774337> ${data.warStars}`, true);
		embed.addField('Attacks/Defenses', `<:attacks:534757491775504425> ${data.attackWins} <:defense:534757493029732363> ${data.defenseWins}`, true);

		let FriendinNeed = '';
		let FriendinNeedStars = '';
		data.achievements.forEach(achievement => {
			if (achievement.name === 'Friend in Need') {
				FriendinNeed = achievement.value;
				FriendinNeedStars = achievement.stars;
			}
		});

		embed.addField('Donations/Receives', [
			`<:donates:534758602691575838> ${data.donations} <:receives:534758309060804608> ${data.donationsReceived}`
		], true);
		embed.addField('Friend in Need', `${FINEmoji[FriendinNeedStars]} ${FriendinNeed}`, true);
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
		const note = await Notes.findOne(message.guild.id, data.tag);
		if (note) {
			const user = this.client.users.get(note.user);
			embed.addField('Note', [
				note.note,
				'',
				`**${user ? user.tag : note.user}** created on **${moment(note.createdAt).format('MMMM D, YYYY, hh:mm')}**`
			]);
		}

		return message.util.send({ embed });
	}
}

module.exports = PlayerCommand;
