const { Command } = require('discord-akairo');
const fetch = require('node-fetch');
const { emoji } = require('../../util/emojis');
const { firestore } = require('../../struct/Database');

class RedeemCommand extends Command {
	constructor() {
		super('redeem', {
			aliases: ['redeem'],
			category: 'other',
			cooldown: 3000,
			description: {
				content: 'Redeems your premium subscription.'
			}
		});
	}

	async exec(message) {
		const res = await fetch('https://www.patreon.com/api/oauth2/api/campaigns/2589569/pledges?include=patron.null', {
			headers: {
				authorization: `Bearer ${process.env.PATREON_API}`
			}
		});

		const data = await res.json();

		const patreon_user = data.included.find(entry => entry.attributes &&
			entry.attributes.social_connections &&
			entry.attributes.social_connections.discord &&
			entry.attributes.social_connections.discord.user_id === message.author.id);

		if (!patreon_user) {
			const embed = this.client.util.embed()
				.setColor(16345172)
				.setAuthor('Oh my!')
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
					.doc(patreon_user.user.attributes.id)
					.update({
						name: patreon_user.attributes.full_name,
						id: patreon_user.id,
						discord_id: message.author.id,
						active: true,
						guilds: [{ id: message.guild.id, limit: 50 }],
						entitled_amount: pledge.attributes.amount_cents / 100,
						redeemed: true
					}, { merge: true });

				await this.client.patron.refresh();

				const embed = this.client.util.embed()
					.setColor(16345172)
					.setDescription([`**Subscription for ${message.guild.name}**`, `Active ${emoji.authorize}`]);

				return message.util.send({ embed });
			}

			if (user && user.redeemed) {
				const isNew = this.isNew(user, message, patreon_user);
				if (isNew) await this.client.patron.refresh();

				const embed = this.client.util.embed()
					.setColor(16345172)
					.setDescription([
						'You\'ve already claimed.'
					]);

				return message.util.send({ embed });
			}

			if (user && !user.redeemed) {
				await firestore.collection('patrons')
					.doc(patreon_user.id)
					.update({
						guilds: [{ id: message.guild.id, limit: 50 }],
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

	async isNew(user, message, patreon_user) {
		if (user && user.discord_id !== message.author.id) {
			await firestore.collection('patrons')
				.doc(patreon_user.id)
				.update({
					discord_id: message.author.id
				}, { merge: true });

			return true;
		}
		return false;
	}
}

module.exports = RedeemCommand;
