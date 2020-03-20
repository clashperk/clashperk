const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const { firestore } = require('./Database');
const { TownHallEmoji, leagueStrings } = require('../util/constants');

const donateList = new Map();
const oldMemberList = new Map();

class ClanTracker {
	constructor(client, { checkRate = 6 * 60 * 1000, quickRate = 3 * 60 * 1000 } = {}) {
		this.client = client;
		this.checkRate = checkRate;
		this.quickRate = quickRate;
		this.cached = new Map();
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	async init() {
		await this.load();
		await this._start();
		await this.start();
		setInterval(this.start.bind(this), this.checkRate);
		setInterval(this._start.bind(this), this.quickRate);
	}

	async load() {
		await firestore.collection('tracking_clans')
			.get()
			.then(snapshot => {
				snapshot.forEach(doc => {
					const data = doc.data();
					if (this.client.guilds.cache.has(data.guild)) {
						this.add(data.tag, data.guild, data);
					}
				});
			});
		return true;
	}

	add(tag, guild, data) {
		this.cached.set(`${guild}${tag}`, data);
	}

	delete(guild, tag) {
		this.cached.delete(`${guild}${tag}`);
	}

	async track(clan, color, channel, guild) {
		let donated = '';
		let received = '';
		let clanInfo;
		let badge;
		let members;
		let league;

		for (const member of clan.memberList) {
			const key = `${guild}${member.tag}`;
			if (donateList.has(key)) {
				clanInfo = `${clan.name} (${clan.tag})`;
				badge = clan.badgeUrls.small;
				members = clan.members;
				league = leagueStrings[member.league.id];
				const donations = member.donations - donateList.get(key).donations;
				if (donations && donations > 0) {
					donated += `${league} **${member.name}** (${member.tag}) : ${donations} \n`;
				}
				const receives = member.donationsReceived - donateList.get(key).donationsReceived;
				if (receives && receives > 0) {
					received += `${league} **${member.name}** (${member.tag}) : ${receives} \n`;
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
			const key = `${guild}${member.tag}`;
			donateList.set(key, member);
		}
	}

	async _track(clan, color, channel, guild) {
		let donated = '';
		let received = '';
		let clanInfo;
		let badge;
		let members;
		let league;

		for (const member of clan.memberList) {
			const key = `${guild}${member.tag}`;
			if (donateList.has(key)) {
				clanInfo = `${clan.name} (${clan.tag})`;
				badge = clan.badgeUrls.small;
				members = clan.members;
				league = leagueStrings[member.league.id];
				const donations = member.donations - donateList.get(key).donations;
				if (donations && donations > 0) {
					donated += `${league} **${member.name}** (${member.tag}) : ${donations} \n`;
				}
				const receives = member.donationsReceived - donateList.get(key).donationsReceived;
				if (receives && receives > 0) {
					received += `${league} **${member.name}** (${member.tag}) : ${receives} \n`;
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
			const key = `${guild}${member.tag}`;
			donateList.set(key, member);
		}
	}

	async memberLog(clan, channel, key) {
		const currentMemberList = clan.memberList.map(m => m.tag);

		const currentMemberSet = new Set(currentMemberList);
		const oldMemberSet = new Set(oldMemberList.get(key));

		// new players
		if (oldMemberSet.size) {
			const tags = currentMemberList.filter(tag => !oldMemberSet.has(tag));
			for (const tag of tags) {
				const member = await this.getPlayer(tag);
				if (!member) return;
				const embed = new MessageEmbed()
					.setColor(0x38d863)
					.setTitle(`${member.name} (${member.tag}) Joined`)
					.setURL(`https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${tag.replace(/#/g, '')}`)
					.setDescription([
						`${TownHallEmoji[member.townHallLevel]} ${member.townHallLevel}`,
						`<:xp:534752059501838346> ${member.expLevel}`,
						`<:warstars:534759020309774337> ${member.warStars}`,
						`${leagueStrings[member.league ? member.league.id : 29000000]} ${member.trophies}`
					].join(' '))
					.setFooter(clan.name, clan.badgeUrls.small)
					.setTimestamp();
				await channel.send({ embed });

				await this.delay(200);
			}
		}

		// a delay of 200 ms
		await this.delay(200);

		// missing players
		if (currentMemberSet.size && oldMemberSet.size) {
			const tags = oldMemberList.get(key).filter(tag => !currentMemberSet.has(tag));
			for (const tag of tags) {
				const member = await this.getPlayer(tag);
				if (!member) return;
				const embed = new MessageEmbed()
					.setColor(0xeb3508)
					.setTitle(`${member.name} (${member.tag}) Left`)
					.setURL(`https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${tag.replace(/#/g, '')}`)
					.setDescription([
						`${TownHallEmoji[member.townHallLevel]} ${member.townHallLevel}`,
						`<:xp:534752059501838346> ${member.expLevel}`,
						`<:warstars:534759020309774337> ${member.warStars}`,
						`${leagueStrings[member.league ? member.league.id : 29000000]} ${member.trophies}`
					].join(' '))
					.setFooter(clan.name, clan.badgeUrls.small)
					.setTimestamp();
				await channel.send({ embed });

				await this.delay(200);
			}
		}

		oldMemberList.set(key, []);
		oldMemberList.set(key, currentMemberList);
		oldMemberSet.clear();
		currentMemberSet.clear();
	}

	async _memberLog(clan, channel, key) {
		const currentMemberList = clan.memberList.map(m => m.tag);

		const currentMemberSet = new Set(currentMemberList);
		const oldMemberSet = new Set(oldMemberList.get(key));

		// new players
		if (oldMemberSet.size) {
			const tags = currentMemberList.filter(tag => !oldMemberSet.has(tag));
			for (const tag of tags) {
				const member = await this.getPlayer(tag);
				if (!member) return;
				const embed = new MessageEmbed()
					.setColor(0x38d863)
					.setTitle(`${member.name} (${member.tag}) Joined`)
					.setURL(`https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${tag.replace(/#/g, '')}`)
					.setDescription([
						`${TownHallEmoji[member.townHallLevel]} ${member.townHallLevel}`,
						`<:xp:534752059501838346> ${member.expLevel}`,
						`<:warstars:534759020309774337> ${member.warStars}`,
						`${leagueStrings[member.league ? member.league.id : 29000000]} ${member.trophies}`
					].join(' '))
					.setFooter(clan.name, clan.badgeUrls.small)
					.setTimestamp();
				await channel.send({ embed });

				await this.delay(200);
			}
		}

		// a delay of 200 ms
		await this.delay(200);

		// missing players
		if (currentMemberSet.size && oldMemberSet.size) {
			const tags = oldMemberList.get(key).filter(tag => !currentMemberSet.has(tag));
			for (const tag of tags) {
				const member = await this.getPlayer(tag);
				if (!member) return;
				const embed = new MessageEmbed()
					.setColor(0xeb3508)
					.setTitle(`${member.name} (${member.tag}) Left`)
					.setURL(`https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${tag.replace(/#/g, '')}`)
					.setDescription([
						`${TownHallEmoji[member.townHallLevel]} ${member.townHallLevel}`,
						`<:xp:534752059501838346> ${member.expLevel}`,
						`<:warstars:534759020309774337> ${member.warStars}`,
						`${leagueStrings[member.league ? member.league.id : 29000000]} ${member.trophies}`
					].join(' '))
					.setFooter(clan.name, clan.badgeUrls.small)
					.setTimestamp();
				await channel.send({ embed });

				await this.delay(200);
			}
		}

		oldMemberList.set(key, []);
		oldMemberList.set(key, currentMemberList);
		oldMemberSet.clear();
		currentMemberSet.clear();
	}

	async start() {
		for (const clan of Array.from(this.cached.values()).filter(clan => !clan.isPremium)) {
			if (clan.donationlogEnabled && this.client.channels.cache.has(clan.donationlog.channel)) {
				const channel = this.client.channels.cache.get(clan.donationlog.channel);
				// check client permissions
				const permissions = ['SEND_MESSAGES', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'VIEW_CHANNEL'];
				if (channel.permissionsFor(channel.guild.me).has(permissions, false)) {
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

					this.track(data, clan.donationlog.color, channel, clan.guild);
					if (clan.memberlogEnabled) {
						const channel = this.client.channels.cache.get(clan.memberlog.channel);
						if (channel.permissionsFor(channel.guild.me).has(permissions, false)) {
							this.memberLog(data, channel, `${clan.guild}${clan.tag}`);
						}
					}
				}
			} else if (clan.memberlogEnabled && this.client.channels.cache.has(clan.memberlog.channel)) {
				const channel = this.client.channels.cache.get(clan.memberlog.channel);
				// check client permissions
				const permissions = ['SEND_MESSAGES', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'VIEW_CHANNEL'];
				if (channel.permissionsFor(channel.guild.me).has(permissions, false)) {
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

					this.memberLog(data, channel, `${clan.guild}${clan.tag}`);
				}
			} else {
				this.delete(clan.guild, clan.tag);
			}

			await this.delay(100);
		}
	}

	async _start() {
		for (const clan of Array.from(this.cached.values()).filter(clan => clan.isPremium)) {
			if (clan.donationlogEnabled && this.client.channels.cache.has(clan.donationlog.channel)) {
				const channel = this.client.channels.cache.get(clan.donationlog.channel);
				// check client permissions
				const permissions = ['SEND_MESSAGES', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'VIEW_CHANNEL'];
				if (channel.permissionsFor(channel.guild.me).has(permissions, false)) {
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

					this._track(data, clan.donationlog.color, channel, clan.guild);
					if (clan.memberlogEnabled) {
						const channel = this.client.channels.cache.get(clan.memberlog.channel);
						if (channel.permissionsFor(channel.guild.me).has(permissions, false)) {
							this._memberLog(data, channel, `${clan.guild}${clan.tag}`);
						}
					}
				}
			} else if (clan.memberlogEnabled && this.client.channels.cache.has(clan.memberlog.channel)) {
				const channel = this.client.channels.cache.get(clan.memberlog.channel);
				// check client permissions
				const permissions = ['SEND_MESSAGES', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'VIEW_CHANNEL'];
				if (channel.permissionsFor(channel.guild.me).has(permissions, false)) {
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

					this._memberLog(data, channel, `${clan.guild}${clan.tag}`);
				}
			} else {
				this.delete(clan.guild, clan.tag);
			}

			await this.delay(150);
		}
	}

	async getPlayer(tag) {
		const res = await fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`, {
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

module.exports = ClanTracker;
