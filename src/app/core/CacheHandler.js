const MaintenanceHandler = require('./MaintenanceHandler');
const ClanActivityLog = require('./ClanActivityLog');
const { mongodb } = require('../struct/Database');
const ClanEmbedLog = require('./ClanEmbedLog');
const { Modes } = require('../util/constants');
const ClanGamesLog = require('./ClanGamesLog');
const DonationLog = require('./DonationLog');
const ClanWarLog = require('./ClanWarLog');
const { ObjectId } = require('mongodb');
const ClanLog = require('./ClanLog');
const fetch = require('node-fetch');

class CacheHandler {
	constructor(client, { interval = 122 * 1000 } = {}) {
		this.client = client;
		this.memberList = {};
		this.cached = new Map();
		this.interval = interval;

		this.clanLog = new ClanLog(client);
		this.clanwarLog = new ClanWarLog(client);
		this.donationLog = new DonationLog(client);
		this.clanembedLog = new ClanEmbedLog(client);
		this.clangamesLog = new ClanGamesLog(client);
		this.activityLog = new ClanActivityLog(client);

		this.maintenanceHandler = new MaintenanceHandler(client);
		this.maintenanceHandler.init();
	}

	async broadcast(data) {
		switch (data.event) {
			case Modes.DONATION_LOG:
				await this.donationLog.exec(data._id, data);
				break;
			case Modes.ACTIVITY_LOG:
				await this.activityLog.exec(data._id, data.clan, data.update);
				break;
			case Modes.CLAN_LOG:
				await this.clanLog.exec(data._id, data);
				break;
			case Modes.CLAN_EMBED_LOG:
				await this.clanembedLog.exec(data._id, data.clan, data.forced);
				break;
			case Modes.CLAN_GAMES_LOG:
				await this.clangamesLog.exec(data._id, data.clan, data.forced, data.tags);
				break;
			case Modes.CLAN_WAR_LOG:
				await this.clanwarLog.exec(data._id, data.clan);
				break;
			default:
				break;
		}
	}

	async init() {
		await this.clanembedLog.init();
		await this.donationLog.init();
		await this.clanLog.init();
		await this.activityLog.init();
		await this.clangamesLog.init();
		await this.clanwarLog.init();

		const collection = await mongodb.db('clashperk')
			.collection('clanstores')
			.find()
			.toArray();

		for (const data of collection) {
			if (this.client.guilds.cache.has(data.guild) && !data.active) {
				this.cached.set(ObjectId(data._id).toString(), {
					// _id: data._id,
					guild: data.guild,
					tag: data.tag
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
			await this.delay(250);
		}
	}

	async add(_id, data) {
		const id = ObjectId(_id).toString();

		if (data && data.mode) {
			const Op = {
				[Modes.DONATION_LOG]: this.donationLog,
				[Modes.CLAN_LOG]: this.clanLog,
				[Modes.ACTIVITY_LOG]: this.activityLog,
				[Modes.CLAN_EMBED_LOG]: this.clanembedLog,
				[Modes.CLAN_GAMES_LOG]: this.clangamesLog,
				[Modes.CLAN_WAR_LOG]: this.clanwarLog
			}[data.mode];
			await Op.init(_id);
		} else {
			await this.clanLog.add(id);
			await this.clanwarLog.add(id);
			await this.donationLog.add(id);
			await this.activityLog.add(id);
			await this.clanembedLog.add(id);
			await this.clangamesLog.add(id);
		}

		if (!this.cached.has(id)) {
			this.cached.set(id, {
				// guild: data.guild,
				tag: data.tag
			});
			return this.start(id);
		}
	}

	delete(_id, data) {
		const id = ObjectId(_id).toString();
		const cache = this.cached.get(id);

		if (data && data.mode) {
			const Op = {
				[Modes.DONATION_LOG]: this.donationLog,
				[Modes.CLAN_LOG]: this.clanLog,
				[Modes.ACTIVITY_LOG]: this.activityLog,
				[Modes.CLAN_EMBED_LOG]: this.clanembedLog,
				[Modes.CLAN_GAMES_LOG]: this.clangamesLog,
				[Modes.CLAN_WAR_LOG]: this.clanwarLog
			}[data.mode];
			Op.delete(id);
		} else {
			this.clanLog.delete(id);
			this.clanwarLog.delete(id);
			this.donationLog.delete(id);
			this.activityLog.delete(id);
			this.clanembedLog.delete(id);
			this.clangamesLog.delete(id);
		}

		if (!data) {
			delete this.memberList[id];
			if (cache && cache.intervalId) clearInterval(cache.intervalId);
			return this.cached.delete(id);
		}
	}

	async start(key) {
		const cache = this.cached.get(key);
		if (!cache) return;
		const clan = await this.clan(cache.tag);
		if (!clan) return;
		if (!clan.memberList.length) return;

		const CurrentMemberList = clan.memberList.map(m => m.tag);
		const CurrentMemberSet = new Set(CurrentMemberList);
		const oldMemberList = this.memberList[key] ? Object.keys(this.memberList[key]) : [];
		const OldMemberSet = new Set(oldMemberList);

		const data = {
			_id: key,
			donated: [],
			received: [],
			donations: 0,
			receives: 0,
			event: Modes.DONATION_LOG
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
			for (const member of oldMemberList.filter(tag => !CurrentMemberSet.has(tag))) {
				$unset[`members.${member}`] = '';
			}
		}

		const $update = {};
		if (Object.keys($set).length) $update.$set = $set;
		if (Object.keys($unset).length) $update.$unset = $unset;

		// Clan War
		if (clan.isWarLogPublic) {
			await this.broadcast({
				_id: key,
				clan,
				event: Modes.CLAN_WAR_LOG
			});
		}

		// Last Online
		await this.broadcast({
			_id: key,
			clan,
			update: $update,
			event: Modes.ACTIVITY_LOG
		});

		// Donation Log
		if (data.donated.length || data.received.length) {
			if (CurrentMemberSet.size && OldMemberSet.size && data.donations !== data.receives) {
				data.unmatched = {
					joined: CurrentMemberList.filter(tag => !OldMemberSet.has(tag)).length,
					left: oldMemberList.filter(tag => !CurrentMemberSet.has(tag)).length
				};
			}

			await this.broadcast(data);
		}

		// Member Log
		const temp = new Set();
		if (CurrentMemberSet.size && OldMemberSet.size) {
			const tags = [];
			for (const tag of oldMemberList.filter(tag => !CurrentMemberSet.has(tag))) {
				if (this.memberList[key] && this.memberList[key][tag]) {
					tags.push({
						tag,
						mode: 'LEFT',
						donated: this.memberList[key][tag].donations,
						received: this.memberList[key][tag].donationsReceived
					});
				} else {
					tags.push({ tag, mode: 'LEFT' });
				}
			}

			for (const tag of CurrentMemberList.filter(tag => !OldMemberSet.has(tag))) {
				tags.push({ tag, mode: 'JOINED' });
			}

			if (tags.length) {
				await this.broadcast({
					_id: key,
					tags: tags.map(tag => ({
						value: Math.random(),
						tag: tag.tag,
						mode: tag.mode,
						donated: tag.donated || 0,
						received: tag.received || 0
					})),
					clan: {
						name: clan.name,
						tag: clan.tag,
						badge: clan.badgeUrls.small
					},
					event: Modes.CLAN_LOG
				});

				// Force update clan embed
				await this.broadcast({
					_id: key,
					clan,
					forced: true,
					event: Modes.CLAN_EMBED_LOG
				});

				// Clan Games
				await this.broadcast({
					_id: key,
					clan,
					forced: true,
					tags,
					event: Modes.CLAN_GAMES_LOG
				});

				temp.add('ON_HOLD');
			}
		}

		// Clan Embed
		if (!temp.delete('ON_HOLD')) {
			await this.broadcast({
				_id: key,
				clan,
				event: Modes.CLAN_EMBED_LOG
			});

			// Clan Games
			await this.broadcast({
				_id: key,
				clan,
				event: Modes.CLAN_GAMES_LOG
			});
		}

		// Purge Cache
		this.memberList[key] = {};
		for (const member of clan.memberList) {
			this.memberList[key][member.tag] = member;
		}

		OldMemberSet.clear();
		CurrentMemberSet.clear();

		// Callback
		if (cache && cache.intervalId) clearInterval(cache.intervalId);
		const intervalId = setInterval(this.start.bind(this), this.interval, key);
		cache.intervalId = intervalId;
		this.cached.set(key, cache);
	}

	async clan(tag) {
		const res = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(tag)}`, {
			method: 'GET',
			headers: {
				accept: 'application/json',
				authorization: `Bearer ${process.env.$DEV_TOKEN}`
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

		this.clanembedLog.cached.clear();
		this.donationLog.cached.clear();
		this.clanLog.cached.clear();
		this.activityLog.cached.clear();
		this.clangamesLog.cached.clear();

		this.memberList = {};
		return this.cached.clear();
	}
}

module.exports = CacheHandler;
