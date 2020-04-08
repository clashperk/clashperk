const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');
const { firestore, mongodb } = require('./Database');
const { townHallEmoji, leagueEmoji } = require('../util/emojis');
const { emoji } = require('../util/emojis');
const permissions = ['SEND_MESSAGES', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'VIEW_CHANNEL'];

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
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	async add(data) {
		const cache = this.cached.get(`${data.guild}${data.tag}`);
		if (cache && cache.intervalID) clearInterval(cache.intervalID);

		return this.update(data);
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
					await channel.send({ embed });
				} catch (error) {
					this.client.logger.error(error.toString(), { label: 'PLAYER_LOG_MESSAGE' });
				}

				await this.delay(200);
			}
		}

		// missing players
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
		if (cache && cache.intervalID) clearInterval(cache.intervalID);
		const collection = mongodb.db('clashperk').collection('lastonlines');
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

			// MongoDB
			if (this.donateList[clan.tag] && member.tag in this.donateList[clan.tag]) {
				if (
					this.donateList[clan.tag][member.tag].donations !== member.donations ||
					this.donateList[clan.tag][member.tag].donationsReceived !== member.donationsReceived ||
					this.donateList[clan.tag][member.tag].versusTrophies !== member.versusTrophies ||
					this.donateList[clan.tag][member.tag].expLevel !== member.expLevel ||
					this.donateList[clan.tag][member.tag].name !== member.name
				) {
					console.log('Member Activity', member.tag);
					await collection.findOneAndUpdate({
						tag: clan.tag
					}, {
						$set: {
							tag: clan.tag,
							name: clan.name,
							[`memberList.${member.tag}`]: {
								lastOnline: new Date(),
								name: member.name,
								tag: member.tag,
								donationsReceived: member.donationsReceived,
								donations: member.donations,
								versusTrophies: member.versusTrophies,
								expLevel: member.expLevel
							}
						}
					}, { upsert: true }).catch(error => console.log(error));
				}
			} else if (oldMemberSet.size && !oldMemberSet.has(member.tag)) {
				console.log('New Member', member.tag);
				await collection.findOneAndUpdate({
					tag: clan.tag
				}, {
					$set: {
						tag: clan.tag,
						name: clan.name,
						[`memberList.${member.tag}`]: {
							lastOnline: new Date(),
							name: member.name,
							tag: member.tag,
							donationsReceived: member.donationsReceived,
							donations: member.donations,
							versusTrophies: member.versusTrophies,
							expLevel: member.expLevel
						}
					}
				}, { upsert: true }).catch(error => console.log(error));
			}
		}

		if (currentMemberSet.size && oldMemberSet.size) {
			const unset = {};
			const leftMembers = this.donateMemberList.get(key).filter(tag => !currentMemberSet.has(tag));
			for (const member of leftMembers) {
				unset[`memberList.${member}`] = '';
			}

			if (leftMembers.length) {
				console.log('Member Deleted', unset);
				await collection.updateOne({
					tag: clan.tag
				}, {
					$unset: unset
				}, { upsert: true }).catch(error => console.log(error));
			}
		}

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

		const intervalID = setInterval(this.update.bind(this), 1.5 * 60 * 1000, cache);
		cache.intervalID = intervalID;
		this.cached.set(key, cache);
	}

	async update(cache) {
		if (this.client.channels.cache.has(cache.donation_log_channel)) {
			const channel = this.client.channels.cache.get(cache.donation_log_channel);
			if (channel.permissionsFor(channel.guild.me).has(permissions, false)) {
				const data = await this.clan(cache.tag);
				if (!data) return;
				this.donationlog(data, cache, channel);

				if (this.client.channels.cache.get(cache.member_log_channel)) {
					const channel = this.client.channels.cache.get(cache.member_log_channel);
					if (channel.permissionsFor(channel.guild.me).has(permissions, false)) {
						this.memberlog(data, cache, channel);
					}
				}
			}
		} else if (this.client.channels.cache.has(cache.member_log_channel)) {
			const channel = this.client.channels.cache.get(cache.member_log_channel);
			if (channel.permissionsFor(channel.guild.me).has(permissions, false)) {
				const data = await this.clan(cache.tag);
				if (!data) return;
				this.memberlog(data, cache, channel, channel);
			}
		} else {
			if (cache && cache.intervalID) clearInterval(cache.intervalID);
			this.cached.delete(`${cache.guild}${cache.tag}`);
			this.client.logger.warn('UNKNOWN_CHANNEL', { label: 'NOT_FOUND' });
		}
	}

	async start() {
		for (const cache of Array.from(this.cached.values())) {
			if (this.client.channels.cache.has(cache.donation_log_channel)) {
				const channel = this.client.channels.cache.get(cache.donation_log_channel);
				if (channel.permissionsFor(channel.guild.me).has(permissions, false)) {
					const data = await this.clan(cache.tag);
					if (!data) continue;
					this.donationlog(data, cache, channel);

					if (this.client.channels.cache.get(cache.member_log_channel)) {
						const channel = this.client.channels.cache.get(cache.member_log_channel);
						if (channel.permissionsFor(channel.guild.me).has(permissions, false)) {
							this.memberlog(data, cache, channel);
						}
					}

					await this.delay(100);
				}
			} else if (this.client.channels.cache.has(cache.member_log_channel)) {
				const channel = this.client.channels.cache.get(cache.member_log_channel);
				if (channel.permissionsFor(channel.guild.me).has(permissions, false)) {
					const data = await this.clan(cache.tag);
					if (!data) continue;
					this.memberlog(data, cache, channel, channel);

					await this.delay(100);
				}
			} else {
				this.cached.delete(`${cache.guild}${cache.tag}`);
				this.client.logger.warn('UNKNOWN_CHANNEL', { label: 'NOT_FOUND' });
			}
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
				authorization: `Bearer ${process.env.TRACKER_API}`,
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
