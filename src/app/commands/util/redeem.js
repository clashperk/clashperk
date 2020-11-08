const { Command } = require('discord-akairo');
const fetch = require('node-fetch');
const { firestore, mongodb } = require('../../struct/Database');
const qs = require('querystring');
const admin = require('firebase-admin');
const { status } = require('../../util/constants');

class RedeemCommand extends Command {
	constructor() {
		super('redeem', {
			aliases: ['redeem'],
			category: 'util',
			description: {
				content: 'Redeems your patreon subscription.'
			}
		});
	}

	cooldown(message) {
		if (this.client.patron.check(message.author, message.guild)) return 1000;
		return 3000;
	}

	async exec(message) {
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

		if (!res) {
			return message.util.send({
				embed: {
					color: 0xf30c11,
					author: { name: 'Error' },
					description: status(504)
				}
			});
		}

		const data = await res.json();
		const patron = data.included.find(entry => entry?.attributes?.social_connections?.discord?.user_id === message.author.id);

		if (!patron) {
			const embed = this.client.util.embed()
				.setColor(16345172)
				.setDescription([
					'I could not find any patreon account connected to your discord.',
					'',
					'Make sure that you are connected and subscribed to ClashPerk.',
					'Not subscribed yet? [Become a Patron](https://www.patreon.com/clashperk)'
				])
				.addField('How to connect?', [
					'https://www.patreon.com/settings/apps'
				])
				.setImage('https://i.imgur.com/APME0CX.png');

			return message.util.send({ embed });
		}

		if (this.client.patron.get(message.guild.id, 'guild', false)) {
			return message.util.send('This server already has an active subscription.');
		}

		const user = await firestore.collection('patrons')
			.doc(patron.id)
			.get()
			.then(snap => snap.data());

		const pledge = data.data.find(entry => entry?.relationships?.patron?.data?.id === patron.id);
		if (pledge.attributes.declined_since) {
			return message.util.send({
				embed: {
					description: 'Something went wrong, please [contact us](https://discord.gg/ppuppun)'
				}
			});
		}

		if (!user) {
			await firestore.collection('patrons')
				.doc(patron.id)
				.update({
					name: patron.attributes.full_name,
					id: patron.id,
					discord_id: message.author.id,
					discord_username: message.author.username,
					active: true,
					guilds: [{ id: message.guild.id, limit: pledge.attributes.amount_cents >= 300 ? 50 : 3 }],
					entitled_amount: pledge.attributes.amount_cents / 100,
					redeemed: true,
					createdAt: new Date(pledge.attributes.created_at)
				}, { merge: true });

			await this.client.patron.refresh();
			const embed = this.client.util.embed()
				.setColor(16345172)
				.setDescription([
					`Patron benefits applied to **${message.guild.name}**`,
					`Thank you so much for the support ${message.author}`
				]);
			return message.util.send({ embed });
		}

		const redeemed = this.redeemed(user);
		if (user && redeemed) {
			if (!this.isNew(user, message, patron)) await this.client.patron.refresh();
			const embed = this.client.util.embed()
				.setColor(16345172)
				.setDescription([
					'You\'ve already claimed your patron benefits!',
					'If you think it\'s wrong, please [contact us](https://discord.gg/ppuppun)'
				]);
			return message.util.send({ embed });
		}

		if (user && !redeemed) {
			await firestore.collection('patrons')
				.doc(patron.id)
				.update({
					guilds: admin.firestore.FieldValue.arrayUnion({
						id: message.guild.id,
						limit: pledge.attributes.amount_cents >= 300 ? 50 : 3
					}),
					entitled_amount: pledge.attributes.amount_cents / 100,
					discord_id: message.author.id,
					discord_username: message.author.username,
					redeemed: true
				}, { merge: true });

			await this.client.patron.refresh();
			await this.sync(message.guild.id);
			const embed = this.client.util.embed()
				.setColor(16345172)
				.setDescription([
					`Patron benefits applied to **${message.guild.name}**`,
					`Thank you so much for the support ${message.author}`
				]);
			return message.channel.send({ embed });
		}
	}

	isNew(user, message, patron) {
		if (user && user.discord_id !== message.author.id) {
			firestore.collection('patrons')
				.doc(patron.id)
				.update({
					discord_id: message.author.id,
					discord_username: message.author.username
				}, { merge: true });

			return true;
		}
		return false;
	}

	async sync(guild) {
		const db = mongodb.db('clashperk').collection('clanstores');
		await db.updateMany({ guild }, { $set: { patron: true } });
		const collection = await db.find({ guild }).toArray();
		collection.forEach(async data => {
			await this.client.cacheHandler.add(data._id, { tag: data.tag, guild: data.guild });
		});
		return collection;
	}

	redeemed(user) {
		if (user.entitled_amount === 10 && user.guilds && user.guilds.length >= 5) return true;
		else if (user.entitled_amount === 5 && user.guilds && user.guilds.length >= 3) return true;
		else if (user.entitled_amount === 3 && user.guilds && user.guilds.length >= 1) return true;
		else if (user.entitled_amount < 3 && user.redeemed) return true;
		return false;
	}
}

module.exports = RedeemCommand;
