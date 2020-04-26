const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const { firestore, mongodb } = require('./Database');
const { townHallEmoji, leagueEmoji } = require('../util/emojis');
const { emoji } = require('../util/emojis');
const permissions = ['SEND_MESSAGES', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'VIEW_CHANNEL'];
const moment = require('moment');
require('moment-duration-format');
const { Util } = require('discord.js');
const ClanGames = require('./ClanGames');

class FastTracker {
	constructor(client, cached) {
		this.client = client;
		this.cached = cached;
		this.donateList = {};
		this.oldMemberList = new Map();
		this.messages = new Map();
		this.embeds = new Map();
	}

	async init() {
		await this.start();
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	async add(data) {
		const key = [data.guild, data.tag].join('');
		const cache = this.cached.get(key);
		if (cache && cache.intervalID) clearInterval(cache.intervalID);

		return this.log(data);
	}

	formatNum(num) {
		return num < 10
			? num.toString()
				.padStart(2, '0')
				.padStart(3, '\u2002')
			: num.toString()
				.padStart(3, '\u2002');
	}

	async log(cache) {
		const clan = await this.clan(cache.tag);
		if (!clan) return;

		const collection = mongodb.db('clashperk').collection('lastonlines');
		if (cache && cache.intervalID) clearInterval(cache.intervalID);
		const key = [cache.guild, clan.tag].join('');
		const currentMemberList = clan.memberList.map(m => m.tag);
		const currentMemberSet = new Set(currentMemberList);
		const oldMemberSet = new Set(this.oldMemberList.get(key));
		const item = { donated: '', received: '', donations: 0, receives: 0 };

		// Donation Counter
		const $set = {};
		for (const member of clan.memberList) {
			item.clan = `${clan.name} (${clan.tag})`;
			item.clanBadge = clan.badgeUrls.small;
			item.members = clan.members;
			if (this.donateList[key] && member.tag in this.donateList[key]) {
				const donations = member.donations - this.donateList[key][member.tag].donations;
				if (donations && donations > 0) {
					item.donations += donations;
					item.donated += `${leagueEmoji[member.league.id]} **\`\u200e${this.formatNum(donations)}\`** \u2002${Util.escapeItalic(member.name)}\n`;
				}
				const receives = member.donationsReceived - this.donateList[key][member.tag].donationsReceived;
				if (receives && receives > 0) {
					item.receives += receives;
					item.received += `${leagueEmoji[member.league.id]} **\`\u200e${this.formatNum(receives)}\`** \u2002${Util.escapeItalic(member.name)}\n`;
				}
			} else if (oldMemberSet.size && !oldMemberSet.has(member.tag)) {
				const donations = member.donations;
				if (donations && donations > 0) {
					item.donations += donations;
					item.donated += `${leagueEmoji[member.league.id]} **\`\u200e${this.formatNum(donations)}\`** \u2002${Util.escapeItalic(member.name)}\n`;
				}
				const receives = member.donationsReceived;
				if (receives && receives > 0) {
					item.receives += receives;
					item.received += `${leagueEmoji[member.league.id]} **\`\u200e${this.formatNum(receives)}\`** \u2002${Util.escapeItalic(member.name)}\n`;
				}
			}

			// Update MongoDB - Last Online
			if (this.donateList[key] && member.tag in this.donateList[key]) {
				if (
					this.donateList[key][member.tag].donations !== member.donations ||
					this.donateList[key][member.tag].donationsReceived !== member.donationsReceived ||
					this.donateList[key][member.tag].versusTrophies !== member.versusTrophies ||
					this.donateList[key][member.tag].expLevel !== member.expLevel ||
					this.donateList[key][member.tag].name !== member.name
				) {
					$set.name = clan.name;
					$set.tag = clan.tag;
					$set[`memberList.${member.tag}`] = { lastOnline: new Date(), tag: member.tag };
				}
			} else if (oldMemberSet.size && !oldMemberSet.has(member.tag)) {
				$set.name = clan.name;
				$set.tag = clan.tag;
				$set[`memberList.${member.tag}`] = { lastOnline: new Date(), tag: member.tag };
			}
		}

		// Last Online - Purge Missing Players
		const $unset = {};
		if (currentMemberSet.size && oldMemberSet.size) {
			const membersLeft = this.oldMemberList.get(key).filter(tag => !currentMemberSet.has(tag));
			for (const member of membersLeft) {
				$unset[`memberList.${member}`] = '';
			}
		}


		if (Object.keys($set).length || Object.keys($unset).length) {
			const update = {};
			if (Object.keys($set).length) update.$set = $set;
			if (Object.keys($unset).length) update.$unset = $unset;

			await collection.updateOne({ tag: clan.tag }, update, { upsert: true })
				.catch(error => this.client.logger.error(error, { label: 'MONGO_ERROR' }));
		}

		// Last Online - Send Message
		if (cache.lastonline_channel) {
			const data = await collection.findOne({ tag: clan.tag });
			if (data) await this.lastOnline(cache, data, clan);
		}

		// Donation Log - Send Message
		if (item.donated !== '' || item.received !== '') {
			const embed = new MessageEmbed()
				.setColor(cache.color)
				.setAuthor(item.clan, item.clanBadge)
				.setThumbnail(item.clanBadge)
				.setFooter(`${item.members}/50`, this.client.user.displayAvatarURL())
				.setTimestamp();
			if (item.donated) embed.addField('Donated', `${item.donated.substring(0, 1024)}`);
			if (item.received) embed.addField('Received', `${item.received.substring(0, 1024)}`);

			if (currentMemberSet.size && oldMemberSet.size) {
				const membersJoined = currentMemberList.filter(tag => !oldMemberSet.has(tag));
				const membersLeft = this.oldMemberList.get(key).filter(tag => !currentMemberSet.has(tag));
				if (item.donations !== item.receives && (membersJoined.length || membersLeft.length)) {
					embed.addField('Unmatched Donation', [
						membersJoined.length ? `${membersJoined.length} Member${membersJoined.length === 1 ? '' : 's'} Joined` : '',
						membersLeft.length ? `${membersLeft.length} Member${membersLeft.length === 1 ? '' : 's'} Left` : ''
					]);
				}
			}

			try {
				if (this.client.channels.cache.has(cache.donation_log_channel)) {
					const channel = this.client.channels.cache.get(cache.donation_log_channel);
					if (channel.permissionsFor(channel.guild.me).has(permissions, false)) {
						await channel.send({ embed });
					}
				}
			} catch (error) {
				this.client.logger.warn(error, { label: 'DONATION_LOG_MESSAGE' });
			}
		}

		if (cache.clan_embed_channel && this.client.patron.get(cache.guild, 'guild', false)) {
			const collection = mongodb.db('clashperk').collection('clanembeds');
			const data = await collection.findOne({ tag: clan.tag, guild: cache.guild });
			if (data) await this.clanEmbed(cache, data, clan);
		}
		// Member Log
		await this.memberlog(cache, clan, currentMemberList, oldMemberSet, currentMemberSet);

		// Purge Cache
		this.donateList[key] = {};
		for (const member of clan.memberList) {
			this.donateList[key][member.tag] = member;
		}

		this.oldMemberList.set(key, []);
		this.oldMemberList.set(key, currentMemberList);
		oldMemberSet.clear();
		currentMemberSet.clear();

		// Callback
		const intervalID = setInterval(this.log.bind(this), 1.5 * 60 * 1000, cache);
		cache.intervalID = intervalID;
		this.cached.set(key, cache);
	}

	async memberlog(cache, clan, currentMemberList, oldMemberSet, currentMemberSet) {
		const key = [cache.guild, clan.tag].join('');
		// Member Log - New Players
		if (oldMemberSet.size) {
			const tags = currentMemberList.filter(tag => !oldMemberSet.has(tag));
			for (const tag of tags) {
				const member = await this.player(tag);
				if (!member) return;
				const embed = new MessageEmbed()
					.setColor(0x38d863)
					.setTitle(`${member.name} (${member.tag}) Joined`)
					.setURL(`https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${tag.replace(/#/g, '')}`)
					.setDescription([
						`${townHallEmoji[member.townHallLevel]} ${member.townHallLevel}`,
						`${emoji.xp} ${member.expLevel}`,
						`${emoji.warstar} ${member.warStars}`,
						`${leagueEmoji[member.league ? member.league.id : 29000000]} ${member.trophies}`
					].join(' '))
					.setFooter(clan.name, clan.badgeUrls.small);
				embed.setTimestamp();

				try {
					if (this.client.channels.cache.has(cache.member_log_channel)) {
						const channel = this.client.channels.cache.get(cache.member_log_channel);
						if (channel.permissionsFor(channel.guild.me).has(permissions, false)) {
							await channel.send({ embed });
						}
					}
				} catch (error) {
					this.client.logger.warn(error, { label: 'PLAYER_LOG_MESSAGE' });
				}

				await this.delay(250);
			}
		}

		// Member Log - Missing Players
		if (currentMemberSet.size && oldMemberSet.size) {
			const tags = this.oldMemberList.get(key).filter(tag => !currentMemberSet.has(tag));
			for (const tag of tags) {
				const member = await this.player(tag);
				if (!member) return;
				const embed = new MessageEmbed()
					.setColor(0xeb3508)
					.setTitle(`${member.name} (${member.tag}) Left`)
					.setURL(`https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${tag.replace(/#/g, '')}`)
					.setDescription([
						`${townHallEmoji[member.townHallLevel]} ${member.townHallLevel}`,
						`${emoji.xp} ${member.expLevel}`,
						`${emoji.warstar} ${member.warStars}`,
						`${leagueEmoji[member.league ? member.league.id : 29000000]} ${member.trophies}`
					].join(' '))
					.setFooter(clan.name, clan.badgeUrls.small);
				embed.setTimestamp();

				try {
					if (this.client.channels.cache.has(cache.member_log_channel)) {
						const channel = this.client.channels.cache.get(cache.member_log_channel);
						if (channel.permissionsFor(channel.guild.me).has(permissions, false)) {
							await channel.send({ embed });
						}
					}
				} catch (error) {
					this.client.logger.warn(error, { label: 'PLAYER_LOG_MESSAGE' });
				}

				await this.delay(250);
			}
		}
	}

	async lastOnline(cache, data, clan) {
		if (this.client.channels.cache.has(cache.lastonline_channel)) {
			const channel = this.client.channels.cache.get(cache.lastonline_channel);
			if (channel.permissionsFor(channel.guild.me).has(permissions.concat('READ_MESSAGE_HISTORY'), false)) {
				const msg = this.messages.get(cache.lastonline_msg);
				if (msg) {
					return this.updateMessage(data, clan, msg)
						.catch(() => null);
				} else if (!msg) {
					const msg = await channel.messages.fetch(cache.lastonline_msg, false)
						.catch(error => {
							if (error.code === 500) return null;
							this.client.logger.warn(error, { label: 'LAST_ONLINE_FETCH_MESSAGE' });
							this.messages.set(cache.lastonline_msg, { id: null, editable: false, message: null });
							return null;
						});
					if (msg) {
						this.messages.set(cache.lastonline_msg, { editable: true, message: msg, id: msg.id });
						return this.updateMessage(data, clan, msg)
							.catch(() => null);
					}
				}
			}
		}
	}

	async clanEmbed(cache, clan, data) {
		if (this.client.channels.cache.has(cache.clan_embed_channel)) {
			const channel = this.client.channels.cache.get(cache.clan_embed_channel);
			if (channel.permissionsFor(channel.guild.me).has(permissions.concat('READ_MESSAGE_HISTORY'), false)) {
				const msg = this.embeds.get(cache.clan_embed_msg);
				if (msg) {
					return this.updateEmbed(data, clan, msg)
						.catch(() => null);
				} else if (!msg) {
					const msg = await channel.messages.fetch(cache.clan_embed_msg, false)
						.catch(error => {
							if (error.code === 500) return null;
							this.client.logger.warn(error, { label: 'CLAN_EMBED_FETCH_MESSAGE' });
							this.embeds.set(cache.clan_embed_msg, { id: null, editable: false, message: null });
							return null;
						});
					if (msg) {
						this.embeds.set(cache.clan_embed_msg, { editable: true, message: msg, id: msg.id });
						return this.updateEmbed(data, clan, msg)
							.catch(() => null);
					}
				}
			}
		}
	}

	async updateEmbed(data, clan, msg) {
		const message = msg.editable ? msg.message : null;
		if (!message) return null;
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.medium)
			.setThumbnail(clan.badgeUrls.medium)
			.setTitle('Open In-Game')
			.setURL(`https://link.clashofclans.com/?action=OpenClanProfile&tag=${clan.tag}`);
		if (data.embed.description) embed.setDescription(data.embed.description);
		else embed.setDescription(clan.description);
		if (data.embed.leader) {
			embed.addField(`${emoji.leader} Leader`, `<@!${data.embed.leader}>`);
		}
		if (data.embed.accepts) {
			embed.addField(`${emoji.townhall} Accepted Town-Hall`, data.embed.accepts.join(', '));
		}

		embed.addField(`${emoji.clan} War Info`, [
			`${clan.warWins} wins, ${clan.isWarLogPublic ? `${clan.warLosses} losses, ${clan.warTies} ties,` : ''} win streak ${clan.warWinStreak}`
		]);

		embed.setFooter(`Members [${clan.members}/50]`, this.client.user.displayAvatarURL())
			.setTimestamp();

		return message.edit({ embed }).catch(error => {
			this.embeds.delete(message.id);
			this.client.logger.warn(error, { label: 'CLAN_BANNER_MESSAGE' });
			return null;
		});
	}

	async updateMessage(data, clan, msg) {
		const message = msg.editable ? msg.message : null;
		if (!message) return null;
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.medium)
			.setDescription([
				`Last Online Board [${clan.members}/50]`,
				`\`\`\`\u200e${'Last On'.padStart(7, ' ')}   ${'Name'.padEnd(20, ' ')}\n${this.filter(data, clan)
					.map(m => `${m.lastOnline ? this.format(m.lastOnline + 1e3).padStart(7, ' ') : ''.padStart(7, ' ')}   ${this.padEnd(m.name)}`)
					.join('\n')}\`\`\``
			])
			.setFooter('Last Updated')
			.setTimestamp();

		return message.edit({ embed }).catch(error => {
			this.messages.delete(message.id);
			this.client.logger.warn(error, { label: 'LAST_ONLINE_EDIT_MESSAGE' });
			return null;
		});
	}

	padEnd(data) {
		return data.padEnd(20, ' ');
	}

	filter(data, clan) {
		const members = clan.memberList.map(member => {
			const lastOnline = member.tag in data.memberList
				? new Date() - new Date(data.memberList[member.tag].lastOnline)
				: null;
			return { tag: member.tag, name: member.name, lastOnline };
		});

		const sorted = members.sort((a, b) => a.lastOnline - b.lastOnline);

		return sorted.filter(item => item.lastOnline).concat(sorted.filter(item => !item.lastOnline));
	}

	format(time) {
		if (time > 864e5) {
			return moment.duration(time).format('d[d] H[h]', { trim: 'both mid' });
		} else if (time > 36e5) {
			return moment.duration(time).format('H[h] m[m]', { trim: 'both mid' });
		}
		return moment.duration(time).format('m[m] s[s]', { trim: 'both mid' });
	}

	async start() {
		for (const cache of Array.from(this.cached.values())) {
			await this.log(cache);
			await this.delay(200);
		}
	}

	async clan(tag) {
		const res = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(tag)}`, {
			method: 'GET',
			headers: {
				accept: 'application/json',
				authorization: `Bearer ${process.env.TRACKER_API}`,
				'cache-control': 'no-cache'
			},
			timeout: 3000
		}).catch(() => null);

		if (!res) return null;
		if (!res.ok) return null;

		return res.json().catch(() => null);
	}

	async player(tag) {
		const res = await fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`, {
			method: 'GET',
			headers: {
				accept: 'application/json',
				authorization: `Bearer ${process.env.TRACKER_API_P}`,
				'cache-control': 'no-cache'
			},
			timeout: 3000
		}).catch(() => null);

		if (!res) return null;
		if (!res.ok) return null;

		return res.json().catch(() => null);
	}
}

class ClanTracker {
	constructor(client) {
		this.client = client;
		this.cached = new Map();
		this.fastTracker = new FastTracker(this.client, this.cached);
		this.clangame = new ClanGames(this.client);
	}

	async init() {
		await this.load();
		await this.clangame.init();
		return this.fastTracker.init();
	}

	async load() {
		const data = await firestore.collection('tracking_clans')
			.get()
			.then(snapshot => {
				snapshot.forEach(doc => {
					const data = doc.data();
					if (this.client.guilds.cache.has(data.guild)) {
						this.add(data.tag, data.guild, data);
					}
				});
			});

		return data;
	}

	add(tag, guild, data) {
		this.clangame.add(tag, { tag: data.tag, guild: data.guild, enabled: true });

		if (data.donationlog) {
			data.donation_log_channel = data.donationlog.channel;
			data.color = data.donationlog.color;
		}

		if (data.memberlog) {
			data.member_log_channel = data.memberlog.channel;
		}

		if (data.lastonline) {
			data.lastonline_channel = data.lastonline.channel;
			data.lastonline_msg = data.lastonline.message;
		}

		if (data.clanembed) {
			data.clan_embed_channel = data.clanembed.channel;
			data.clan_embed_msg = data.clanembed.message;
		}

		// this.client.cwl.add(tag, true);
		const key = [guild, tag].join('');
		return this.cached.set(key, data);
	}

	push(data) {
		this.clangame.push({ tag: data.tag, guild: data.guild, enabled: true });
		return this.fastTracker.add(data);
	}

	delete(guild, tag) {
		const key = [guild, tag].join('');
		this.clangame.delete(tag);
		const clan = this.cached.get(key);
		if (clan && clan.intervalID) clearInterval(clan.intervalID);
		return this.cached.delete(key);
	}
}

module.exports = ClanTracker;
