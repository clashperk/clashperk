const MaintenanceHandler = require('./MaintenanceHandler');
const ClanActivityLog = require('./ClanActivityLog');
const { mongodb } = require('../struct/Database');
const ClanMemberLog = require('./ClanMemberLog');
const ClanEmbedLog = require('./ClanEmbedLog');
const { Op } = require('../util/constants');
const ClanGamesLog = require('./ClanGamesLog');
const DonationLog = require('./DonationLog');
const ClanWarLog = require('./ClanWarLog');
const { ObjectId } = require('mongodb');
const fetch = require('node-fetch');

class CacheHandler {
	constructor(client, { interval = 122 * 1000 } = {}) {
		this.client = client;
		this.members = {};
		this.cached = new Map();
		this.interval = interval;

		this.clanLog = new ClanMemberLog(client);
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
			case Op.DONATION_LOG:
				await this.donationLog.exec(data.tag, data);
				break;
			case Op.LAST_ONLINE_LOG:
				await this.activityLog.exec(data.tag, data.clan, data.update);
				break;
			case Op.CLAN_MEMBER_LOG:
				await this.clanLog.exec(data.tag, data);
				break;
			case Op.CLAN_EMBED_LOG:
				await this.clanembedLog.exec(data.tag, data.clan, data.forced);
				break;
			case Op.CLAN_GAMES_LOG:
				await this.clangamesLog.exec(data.tag, data.clan, data.forced, data.tags);
				break;
			case Op.CLAN_WAR_LOG:
				await this.clanwarLog.exec(data.tag, data.clan);
				break;
			default:
				break;
		}
	}

	season() {
		const now = new Date();
		let day = 0;
		let iso = new Date();
		while (true) {
			iso = new Date(now.getFullYear(), now.getMonth() + 1, day, 5, 0);
			if (iso.getDay() === 1) break;
			day -= 1;
		}

		const ms = new Date(iso) - new Date();
		if (ms > 0 && ms < Math.pow(2, 31)) {
			const id = setTimeout(async () => {
				clearTimeout(id);
				return this.activityLog.purge(iso);
			}, ms);
		}

		this.iso = new Date(iso);
		return { iso, ms };
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	async init() {
		await this.clanembedLog.init();
		await this.donationLog.init();
		await this.clanLog.init();
		await this.activityLog.init();
		await this.clangamesLog.init();
		this.clanwarLog.init();

		const collection = await mongodb.db('clashperk')
			.collection('clanstores')
			.find({ active: true })
			.sort({ patron: -1 })
			.toArray();

		for (const data of collection) {
			if (this.client.guilds.cache.has(data.guild)) {
				const clan = this.cached.get(data.tag) || { count: 0 };
				clan.count += 1;
				this.cached.set(data.tag, clan);
			}
		}

		this.client.logger.info(`Cache store Initialized ${this.cached.size}/${collection.length}`, { label: 'CACHE_STORE' });
		return this.launch();
	}

	async launch() {
		for (const tag of this.cached.keys()) {
			await this.start(tag);
			await this.delay(250);
		}
	}

	async add(_id, data) {
		const id = ObjectId(_id).toString();

		const OP = {
			[Op.DONATION_LOG]: this.donationLog,
			[Op.CLAN_MEMBER_LOG]: this.clanLog,
			[Op.LAST_ONLINE_LOG]: this.activityLog,
			[Op.CLAN_EMBED_LOG]: this.clanembedLog,
			[Op.CLAN_GAMES_LOG]: this.clangamesLog,
			[Op.CLAN_WAR_LOG]: this.clanwarLog
		};
		if (data && data.mode) {
			await OP[data.mode].add(_id);
		} else {
			await Promise.all([...Object.values(OP).map(Op => Op.add(id))]);
		}

		if (this.cached.has(data.tag)) {
			const cache = this.cached.get(data.tag);
			cache.count += 1;
			this.cached.set(data.tag, cache);
		}

		if (!this.cached.has(data.tag)) {
			this.cached.set(data.tag, { count: 1 });
			return this.start(data.tag);
		}
	}

	delete(_id, tag, data) {
		const id = ObjectId(_id).toString();
		const cache = this.cached.get(tag);

		const OP = {
			[Op.DONATION_LOG]: this.donationLog,
			[Op.CLAN_MEMBER_LOG]: this.clanLog,
			[Op.LAST_ONLINE_LOG]: this.activityLog,
			[Op.CLAN_EMBED_LOG]: this.clanembedLog,
			[Op.CLAN_GAMES_LOG]: this.clangamesLog,
			[Op.CLAN_WAR_LOG]: this.clanwarLog
		};
		if (data && data.mode) {
			OP[data.mode].delete(id, tag);
		} else {
			Object.values(OP).map(Op => Op.delete(id, tag));
		}

		if (!data && cache && cache.count > 1) {
			cache.count -= 1;
			this.cached.set(tag, cache);
		}

		if (!data && cache && cache.count <= 1) {
			delete this.members[tag];
			if (cache && cache.intervalId) clearInterval(cache.intervalId);
			return this.cached.delete(tag);
		}
	}

	dateId() {
		const now = new Date();
		return [
			now.getFullYear(),
			(now.getMonth() + 1).toString().padStart(2, '0'),
			now.getDate().toString().padStart(2, '0')
		].join('-').concat(`T${now.getHours().toString().padStart(2, '0')}:00`);
	}

	isReset(tag, newMembers = []) {
		const ms = new Date(this.iso) - new Date();
		if ((ms >= 0 && ms <= 9e5) || (ms < 0 && ms >= -9e5)) {
			const oldMembers = this.members[tag] ? Object.values(this.members[tag]) : [];
			const Old = oldMembers.reduce((a, m) => {
				const value = m.donations + m.donationsReceived;
				return a + value;
			}, 1);
			const New = newMembers.reduce((a, m) => {
				const value = m.donations + m.donationsReceived;
				return a + value;
			}, 1);

			return Old > New && ((Old - New) / Old) * 100 >= 90;
		}

		return false;
	}

	async start(tag) {
		const cache = this.cached.get(tag);
		if (!cache) return null;
		const clan = await this.clan(tag);
		if (!clan) return null;
		if (!clan.memberList.length) return null;

		const CurrentMemberList = clan.memberList.map(m => m.tag);
		const CurrentMemberSet = new Set(CurrentMemberList);
		const oldMemberList = this.members[tag] ? Object.keys(this.members[tag]) : [];
		const OldMemberSet = new Set(oldMemberList);

		const data = { tag, donated: [], received: [], donations: 0, receives: 0, event: Op.DONATION_LOG };

		const [update, set, inc, unset] = [{}, {}, {}, {}];
		for (const member of clan.memberList) {
			data.clan = {
				name: clan.name,
				tag: clan.tag,
				members: clan.members,
				badge: clan.badgeUrls.small
			};

			if (this.members[tag] && member.tag in this.members[tag]) {
				const donations = member.donations - this.members[tag][member.tag].donations;
				if (donations && donations > 0) {
					data.donations += donations;
					data.donated.push({ league: member.league.id, name: member.name, tag: member.tag, donated: donations });
				}
				const receives = member.donationsReceived - this.members[tag][member.tag].donationsReceived;
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

			const dateId = this.dateId();
			if (this.members[tag] && member.tag in this.members[tag]) {
				if (
					this.members[tag][member.tag].donations !== member.donations ||
					this.members[tag][member.tag].donationsReceived !== member.donationsReceived ||
					this.members[tag][member.tag].versusTrophies !== member.versusTrophies ||
					this.members[tag][member.tag].expLevel !== member.expLevel ||
					this.members[tag][member.tag].name !== member.name
				) {
					set.name = clan.name;
					set.tag = clan.tag;
					set.guild = cache.guild;
					set.updatedAt = new Date();
					set[`members.${member.tag}.lastOnline`] = new Date();
					set[`members.${member.tag}.tag`] = member.tag;
					inc[`members.${member.tag}.activities.${dateId}`] = 1;
				}
			} else if (OldMemberSet.size && !OldMemberSet.has(member.tag)) {
				set.name = clan.name;
				set.tag = clan.tag;
				set.guild = cache.guild;
				set.updatedAt = new Date();
				set[`members.${member.tag}.lastOnline`] = new Date();
				set[`members.${member.tag}.tag`] = member.tag;
				inc[`members.${member.tag}.activities.${dateId}`] = 1;
			}
		}

		if (CurrentMemberSet.size && OldMemberSet.size) {
			// eslint-disable-next-line no-unused-vars
			for (const member of oldMemberList.filter(tag => !CurrentMemberSet.has(tag))) {
				// unset[`members.${member}`] = '';
			}
		}

		if (Object.keys(set).length) update.$set = set;
		if (Object.keys(inc).length && !this.isReset(tag, clan.memberList)) update.$inc = inc;
		if (Object.keys(unset).length) update.$unset = unset;

		await this.broadcast({ tag, clan, update, event: Op.LAST_ONLINE_LOG });

		if (data.donated.length || data.received.length) {
			if (CurrentMemberSet.size && OldMemberSet.size && data.donations !== data.receives) {
				data.unmatched = {
					in: CurrentMemberList.filter(tag => !OldMemberSet.has(tag)).length,
					out: oldMemberList.filter(tag => !CurrentMemberSet.has(tag)).length
				};
			}

			await this.broadcast(data);
		}

		const temp = new Set();
		if (CurrentMemberSet.size && OldMemberSet.size) {
			const tags = [];
			for (const mTag of oldMemberList.filter(tag => !CurrentMemberSet.has(tag))) {
				if (this.members[tag] && this.members[tag][mTag]) {
					tags.push({
						tag: mTag,
						mode: 'LEFT',
						donated: this.members[tag][mTag].donations,
						received: this.members[tag][mTag].donationsReceived
					});
				} else {
					tags.push({ tag: mTag, mode: 'LEFT' });
				}
			}

			for (const tag of CurrentMemberList.filter(tag => !OldMemberSet.has(tag))) {
				tags.push({ tag, mode: 'JOINED' });
			}

			if (tags.length) {
				await this.broadcast({
					tag,
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
					event: Op.CLAN_MEMBER_LOG
				});

				await this.broadcast({ tag, clan, forced: true, event: Op.CLAN_EMBED_LOG });
				await this.broadcast({ tag, clan, forced: true, tags, event: Op.CLAN_GAMES_LOG });
				temp.add('ON_HOLD');
			}
		}

		if (!temp.delete('ON_HOLD')) {
			await this.broadcast({ tag, clan, event: Op.CLAN_EMBED_LOG });
			await this.broadcast({ tag, clan, event: Op.CLAN_GAMES_LOG });
		}

		this.members[tag] = {};
		for (const member of clan.memberList) {
			this.members[tag][member.tag] = member;
		}

		OldMemberSet.clear();
		CurrentMemberSet.clear();

		// callback
		if (cache && cache.intervalId) clearInterval(cache.intervalId);
		cache.intervalId = setInterval(this.start.bind(this), this.interval, tag);
		return this.cached.set(tag, cache);
	}

	async clan(tag) {
		const res = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(tag)}`, {
			method: 'GET',
			headers: {
				accept: 'application/json',
				authorization: `Bearer ${process.env.CLAN_AND_PLAYER_TOKEN}`
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
		this.clanwarLog.clear();

		this.members = {};
		return this.cached.clear();
	}
}

module.exports = CacheHandler;
