const fetch = require('node-fetch');
const { mongodb } = require('../struct/Database');
const ClanEmbed = require('./ClanEmbed');
const DonationEvent = require('./DonationEvent');
const LastOnlineEvent = require('./LastOnlineEvent');
const PlayerEvent = require('./PlayerEvent');
const { ObjectId } = require('mongodb');

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
	}

	async broadcast(data) {
		switch (data.mode) {
			case 'CLAN_DONATION_EVENT':
				this.clanEvent.exec(data._id, data);
				break;
			case 'LAST_ONLINE_EVENT':
				this.lastOnline.exec(data._id, data.clan, data.update);
				break;
			case 'CLAN_MEMBER_ACTION':
				this.playerEvent.exec(data._id, data);
				break;
			case 'CLAN_EMBED_EVENT':
				this.clanEmbed.exec(data._id, data.clan);
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

		// console.log(collection);

		this.client.logger.info('Cache store Initialized', { label: 'CACHE_STORE' });

		return this.launch();
	}

	async delay(ms) {
		return new Promise(res => setTimeout(res, ms));
	}

	async launch() {
		for (const key of this.cached.keys()) {
			// console.log(key);
			// console.log(typeof key);
			await this.start(key);
			await this.delay(500);
		}
	}

	add(key, value) {
		const cache = this.cached.get(key);
		if (cache && cache.timeoutId) clearTimeout(cache.timeoutId);
		this.cached.set(key, value);
		return this.start(key);
	}

	delete(key) {
		const cache = this.cached.get(key);
		if (cache && cache.timeoutId) clearTimeout(cache.timeoutId);
		this.clanEmbed.delete(key);
		this.clanEvent.delete(key);
		this.playerEvent.delete(key);
		this.lastOnline.delete(key);
		return this.cached.delete(key);
	}

	async start(key) {
		const cache = this.cached.get(key);
		console.log(cache);

		const clan = await this.clan(cache.tag);
		if (!clan) return;
		console.log([clan.name, clan.tag]);

		if (cache && cache.timeoutId) clearTimeout(cache.timeoutId);

		const CurrentMemberList = clan.memberList.map(m => m.tag);
		const CurrentMemberSet = new Set(CurrentMemberList);
		const OldMemberSet = new Set(this.oldMemberList.get(key));

		const data = {
			_id: key,
			donated: [],
			received: [],
			donations: 0,
			receives: 0,
			mode: 'CLAN_DONATION_EVENT'
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

		// Last Online - Send Message
		this.broadcast({
			_id: key,
			clan,
			update: $update,
			mode: 'LAST_ONLINE_EVENT'
		});

		// Clan Embed
		this.broadcast({
			_id: key,
			clan,
			mode: 'CLAN_EMBED_EVENT'
		});

		// Donation Log - Send Message
		if (data.donated.length || data.received.length) {
			if (CurrentMemberSet.size && OldMemberSet.size) {
				const joined = CurrentMemberList.filter(tag => !OldMemberSet.has(tag));
				const left = this.oldMemberList.get(key).filter(tag => !CurrentMemberSet.has(tag));
				if (data.donations !== data.receives && (joined.length || left.length)) {
					data.unmatched = { joined: joined.length, left: left.length };
				}
			}

			this.broadcast(data);
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
				this.broadcast({
					_id: key,
					tags,
					clan: {
						name: clan.name,
						tag: clan.tag,
						badge: clan.badgeUrls.small
					},
					mode: 'CLAN_MEMBER_ACTION'
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
		const timeoutId = setTimeout(this.start.bind(this), 1.5 * 60 * 1000, key);
		cache.timeoutId = timeoutId;
		this.cached.set(key, cache);
	}

	async clan(tag) {
		const res = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(tag)}`, {
			method: 'GET',
			headers: {
				accept: 'application/json',
				authorization: `Bearer ${process.env.CLASH_OF_CLANS_API}`
			},
			timeout: 5000
		}).catch(() => null);

		if (!res) return null;
		if (!res.ok) return null;
		return res.json().catch(() => null);
	}

	async flush() {
		for (const key of this.cached.keys()) {
			console.log(typeof key);
			const cache = this.cached.get(key);
			if (cache && cache.timeoutId) clearTimeout(cache.timeoutId);
		}

		this.clanEmbed.cached.clear();
		this.clanEvent.cached.clear();
		this.playerEvent.cached.clear();
		this.lastOnline.cached.clear();

		return this.cached.clear();
	}
}

module.exports = CacheHandler;
