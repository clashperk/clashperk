const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const { firestore } = require('../struct/Database');

const donateList = [];
let oldMemberList = [];

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
	12: '<:townhall12:534745574981894154>',
	13: '<:townhall13:653959735124426814>'
};

const HeroEmojis = {
	'Barbarian King': '<:barbarianking:524939911581663242>',
	'Archer Queen': '<:archerqueen:524939902408720394>',
	'Grand Warden': '<:grandwarden:524939931303411722>',
	'Battle Machine': '<:warmachine:524939920943349781>',
	'Royal Champion': '<:royal_champion:653967122166185995>'
};

const leagueStrings = {
	29000000: '<:no_league:524912313531367424>',
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

class Tracker {
	constructor(client, { checkRate = 5 * 60 * 1000 } = {}) {
		this.client = client;
		this.checkRate = checkRate;
		this.cached = new Map();
	}

	async init() {
		await this.load();
		await this.start();
		this.client.setInterval(this.start.bind(this), this.checkRate);
	}

	async load() {
		await firestore.collection('tracking_clans')
			.get()
			.then(snapshot => {
				snapshot.forEach(doc => {
					const data = doc.data();
					if (this.client.guilds.cache.has(data.guild)) {
						if (data.memrLogEnabled) {
							this.add(data.tag, data.guild, data.channel, data.color, true, data.memberlog);
						} else {
							this.add(data.tag, data.guild, data.channel, data.color);
						}
					}
				});
			});
		return true;
	}

	add(tag, guild, channel, color, memrLogEnabled = false, memberlog) {
		const data = {
			channel,
			tag,
			color,
			guild,
			memrLogEnabled,
			memberlog
		};
		this.cached.set(`${guild}${tag}`, data);
	}

	delete(guild, tag) {
		this.cached.delete(`${guild}${tag}`);
		delete donateList[`${guild}${tag}`];
	}

	async track(clan, color, channel, guild) {
		let donated = '';
		let received = '';
		let clanInfo;
		let badge;
		let members;
		let league;

		for (const member of clan.memberList) {
			if (`${guild}${member.tag}` in donateList) {
				clanInfo = `${clan.name} (${clan.tag})`;
				badge = clan.badgeUrls.large;
				members = clan.members;
				league = leagueStrings[member.league.id];
				const donations = member.donations - donateList[`${guild}${member.tag}`].donations;
				if (donations) {
					donated += `${league} **${member.name}** (${member.tag}) : ${Math.abs(donations)} \n`;
				}
				const receives = member.donationsReceived - donateList[`${guild}${member.tag}`].donationsReceived;
				if (receives) {
					received += `${league} **${member.name}** (${member.tag}) : ${Math.abs(receives)} \n`;
				}
			}
		}

		if (donated !== '' || received !== '') {
			const embed = new MessageEmbed()
				.setColor(color)
				.setAuthor(clanInfo, badge)
				.setThumbnail(badge)
				.setFooter(`${members}/50`, this.client.user.displayAvatarURL())
				.setTimestamp();
			if (donated) embed.addField('Donated', `${donated.substring(0, 1024)}`);
			if (received) embed.addField('Received', `${received.substring(0, 1024)}`);

			try {
				await channel.send({ embed });
			} catch (error) {
				this.client.logger.error(error.toString(), { label: 'TRACKER MESSAGE' });
			}
		}

		for (const member of clan.memberList) {
			donateList[`${guild}${member.tag}`] = member;
		}
	}

	async memberLog(clan, channel) {
		console.log('Init', channel.name);
		const currentMemberList = clan.memberList.map(m => m.tag);

		const currentMemberSet = new Set(currentMemberList);
		const oldMemberSet = new Set(oldMemberList);

		// new players
		if (oldMemberList.length) {
			const tags = currentMemberList.filter(x => !oldMemberSet.has(x));
			for (const tag of tags) {
				const member = await this.getPlayer(tag);
				const embed = new MessageEmbed()
					.setColor(0x38d863)
					.setTitle(`${member.name} (${member.tag}) Joined`)
					.setURL(`https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${tag.replace(/#/g, '')}`)
					.setDescription([
						`${TownHallEmoji[member.townHallLevel]} ${member.townHallLevel}`,
						`<:xp:534752059501838346> ${member.expLevel}`,
						`<:warstars:534759020309774337> ${member.warStars}`,
						`${leagueStrings[member.league ? member.league.id : 0]} ${member.trophies}`
					].join(' '));
				await channel.send({ embed });

				await this.delay(200);
			}
		}

		// a delay of 200 ms
		await this.delay(200);

		// missing players
		if (currentMemberSet.size && oldMemberSet.size) {
			const tags = oldMemberList.filter(x => !currentMemberSet.has(x));
			for (const tag of tags) {
				const member = await this.getPlayer(tag);
				const embed = new MessageEmbed()
					.setColor(0xeb3508)
					.setTitle(`${member.name} (${member.tag}) Left`)
					.setURL(`https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${tag.replace(/#/g, '')}`)
					.setDescription([
						`${TownHallEmoji[member.townHallLevel]} ${member.townHallLevel}`,
						`<:xp:534752059501838346> ${member.expLevel}`,
						`<:warstars:534759020309774337> ${member.warStars}`,
						`${leagueStrings[member.league ? member.league.id : 0]} ${member.trophies}`
					].join(' '));
				await channel.send({ embed });

				await this.delay(200);
			}
		}

		oldMemberList = [];
		oldMemberList = currentMemberList;
		oldMemberSet.clear();
	}

	async start() {
		for (const clan of this.cached.values()) {
			if (this.client.channels.cache.has(clan.channel)) {
				const channel = this.client.channels.cache.get(clan.channel);
				// check client permissions
				if (channel.permissionsFor(channel.guild.me).has(['SEND_MESSAGES', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'VIEW_CHANNEL'], false)) {
					const res = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(clan.tag)}`, {
						method: 'GET',
						headers: {
							Accept: 'application/json',
							authorization: `Bearer ${process.env.TRACKER_API}`,
							'cache-control': 'no-cache'
						},
						timeout: 3000
					}).catch(() => null);

					if (!res) continue;
					if (!res.ok) continue;

					const data = await res.json();

					this.track(data, clan.color, channel, clan.guild);
					if (clan.tag === '#8QU8J9LP') {
						const channel = this.client.channels.cache.get('683195551801802753');
						this.memberLog(data, channel);
					}
				}
			} else {
				this.client.logger.warn(`Channel: ${clan.channel}`, { label: 'Missing Channel' });
				this.delete(clan.guild, clan.tag);
			}

			await this.delay(100);
		}
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	async getPlayer(tag) {
		const res = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(tag)}`, {
			method: 'GET',
			headers: {
				Accept: 'application/json',
				authorization: `Bearer ${process.env.TRACKER_API}`,
				'cache-control': 'no-cache'
			},
			timeout: 3000
		}).catch(() => null);

		if (!res) return null;
		if (!res.ok) return null;

		return res.json();
	}
}

module.exports = Tracker;
