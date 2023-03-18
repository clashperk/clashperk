import {
	CommandInteraction,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	StringSelectMenuBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle
} from 'discord.js';
import { ObjectId } from 'mongodb';
import moment from 'moment';
import { Collections } from '../../../util/Constants.js';
import { Command } from '../../../lib/index.js';
import { RaidReminder } from '../../../struct/CapitalRaidScheduler.js';

export default class ReminderCreateCommand extends Command {
	public constructor() {
		super('capital-reminder-edit', {
			category: 'reminder',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { id: string }) {
		const reminders = await this.client.db
			.collection<RaidReminder>(Collections.RAID_REMINDERS)
			.find({ guild: interaction.guild.id })
			.toArray();
		if (!reminders.length)
			return interaction.editReply(this.i18n('command.reminders.delete.no_reminders', { lng: interaction.locale }));

		const reminderId = reminders[Number(args.id) - 1]?._id as ObjectId | null;
		if (!reminderId) {
			return interaction.editReply(this.i18n('command.reminders.delete.not_found', { lng: interaction.locale, id: args.id }));
		}

		const reminder = await this.client.db.collection<RaidReminder>(Collections.RAID_REMINDERS).findOne({ _id: reminderId });
		if (!reminder) {
			return interaction.editReply(this.i18n('command.reminders.delete.not_found', { lng: interaction.locale, id: args.id }));
		}

		const customIds = {
			roles: this.client.uuid(interaction.user.id),
			remaining: this.client.uuid(interaction.user.id),
			clans: this.client.uuid(interaction.user.id),
			save: this.client.uuid(interaction.user.id),
			memberType: this.client.uuid(interaction.user.id),
			message: this.client.uuid(interaction.user.id),
			modal: this.client.uuid(interaction.user.id),
			modalMessage: this.client.uuid(interaction.user.id)
		};

		const state = {
			remaining: reminder.remaining.map((r) => r.toString()),
			allMembers: reminder.allMembers,
			roles: reminder.roles,
			message: reminder.message
		};

		const mutate = (disable = false) => {
			const row1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				new StringSelectMenuBuilder()
					.setPlaceholder('Select Attacks Remaining')
					.setMaxValues(6)
					.setCustomId(customIds.remaining)
					.setOptions(
						Array(6)
							.fill(0)
							.map((_, i) => ({
								label: `${i + 1} Remaining${i === 5 ? ` (if eligible)` : ''}`,
								value: (i + 1).toString(),
								default: state.remaining.includes((i + 1).toString())
							}))
					)
					.setDisabled(disable)
			);

			const row2 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				new StringSelectMenuBuilder()
					.setPlaceholder('Select Min. Attacks Done')
					.setMaxValues(1)
					.setCustomId(customIds.memberType)
					.setOptions([
						{
							label: 'All Members',
							value: 'allMembers',
							description: 'With a minimum of 0 attacks done.',
							default: state.allMembers
						},
						{
							label: 'Only Participants',
							value: 'onlyParticipants',
							description: 'With a minimum of 1 attack done.',
							default: !state.allMembers
						}
					])
					.setDisabled(disable)
			);

			const row3 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				new StringSelectMenuBuilder()
					.setPlaceholder('Select Clan Roles')
					.setCustomId(customIds.roles)
					.setMaxValues(4)
					.setOptions([
						{
							label: 'Leader',
							value: 'leader',
							default: state.roles.includes('leader')
						},
						{
							label: 'Co-Leader',
							value: 'coLeader',
							default: state.roles.includes('coLeader')
						},
						{
							label: 'Elder',
							value: 'admin',
							default: state.roles.includes('admin')
						},
						{
							label: 'Member',
							value: 'member',
							default: state.roles.includes('member')
						}
					])
					.setDisabled(disable)
			);

			const row4 = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder().setCustomId(customIds.save).setLabel('Save').setStyle(ButtonStyle.Primary).setDisabled(disable)
			);

			return [row1, row2, row3, row4];
		};

		const clans = await this.client.storage.search(interaction.guildId, reminder.clans);
		const msg = await interaction.editReply({
			components: mutate(),
			content: [
				`**Edit Raid Attack Reminder (${this.getStatic(reminder.duration)} remaining)** <#${reminder.channel}>`,
				'',
				clans.map((clan) => clan.name).join(', '),
				'',
				`${reminder.message}`
			].join('\n'),
			allowedMentions: { parse: [] }
		});
		const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
			filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === customIds.remaining && action.isStringSelectMenu()) {
				state.remaining = action.values;
				await action.update({ components: mutate() });
			}

			if (action.customId === customIds.roles && action.isStringSelectMenu()) {
				state.roles = action.values;
				await action.update({ components: mutate() });
			}

			if (action.customId === customIds.memberType && action.isStringSelectMenu()) {
				state.allMembers = action.values.includes('allMembers');
				await action.update({ components: mutate() });
			}

			if (action.customId === customIds.message && action.isButton()) {
				const modal = new ModalBuilder().setCustomId(customIds.modal).setTitle('Edit Reminder Message');
				const messageInput = new TextInputBuilder()
					.setCustomId(customIds.modalMessage)
					.setLabel('Reminder Message')
					.setMinLength(1)
					.setMaxLength(1000)
					.setRequired(true)
					.setValue(reminder.message)
					.setStyle(TextInputStyle.Paragraph);
				modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(messageInput));
				await action.showModal(modal);

				try {
					await action
						.awaitModalSubmit({
							time: 5 * 60 * 1000,
							filter: (_interaction) => _interaction.customId === customIds.modal
						})
						.then(async (_action) => {
							state.message = _action.fields.getTextInputValue(customIds.modalMessage);
							await _action.deferUpdate();
							await _action.editReply({
								components: mutate(),
								content: [
									`**Edit Raid Attack Reminder (${this.getStatic(reminder.duration)})** <#${reminder.channel}>`,
									'',
									`${state.message}`,
									'',
									clans.map((clan) => clan.name).join(', ')
								].join('\n')
							});
						});
				} catch {}
			}

			if (action.customId === customIds.save && action.isButton()) {
				await action.deferUpdate();
				await this.client.db.collection<RaidReminder>(Collections.RAID_REMINDERS).updateOne(
					{ _id: reminder._id },
					{
						$set: {
							remaining: state.remaining.map((num) => Number(num)),
							roles: state.roles,
							allMembers: state.allMembers,
							message: state.message.trim()
						}
					},
					{ upsert: true }
				);
				await action.editReply({
					components: mutate(true),
					content: this.i18n('command.reminders.create.success', { lng: interaction.locale })
				});
			}
		});

		collector.on('end', async (_, reason) => {
			for (const id of Object.values(customIds)) this.client.components.delete(id);
			if (!/delete/i.test(reason)) await interaction.editReply({ components: mutate(true) });
		});
	}

	private getStatic(dur: number) {
		return moment.duration(dur).format('d[d] h[h] m[m]', { trim: 'both mid' });
	}
}
