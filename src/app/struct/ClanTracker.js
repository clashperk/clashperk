const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const { firestore } = require('./Database');
const { TownHallEmoji, leagueEmojis } = require('../util/constants');

class FastTracker {
	constructor(client, cached) {
		this.client = client;
		this.cached = cached;
		this.donateList = {};
		this.oldMemberList = new Map();
		this.donateMemberList = new Map();
	}

	async init() {
		await this.start();
		// setInterval(this.start.bind(this), 3 * 60 * 1000);
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	async memberlog(clan, cache, channel) {
		const key = `${cache.guild}${clan.tag}`;
		const currentMemberList = clan.memberList.map(m => m.tag);

		const currentMemberSet = new Set(currentMemberList);
		const oldMemberSet = new Set(this.oldMemberList.get(key));

		// new players
		if (oldMemberSet.size) {
			const tags = currentMemberList.filter(tag => !oldMemberSet.has(tag));
			for (const tag of tags) {
				const member = await this.fetchPlayer(tag);
				if (!member) return;
				const embed = new MessageEmbed()
					.setColor(0x38d863)
					.setTitle(`${member.name} (${member.tag}) Joined`)
					.setURL(`https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${tag.replace(/#/g, '')}`)
					.setDescription([
						`${TownHallEmoji[member.townHallLevel]} ${member.townHallLevel}`,
						`<:xp:534752059501838346> ${member.expLevel}`,
						`<:warstars:534759020309774337> ${member.warStars}`,
						`${leagueEmojis[member.league ? member.league.id : 29000000]} ${member.trophies}`
					].join(' '))
					.setFooter(clan.name, clan.badgeUrls.small);
				embed.setTimestamp();

				try {
					await channel.send({ embed });
				} catch (error) {
					this.client.logger.error(error.toString(), { label: 'PLAYER_LOG_MESSAGE' });
				}

				await this.delay(200);
			}
		}

		// a delay of 200 ms
		await this.delay(200);

		// missing players
		if (currentMemberSet.size && oldMemberSet.size) {
			const tags = this.oldMemberList.get(key).filter(tag => !currentMemberSet.has(tag));
			for (const tag of tags) {
				const member = await this.fetchPlayer(tag);
				if (!member) return;
				const embed = new MessageEmbed()
					.setColor(0xeb3508)
					.setTitle(`${member.name} (${member.tag}) Left`)
					.setURL(`https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${tag.replace(/#/g, '')}`)
					.setDescription([
						`${TownHallEmoji[member.townHallLevel]} ${member.townHallLevel}`,
						`<:xp:534752059501838346> ${member.expLevel}`,
						`<:warstars:534759020309774337> ${member.warStars}`,
						`${leagueEmojis[member.league ? member.league.id : 29000000]} ${member.trophies}`
					].join(' '))
					.setFooter(clan.name, clan.badgeUrls.small);
				embed.setTimestamp();

				try {
					await channel.send({ embed });
				} catch (error) {
					this.client.logger.error(error.toString(), { label: 'PLAYER_LOG_MESSAGE' });
				}

				await this.delay(200);
			}
		}

		this.oldMemberList.set(key, []);
		this.oldMemberList.set(key, currentMemberList);
		oldMemberSet.clear();
		currentMemberSet.clear();
	}

	async donationlog(clan, cache, channel) {
		const key = `${cache.guild}${clan.tag}`;
		clearInterval(this.cached.get(key).intervalID);
		const currentMemberList = clan.memberList.map(m => m.tag);
		const currentMemberSet = new Set(currentMemberList);
		const oldMemberSet = new Set(this.donateMemberList.get(key));
		const item = { donated: '', received: '', donations: 0, receives: 0 };

		for (const member of clan.memberList) {
			item.clan = `${clan.name} (${clan.tag})`;
			item.clanBadge = clan.badgeUrls.small;
			item.members = clan.members;
			if (this.donateList[key] && member.tag in this.donateList[key]) {
				const donations = member.donations - this.donateList[key][member.tag].donations;
				if (donations && donations > 0) {
					item.donations += donations;
					item.donated += `${leagueEmojis[member.league.id]} **${member.name}** (${member.tag}) **»** ${donations} \n`;
				}
				const receives = member.donationsReceived - this.donateList[key][member.tag].donationsReceived;
				if (receives && receives > 0) {
					item.receives += receives;
					item.received += `${leagueEmojis[member.league.id]} **${member.name}** (${member.tag}) **»** ${receives} \n`;
				}
			} else if (oldMemberSet.size && !oldMemberSet.has(member.tag)) {
				const donations = member.donations;
				if (donations && donations > 0) {
					item.donations += donations;
					item.donated += `${leagueEmojis[member.league.id]} **${member.name}** (${member.tag}) **»** ${donations}* \n`;
				}
				const receives = member.donationsReceived;
				if (receives && receives > 0) {
					item.receives += receives;
					item.received += `${leagueEmojis[member.league.id]} **${member.name}** (${member.tag}) **»** ${receives}* \n`;
				}
			}
		}

		if (item.donated !== '' || item.received !== '') {
			const embed = new MessageEmbed()
				.setColor(cache.color)
				.setAuthor(item.clan, item.clanBadge)
				.setThumbnail(item.clanBadge)
				.setFooter(`${item.members}/50 [CLUSTER 1]`, this.client.user.displayAvatarURL())
				.setTimestamp();
			if (item.donated) embed.addField('Donated', `${item.donated.substring(0, 1024)}`);
			if (item.received) embed.addField('Received', `${item.received.substring(0, 1024)}`);

			if (currentMemberSet.size && oldMemberSet.size) {
				const membersJoined = currentMemberList.filter(tag => !oldMemberSet.has(tag));
				const membersLeft = this.donateMemberList.get(key).filter(tag => !currentMemberSet.has(tag));
				if (item.donations !== item.receives && (membersJoined.length || membersLeft.length)) {
					embed.addField('Unmatched Donations', [
						membersJoined.length ? `${membersJoined.length} Member${membersJoined.length === 1 ? '' : 's'} Joined` : '',
						membersLeft.length ? `${membersLeft.length} Member${membersLeft.length === 1 ? '' : 's'} Left` : ''
					]);
				}
			}

			try {
				await channel.send({ embed });
			} catch (error) {
				this.client.logger.error(error.toString(), { label: 'DONATION_LOG_MESSAGE' });
			}
		}

		this.donateList[key] = {};
		for (const member of clan.memberList) {
			this.donateList[key][member.tag] = member;
		}

		this.donateMemberList.set(key, []);
		this.donateMemberList.set(key, currentMemberList);
		oldMemberSet.clear();
		currentMemberSet.clear();

		const intervalID = setInterval(this.update.bind(this), 1 * 60 * 1000, cache);
		cache.intervalID = intervalID;
		this.cached.set(key, cache);
	}

	async update(cache) {
		console.log(cache.tag);
		if (this.client.channels.cache.has(cache.donation_log_channel)) {
			const channel = this.client.channels.cache.get(cache.donation_log_channel);
			const permissions = ['SEND_MESSAGES', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'VIEW_CHANNEL'];
			if (channel.permissionsFor(channel.guild.me).has(permissions, false)) {
				const res = await this.fetchClan(cache.tag);
				if (!res) return;
				if (!res.ok) return;
				const data = await res.json();
				this.donationlog(data, cache, channel);

				if (this.client.channels.cache.get(cache.member_log_channel)) {
					const channel = this.client.channels.cache.get(cache.member_log_channel);
					const permissions = ['SEND_MESSAGES', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'VIEW_CHANNEL'];
					if (channel.permissionsFor(channel.guild.me).has(permissions, false)) {
						this.memberlog(data, cache, channel);
					}
				}

				await this.delay(150);
			}
		} else if (this.client.channels.cache.has(cache.member_log_channel)) {
			const channel = this.client.channels.cache.get(cache.member_log_channel);
			const permissions = ['SEND_MESSAGES', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'VIEW_CHANNEL'];
			if (channel.permissionsFor(channel.guild.me).has(permissions, false)) {
				const res = await this.fetchClan(cache.tag);
				if (!res) return;
				if (!res.ok) return;
				const data = await res.json();
				this.memberlog(data, cache, channel, channel);

				await this.delay(150);
			}
		} else {
			clearInterval(cache.intervalID);
			this.cached.delete(`${cache.guild}${cache.tag}`);
			this.client.logger.warn('UNKNOWN_CHANNEL', { label: 'NOT_FOUND' });
		}
	}

	async start() {
		for (const cache of Array.from(this.cached.values()).filter(clan => clan.isPremium)) {
			if (this.client.channels.cache.has(cache.donation_log_channel)) {
				const channel = this.client.channels.cache.get(cache.donation_log_channel);
				const permissions = ['SEND_MESSAGES', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'VIEW_CHANNEL'];
				if (channel.permissionsFor(channel.guild.me).has(permissions, false)) {
					const res = await this.fetchClan(cache.tag);
					if (!res) continue;
					if (!res.ok) continue;
					const data = await res.json();
					this.donationlog(data, cache, channel);

					if (this.client.channels.cache.get(cache.member_log_channel)) {
						const channel = this.client.channels.cache.get(cache.member_log_channel);
						const permissions = ['SEND_MESSAGES', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'VIEW_CHANNEL'];
						if (channel.permissionsFor(channel.guild.me).has(permissions, false)) {
							this.memberlog(data, cache, channel);
						}
					}

					await this.delay(150);
				}
			} else if (this.client.channels.cache.has(cache.member_log_channel)) {
				const channel = this.client.channels.cache.get(cache.member_log_channel);
				const permissions = ['SEND_MESSAGES', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'VIEW_CHANNEL'];
				if (channel.permissionsFor(channel.guild.me).has(permissions, false)) {
					const res = await this.fetchClan(cache.tag);
					if (!res) continue;
					if (!res.ok) continue;
					const data = await res.json();
					this.memberlog(data, cache, channel, channel);

					await this.delay(150);
				}
			} else {
				this.cached.delete(`${cache.guild}${cache.tag}`);
				this.client.logger.warn('UNKNOWN_CHANNEL', { label: 'NOT_FOUND' });
			}
		}
	}

	async add(data) {
		const res = await this.fetchClan(data.tag);
		if (!res) return;
		if (!res.ok) return;
		const clan = await res.json();

		const key = `${data.guild}${data.tag}`;
		this.donateList[key] = {};
		for (const member of clan.memberList) {
			this.donateList[key][member.tag] = member;
		}

		this.oldMemberList.set(key, clan.memberList.map(member => member.tag));
		this.donateMemberList.set(key, clan.memberList.map(member => member.tag));
	}

	async fetchClan(tag) {
		return fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(tag)}`, {
			method: 'GET',
			headers: {
				Accept: 'application/json',
				authorization: `Bearer ${process.env.TRACKER_API}`,
				'cache-control': 'no-cache'
			},
			timeout: 3000
		}).catch(() => null);
	}

	async fetchPlayer(tag) {
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

class SlowTracker {
	constructor(client, cached) {
		this.client = client;
		this.cached = cached;
		this.donateList = {};
		this.oldMemberList = new Map();
		this.donateMemberList = new Map();
	}

	async init() {
		await this.start();
		setInterval(this.start.bind(this), 5 * 60 * 1000);
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	async memberlog(clan, cache, channel) {
		const key = `${cache.guild}${clan.tag}`;
		const currentMemberList = clan.memberList.map(m => m.tag);

		const currentMemberSet = new Set(currentMemberList);
		const oldMemberSet = new Set(this.oldMemberList.get(key));

		// new players
		if (oldMemberSet.size) {
			const tags = currentMemberList.filter(tag => !oldMemberSet.has(tag));
			for (const tag of tags) {
				const member = await this.fetchPlayer(tag);
				if (!member) return;
				const embed = new MessageEmbed()
					.setColor(0x38d863)
					.setTitle(`${member.name} (${member.tag}) Joined`)
					.setURL(`https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${tag.replace(/#/g, '')}`)
					.setDescription([
						`${TownHallEmoji[member.townHallLevel]} ${member.townHallLevel}`,
						`<:xp:534752059501838346> ${member.expLevel}`,
						`<:warstars:534759020309774337> ${member.warStars}`,
						`${leagueEmojis[member.league ? member.league.id : 29000000]} ${member.trophies}`
					].join(' '))
					.setFooter(clan.name, clan.badgeUrls.small);
				embed.setTimestamp();

				try {
					await channel.send({ embed });
				} catch (error) {
					this.client.logger.error(error.toString(), { label: 'PLAYER_LOG_MESSAGE' });
				}

				await this.delay(200);
			}
		}

		// a delay of 200 ms
		await this.delay(200);

		// missing players
		if (currentMemberSet.size && oldMemberSet.size) {
			const tags = this.oldMemberList.get(key).filter(tag => !currentMemberSet.has(tag));
			for (const tag of tags) {
				const member = await this.fetchPlayer(tag);
				if (!member) return;
				const embed = new MessageEmbed()
					.setColor(0xeb3508)
					.setTitle(`${member.name} (${member.tag}) Left`)
					.setURL(`https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${tag.replace(/#/g, '')}`)
					.setDescription([
						`${TownHallEmoji[member.townHallLevel]} ${member.townHallLevel}`,
						`<:xp:534752059501838346> ${member.expLevel}`,
						`<:warstars:534759020309774337> ${member.warStars}`,
						`${leagueEmojis[member.league ? member.league.id : 29000000]} ${member.trophies}`
					].join(' '))
					.setFooter(clan.name, clan.badgeUrls.small);
				embed.setTimestamp();

				try {
					await channel.send({ embed });
				} catch (error) {
					this.client.logger.error(error.toString(), { label: 'PLAYER_LOG_MESSAGE' });
				}

				await this.delay(200);
			}
		}

		this.oldMemberList.set(key, []);
		this.oldMemberList.set(key, currentMemberList);
		oldMemberSet.clear();
		currentMemberSet.clear();
	}

	async donationlog(clan, cache, channel) {
		const key = `${cache.guild}${clan.tag}`;
		const currentMemberList = clan.memberList.map(m => m.tag);
		const currentMemberSet = new Set(currentMemberList);
		const oldMemberSet = new Set(this.donateMemberList.get(key));
		const item = { donated: '', received: '', donations: 0, receives: 0 };

		for (const member of clan.memberList) {
			item.clan = `${clan.name} (${clan.tag})`;
			item.clanBadge = clan.badgeUrls.small;
			item.members = clan.members;
			if (this.donateList[key] && member.tag in this.donateList[key]) {
				const donations = member.donations - this.donateList[key][member.tag].donations;
				if (donations && donations > 0) {
					item.donations += donations;
					item.donated += `${leagueEmojis[member.league.id]} **${member.name}** (${member.tag}) **»** ${donations} \n`;
				}
				const receives = member.donationsReceived - this.donateList[key][member.tag].donationsReceived;
				if (receives && receives > 0) {
					item.receives += receives;
					item.received += `${leagueEmojis[member.league.id]} **${member.name}** (${member.tag}) **»** ${receives} \n`;
				}
			} else if (oldMemberSet.size && !oldMemberSet.has(member.tag)) {
				const donations = member.donations;
				if (donations && donations > 0) {
					item.donations += donations;
					item.donated += `${leagueEmojis[member.league.id]} **${member.name}** (${member.tag}) **»** ${donations}* \n`;
				}
				const receives = member.donationsReceived;
				if (receives && receives > 0) {
					item.receives += receives;
					item.received += `${leagueEmojis[member.league.id]} **${member.name}** (${member.tag}) **»** ${receives}* \n`;
				}
			}
		}

		const index = Array.from(this.cached.keys())
			.filter(clan => !clan.isPremium)
			.indexOf(`${cache.guild}${cache.tag}`);
		const range = ((index / 100) + 2).toFixed();
		if (item.donated !== '' || item.received !== '') {
			const embed = new MessageEmbed()
				.setColor(cache.color)
				.setAuthor(item.clan, item.clanBadge)
				.setThumbnail(item.clanBadge)
				.setFooter(`${item.members}/50 [CLUSTER ${range}]`, this.client.user.displayAvatarURL())
				.setTimestamp();
			if (item.donated) embed.addField('Donated', `${item.donated.substring(0, 1024)}`);
			if (item.received) embed.addField('Received', `${item.received.substring(0, 1024)}`);

			if (currentMemberSet.size && oldMemberSet.size) {
				const membersJoined = currentMemberList.filter(tag => !oldMemberSet.has(tag));
				const membersLeft = this.donateMemberList.get(key).filter(tag => !currentMemberSet.has(tag));
				if (item.donations !== item.receives && (membersJoined.length || membersLeft.length)) {
					embed.addField('Unmatched Donations', [
						membersJoined.length ? `${membersJoined.length} Member${membersJoined.length === 1 ? '' : 's'} Joined` : '',
						membersLeft.length ? `${membersLeft.length} Member${membersLeft.length === 1 ? '' : 's'} Left` : ''
					]);
				}
			}

			try {
				await channel.send({ embed });
			} catch (error) {
				this.client.logger.error(error.toString(), { label: 'DONATION_LOG_MESSAGE' });
			}
		}

		this.donateList[key] = {};
		for (const member of clan.memberList) {
			this.donateList[key][member.tag] = member;
		}

		this.donateMemberList.set(key, []);
		this.donateMemberList.set(key, currentMemberList);
		oldMemberSet.clear();
		currentMemberSet.clear();
	}

	async start() {
		for (const cache of Array.from(this.cached.values()).filter(clan => !clan.isPremium)) {
			if (this.client.channels.cache.has(cache.donation_log_channel)) {
				const channel = this.client.channels.cache.get(cache.donation_log_channel);
				const permissions = ['SEND_MESSAGES', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'VIEW_CHANNEL'];
				if (channel.permissionsFor(channel.guild.me).has(permissions, false)) {
					const res = await this.fetchClan(cache.tag);
					if (!res) continue;
					if (!res.ok) continue;
					const data = await res.json();
					this.donationlog(data, cache, channel);

					if (this.client.channels.cache.get(cache.member_log_channel)) {
						const channel = this.client.channels.cache.get(cache.member_log_channel);
						const permissions = ['SEND_MESSAGES', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'VIEW_CHANNEL'];
						if (channel.permissionsFor(channel.guild.me).has(permissions, false)) {
							this.memberlog(data, cache, channel);
						}
					}

					await this.delay(150);
				}
			} else if (this.client.channels.cache.has(cache.member_log_channel)) {
				const channel = this.client.channels.cache.get(cache.member_log_channel);
				const permissions = ['SEND_MESSAGES', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'VIEW_CHANNEL'];
				if (channel.permissionsFor(channel.guild.me).has(permissions, false)) {
					const res = await this.fetchClan(cache.tag);
					if (!res) continue;
					if (!res.ok) continue;
					const data = await res.json();
					this.memberlog(data, cache, channel, channel);

					await this.delay(150);
				}
			} else {
				this.cached.delete(`${cache.guild}${cache.tag}`);
				this.client.logger.warn('UNKNOWN_CHANNEL', { label: 'NOT_FOUND' });
			}
		}
	}

	async add(data) {
		const res = await this.fetchClan(data.tag);
		if (!res) return;
		if (!res.ok) return;
		const clan = await res.json();

		const key = `${data.guild}${data.tag}`;
		this.donateList[key] = {};
		for (const member of clan.memberList) {
			this.donateList[key][member.tag] = member;
		}

		this.oldMemberList.set(key, clan.memberList.map(member => member.tag));
		this.donateMemberList.set(key, clan.memberList.map(member => member.tag));
	}

	async fetchClan(tag) {
		return fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(tag)}`, {
			method: 'GET',
			headers: {
				Accept: 'application/json',
				authorization: `Bearer ${process.env.TRACKER_API}`,
				'cache-control': 'no-cache'
			},
			timeout: 3000
		}).catch(() => null);
	}

	async fetchPlayer(tag) {
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

class ClanTracker {
	constructor(client) {
		this.client = client;
		this.cached = new Map();
	}

	async init() {
		await this.load();
		new FastTracker(this.client, this.cached).init();
		new SlowTracker(this.client, this.cached).init();
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
		if (data.donationlog) {
			data.donation_log_channel = data.donationlog.channel;
			data.color = data.donationlog.color;
		}

		if (data.memberlog) {
			data.member_log_channel = data.memberlog.channel;
		}

		this.cached.set(`${guild}${tag}`, data);
	}

	delete(guild, tag) {
		this.cached.delete(`${guild}${tag}`);
	}
}

module.exports = ClanTracker;
