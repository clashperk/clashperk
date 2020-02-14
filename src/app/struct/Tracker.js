const Logger = require('../util/logger');
const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const { firestore } = require('../struct/Database');

const donateList = [];
let memberList = [];

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
					if (this.client.guilds.has(data.guild)) {
						this.add(data.tag, data.guild, data.channel, data.color);
					}
				});
			});
		return true;
	}

	add(tag, guild, channel, color) {
		const data = {
			channel,
			tag,
			color,
			guild
		};
		this.cached.set(`${guild}${tag}`, data);
	}

	delete(guild, tag) {
		this.cached.delete(`${guild}${tag}`);
		delete donateList[`${guild}${tag}`];
	}

	track(clan, color, channel, guild) {
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
				channel.send({ embed });
			} catch (error) {
				Logger.error(error.toString(), { level: 'TRACKER MESSAGE' });
			}
		}

		for (const member of clan.memberList) {
			donateList[`${guild}${member.tag}`] = member;
		}
	}

	memberLog(clan, color, channel, guild) {
		if (guild !== '609250675431309313') return;
		for (const member of clan.memberList) {
			if (member.tag in memberList.map(m => m.tag) === false && memberList.length) {
				console.log(member.tag, 'Joined')
			}
		}

		for (const member of memberList) {
			if (member.tag in clan.memberList.map(m => m.tag) === false) {
				console.log(member.tag, 'Left')
			}
		}

		memberList = [];
		for (const member of clan.memberList) {
			memberList.push(member);
		}

		console.log(memberList);
	}

	async start() {
		for (const clan of this.cached.values()) {
			if (this.client.channels.has(clan.channel)) {
				const channel = this.client.channels.get(clan.channel);
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
					// this.memberLog(data, clan.color, channel, clan.guild);
				}
			} else {
				Logger.warn(`Channel: ${clan.channel}`, { level: 'Missing Channel' });
				this.delete(clan.guild, clan.tag);
			}

			await this.delay(100);
		}
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}
}

module.exports = Tracker;
