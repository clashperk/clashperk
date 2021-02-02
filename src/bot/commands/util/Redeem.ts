import { COLLECTIONS, status } from '../../util/Constants';
import { Command } from 'discord-akairo';
import { Message } from 'discord.js';
import fetch from 'node-fetch';
import qs from 'querystring';

export default class RedeemCommand extends Command {
	public constructor() {
		super('redeem', {
			aliases: ['redeem'],
			category: 'config',
			channel: 'guild',
			description: {
				content: 'Redeems your patreon subscription.'
			}
		});
	}

	public async exec(message: Message) {
		const query = qs.stringify({
			'include': 'patron.null',
			'page[count]': 100,
			'sort': 'created'
		});
		const res = await fetch(`https://www.patreon.com/api/oauth2/api/campaigns/2589569/pledges?${query}`, {
			headers: {
				authorization: `Bearer ${process.env.PATREON_API!}`
			},
			timeout: 5000
		}).catch(() => null);

		if (!res) {
			return message.util!.send({
				embed: {
					color: 0xf30c11,
					author: { name: 'Error' },
					description: status(504)
				}
			});
		}

		const data = await res.json();
		const patron = data.included.find((entry: any) => entry?.attributes?.social_connections?.discord?.user_id === message.author.id);

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

			return message.util!.send({ embed });
		}

		if (this.client.patrons.get(message.guild!.id)) {
			return message.util!.send('This server already has an active subscription.');
		}

		const db = this.client.db.collection(COLLECTIONS.PATRONS);
		const user = await db.findOne({ id: patron.id });

		const pledge = data.data.find((entry: any) => entry?.relationships?.patron?.data?.id === patron.id);
		if (pledge.attributes.declined_since) {
			return message.util!.send({
				embed: {
					description: 'Something went wrong, please [contact us](https://discord.gg/ppuppun)'
				}
			});
		}

		if (!user) {
			await db.updateOne(
				{ id: patron.id },
				{
					$set: {
						name: patron.attributes.full_name,
						id: patron.id,
						discord_id: message.author.id,
						discord_username: message.author.username,
						active: true,
						guilds: [{ id: message.guild!.id, limit: pledge.attributes.amount_cents >= 300 ? 50 : 3 }],
						entitled_amount: pledge.attributes.amount_cents / 100,
						redeemed: true,
						createdAt: new Date(pledge.attributes.created_at)
					}
				},
				{ upsert: true }
			);

			await this.client.patrons.refresh();
			const embed = this.client.util.embed()
				.setColor(16345172)
				.setDescription([
					`Patron benefits applied to **${message.guild!.name}**`,
					`Thank you so much for the support ${message.author.toString()}`
				]);
			return message.util!.send({ embed });
		}

		const redeemed = this.redeemed(user);
		if (user && redeemed) {
			if (!this.isNew(user, message, patron)) await this.client.patrons.refresh();
			const embed = this.client.util.embed()
				.setColor(16345172)
				.setDescription([
					'You\'ve already claimed your patron benefits!',
					'If you think it\'s wrong, please [contact us](https://discord.gg/ppuppun)'
				]);
			return message.util!.send({ embed });
		}

		if (user && !redeemed) {
			await db.updateOne(
				{ id: patron.id },
				{
					$set: {
						entitled_amount: pledge.attributes.amount_cents / 100,
						discord_id: message.author.id,
						discord_username: message.author.username,
						redeemed: true
					},
					$push: {
						guilds: {
							id: message.guild!.id,
							limit: pledge.attributes.amount_cents >= 300 ? 50 : 3
						}
					}
				}
			);

			await this.client.patrons.refresh();
			await this.sync(message.guild!.id);
			const embed = this.client.util.embed()
				.setColor(16345172)
				.setDescription([
					`Patron benefits applied to **${message.guild!.name}**`,
					`Thank you so much for the support ${message.author.toString()}`
				]);
			return message.channel.send({ embed });
		}
	}

	private isNew(user: any, message: Message, patron: any) {
		if (user && user.discord_id !== message.author.id) {
			this.client.db.collection(COLLECTIONS.PATRONS)
				.updateOne(
					{ id: patron.id },
					{
						$set: {
							discord_id: message.author.id,
							discord_username: message.author.username
						}
					}
				);

			return true;
		}
		return false;
	}

	private async sync(guild: string) {
		await this.client.db.collection(COLLECTIONS.CLAN_STORES).updateMany({ guild }, { $set: { active: true, patron: true } });

		await this.client.db.collection(COLLECTIONS.CLAN_STORES)
			.find({ guild })
			.forEach(data => this.client.rpcHandler.add(data._id.toString(), { tag: data.tag, guild: data.guild, op: 0 }));
	}

	private redeemed(user: any) {
		if (user.entitled_amount === 10 && user.guilds && user.guilds.length >= 5) return true;
		else if (user.entitled_amount === 5 && user.guilds && user.guilds.length >= 3) return true;
		else if (user.entitled_amount === 3 && user.guilds && user.guilds.length >= 1) return true;
		else if (user.entitled_amount < 3 && user.redeemed) return true;
		return false;
	}
}
