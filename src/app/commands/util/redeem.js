const { Command } = require('discord-akairo');
const fetch = require('node-fetch');
const { emoji } = require('../../util/emojis');
const { firestore } = require('../../struct/Database');
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
		const patreon_user = data.included.find(entry => entry.attributes &&
			entry.attributes.social_connections &&
			entry.attributes.social_connections.discord &&
			entry.attributes.social_connections.discord.user_id === message.author.id);

		if (!patreon_user) {
			const embed = this.client.util.embed()
				.setColor(16345172)
				.setDescription([
					'I could not find any patreon account connected to your discord.',
					'',
					'Make sure that you are connected and subscribed to ClashPerk.',
					'Not subscribed yet? [Become a Patron](https://www.patreon.com/bePatron?u=14584309)'
				])
				.addField('How to connect?', [
					'https://www.patreon.com/settings/apps'
				])
				.setImage('https://i.imgur.com/APME0CX.png');

			return message.util.send({ embed });
		}

		if (patreon_user) {
			const user = await firestore.collection('patrons')
				.doc(patreon_user.id)
				.get()
				.then(snap => snap.data());

			if (!user) {
				const pledge = data.data.find(entry => entry.relationships &&
					entry.relationships &&
					entry.relationships.patron &&
					entry.relationships.patron.data &&
					entry.relationships.patron.data.id === patreon_user.id);

				await firestore.collection('patrons')
					.doc(patreon_user.id)
					.update({
						name: patreon_user.attributes.full_name,
						id: patreon_user.id,
						discord_id: message.author.id,
						active: true,
						guilds: [{ id: message.guild.id, limit: pledge.attributes.amount_cents >= 300 ? 50 : 3 }],
						entitled_amount: pledge.attributes.amount_cents / 100,
						redeemed: true
					}, { merge: true });

				await this.client.patron.refresh();
				const embed = this.client.util.embed()
					.setColor(16345172)
					.setDescription([`**Subscription for ${message.guild.name}**`, `Active ${emoji.authorize}`]);
				return message.util.send({ embed });
			}

			const redeemed = this.isRedeemed(user);
			if (user && redeemed) {
				if (!this.isNew(user, message, patreon_user)) await this.client.patron.refresh();
				const embed = this.client.util.embed()
					.setColor(16345172)
					.setDescription('You\'ve already claimed.');
				return message.util.send({ embed });
			}

			if (user && !redeemed) {
				await firestore.collection('patrons')
					.doc(patreon_user.id)
					.update({
						guilds: admin.firestore.FieldValue.arrayUnion({
							id: message.guild.id,
							limit: user.entitled_amount >= 3 ? 50 : 3
						}),
						discord_id: message.author.id,
						redeemed: true
					}, { merge: true });

				await this.client.patron.refresh();
				const embed = this.client.util.embed()
					.setColor(16345172)
					.setDescription([`**Subscription for ${message.guild.name}**`, `Active ${emoji.authorize}`]);
				return message.channel.send({ embed });
			}
		}
	}

	isNew(user, message, patreon_user) {
		if (user && user.discord_id !== message.author.id) {
			firestore.collection('patrons')
				.doc(patreon_user.id)
				.update({
					discord_id: message.author.id
				}, { merge: true });

			return true;
		}
		return false;
	}

	isRedeemed(user) {
		if (user.entitled_amount === 10 && user.guilds && user.guilds.length >= 5) return true;
		else if (user.entitled_amount === 5 && user.guilds && user.guilds.length >= 3) return true;
		else if (user.entitled_amount === 3 && user.guilds && user.guilds.length >= 1) return true;
		else if (user.entitled_amount < 3 && user.redeemed) return true;
		return false;
	}
}

module.exports = RedeemCommand;
