const MaintenanceHandler = require('./MaintenanceHandler');
const ClanActivityLog = require('./ClanActivityLog');
const { mongodb } = require('../struct/Database');
const ClanEmbedLog = require('./ClanEmbedLog');
const { Modes } = require('../util/constants');
const ClanGamesLog = require('./ClanGamesLog');
const DonationLog = require('./DonationLog');
const ClanWarLog = require('./ClanWarLive');
const { ObjectId } = require('mongodb');
const ClanLog = require('./ClanLog');
const fetch = require('node-fetch');

class CacheHandler {
	constructor(client, { interval = 122 * 1000 } = {}) {
		this.client = client;
		this.members = {};
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

	async init() {
		await this.clanembedLog.init();
		await this.donationLog.init();
		await this.clanLog.init();
		await this.activityLog.init();
		await this.clangamesLog.init();
		await this.clanwarLog.init();

		const collection = await mongodb.db('clashperk')
			.collection('clanstores')
			.find({ active: true })
			.sort({ patron: -1 })
			.toArray();

		for (const data of collection) {
			if (this.client.guilds.cache.has(data.guild)) {
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
		for (const id of this.cached.keys()) {
			await this.start(id);
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
			await Op.add(_id);
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
				guild: data.guild,
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
			delete this.members[id];
			if (cache && cache.intervalId) clearInterval(cache.intervalId);
			return this.cached.delete(id);
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

	isReset(id, newMembers = []) {
		const ms = new Date() - new Date(this.iso);
		if (ms <= 9e5 || ms >= -9e5) {
			const oldMembers = this.members[id] ? Object.values(this.members[id]) : [];
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

	async start(id) {
		const cache = this.cached.get(id);
		if (!cache) return null;
		const clan = await this.clan(cache.tag);
		if (!clan) return null;
		if (!clan.memberList.length) return null;

		const CurrentMemberList = clan.memberList.map(m => m.tag);
		const CurrentMemberSet = new Set(CurrentMemberList);
		const oldMemberList = this.members[id] ? Object.keys(this.members[id]) : [];
		const OldMemberSet = new Set(oldMemberList);

		const data = { _id: id, donated: [], received: [], donations: 0, receives: 0, event: Modes.DONATION_LOG };

		const [update, set, inc, unset] = [{}, {}, {}, {}];
		for (const member of clan.memberList) {
			data.clan = {
				name: clan.name,
				tag: clan.tag,
				members: clan.members,
				badge: clan.badgeUrls.small
			};

			if (this.members[id] && member.tag in this.members[id]) {
				const donations = member.donations - this.members[id][member.tag].donations;
				if (donations && donations > 0) {
					data.donations += donations;
					data.donated.push({ league: member.league.id, name: member.name, tag: member.tag, donated: donations });
				}
				const receives = member.donationsReceived - this.members[id][member.tag].donationsReceived;
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
			if (this.members[id] && member.tag in this.members[id]) {
				if (
					this.members[id][member.tag].donations !== member.donations ||
					this.members[id][member.tag].donationsReceived !== member.donationsReceived ||
					this.members[id][member.tag].versusTrophies !== member.versusTrophies ||
					this.members[id][member.tag].expLevel !== member.expLevel ||
					this.members[id][member.tag].name !== member.name
				) {
					set.name = clan.name;
					set.tag = clan.tag;
					set.guild = cache.guild;
					set.clan_id = ObjectId(id);
					set[`members.${member.tag}.lastOnline`] = new Date();
					set[`members.${member.tag}.tag`] = member.tag;
					inc[`members.${member.tag}.activities.${dateId}`] = 1;
				}
			} else if (OldMemberSet.size && !OldMemberSet.has(member.tag)) {
				set.name = clan.name;
				set.tag = clan.tag;
				set.guild = cache.guild;
				set.clan_id = ObjectId(id);
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
		if (Object.keys(inc).length && !this.isReset(id, clan.memberList)) update.$inc = inc;
		if (Object.keys(unset).length) update.$unset = unset;

		await this.broadcast({ _id: id, clan, update, event: Modes.ACTIVITY_LOG });

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
			for (const tag of oldMemberList.filter(tag => !CurrentMemberSet.has(tag))) {
				if (this.members[id] && this.members[id][tag]) {
					tags.push({
						tag,
						mode: 'LEFT',
						donated: this.members[id][tag].donations,
						received: this.members[id][tag].donationsReceived
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
					_id: id,
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

				await this.broadcast({ _id: id, clan, forced: true, event: Modes.CLAN_EMBED_LOG });
				await this.broadcast({ _id: id, clan, forced: true, tags, event: Modes.CLAN_GAMES_LOG });
				temp.add('ON_HOLD');
			}
		}

		if (!temp.delete('ON_HOLD')) {
			await this.broadcast({ _id: id, clan, event: Modes.CLAN_EMBED_LOG });
			await this.broadcast({ _id: id, clan, event: Modes.CLAN_GAMES_LOG });
		}

		this.members[id] = {};
		for (const member of clan.memberList) {
			this.members[id][member.tag] = member;
		}

		OldMemberSet.clear();
		CurrentMemberSet.clear();

		// callback
		if (cache && cache.intervalId) clearInterval(cache.intervalId);
		cache.intervalId = setInterval(this.start.bind(this), this.interval, id);
		return this.cached.set(id, cache);
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
		this.clanwarLog.clear();

		this.members = {};
		return this.cached.clear();
	}
}

module.exports = CacheHandler;
