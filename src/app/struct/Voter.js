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

	init() {
		this.incoming();
		this.clear();
		setInterval(this.clear.bind(this), this.timeout);
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
		if (!data) return { level: 0, xp: 0, oldXP: 0, nextXP: 25, progress: 0, progress_bar: '●━━━━━━━━━━━━━━ 0/25 XP' };

		const xp = this.getXP(data.xp);
		const level = this.getLevel(data.xp);

		const oldXP = Math.floor((level / 0.2) ** 2);
		const nextXP = Math.floor(((level + 1) / 0.2) ** 2);
		const progress = Math.round(((xp - oldXP) / (nextXP - oldXP)) * 14);
		const bar = '━━━━━━━━━━━━━━'.split('');
		const XPs = `${xp >= 1000 ? `${(xp / 1000).toFixed(2)}K` : xp}/${nextXP >= 1000 ? `${(nextXP / 1000).toFixed(2)}K` : nextXP}`;
		const progress_bar = `${bar.splice(0, progress).join('')}●${bar.splice(progress - 14).join('')} ${XPs} XP`;
		return { xp, level, oldXP, nextXP, progress, progress_bar };
	}

	getXP(xp) {
		return Math.floor(xp);
	}

	getLevel(xp) {
		return Math.round(Math.sqrt(Math.floor(xp / 25)));
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

	getRandom(max, min) {
		return Math.floor(Math.random() * (max - min)) + Math.floor(min);
	}
}

module.exports = Voter;
