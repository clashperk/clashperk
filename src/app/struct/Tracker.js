const Logger = require('../util/logger');
const { MessageEmbed, Util } = require('discord.js');
const fetch = require('node-fetch');
const Clans = require('../models/Clans');

const donateList = [];

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
		for (const data of await Clans.findAll({ where: { tracking: true } })) {
			this.add(data.tag, data.guild, data.channel, data.color);
		}
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
	}

	track(clan, channel, color) {
		let donated = '';
		let received = '';
		let clanInfo;
		let badge;
		let members;
		let league;

		for (const member of clan.memberList) {
			if (`${channel.id}${member.tag}` in donateList) {
				clanInfo = `${clan.name} (${clan.tag})`;
				badge = clan.badgeUrls.large;
				members = clan.members;
				league = leagueStrings[member.league.id];
				const donations = member.donations - donateList[`${channel.id}${member.tag}`].donations;
				if (donations) {
					donated += `${league} **${member.name}** (${member.tag}) : ${donations} \n`;
				}
				const receives = member.donationsReceived - donateList[`${channel.id}${member.tag}`].donationsReceived;
				if (receives) {
					received += `${league} **${member.name}** (${member.tag}) : ${receives} \n`;
				}
			}
		}

		if (donated !== '' || received !== '') {
			const embed = new MessageEmbed()
				.setColor(isNaN(color) ? String(color) : Number(color))
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
			donateList[`${channel.id}${member.tag}`] = member;
		}
	}

	async start() {
		for (const clan of this.cached.values()) {
			if (this.client.channels.has(clan.channel)) {
				const channel = this.client.channels.get(clan.channel);

				if (channel.permissionsFor(channel.guild.me).has(['SEND_MESSAGES', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'VIEW_CHANNEL'], false)) {
					const res = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(clan.tag)}`, {
						method: 'GET',
						headers: {
							Accept: 'application/json',
							authorization: `Bearer ${process.env.TRACKER_API}`,
							'cache-control': 'no-cache'
						}
					});

					if (!res.ok) continue;

					const data = await res.json();

					this.track(data, channel, clan.color);
				}
			} else {
				Logger.warn(`Channel: ${clan.channel}`, { level: 'Missing Channel' });
				this.delete(clan.guild, clan.tag);
				if (this.client.user.id === process.env.CLIENT_ID) {
					await Clans.destroy({ where: { channel: clan.channel } });
				}
			}

			await this.delay(100);
		}
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}
}

module.exports = Tracker;
