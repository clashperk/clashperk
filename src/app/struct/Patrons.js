const Guilds = require('../models/Guilds');
const Logger = require('../util/logger');
const Users = require('../models/Users');
const PatronUsers = require('../struct/PatronUsers');
const PatronGuilds = require('../struct/PatronGuilds');
const { firebase } = require('../struct/Database');
const { MessageEmbed } = require('discord.js');

class Patron {
	constructor(client) {
		this.client = client;
		this.users = new PatronUsers(Users);
		this.guilds = new PatronGuilds(Guilds);
	}

	async init() {
		await this.users.init();
		await this.guilds.init();
		// await this.incomingWebhook();
	}

	users() {
		return this.users;
	}

	guilds() {
		return this.guilds;
	}

	/* async incomingWebhook() {
		firebase.ref('patreon').on('child_added', snapshot => {
			const body = snapshot.val();
			if (body && body.action === 'members:pledge:create') return this.addPatron(body);
			if (body && body.action === 'members:pledge:update') return this.updatePatron(body);
			if (body && body.action === 'members:pledge:delete') return this.deletePatron(body);
		});
	}*/

	async addPatron(body) {
		const user = body.included.find(inc => inc.type === 'user');
		const discord_id = user.attributes.social_connections && user.attributes.social_connections.discord && user.attributes.social_connections.discord.user_id;

		const { attributes } = body.data;
		if (attributes.pledge_amount_cents === 0) return;

		const object = {
			patron: true,
			type: 'members:pledge:create',
			amount: attributes.pledge_amount_cents / 100,
			name: user.attributes.full_name,
			patreon_id: user.id,
			discord_id: discord_id || null,
			redeemed: false,
			date: attributes.pledge_relationship_start || new Date(),
			declined_since: null,
			total: attributes.lifetime_support_cents / 100
		};

		await this.webhook(object);
	}

	async updatePatron(body) {
		const user = body.included.find(inc => inc.type === 'user');
		const discord_id = user.attributes.social_connections && user.attributes.social_connections.discord && user.attributes.social_connections.discord.user_id;

		const { attributes } = body.data;
		const object = {
			patron: true,
			type: 'members:pledge:update',
			amount: attributes.pledge_amount_cents / 100,
			name: user.attributes.full_name,
			patreon_id: user.id,
			discord_id: discord_id || null,
			redeemed: false,
			date: attributes.pledge_relationship_start || new Date(),
			declined_since: null,
			total: attributes.lifetime_support_cents / 100
		};

		await this.webhook(object);
	}

	async deletePatron(body) {
		const user = body.included.find(inc => inc.type === 'user');
		const discord_id = user.attributes.social_connections && user.attributes.social_connections.discord && user.attributes.social_connections.discord.user_id;

		const { attributes } = body.data;
		const object = {
			patron: false,
			type: 'members:pledge:delete',
			amount: attributes.pledge_amount_cents / 100,
			name: user.attributes.full_name,
			patreon_id: user.id,
			discord_id: discord_id || null,
			redeemed: false,
			date: attributes.pledge_relationship_start || new Date(),
			declined_since: null,
			total: attributes.lifetime_support_cents / 100
		};

		await this.webhook(object);
	}

	async webhook(object) {
		const webhook = await this.client.fetchWebhook('612211124556791808').catch(() => null);
		if (!webhook) return Logger.error('Webhook Not Found', { level: 'VOTING HOOK' });
		const user = await this.client.users.fetch(object.discord_id).catch(() => null);
		if (user) Logger.info(user.tag, { level: 'VOTER' });

		const embed = new MessageEmbed()
			.setColor(0xf96854).setTimestamp();
		if (user) embed.setAuthor(`${user.tag} (${user.id})`, user.displayAvatarURL());
		embed.addField('Patron', `${object.name} (${object.patreon_id})`);

		if (object.type === 'members:pledge:create') {
			embed.addField('Pledge Amount', `$ ${object.amount}`).setFooter('Pledge Create')
				.addField('Total Amount', `$ ${object.total}`);
		} else if (object.type === 'members:pledge:update') {
			embed.addField('Pledge Amount', `$ ${object.amount}`).setFooter('Pledge Update')
				.addField('Total Amount', `$ ${object.total}`);
		} else if (object.type === 'members:pledge:delete') {
			embed.addField('Pledge Amount', `$ ${object.total}`).setFooter('Pledge Delete');
		}

		return webhook.send({ embeds: [embed] });
	}
}

module.exports = Patron;
