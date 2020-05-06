const fetch = require('node-fetch');
const { mongodb } = require('../struct/Database');
const ClanEmbed = require('./ClanEmbedEvent');
const DonationEvent = require('./DonationEvent');
const LastOnlineEvent = require('./LastOnlineEvent');
const ClanGamesEvent = require('./ClanGamesEvent');
const PlayerEvent = require('./PlayerEvent');
const { ObjectId } = require('mongodb');
const { MODES, EVENTS } = require('../util/constants');

class CacheHandler {
	constructor(client) {
		this.client = client;
		this.cached = new Map();
		this.oldMemberList = new Map();
		this.memberList = {};

		this.clanEmbed = new ClanEmbed(client);
		this.clanEvent = new DonationEvent(client);
		this.lastOnline = new LastOnlineEvent(client);
		this.playerEvent = new PlayerEvent(client);
		this.clanGame = new ClanGamesEvent(client);
	}

	async broadcast(data) {
		switch (data.event) {
			case 'CLAN_DONATION_EVENT':
				await this.clanEvent.exec(data._id, data);
				break;
			case 'LAST_ONLINE_EVENT':
				await this.lastOnline.exec(data._id, data.clan, data.update);
				break;
			case 'CLAN_MEMBER_ACTION':
				await this.playerEvent.exec(data._id, data);
				break;
			case 'CLAN_EMBED_EVENT':
				await this.clanEmbed.exec(data._id, data.clan);
				break;
			case 'CLAN_GAMES_EVENT':
				await this.clanGame.exec(data._id, data.clan);
				break;
			default:
				break;
		}
	}

	async init() {
		await this.clanEmbed.init();
		await this.clanEvent.init();
		await this.playerEvent.init();
		await this.lastOnline.init();
		await this.clanGame.init();

		const collection = await mongodb.db('clashperk')
			.collection('clanstores')
			.find()
			.toArray();

		for (const item of collection) {
			if (this.client.guilds.cache.has(item.guild)) {
				this.cached.set(ObjectId(item._id).toString(), {
					_id: item._id,
					tag: item.tag,
					guild: item.guild
				});
			}
		}

		this.client.logger.info(`Cache store Initialized ${this.cached.size}/${collection.length}`, { label: 'CACHE_STORE' });

		return this.launch();
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	async launch() {
		for (const key of this.cached.keys()) {
			await this.start(key);
			await this.delay(500);
		}
	}

	async add(_id, data) {
		const id = ObjectId(_id).toString();
		const cache = this.cached.get(id);
		if (cache && cache.intervalId) clearInterval(cache.intervalId);

		this.cached.set(id, { guild: data.guild, tag: data.tag });

		if (data && data.mode) {
			this.addLogs(_id, data.mode);
		} else {
			await this.clanEvent.add(id);
			await this.lastOnline.add(id);
			await this.clanEmbed.add(id);
			await this.clanGame.add(id);
			await this.playerEvent.add(id);
		}

		return this.start(id);
	}

	async addLogs(_id, mode) {
		if (mode === MODES[1]) return this.clanEvent.add(_id);
		if (mode === MODES[2]) return this.playerEvent.add(_id);
		if (mode === MODES[3]) return this.lastOnline.add(_id);
		if (mode === MODES[4]) return this.clanEmbed.add(_id);
		if (mode === MODES[5]) return this.clanGame.add(_id);
	}

	delete(_id, data) {
		const id = ObjectId(_id).toString();
		const cache = this.cached.get(id);
		delete this.memberList[id];
		this.oldMemberList.delete(id);
		if (cache && cache.intervalId) clearInterval(cache.intervalId);

		if (data && data.mode) {
			this.stopLogs(id, data.mode);
		} else {
			this.clanEmbed.delete(id);
			this.clanEvent.delete(id);
			this.playerEvent.delete(id);
			this.lastOnline.delete(id);
			this.clanGame.delete(id);
		}

		return this.cached.delete(id);
	}

	async stopLogs(id, mode) {
		if (mode === MODES[1]) return this.clanEvent.delete(id);
		if (mode === MODES[2]) return this.playerEvent.delete(id);
		if (mode === MODES[3]) return this.lastOnline.delete(id);
		if (mode === MODES[4]) return this.clanEmbed.delete(id);
		if (mode === MODES[5]) return this.clanGame.delete(id);
	}

	async start(key) {
		const cache = this.cached.get(key);

		const clan = await this.clan(cache.tag);
		if (!clan) return;

		const CurrentMemberList = clan.memberList.map(m => m.tag);
		const CurrentMemberSet = new Set(CurrentMemberList);
		const OldMemberSet = new Set(this.oldMemberList.get(key));

		const data = {
			_id: key,
			donated: [],
			received: [],
			donations: 0,
			receives: 0,
			event: EVENTS[1]
		};

		const $set = {};
		for (const member of clan.memberList) {
			data.clan = {
				name: clan.name,
				tag: clan.tag,
				members: clan.members,
				badge: clan.badgeUrls.small
			};

			if (this.memberList[key] && member.tag in this.memberList[key]) {
				const donations = member.donations - this.memberList[key][member.tag].donations;
				if (donations && donations > 0) {
					data.donations += donations;
					data.donated.push({ league: member.league.id, name: member.name, tag: member.tag, donated: donations });
				}
				const receives = member.donationsReceived - this.memberList[key][member.tag].donationsReceived;
				if (receives && receives > 0) {
					data.receives += receives;
					data.received.push({ league: member.league.id, name: member.name, tag: member.tag, received: receives });
				}
			} else if (OldMemberSet.size && !OldMemberSet.has(member.tag)) {
				const donations = member.donations;
				if (donations && donations > 0) {
					data.donations += donations;
					data.donated.push({ league: member.league.id, name: member.name, tag: member.tag, donated: donations });
				}
				const receives = member.donationsReceived;
				if (receives && receives > 0) {
					data.receives += receives;
					data.received.push({ league: member.league.id, name: member.name, tag: member.tag, received: receives });
				}
			}

			// Update MongoDB - Last Online
			if (this.memberList[key] && member.tag in this.memberList[key]) {
				if (
					this.memberList[key][member.tag].donations !== member.donations ||
					this.memberList[key][member.tag].donationsReceived !== member.donationsReceived ||
					this.memberList[key][member.tag].versusTrophies !== member.versusTrophies ||
					this.memberList[key][member.tag].expLevel !== member.expLevel ||
					this.memberList[key][member.tag].name !== member.name
				) {
					$set.name = clan.name;
					$set.tag = clan.tag;
					$set[`members.${member.tag}`] = { lastOnline: new Date(), tag: member.tag };
				}
			} else if (OldMemberSet.size && !OldMemberSet.has(member.tag)) {
				$set.name = clan.name;
				$set.tag = clan.tag;
				$set[`members.${member.tag}`] = { lastOnline: new Date(), tag: member.tag };
			}
		}

		// Last Online - Purge Missing Players
		const $unset = {};
		if (CurrentMemberSet.size && OldMemberSet.size) {
			for (const member of this.oldMemberList.get(key).filter(tag => !CurrentMemberSet.has(tag))) {
				$unset[`members.${member}`] = '';
			}
		}

		const $update = {};
		if (Object.keys($set).length) $update.$set = $set;
		if (Object.keys($unset).length) $update.$unset = $unset;

		// Last Online
		await this.broadcast({
			_id: key,
			clan,
			update: $update,
			event: EVENTS[3]
		});

		// Clan Embed
		await this.broadcast({
			_id: key,
			clan,
			event: EVENTS[4]
		});

		// Clan Games
		await this.broadcast({
			_id: key,
			clan,
			event: EVENTS[5]
		});

		// Donation Log
		if (data.donated.length || data.received.length) {
			if (CurrentMemberSet.size && OldMemberSet.size) {
				const joined = CurrentMemberList.filter(tag => !OldMemberSet.has(tag));
				const left = this.oldMemberList.get(key).filter(tag => !CurrentMemberSet.has(tag));
				if (data.donations !== data.receives && (joined.length || left.length)) {
					data.unmatched = { joined: joined.length, left: left.length };
				}
			}

			await this.broadcast(data);
		}

		// Member Log
		if (CurrentMemberSet.size && OldMemberSet.size) {
			const tags = [];
			for (const tag of this.oldMemberList.get(key).filter(tag => !CurrentMemberSet.has(tag))) {
				tags.push({ tag, mode: 'LEFT' });
			}

			for (const tag of CurrentMemberList.filter(tag => !OldMemberSet.has(tag))) {
				tags.push({ tag, mode: 'JOINED' });
			}

			if (tags.length) {
				await this.broadcast({
					_id: key,
					tags,
					clan: {
						name: clan.name,
						tag: clan.tag,
						badge: clan.badgeUrls.small
					},
					event: EVENTS[2]
				});
			}
		}

		// Purge Cache
		this.memberList[key] = {};
		for (const member of clan.memberList) {
			this.memberList[key][member.tag] = member;
		}

		this.oldMemberList.set(key, []);
		this.oldMemberList.set(key, CurrentMemberList);
		OldMemberSet.clear();
		CurrentMemberSet.clear();

		// Callback
		if (cache && cache.intervalId) clearInterval(cache.intervalId);
		const intervalId = setInterval(this.start.bind(this), 1.5 * 60 * 1000, key);
		cache.intervalId = intervalId;
		this.cached.set(key, cache);
	}

	async clan(tag) {
		const res = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(tag)}`, {
			method: 'GET',
			headers: {
				accept: 'application/json',
				authorization: `Bearer ${process.env.CLAN_EVENTS_API}`
			},
			timeout: 5000
		}).catch(() => null);

		if (!res) return null;
		if (!res.ok) return null;
		return res.json().catch(() => null);
	}

	async flush() {
		for (const key of this.cached.keys()) {
			const cache = this.cached.get(key);
			if (cache && cache.intervalId) clearInterval(cache.intervalId);
		}

		this.clanEmbed.cached.clear();
		this.clanEvent.cached.clear();
		this.playerEvent.cached.clear();
		this.lastOnline.cached.clear();
		this.clanGame.cached.clear();

		return this.cached.clear();
	}
}

module.exports = CacheHandler;
