const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const { firestore, mongodb } = require('./Database');
const { townHallEmoji, leagueEmoji } = require('../util/emojis');
const { emoji } = require('../util/emojis');
const permissions = ['SEND_MESSAGES', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'VIEW_CHANNEL'];
const moment = require('moment');
require('moment-duration-format');

class FastTracker {
	constructor(client, cached) {
		this.client = client;
		this.cached = cached;
		this.donateList = {};
		this.oldMemberList = new Map();
		this.messages = new Map();
	}

	async init() {
		await this.start();
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	async add(data) {
		const cache = this.cached.get(`${data.guild}${data.tag}`);
		if (cache && cache.intervalID) clearInterval(cache.intervalID);

		return this.log(data);
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
		for (const member of clan.memberList) {
			item.clan = `${clan.name} (${clan.tag})`;
			item.clanBadge = clan.badgeUrls.small;
			item.members = clan.members;
			if (this.donateList[key] && member.tag in this.donateList[key]) {
				const donations = member.donations - this.donateList[key][member.tag].donations;
				if (donations && donations > 0) {
					item.donations += donations;
					item.donated += `${leagueEmoji[member.league.id]} **${member.name}** (${member.tag}) **»** ${donations} \n`;
				}
				const receives = member.donationsReceived - this.donateList[key][member.tag].donationsReceived;
				if (receives && receives > 0) {
					item.receives += receives;
					item.received += `${leagueEmoji[member.league.id]} **${member.name}** (${member.tag}) **»** ${receives} \n`;
				}
			} else if (oldMemberSet.size && !oldMemberSet.has(member.tag)) {
				const donations = member.donations;
				if (donations && donations > 0) {
					item.donations += donations;
					item.donated += `${leagueEmoji[member.league.id]} **${member.name}** (${member.tag}) **»** ${donations}* \n`;
				}
				const receives = member.donationsReceived;
				if (receives && receives > 0) {
					item.receives += receives;
					item.received += `${leagueEmoji[member.league.id]} **${member.name}** (${member.tag}) **»** ${receives}* \n`;
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
					await collection.findOneAndUpdate({
						tag: clan.tag
					}, {
						$set: {
							tag: clan.tag,
							name: clan.name,
							[`memberList.${member.tag}`]: {
								lastOnline: new Date(),
								name: member.name,
								tag: member.tag
							}
						}
					}, { upsert: true }).catch(error => this.client.logger.error(error, { label: 'MONGO_ERROR_OLD_MEMBER' }));
				}
			} else if (oldMemberSet.size && !oldMemberSet.has(member.tag)) {
				await collection.findOneAndUpdate({
					tag: clan.tag
				}, {
					$set: {
						tag: clan.tag,
						name: clan.name,
						[`memberList.${member.tag}`]: {
							lastOnline: new Date(),
							name: member.name,
							tag: member.tag
						}
					}
				}, { upsert: true }).catch(error => this.client.logger.error(error, { label: 'MONGO_ERROR_NEW_MEMBER' }));
			}
		}

		// Last Online - Purge Missing Players
		if (currentMemberSet.size && oldMemberSet.size) {
			const unset = {};
			const membersLeft = this.oldMemberList.get(key).filter(tag => !currentMemberSet.has(tag));
			for (const member of membersLeft) {
				unset[`memberList.${member}`] = '';
			}

			if (membersLeft.length) {
				await collection.updateOne({
					tag: clan.tag
				}, {
					$unset: unset
				}, { upsert: true }).catch(error => this.client.logger.error(error, { label: 'MONGO_ERROR_UNSET' }));
			}
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
					embed.addField('Unmatched Donations', [
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

		// Member Log
		this.memberlog(cache, clan, currentMemberList, oldMemberSet, currentMemberSet);

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

	async playerUpdate(clan, key, collection) {
		if (clan.tag !== '#8QU8J9LP') return;
		for (const tag of clan.memberList.map(m => m.tag)) {
			const member = await this.player(tag);
			if (!member) continue;
			if (this.donateList[key] && member.tag in this.donateList[key] && this.donateList[key][member.tag].attackWins) {
				if (this.donateList[key][member.tag].attackWins !== member.attackWins) {
					console.log(member.tag);
					await collection.findOneAndUpdate({
						tag: clan.tag
					}, {
						$set: {
							tag: clan.tag,
							name: clan.name,
							[`memberList.${member.tag}`]: {
								lastOnline: new Date(),
								name: member.name,
								tag: member.tag
							}
						}
					}, { upsert: true }).catch(error => console.log(error));
				}
			}

			await this.delay(150);
			this.donateList[key][member.tag].attackWins = member.attackWins;
		}
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
					const msg = await channel.messages.fetch(cache.lastonline_msg)
						.catch(error => {
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

	async updateMessage(data, clan, msg) {
		const message = msg.editable ? msg.message : null;
		if (!message) return null;
		const embed = this.client.util.embed()
			.setColor(0x5970c1)
			.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.medium)
			.setDescription([
				`\`\`\`\u200e${'Last On'.padStart(7, ' ')}   ${'Name'.padEnd(20, ' ')}\n${this.filter(data, clan)
					.map(m => `${m.lastOnline ? this.format(m.lastOnline + 1e3).padStart(7, ' ') : ''.padStart(7, ' ')}   ${this.padEnd(m.name)}`)
					.join('\n')}\`\`\``
			])
			.setTimestamp();

		return message.edit([
			'Last Online Board'
		], { embed }).catch(error => {
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
	}

	async init() {
		await this.load();
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

		this.client.cwl.add(tag, true);
		return this.cached.set(`${guild}${tag}`, data);
	}

	push(data) {
		return this.fastTracker.add(data);
	}

	delete(guild, tag) {
		const clan = this.cached.get(`${guild}${tag}`);
		if (clan && clan.intervalID) clearInterval(clan.intervalID);
		return this.cached.delete(`${guild}${tag}`);
	}
}

module.exports = ClanTracker;
