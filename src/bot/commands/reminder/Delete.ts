import { CommandInteraction, MessageActionRow, MessageButton, MessageEmbed, MessageSelectMenu } from 'discord.js';
import { Collections } from '../../util/Constants';
import { Reminder, ReminderTemp } from '../../struct/RemindScheduler';
import { Args, Command } from '../../lib';
import moment from 'moment';
import { ObjectId } from 'mongodb';

const roles: Record<string, string> = {
	member: 'Member',
	admin: 'Elder',
	coLeader: 'Co-Leader',
	leader: 'Leader'
};

export default class ReminderDeleteCommand extends Command {
	public constructor() {
		super('reminder-delete', {
			category: 'reminder',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			clientPermissions: ['EMBED_LINKS'],
			defer: true
		});
	}

	public args(): Args {
		return {
			clear: {
				match: 'BOOLEAN'
			}
		};
	}

	public async exec(interaction: CommandInteraction<'cached'>, { id, clear }: { id?: string; clear: boolean }) {
		const reminders = await this.client.db.collection<Reminder>(Collections.REMINDERS).find({ guild: interaction.guild.id }).toArray();
		if (!reminders.length) return interaction.editReply(this.i18n('command.reminder.delete.no_reminders', { lng: interaction.locale }));

		if (clear) {
			await this.client.db.collection<Reminder>(Collections.REMINDERS).deleteMany({ guild: interaction.guild.id });
			await this.client.db.collection<ReminderTemp>(Collections.REMINDERS_TEMP).deleteMany({ guild: interaction.guildId });
			return interaction.editReply(this.i18n('command.reminder.delete.cleared', { lng: interaction.locale }));
		}

		if (id) {
			const reminderId = reminders[Number(id) - 1]?._id as ObjectId | null;
			if (!reminderId) return interaction.editReply(this.i18n('command.reminder.delete.not_found', { lng: interaction.locale, id }));
			await this.client.db.collection<Reminder>(Collections.REMINDERS).deleteOne({ _id: reminderId });
			await this.client.db.collection<ReminderTemp>(Collections.REMINDERS_TEMP).deleteMany({ reminderId });
			return interaction.editReply(this.i18n('command.reminder.delete.success', { lng: interaction.locale, id }));
		}

		if (reminders.length > 25)
			return interaction.editReply(this.i18n('command.reminder.delete.too_many_reminders', { lng: interaction.locale }));

		const clans = await this.client.storage.findAll(interaction.guild.id);
		const customIds = {
			menu: this.client.uuid(interaction.user.id),
			delete: this.client.uuid(interaction.user.id),
			view: this.client.uuid(interaction.user.id)
		};

		const label = (duration: number) => moment.duration(duration).format('H[h], m[m], s[s]', { trim: 'both mid' });

		const state = {
			selected: null as string | null,
			reminders: new Set(reminders.map((rem) => rem._id.toHexString()))
		};

		const options = (men = false, view = false, del = false) => {
			const menu = new MessageActionRow().addComponents(
				new MessageSelectMenu()
					.setCustomId(customIds.menu)
					.setPlaceholder('Select a reminder!')
					.addOptions(
						reminders
							.filter((rem) => state.reminders.has(rem._id.toHexString()))
							.map((rem) => ({
								label: `${label(rem.duration)} remaining`,
								value: rem._id.toHexString(),
								description: `${rem.message.substring(0, 100)}`,
								default: state.selected === rem._id.toHexString()
							}))
					)
					.setDisabled(men)
			);

			const button = new MessageActionRow()
				.addComponents(new MessageButton().setCustomId(customIds.view).setLabel('View').setStyle('PRIMARY').setDisabled(view))
				.addComponents(new MessageButton().setCustomId(customIds.delete).setLabel('Delete').setStyle('DANGER').setDisabled(del));

			return [menu, button];
		};

		const embeds = () => {
			const reminder = reminders.find((rem) => rem._id.toHexString() === state.selected)!;
			const embed = new MessageEmbed().setColor(this.client.embed(interaction));
			embed.addField('Duration', `${label(reminder.duration)} remaining`);
			embed.addField('Channel', `<#${reminder.channel}>`);
			if (reminder.roles.length === 4) {
				embed.addField('Roles', 'Any');
			} else {
				embed.addField('Roles', reminder.roles.map((role) => roles[role]).join(', '));
			}
			if (reminder.townHalls.length === 13) {
				embed.addField('Town Halls', 'Any');
			} else {
				embed.addField('Town Halls', reminder.townHalls.join(', '));
			}
			if (reminder.remaining.length === 2) {
				embed.addField('Remaining Hits', 'Any');
			} else {
				embed.addField('Remaining Hits', reminder.remaining.join(', '));
			}
			const _clans = clans.filter((clan) => reminder.clans.includes(clan.tag)).map((clan) => clan.name);
			if (_clans.length) embed.addField('Clans', _clans.join(', ').substring(0, 1024));
			else embed.addField('Clans', reminder.clans.join(', ').substring(0, 1024));
			embed.addField('Message', reminder.message.substring(0, 1024));
			return embed;
		};

		const msg = await interaction.editReply({
			embeds: [],
			content: '**Manage War Reminders**',
			components: options(false, true, true)
		});
		const collector = msg.createMessageComponentCollector({
			filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === customIds.menu && action.isSelectMenu()) {
				state.selected = action.values[0]!;
				await action.update({ components: options(false, true, false), embeds: [embeds()] });
			}

			if (action.customId === customIds.view) {
				const rems = reminders.filter((rem) => state.reminders.has(rem._id.toHexString()));
				await action.update({
					embeds: rems.length ? [embeds()] : [],
					components: rems.length ? options(false, true, false) : [],
					content: rems.length ? '**Manage War Reminders**' : "**You don't have any more reminders!**"
				});
			}

			if (action.customId === customIds.delete) {
				await action.deferUpdate();
				state.reminders.delete(state.selected!);

				await this.client.db.collection<Reminder>(Collections.REMINDERS).deleteOne({ _id: new ObjectId(state.selected!) });
				await this.client.db
					.collection<ReminderTemp>(Collections.REMINDERS_TEMP)
					.deleteMany({ reminderId: new ObjectId(state.selected!) });

				const rems = reminders.filter((rem) => state.reminders.has(rem._id.toHexString()));
				await action.editReply({
					embeds: [],
					components: rems.length ? options(false, true, true) : [],
					content: rems.length ? '**Manage War Reminders**' : "**You don't have any more reminders!**"
				});
			}
		});

		collector.on('end', async (_, reason) => {
			for (const id of Object.values(customIds)) {
				this.client.components.delete(id);
			}
			if (!/delete/i.test(reason)) await interaction.editReply({ components: state.reminders.size ? options(true, true, true) : [] });
		});
	}
}
