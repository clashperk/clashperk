const { Users, Guilds } = require('./PatreonProvider');
const { firebase, firestore } = require('../struct/Database');
const { MessageEmbed } = require('discord.js');

class Patron {
	constructor(client, { webhook = '612211124556791808' } = {}) {
		this.client = client;
		this.webhook = webhook;
		this.users = new Users(firestore.collection('patron_users'));
		this.guilds = new Guilds(firestore.collection('patron_guilds'));
	}

	async init() {
		await this.users.init();
		await this.guilds.init();
		await this.incoming();
	}

	users() {
		return this.users;
	}

	guilds() {
		return this.guilds;
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

		const webhook = await this.client.fetchWebhook(this.webhook).catch(() => null);
		if (!webhook) return this.client.logger.error('Webhook Not Found', { label: 'VOTING HOOK' });
		const user = await this.client.users.fetch(discord_id).catch(() => null);
		if (user) this.client.logger.info(user.tag, { label: 'PATRON' });

		await firebase.ref('patreon').child(key).update({ webhook_triggered: true });
		await firestore.collection('patreon')
			.doc(patron_user.id)
			.update({
				patron: {
					name: patron_user.attributes.full_name,
					id: patron_user.id
				},
				discord: {
					id: discord_id
				},
				createdAt: attributes.pledge_relationship_start || new Date()
			}, { merge: true });

		const embed = new MessageEmbed()
			.setColor(0xf96854)
			.setTimestamp(attributes.pledge_relationship_start);
		if (user) embed.setAuthor(`${user.tag} (${user.id})`, user.displayAvatarURL());
		embed.addField('Patron', `${patron_user.attributes.full_name} (${patron_user.id})`)
			.addField('Entitled Amount', [
				`$ ${attributes.currently_entitled_amount_cents / 100}`
			]);

		return webhook.send({ embeds: [embed] });
	}

	async updatePatron(body, key) {
		if (body.webhook_triggered) return;

		const patron_user = body.included.find(inc => inc.type === 'user');
		const discord_id = patron_user.attributes.social_connections && patron_user.attributes.social_connections.discord && patron_user.attributes.social_connections.discord.user_id;

		const { attributes } = body.data;

		const webhook = await this.client.fetchWebhook(this.webhook).catch(() => null);
		if (!webhook) return this.client.logger.error('Webhook Not Found', { label: 'VOTING HOOK' });
		const user = await this.client.users.fetch(discord_id).catch(() => null);
		if (user) this.client.logger.info(user.tag, { label: 'PATRON' });

		await firebase.ref('patreon').child(key).update({ webhook_triggered: true });
		await firestore.collection('petreon')
			.doc(patron_user.id)
			.update({
				patron: {
					user: patron_user.attributes.full_name,
					id: patron_user.id
				},
				discord: {
					id: discord_id
				},
				createdAt: patron_user.pledge_relationship_start || new Date()
			}, { merge: true });

		const embed = new MessageEmbed()
			.setColor(0x38d863)
			.setTimestamp();
		if (user) embed.setAuthor(`${user.tag} (${user.id})`, user.displayAvatarURL());
		embed.addField('Patron', `${patron_user.attributes.full_name} (${patron_user.id})`)
			.addField('Entitled Amount', [
				`$ ${attributes.currently_entitled_amount_cents / 100}`
			]);

		return webhook.send({ embeds: [embed] });
	}

	async deletePatron(body, key) {
		if (body.webhook_triggered) return;

		const patron_user = body.included.find(inc => inc.type === 'user');
		const discord_id = patron_user.attributes.social_connections && patron_user.attributes.social_connections.discord && patron_user.attributes.social_connections.discord.user_id;

		const { attributes } = body.data;

		const webhook = await this.client.fetchWebhook(this.webhook).catch(() => null);
		if (!webhook) return this.client.logger.error('Webhook Not Found', { label: 'VOTING HOOK' });
		const user = await this.client.users.fetch(discord_id).catch(() => null);
		if (user) this.client.logger.info(user.tag, { label: 'PATRON' });

		await firebase.ref('patreon').child(key).update({ webhook_triggered: true });

		const embed = new MessageEmbed()
			.setColor(0xf30c11)
			.setTimestamp();
		if (user) embed.setAuthor(`${user.tag} (${user.id})`, user.displayAvatarURL());
		embed.addField('Patron', `${patron_user.attributes.full_name} (${patron_user.id})`)
			.addField('Lifetime Support', [
				`$ ${attributes.lifetime_support_cents / 100}`
			]);

		return webhook.send({ embeds: [embed] });
	}
}

module.exports = Patron;
