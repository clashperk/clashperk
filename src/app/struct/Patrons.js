const { firebase, firestore } = require('../struct/Database');
const { MessageEmbed } = require('discord.js');
const qs = require('querystring');
const fetch = require('node-fetch');

class Patron {
	constructor(client) {
		this.client = client;
		this.store = new Map();
	}

	async init() {
		return this.incoming();
	}

	get(id, key, def) {
		if (this.store.has(id)) {
			const value = this.store.get(id)[key];
			return value == null ? def : value; // eslint-disable-line no-eq-null
		}

		return def;
	}

	check(user, guild) {
		return this.get(guild.id, 'guild', false) || this.get(user.id, 'user', false);
	}

	async refresh() {
		this.store.clear();
		await firestore.collection('patrons')
			.where('active', '==', true)
			.get()
			.then(snap => {
				snap.forEach(doc => {
					const data = doc.data();
					if (data.discord_id) {
						this.store.set(data.discord_id, { user: true });
					}

					if (data.shared) {
						for (const id of data.shared) {
							this.store.set(id, { user: true });
						}
					}

					if (data.active && data.guilds) {
						for (const guild of data.guilds) {
							this.store.set(guild.id, { guild: true, limit: guild.limit });
						}
					}
				});
			});

		return Promise.resolve(0);
	}

	async incoming() {
		firebase.ref('patreon').on('child_added', snapshot => {
			const body = snapshot.val();
			if (body && body.action === 'members:pledge:create') return this.addPatron(body, snapshot.key);
			if (body && body.action === 'members:pledge:update') return this.updatePatron(body, snapshot.key);
			if (body && body.action === 'members:pledge:delete') return this.deletePatron(body, snapshot.key);
		});
	}

	async addPatron(body, key) {
		if (body.webhook_triggered) return;

		const patron_user = body.included.find(inc => inc.type === 'user');
		const discord_id = patron_user.attributes.social_connections && patron_user.attributes.social_connections.discord && patron_user.attributes.social_connections.discord.user_id;

		const { attributes } = body.data;
		if (attributes.currently_entitled_amount_cents === 0) return;

		this.client.logger.info(`${patron_user.attributes.full_name} (${patron_user.id})`, { label: 'PATRON_NEW' });

		const user = await this.client.users.fetch(discord_id).catch(() => null);
		if (user) {
			this.client.logger.info(`${user.tag} (${user.id})`, { label: 'PATRON_NEW' });
		}

		await firestore.collection('patrons')
			.doc(patron_user.id)
			.update({
				name: patron_user.attributes.full_name,
				id: patron_user.id,
				discord_id: user ? user.id : null,
				discord_username: user ? user.username : null,
				createdAt: new Date(attributes.pledge_relationship_start) || new Date(),
				active: true,
				entitled_amount: attributes.currently_entitled_amount_cents / 100
			}, { merge: true });

		await this.refresh();

		const webhook = await this.fetchWebhook().catch(() => null);
		if (!webhook) return this.client.logger.error('Webhook Not Found', { label: 'PATREON WEBHOOK' });
		await firebase.ref('patreon').child(key).update({ webhook_triggered: true });

		const embed = new MessageEmbed()
			.setColor(0xf96854)
			.setTimestamp(attributes.pledge_relationship_start);
		if (user) embed.setAuthor(`${user.tag} (${user.id})`, user.displayAvatarURL());
		embed.addField('Patron', `${patron_user.attributes.full_name} (${patron_user.id})`)
			.addField('Entitled Amount', [
				`$ ${attributes.currently_entitled_amount_cents / 100}`
			]);

		return webhook.send({ embeds: [embed], username: 'ClashPerk', avatarURL: this.client.user.displayAvatarURL() });
	}

	async updatePatron(body, key) {
		if (body.webhook_triggered) return;

		const patron_user = body.included.find(inc => inc.type === 'user');
		const discord_id = patron_user.attributes.social_connections && patron_user.attributes.social_connections.discord && patron_user.attributes.social_connections.discord.user_id;

		const { attributes } = body.data;

		this.client.logger.info(`${patron_user.attributes.full_name} (${patron_user.id})`, { label: 'PATRON_UPDATE' });

		const user = await this.client.users.fetch(discord_id).catch(() => null);
		if (user) {
			this.client.logger.info(`${user.tag} (${user.id})`, { label: 'PATRON_UPDATE' });
		}

		const user_db = await firestore.collection('patrons')
			.doc(patron_user.id)
			.get()
			.then(snap => snap.data());
		if (user_db && attributes.currently_entitled_amount_cents < 300 && user_db.guilds) {
			await firestore.collection('patrons')
				.doc(patron_user.id)
				.update({
					guilds: [{ id: user_db.guilds[0].id, limit: 3 }]
				}, { merge: true });
		}
		await firestore.collection('patrons')
			.doc(patron_user.id)
			.update({
				name: patron_user.attributes.full_name,
				id: patron_user.id,
				discord_id: user ? user.id : null,
				discord_username: user ? user.username : null,
				updatedAt: new Date(),
				active: true,
				entitled_amount: attributes.currently_entitled_amount_cents / 100
			}, { merge: true });

		await this.refresh();

		const webhook = await this.fetchWebhook().catch(() => null);
		if (!webhook) return this.client.logger.error('Webhook Not Found', { label: 'PATREON WEBHOOK' });
		await firebase.ref('patreon').child(key).update({ webhook_triggered: true });

		const embed = new MessageEmbed()
			.setColor(0x38d863)
			.setTimestamp();
		if (user) embed.setAuthor(`${user.tag} (${user.id})`, user.displayAvatarURL());
		embed.addField('Patron', `${patron_user.attributes.full_name} (${patron_user.id})`)
			.addField('Entitled Amount', [
				`$ ${attributes.currently_entitled_amount_cents / 100}`
			]);

		return webhook.send({ embeds: [embed], username: 'ClashPerk', avatarURL: this.client.user.displayAvatarURL() });
	}

	async deletePatron(body, key) {
		if (body.webhook_triggered) return;

		const patron_user = body.included.find(inc => inc.type === 'user');
		const discord_id = patron_user.attributes.social_connections && patron_user.attributes.social_connections.discord && patron_user.attributes.social_connections.discord.user_id;

		const { attributes } = body.data;

		this.client.logger.info(`${patron_user.attributes.full_name} (${patron_user.id})`, { label: 'PATRON_DELETE' });

		const user = await this.client.users.fetch(discord_id).catch(() => null);
		if (user) {
			this.client.logger.info(`${user.tag} (${user.id})`, { label: 'PATRON_DELETE' });
		}

		await firestore.collection('patrons')
			.doc(patron_user.id)
			.update({
				name: patron_user.attributes.full_name,
				id: patron_user.id,
				discord_id: user ? user.id : null,
				discord_username: user ? user.username : null,
				active: false,
				expiredAt: new Date(),
				lifetime_support: attributes.lifetime_support_cents / 100
			}, { merge: true });

		await this.refresh();

		const webhook = await this.fetchWebhook().catch(() => null);
		if (!webhook) return this.client.logger.error('Webhook Not Found', { label: 'PATREON WEBHOOK' });
		await firebase.ref('patreon').child(key).update({ webhook_triggered: true });

		const embed = new MessageEmbed()
			.setColor(0xf30c11)
			.setTimestamp();
		if (user) embed.setAuthor(`${user.tag} (${user.id})`, user.displayAvatarURL());
		embed.addField('Patron', `${patron_user.attributes.full_name} (${patron_user.id})`)
			.addField('Lifetime Support', [
				`$ ${attributes.lifetime_support_cents / 100}`
			]);

		return webhook.send({ embeds: [embed], username: 'ClashPerk', avatarURL: this.client.user.displayAvatarURL() });
	}

	async sync() {
		const query = qs.stringify({
			'include': 'patron.null',
			'page[count]': 100,
			'sort': 'created'
		});
		const res = await fetch(`https://www.patreon.com/api/oauth2/api/campaigns/2589569/pledges?${query}`, {
			headers: {
				authorization: `Bearer ${process.env.PATREON_API}`
			},
			timeout: 5000
		}).catch(() => null);
		const data = await res.json();
		// const users = data.included.map(user => user.id);
		for (const user of data.data) {
			user.relationships.patron.data.id;
			// eslint-disable-next-line no-eq-null
			if (user.attributes.declined_since == null) continue;
			if (new Date(user.attributes.declined_since).getMonth() === new Date().getMonth()) continue;
			// TODO: Delete from Database
		}
	}

	updateUsername() {
		firestore.collection('patrons').get().then(snap => {
			snap.forEach(async doc => {
				const data = doc.data();
				if (data.discord_id) {
					const user = await this.client.users.fetch(data.discord_id).catch(() => null);
					if (user) await firestore.collection('patrons').doc(data.id).update({ discord_username: user.username });
				}
			});
		});
	}

	async fetchWebhook() {
		if (this.webhook) return this.webhook;
		const guild = this.client.guilds.cache.get(this.client.settings.get('global', 'defaultGuild', undefined));
		if (!guild) return null;
		const webhooks = await guild.fetchWebhooks().catch(() => null);
		const webhook = webhooks.get(this.client.settings.get('global', 'patreonWebhook', undefined));
		this.webhook = webhook;
		return webhook;
	}
}

module.exports = Patron;
