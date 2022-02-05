import { Message, MessageActionRow, MessageButton, MessageEmbed, MessageSelectMenu } from 'discord.js';
import { Collections } from '../../util/Constants';
import { Reminder, ReminderTemp } from '../../struct/RemindScheduler';
import { Command } from 'discord-akairo';
import moment from 'moment';
import { ObjectId } from 'mongodb';

export default class ReminderDeleteCommand extends Command {
	public constructor() {
		super('reminder-delete', {
			aliases: ['rem-del'],
			category: 'beta',
			channel: 'guild',
			description: {},
			userPermissions: ['MANAGE_GUILD'],
			clientPermissions: ['EMBED_LINKS']
		});
	}

	public async exec(message: Message) {
		const reminders = await this.client.db.collection<Reminder>(Collections.REMINDERS)
			.find({ guild: message.guild!.id })
			.toArray();

		const customIds = {
			'menu': this.client.uuid(message.author.id),
			'delete': this.client.uuid(message.author.id),
			'view': this.client.uuid(message.author.id)
		};

		const label = (duration: number) => moment.duration(duration)
			.format('H[h], m[m], s[s]', { trim: 'both mid' });

		const state = {
			selected: null as string | null,
			reminders: new Set(reminders.map(rem => rem._id.toHexString()))
		};

		const options = (disabled: boolean, all = false) => {
			const menu = new MessageActionRow()
				.addComponents(
					new MessageSelectMenu()
						.setCustomId(customIds.menu)
						.setPlaceholder('Select a reminder!')
						.addOptions(
							reminders
								.filter(rem => state.reminders.has(rem._id.toHexString()))
								.map(
									rem => ({
										'label': label(rem.duration),
										'value': rem._id.toHexString(),
										'description': `${rem.message.substring(0, 100)}`,
										'default': state.selected === rem._id.toHexString()
									})
								)
						)
						.setDisabled(all)
				);

			const button = new MessageActionRow()
				.addComponents(
					new MessageButton()
						.setCustomId(customIds.view)
						.setLabel('View')
						.setStyle('PRIMARY')
						.setDisabled(disabled)
				)
				.addComponents(
					new MessageButton()
						.setCustomId(customIds.delete)
						.setLabel('Delete')
						.setStyle('DANGER')
						.setDisabled(disabled)
				);

			return [menu, button];
		};

		const embeds = () => {
			const reminder = reminders.find(rem => rem._id.toHexString() === state.selected)!;
			return new MessageEmbed()
				.addField(`${reminder.duration >= (3600 * 1000) ? 'Hours' : 'Minutes'} Remaining`, label(reminder.duration))
				.addField('Message', reminder.message)
				.addField('Channel', `<#${reminder.channel}>`)
				.setFooter({ text: `ID: ${reminder._id.toHexString()}` });
		};

		const msg = await message.util!.send({ content: '**Manage Reminders!**', components: options(true) });
		const collector = msg.createMessageComponentCollector({
			filter: action => Object.values(customIds).includes(action.customId) && action.user.id === message.author.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async action => {
			if (action.customId === customIds.menu && action.isSelectMenu()) {
				state.selected = action.values[0]!;
				await action.update({ components: options(false), embeds: [] });
			}

			if (action.customId === customIds.view) {
				const components = options(false);
				components[1].components[0].setDisabled(true);
				await action.update({ embeds: [embeds()], components });
			}

			if (action.customId === customIds.delete) {
				await action.deferUpdate();
				state.reminders.delete(state.selected!);

				await this.client.db.collection<Reminder>(Collections.REMINDERS)
					.deleteOne({ _id: new ObjectId(state.selected!) });
				await this.client.db.collection<ReminderTemp>(Collections.REMINDERS_TEMP)
					.deleteMany({ reminderId: new ObjectId(state.selected!) });

				await action.editReply({ components: options(true), embeds: [] });

				await action.followUp({ ephemeral: true, content: '**Successfully deleted!**' });
			}
		});

		collector.on('end', async (_, reason) => {
			for (const id of Object.values(customIds)) {
				this.client.components.delete(id);
			}
			if (!/delete/i.test(reason)) await msg.edit({ components: options(true, true) });
		});
	}
}
