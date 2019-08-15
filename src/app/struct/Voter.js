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
			headers: { Authorization: process.env.DBL }
		});
		if (!res.ok) return false;
		const data = await res.json();
		if (data.voted > 0) return true;
		return false;
	}

	init() {
		this.incomingVote();
		this.clear();
		setInterval(this.clear.bind(this), this.timeout);
	}

	incomingVote() {
		firebase.ref('votes').on('child_added', snapshot => {
			const data = snapshot.val();
			if ((Date.now() - new Date(Number(snapshot.key))) >= 4.32e+7) return;
			if (data.type === 'upvote' && (Date.now() - new Date(Number(snapshot.key))) <= 10000) this.webhook(snapshot.key, data.id);
			this.store.set(data.user, snapshot.key);
			Logger.info(`${snapshot.key} ${JSON.stringify(data)}`, { level: 'UPVOTE' });
		});
	}

	clear() {
		for (const [key, value] of this.store.entries()) {
			if ((Date.now() - new Date(Number(value))) >= 4.32e+7) return this.store.delete(key);
		}
	}

	async webhook(time, id) {
		const webhook = await this.client.fetchWebhook('611560024895913985').catch(() => null);
		if (!webhook) return Logger.error('Webhook Not Found', { level: 'VOTING HOOK' });
		const user = await this.client.users.fetch(id).catch(() => null);
		if (!user) return Logger.error('User Not Found', { level: 'VOTER' });
		Logger.info(user.tag, { level: 'VOTER' });
		const embed = new MessageEmbed()
			.setColor(0x38d863)
			.setAuthor(`${user.tag}`, user.displayAvatarURL())
			.setTimestamp(Number(time));
		return webhook.send({ embeds: [embed] });
	}
}

module.exports = Voter;
