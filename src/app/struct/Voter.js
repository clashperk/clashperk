const fetch = require('node-fetch');
const { firebase } = require('../struct/Database');
const Logger = require('../util/logger');
const { MessageEmbed } = require('discord.js');

class Voter {
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
		const object = await firebase.ref('votes').once('value').then(snap => snap.val());
		for (const [key, value] of Object.entries(object)) {
			const data = await firebase.ref('ranks').child(value.user).once('value')
				.then(snap => snap.val());
			if (data) {
				await firebase.ref('ranks').child(value.user).update({ xp: data.xp + value.earnedXP, last_voted: Number(key) });
			} else {
				await firebase.ref('ranks').child(value.user).update({ xp: value.earnedXP, last_voted: Number(key) });
			}
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

	async board() {
		const data = await firebase.ref('ranks')
			.once('value')
			.then(snap => snap.val());
		const leaderboard = [];
		for (const [key, value] of this.entries(data)) {
			if (!this.client.users.has(key)) continue;
			const { level } = this.getLevel(value.xp);
			leaderboard.push({ user: key, xp: value.xp, level });
			if (leaderboard.length === 10) break;
		}

		return this.sort(leaderboard);
	}

	async leaderboard() {
		const embed = new MessageEmbed()
			.setColor(0x5970c1)
			.setAuthor('Leaderboard');
		let index = 0;
		for (const { user, level, xp } of await this.board()) {
			embed.addField(`**${++index}**. ${this.client.users.get(user).tag}`, [
				`${Array(4).fill('\u200b').join(' ')} 🏷️\`LEVEL ${level}\` \\🔥\`EXP ${xp}\``
			]);
		}

		return embed;
	}

	sort(items) {
		return items.sort((a, b) => b.xp - a.xp);
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
		let level = 0;
		for (let i = 0; i <= Infinity; i++) {
			if ((5 * (i ** 2)) + (50 * i) + 100 > xp) break;
			xp -= (5 * (i ** 2)) + (50 * i) + 100;
			level++;
		}

		return { level, remaining: Math.floor(xp) };
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
				this.webhook(snapshot.key, data);
			}
		});
	}

	async webhook(key, data) {
		if (data.webhook_triggered) return;

		const webhook = await this.client.fetchWebhook('611560024895913985').catch(() => null);
		if (!webhook) return Logger.error('Webhook Not Found', { level: 'VOTING WEBHOOK' });

		const user = await this.client.users.fetch(data.user).catch(() => null);
		if (!user) return Logger.error('User Not Found', { level: 'VOTER' });

		Logger.info(`${user.tag}/${data.earnedXP}`, { level: 'VOTER' });

		await firebase.ref('votes').child(key).update({ webhook_triggered: true });

		const embed = new MessageEmbed()
			.setColor(0x38d863)
			.setAuthor(`${user.tag}`, user.displayAvatarURL())
			.setFooter(`Received ${data.earnedXP} XP`)
			.setTimestamp(Number(key));
		return webhook.send({ embeds: [embed] });
	}

	clear() {
		for (const [key, value] of this.store.entries()) {
			if ((Date.now() - new Date(Number(value))) >= 4.32e+7) return this.store.delete(key);
		}
	}
}

module.exports = Voter;
