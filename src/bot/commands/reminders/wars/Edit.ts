import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	CommandInteraction,
	ComponentType,
	ModalBuilder,
	StringSelectMenuBuilder,
	TextInputBuilder,
	TextInputStyle,
	escapeMarkdown
} from 'discord.js';
import moment from 'moment';
import { Command } from '../../../lib/index.js';
import { Reminder } from '../../../struct/ClanWarScheduler.js';
import { Collections, MAX_TOWN_HALL_LEVEL } from '../../../util/Constants.js';
import { hexToNanoId } from '../../../util/Helper.js';

export default class ReminderEditCommand extends Command {
	public constructor() {
		super('reminder-edit', {
			aliases: ['reminders-edit'],
			category: 'reminder',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			defer: true,
			ephemeral: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { id: string }) {
		const reminders = await this.client.db.collection<Reminder>(Collections.REMINDERS).find({ guild: interaction.guild.id }).toArray();
		if (!reminders.length)
			return interaction.editReply(this.i18n('command.reminders.delete.no_reminders', { lng: interaction.locale }));

		const reminderId = reminders.find((rem) => hexToNanoId(rem._id) === args.id.toUpperCase())?._id;
		if (!reminderId) {
			return interaction.editReply(this.i18n('command.reminders.delete.not_found', { lng: interaction.locale, id: args.id }));
		}

		const reminder = await this.client.db.collection<Reminder>(Collections.REMINDERS).findOne({ _id: reminderId });
		if (!reminder) {
			return interaction.editReply(this.i18n('command.reminders.delete.not_found', { lng: interaction.locale, id: args.id }));
		}

		const customIds = {
			roles: this.client.uuid(interaction.user.id),
			townHalls: this.client.uuid(interaction.user.id),
			remaining: this.client.uuid(interaction.user.id),
			clans: this.client.uuid(interaction.user.id),
			save: this.client.uuid(interaction.user.id),
			warTypes: this.client.uuid(interaction.user.id),
			message: this.client.uuid(interaction.user.id),
			modalMessage: this.client.uuid(interaction.user.id)
		};

		const clans = await this.client.storage.search(interaction.guildId, reminder.clans);
		const state = {
			remaining: reminder.remaining.map((remaining) => remaining.toString()),
			townHalls: reminder.townHalls.map((townHall) => townHall.toString()),
			smartSkip: Boolean(reminder.smartSkip),
			roles: reminder.roles,
			warTypes: reminder.warTypes,
			message: reminder.message
		};

		const mutate = (disable = false) => {
			const warTypeRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				new StringSelectMenuBuilder()
					.setPlaceholder('Select War Types')
					.setMaxValues(3)
					.setCustomId(customIds.warTypes)
					.setOptions([
						{
							label: 'Normal',
							value: 'normal',
							default: state.warTypes.includes('normal')
						},
						{
							label: 'Friendly',
							value: 'friendly',
							default: state.warTypes.includes('friendly')
						},
						{
							label: 'CWL',
							value: 'cwl',
							default: state.warTypes.includes('cwl')
						}
					])
					.setDisabled(disable)
			);

			const attackRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				new StringSelectMenuBuilder()
					.setPlaceholder('Select Attacks Remaining')
					.setMaxValues(3)
					.setCustomId(customIds.remaining)
					.setOptions([
						{
							description: '1 Attack Remaining',
							label: '1 Remaining',
							value: '1',
							default: state.remaining.includes('1')
						},
						{
							description: '2 Attacks Remaining',
							label: '2 Remaining',
							value: '2',
							default: state.remaining.includes('2')
						},
						{
							description: 'Skip reminder if the destruction is 100%',
							label: 'Smart Skip',
							value: 'smartSkip',
							default: state.smartSkip
						}
					])
					.setDisabled(disable)
			);

			const townHallRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				new StringSelectMenuBuilder()
					.setPlaceholder('Select Town Halls')
					.setCustomId(customIds.townHalls)
					.setMaxValues(MAX_TOWN_HALL_LEVEL - 1)
					.setOptions(
						Array(MAX_TOWN_HALL_LEVEL - 1)
							.fill(0)
							.map((_, i) => {
								const hall = (i + 2).toString();
								return {
									value: hall,
									label: hall,
									description: `Town Hall ${hall}`,
									default: state.townHalls.includes(hall)
								};
							})
					)
					.setDisabled(disable)
			);

			const clanRolesRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
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

			const btnRow = new ActionRowBuilder<ButtonBuilder>()
				.addComponents(
					new ButtonBuilder()
						.setCustomId(customIds.message)
						.setLabel('Set Custom Message')
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(disable)
				)
				.addComponents(
					new ButtonBuilder().setCustomId(customIds.save).setLabel('Save').setStyle(ButtonStyle.Primary).setDisabled(disable)
				);

			return reminder.duration === 0
				? [warTypeRow, clanRolesRow, btnRow]
				: [warTypeRow, attackRow, townHallRow, clanRolesRow, btnRow];
		};

		const dur = `${reminder.duration === 0 ? 'at the end' : `${this.getStatic(reminder.duration)} remaining`}`;
		const msg = await interaction.editReply({
			components: mutate(),
			content: [
				`**Edit War Reminder (${dur})** <#${reminder.channel}>`,
				'',
				escapeMarkdown(clans.map((clan) => `${clan.name} (${clan.tag})`).join(', ')),
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
			if (action.customId === customIds.warTypes && action.isStringSelectMenu()) {
				state.warTypes = action.values;
				await action.update({ components: mutate() });
			}

			if (action.customId === customIds.remaining && action.isStringSelectMenu()) {
				state.remaining = action.values.filter((v) => v !== 'smartSkip');
				state.smartSkip = action.values.includes('smartSkip');
				await action.update({ components: mutate() });
			}

			if (action.customId === customIds.townHalls && action.isStringSelectMenu()) {
				state.townHalls = action.values;
				await action.update({ components: mutate() });
			}

			if (action.customId === customIds.roles && action.isStringSelectMenu()) {
				state.roles = action.values;
				await action.update({ components: mutate() });
			}

			if (action.customId === customIds.message && action.isButton()) {
				const modalCustomId = this.client.uuid(interaction.user.id);
				const modal = new ModalBuilder().setCustomId(modalCustomId).setTitle('Edit Reminder Message');
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
							filter: (action) => action.customId === modalCustomId
						})
						.then(async (modalSubmit) => {
							state.message = modalSubmit.fields.getTextInputValue(customIds.modalMessage);
							await modalSubmit.deferUpdate();
							await modalSubmit.editReply({
								components: mutate(),
								content: [
									`**Edit War Reminder (${
										reminder.duration === 0 ? 'at the end' : `${this.getStatic(reminder.duration)} remaining`
									})** <#${reminder.channel}>`,
									'',
									clans.map((clan) => escapeMarkdown(clan.name)).join(', '),
									'',
									`${state.message}`
								].join('\n')
							});
						});
				} catch {}
			}

			if (action.customId === customIds.save && action.isButton()) {
				await action.deferUpdate();
				await this.client.db.collection<Reminder>(Collections.REMINDERS).updateOne(
					{ _id: reminder._id },
					{
						$set: {
							remaining: state.remaining.map((num) => Number(num)),
							townHalls: state.townHalls.map((num) => Number(num)),
							roles: state.roles,
							warTypes: state.warTypes,
							smartSkip: state.smartSkip,
							message: state.message
						}
					}
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
