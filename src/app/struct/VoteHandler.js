const fetch = require('node-fetch');
const { firebase } = require('./Database');
const { MessageEmbed } = require('discord.js');

class VoteHandler {
	constructor(client, { timeout = 30 * 60 * 1000 } = {}) {
		this.client = client;
		this.store = new Map();
		this.timeout = timeout;
	}

	init() {
		this.incoming();
		this.clear();
		setInterval(this.clear.bind(this), this.timeout);
	}

	async fetchWebhook() {
		if (this.webhook) return this.webhook;
		const guild = this.client.guilds.cache.get(this.client.settings.get('global', 'server', undefined));
		if (!guild) return null;
		const webhooks = await guild.fetchWebhooks().catch(() => null);
		const webhook = webhooks.get(this.client.settings.get('global', 'voteWebhook', undefined));
		this.webhook = webhook;
		return webhook;
	}

	isVoter(user) {
		if (this.store.has(user)) return true;
		return false;
	}

	async fetchVote(user) {
		const cached = this.store.has(user);
		if (cached) return true;
		const fetched = await this.fetch(user);
		if (!fetched) return false;
		this.store.set(user, Date.now());
		return true;
	}

	async fetch(user) {
		const res = await fetch(`https://discordbots.org/api/bots/526971716711350273/check?userId=${user}`, {
			headers: { Authorization: process.env.DBL }, timeout: 3000
		}).catch(() => null);
		if (!res) return false;
		if (!res.ok) return false;
		const data = await res.json();
		if (data.voted > 0) return true;
		return false;
	}

	async count() {
		const object = await firebase.ref('users').once('value').then(snap => snap.val());
		let index = 0;
		for (const [key, value] of Object.entries(object)) {
			console.log(key, value);

			const g = Math.floor((Math.floor(Math.random() * 3) + 2) * value);
			console.log('Random', g);
			await firebase.ref('ranks')
				.child(key)
				.transaction(point => {
					if (point === null) return { xp: g };
					point.xp += g;
					return point;
				})
				.then(() => console.log('Doc', index++));
		}
	}

	async get(user) {
		const data = await firebase.ref('ranks')
			.child(user)
			.once('value')
			.then(snap => snap.val());
		if (!data) return { level: 0, progress: '0/100', left: Array(0).fill('▬'), right: Array(14).fill('▬') };

		const xp = Math.floor(data.xp);
		const { level, remaining } = this.getLevel(xp);

		const nextXP = this.nextXP(level);
		const bar = Math.floor((remaining / nextXP) * 14);
		const { left, right } = this.progress(bar);
		const progress = `${remaining >= 1000 ? `${(remaining / 1000).toFixed(2)}K` : remaining}/${nextXP >= 1000 ? `${(nextXP / 1000).toFixed(2)}K` : nextXP}`;

		return { level, progress, left, right };
	}

	entries(object) {
		if (!object) return [];
		return Object.entries(object);
	}

	progress(num) {
		return { left: Array(num).fill('▬'), right: Array(14 - num).fill('▬') };
	}

	oldXP(level) {
		return Math.floor((5 * (level ** 2)) + (50 * level) + 100);
	}

	nextXP(level) {
		return Math.floor((5 * (level ** 2)) + (50 * level) + 100);
	}

	lvlByXP(xp) {
		const sqrt = Math.sqrt((50 * 50) - (4 * 5 * (100 - xp)));
		return Math.floor((-50 + sqrt) / (2 * 5));
	}

	getLevel(xp) {
		const levels_xp = Array(200).fill(0).map((x, i) => (5 * (i ** 2)) + (50 * i) + 100);
		let remaining_xp = Number(xp);
		let level = 0;
		while (remaining_xp >= levels_xp[level]) {
			remaining_xp -= levels_xp[level];
			level += 1;
		}

		return { level, remaining: Math.floor(remaining_xp) };
	}

	getRandom(max, min) {
		return Math.floor(Math.random() * (max - min)) + Math.floor(min);
	}

	incoming() {
		firebase.ref('votes').on('child_added', async snapshot => {
			const data = snapshot.val();
			if ((Date.now() - new Date(Number(snapshot.key))) >= 4.32e+7) return;
			if (data.type === 'upvote') {
				this.store.set(data.user, snapshot.key);
				this.send(snapshot.key, data);
			}
		});
	}

	async send(key, data) {
		if (data.webhook_triggered) return;

		const webhook = await this.fetchWebhook().catch(() => null);
		if (!webhook) return this.client.logger.error('Webhook Not Found', { label: 'VOTING WEBHOOK' });

		const user = await this.client.users.fetch(data.user).catch(() => null);
		if (!user) return this.client.logger.error('User Not Found', { label: 'VOTER' });

		this.client.logger.info(`${user.tag}/${data.earnedXP}`, { label: 'VOTER' });

		await firebase.ref('votes').child(key).update({ webhook_triggered: true });

		const embed = new MessageEmbed()
			.setColor(0x38d863)
			.setAuthor(`${user.tag}`, user.displayAvatarURL())
			.setFooter(`Received ${data.earnedXP} XP`)
			.setTimestamp(Number(key));
		return webhook.send({ embeds: [embed], username: 'ClashPerk', avatarURL: this.client.user.displayAvatarURL() });
	}

	clear() {
		for (const [key, value] of this.store.entries()) {
			if ((Date.now() - new Date(Number(value))) >= 4.32e+7) return this.store.delete(key);
		}
	}
}

module.exports = VoteHandler;
