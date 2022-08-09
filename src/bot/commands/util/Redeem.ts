import { CommandInteraction, MessageActionRow, MessageButton, MessageEmbed, MessageSelectMenu } from 'discord.js';
import { Included, Patron } from '../../struct/Patrons.js';
import { Collections } from '../../util/Constants.js';
import { Command } from '../../lib/index.js';

const rewards = {
	bronze: '3705318',
	silver: '4742718',
	gold: '5352215'
};

export default class RedeemCommand extends Command {
	public constructor() {
		super('redeem', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {
				content: 'Redeem/Manage Patreon subscription.'
			},
			defer: true,
			ephemeral: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>) {
		const data = await this.client.patrons.fetchAPI();
		if (!data) return interaction.editReply('**Something went wrong (unresponsive api), please contact us!**');

		const patron = data.included.find((entry) => entry.attributes.social_connections?.discord?.user_id === interaction.user.id);
		if (!patron) {
			const embed = new MessageEmbed()
				.setColor(16345172)
				.setDescription(
					[
						'I could not find any Patreon account connected to your Discord.',
						'',
						'Make sure that you are connected and subscribed to ClashPerk.',
						'Not subscribed yet? [Become a Patron](https://www.patreon.com/clashperk)'
					].join('\n')
				)
				.addField('How to connect?', 'https://www.patreon.com/settings/apps')
				.setImage('https://i.imgur.com/APME0CX.png');

			return interaction.editReply({ embeds: [embed] });
		}

		if (this.client.patrons.get(interaction.guild.id)) {
			return interaction.editReply('**This server already has an active subscription.**');
		}

		const collection = this.client.db.collection<Patron>(Collections.PATRONS);
		const user = await collection.findOne({ id: patron.id });

		const pledge = data.data.find((entry) => entry.relationships.user.data.id === patron.id);
		if (!pledge) return interaction.editReply('**Something went wrong (unknown pledge), please contact us!**');

		if (pledge.attributes.patron_status !== 'active_patron') {
			return interaction.editReply('**Something went wrong (declined pledge), please contact us!**');
		}

		const rewardId = pledge.relationships.currently_entitled_tiers.data[0]?.id;
		if (!rewardId) {
			return interaction.editReply('**Something went wrong (unknown tier), please contact us!**');
		}

		const embed = new MessageEmbed()
			.setColor(16345172)
			.setDescription(
				[
					`Subscription enabled for **${interaction.guild.name}**`,
					`Thank you so much for the support ${interaction.user.toString()}`
				].join('\n')
			);

		if (!user) {
			await collection.updateOne(
				{ id: patron.id },
				{
					$set: {
						id: patron.id,
						name: patron.attributes.full_name,
						rewardId,
						userId: interaction.user.id,
						username: interaction.user.username,
						guilds: [
							{
								id: interaction.guild.id,
								name: interaction.guild.name,
								limit: 50
							}
						],
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
			await this.sync(interaction.guild.id);
			return interaction.editReply({ embeds: [embed] });
		}

		const redeemed = this.redeemed({ ...user, rewardId });
		if (redeemed) {
			if (!this.isNew(user, interaction, patron)) await this.client.patrons.refresh();
			const embed = new MessageEmbed()
				.setColor(16345172)
				.setDescription(
					[
						"You've already claimed your subscription!",
						"If you think it's wrong, please [contact us.](https://discord.gg/ppuppun)"
					].join('\n')
				);

			const customIds = {
				button: this.client.uuid(interaction.user.id),
				menu: this.client.uuid(interaction.user.id)
			};
			const row = new MessageActionRow().addComponents(
				new MessageButton().setStyle('SECONDARY').setCustomId(customIds.button).setLabel('Manage Servers')
			);
			const msg = await interaction.editReply({ embeds: [embed], components: [row] });
			const collector = msg.createMessageComponentCollector({
				filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
				time: 5 * 60 * 1000
			});

			const menus = new MessageActionRow().addComponents(
				new MessageSelectMenu()
					.setPlaceholder('Select a server!')
					.setCustomId(customIds.menu)
					.addOptions(user.guilds.map((guild) => ({ label: guild.name, value: guild.id })))
			);

			collector.on('collect', async (action) => {
				if (action.customId === customIds.button) {
					return action.update({
						embeds: [],
						components: [menus],
						content: '**Select a server to disable subscription.**'
					});
				}

				if (action.customId === customIds.menu && action.isSelectMenu()) {
					const id = action.values[0].trim();
					const guild = user.guilds.find((guild) => guild.id === id);
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
					userId: interaction.user.id,
					username: interaction.user.username,
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
						id: interaction.guild.id,
						name: interaction.guild.name,
						limit: 50
					}
				}
			}
		);

		await this.client.patrons.refresh();
		await this.sync(interaction.guild.id);
		return interaction.editReply({ embeds: [embed] });
	}

	private isNew(user: Patron, interaction: CommandInteraction, patron: Included) {
		if (user.userId !== interaction.user.id) {
			this.client.db.collection(Collections.PATRONS).updateOne(
				{ id: patron.id },
				{
					$set: {
						userId: interaction.user.id,
						username: interaction.user.username
					}
				}
			);
			return true;
		}
		return false;
	}

	private async sync(guild: string) {
		await this.client.db.collection(Collections.CLAN_STORES).updateMany({ guild }, { $set: { active: true, patron: true } });
		await this.client.db
			.collection(Collections.CLAN_STORES)
			.find({ guild })
			.forEach((data) => {
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
