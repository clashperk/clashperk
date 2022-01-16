import { Message, MessageActionRow, MessageButton, MessageSelectMenu } from 'discord.js';
import { Included, Patron } from '../../struct/Patrons';
import { Collections } from '../../util/Constants';
import { Command } from 'discord-akairo';

const rewards = {
	bronze: '3705318',
	silver: '4742718',
	gold: '5352215'
};

export default class RedeemCommand extends Command {
	public constructor() {
		super('redeem', {
			aliases: ['redeem'],
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Redeem/Manage Patreon subscription.'
			}
		});
	}

	public async exec(message: Message) {
		const data = await this.client.patrons.fetchAPI();
		if (!data) return message.util!.send('**Something went wrong (unresponsive api), please contact us!**');

		const patron = data.included.find(entry => entry.attributes.social_connections?.discord?.user_id === '860039763196903484');
		if (!patron) {
			const embed = this.client.util.embed()
				.setColor(16345172)
				.setDescription([
					'I could not find any patreon account connected to your discord.',
					'',
					'Make sure that you are connected and subscribed to ClashPerk.',
					'Not subscribed yet? [Become a Patron](https://www.patreon.com/clashperk)'
				].join('\n'))
				.addField('How to connect?', 'https://www.patreon.com/settings/apps')
				.setImage('https://i.imgur.com/APME0CX.png');

			return message.util!.send({ embeds: [embed] });
		}

		if (this.client.patrons.get(message.guild!.id)) {
			return message.util!.send('**This server already has an active subscription.**');
		}

		const collection = this.client.db.collection<Patron>(Collections.PATRONS);
		const user = await collection.findOne({ id: patron.id });

		const pledge = data.data.find(entry => entry.relationships.user.data.id === patron.id);
		if (!pledge) return message.util!.send('**Something went wrong (unknown pledge), please contact us!**');

		if (pledge.attributes.patron_status !== 'active_patron') {
			return message.util!.send('**Something went wrong (declined pledge), please contact us!**');
		}

		const rewardId = pledge.relationships.currently_entitled_tiers.data[0]?.id;
		if (!rewardId) {
			return message.util!.send('**Something went wrong (unknown tier), please contact us!**');
		}

		const embed = this.client.util.embed()
			.setColor(16345172)
			.setDescription([
				`Subscription enabled for **${message.guild!.name}**`,
				`Thank you so much for the support ${message.author.toString()}`
			].join('\n'));

		if (!user) {
			await collection.updateOne(
				{ id: patron.id },
				{
					$set: {
						id: patron.id,
						name: patron.attributes.full_name,
						rewardId,
						userId: message.author.id,
						username: message.author.username,
						guilds: [{
							id: message.guild!.id,
							name: message.guild!.name,
							limit: 50
						}],
						redeemed: true,
						active: true,
						declined: false,
						cancelled: false,
						entitledAmount: pledge.attributes.currently_entitled_amount_cents,
						lifetimeSupport: pledge.attributes.lifetime_support_cents,
						createdAt: new Date(pledge.attributes.pledge_relationship_start),
						lastChargeDate: new Date(pledge.attributes.last_charge_date)
					}
				},
				{ upsert: true }
			);

			await this.client.patrons.refresh();
			await this.sync(message.guild!.id);
			return message.util!.send({ embeds: [embed] });
		}

		const redeemed = this.redeemed({ ...user, rewardId });
		if (redeemed) {
			if (!this.isNew(user, message, patron)) await this.client.patrons.refresh();
			const embed = this.client.util.embed()
				.setColor(16345172)
				.setDescription([
					'You\'ve already claimed your subscription!',
					'If you think it\'s wrong, please [contact us.](https://discord.gg/ppuppun)'
				].join('\n'));

			const customIds = {
				button: this.client.uuid(message.author.id),
				menu: this.client.uuid(message.author.id)
			};
			const row = new MessageActionRow()
				.addComponents(
					new MessageButton()
						.setStyle('SECONDARY')
						.setCustomId(customIds.button)
						.setLabel('Manage Servers')
				);
			const msg = await message.util!.send({ embeds: [embed], components: [row] });
			const collector = msg.createMessageComponentCollector({
				filter: action => Object.values(customIds).includes(action.customId) && action.user.id === message.author.id,
				time: 5 * 60 * 1000
			});

			const menus = new MessageActionRow()
				.addComponents(
					new MessageSelectMenu()
						.setPlaceholder('Select a server!')
						.setCustomId(customIds.menu)
						.addOptions(user.guilds.map(guild => ({ label: guild.name, value: guild.id })))
				);

			collector.on('collect', async action => {
				if (action.customId === customIds.button) {
					return action.update({
						embeds: [], components: [menus],
						content: '**Select a server to disable subscription.**'
					});
				}

				if (action.customId === customIds.menu && action.isSelectMenu()) {
					const id = action.values[0].trim();
					const guild = user.guilds.find(guild => guild.id === id);
					if (!guild) return action.update({ content: '**Something went wrong (unknown server), please contact us!**' });
					await action.deferUpdate();
					await collection.updateOne({ _id: user._id }, { $pull: { guilds: { id } } });
					await action.editReply({ components: [], content: `Subscription disabled for **${guild.name} (${guild.id})**` });
				}
			});

			return;
		}

		// not redeemed
		await collection.updateOne(
			{ id: patron.id },
			{
				$set: {
					userId: message.author.id,
					username: message.author.username,
					active: true,
					declined: false,
					cancelled: false,
					redeemed: true,
					entitledAmount: pledge.attributes.currently_entitled_amount_cents,
					lifetimeSupport: pledge.attributes.lifetime_support_cents,
					lastChargeDate: new Date(pledge.attributes.last_charge_date)
				},
				$push: {
					guilds: {
						id: message.guild!.id,
						name: message.guild!.name,
						limit: 50
					}
				}
			}
		);

		await this.client.patrons.refresh();
		await this.sync(message.guild!.id);
		return message.channel.send({ embeds: [embed] });
	}

	private isNew(user: Patron, message: Message, patron: Included) {
		if (user.userId !== message.author.id) {
			this.client.db.collection(Collections.PATRONS)
				.updateOne(
					{ id: patron.id },
					{
						$set: {
							userId: message.author.id,
							username: message.author.username
						}
					}
				);
			return true;
		}
		return false;
	}

	private async sync(guild: string) {
		await this.client.db.collection(Collections.CLAN_STORES)
			.updateMany({ guild }, { $set: { active: true, patron: true } });
		await this.client.db.collection(Collections.CLAN_STORES)
			.find({ guild })
			.forEach(data => {
				this.client.rpcHandler.add(data._id.toString(), { tag: data.tag, guild: data.guild, op: 0 });
			});
	}

	private redeemed(user: Patron) {
		if (user.rewardId === rewards.gold && user.guilds.length >= 5) return true;
		else if (user.rewardId === rewards.silver && user.guilds.length >= 3) return true;
		else if (user.rewardId === rewards.bronze && user.guilds.length >= 1) return true;
		return false;
	}
}
