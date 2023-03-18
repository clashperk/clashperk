import {
	CommandInteraction,
	ActionRowBuilder,
	ButtonBuilder,
	EmbedBuilder,
	StringSelectMenuBuilder,
	ButtonStyle,
	ComponentType
} from 'discord.js';
import moment from 'moment';
import { ObjectId } from 'mongodb';
import { Collections } from '../../../util/Constants.js';
import { Args, Command } from '../../../lib/index.js';
import { RaidReminder, RaidSchedule } from '../../../struct/CapitalRaidScheduler.js';

const roles: Record<string, string> = {
	member: 'Member',
	admin: 'Elder',
	coLeader: 'Co-Leader',
	leader: 'Leader'
};

export default class CapitalReminderDeleteCommand extends Command {
	public constructor() {
		super('capital-reminder-delete', {
			category: 'reminder',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			clientPermissions: ['EmbedLinks'],
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
		const reminders = await this.client.db
			.collection<RaidReminder>(Collections.RAID_REMINDERS)
			.find({ guild: interaction.guild.id })
			.toArray();
		if (!reminders.length)
			return interaction.editReply(this.i18n('command.reminders.delete.no_reminders', { lng: interaction.locale }));

		if (clear) {
			await this.client.db.collection<RaidReminder>(Collections.RAID_REMINDERS).deleteMany({ guild: interaction.guild.id });
			await this.client.db.collection<RaidSchedule>(Collections.RAID_SCHEDULERS).deleteMany({ guild: interaction.guildId });
			return interaction.editReply(this.i18n('command.reminders.delete.cleared', { lng: interaction.locale }));
		}

		if (id) {
			const reminderId = reminders[Number(id) - 1]?._id as ObjectId | null;
			if (!reminderId) return interaction.editReply(this.i18n('command.reminders.delete.not_found', { lng: interaction.locale, id }));
			await this.client.db.collection<RaidReminder>(Collections.RAID_REMINDERS).deleteOne({ _id: reminderId });
			await this.client.db.collection<RaidSchedule>(Collections.RAID_SCHEDULERS).deleteMany({ reminderId });
			return interaction.editReply(this.i18n('command.reminders.delete.success', { lng: interaction.locale, id }));
		}

		if (reminders.length > 25)
			return interaction.editReply(this.i18n('command.reminders.delete.too_many_reminders', { lng: interaction.locale }));

		const clans = await this.client.storage.find(interaction.guild.id);
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
			const menu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				new StringSelectMenuBuilder()
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

			const button = new ActionRowBuilder<ButtonBuilder>()
				.addComponents(
					new ButtonBuilder().setCustomId(customIds.view).setLabel('View').setStyle(ButtonStyle.Primary).setDisabled(view)
				)
				.addComponents(
					new ButtonBuilder().setCustomId(customIds.delete).setLabel('Delete').setStyle(ButtonStyle.Danger).setDisabled(del)
				);

			return [menu, button];
		};

		const embeds = () => {
			const reminder = reminders.find((rem) => rem._id.toHexString() === state.selected)!;
			const embed = new EmbedBuilder().setColor(this.client.embed(interaction));
			embed.addFields([
				{
					name: 'Duration',
					value: `${label(reminder.duration)} remaining`
				},
				{
					name: 'Channel',
					value: `<#${reminder.channel}>`
				}
			]);
			if (reminder.roles.length === 4) {
				embed.addFields([{ name: 'Roles', value: 'Any' }]);
			} else {
				embed.addFields([{ name: 'Roles', value: reminder.roles.map((role) => roles[role]).join(', ') }]);
			}

			if (reminder.remaining.length === 6) {
				embed.addFields([{ name: 'Remaining Hits', value: 'Any' }]);
			} else {
				embed.addFields([{ name: 'Remaining Hits', value: reminder.remaining.join(', ') }]);
			}

			embed.addFields([{ name: 'Members', value: reminder.allMembers ? 'All Members' : 'Only Participants' }]);

			const _clans = clans.filter((clan) => reminder.clans.includes(clan.tag)).map((clan) => clan.name);
			if (_clans.length) embed.addFields([{ name: 'Clans', value: _clans.join(', ').substring(0, 1024) }]);
			else embed.addFields([{ name: 'Clans', value: reminder.clans.join(', ').substring(0, 1024) }]);
			embed.addFields([{ name: 'Message', value: reminder.message.substring(0, 1024) }]);
			return embed;
		};

		const msg = await interaction.editReply({
			embeds: [],
			content: '**Manage Capital Raid Reminders**',
			components: options(false, true, true)
		});
		const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
			filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === customIds.menu && action.isStringSelectMenu()) {
				state.selected = action.values[0]!;
				await action.update({ components: options(false, true, false), embeds: [embeds()] });
			}

			if (action.customId === customIds.view) {
				const rems = reminders.filter((rem) => state.reminders.has(rem._id.toHexString()));
				await action.update({
					embeds: rems.length ? [embeds()] : [],
					components: rems.length ? options(false, true, false) : [],
					content: rems.length ? '**Manage Capital Raid Reminders**' : "**You don't have any more reminders!**"
				});
			}

			if (action.customId === customIds.delete) {
				await action.deferUpdate();
				state.reminders.delete(state.selected!);

				await this.client.db.collection<RaidReminder>(Collections.RAID_REMINDERS).deleteOne({ _id: new ObjectId(state.selected!) });
				await this.client.db
					.collection<RaidSchedule>(Collections.RAID_SCHEDULERS)
					.deleteMany({ reminderId: new ObjectId(state.selected!) });

				const rems = reminders.filter((rem) => state.reminders.has(rem._id.toHexString()));
				await action.editReply({
					embeds: [],
					components: rems.length ? options(false, true, true) : [],
					content: rems.length ? '**Manage Capital Raid Reminders**' : "**You don't have any more reminders!**"
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
