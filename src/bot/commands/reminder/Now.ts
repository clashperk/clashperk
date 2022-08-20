import { CommandInteraction, ActionRowBuilder, ButtonBuilder, SelectMenuBuilder, TextChannel, ButtonStyle } from 'discord.js';
import ms from 'ms';
import { Command } from '../../lib/index.js';

export default class ReminderNowCommand extends Command {
	public constructor() {
		super('reminder-now', {
			category: 'reminder',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: { duration: string; message: string; channel?: TextChannel; clans?: string }
	) {
		const tags = this.client.resolver.resolveArgs(args.clans);
		const clans = tags.length
			? await this.client.storage.search(interaction.guildId, tags)
			: await this.client.storage.find(interaction.guildId);

		if (!clans.length && tags.length) return interaction.editReply(this.i18n('common.no_clans_found', { lng: interaction.locale }));
		if (!clans.length) return interaction.editReply(this.i18n('common.no_clans_linked', { lng: interaction.locale }));

		// const reminders = await this.client.db.collection<Reminder>(Collections.REMINDERS).countDocuments({ guild: interaction.guild.id });
		// if (reminders >= 25 && !this.client.patrons.get(interaction.guild.id)) {
		// 	return interaction.editReply(this.i18n('command.reminder.create.max_limit', { lng: interaction.locale }));
		// }
		if (!/\d+?\.?\d+?[hm]|\d[hm]/g.test(args.duration)) {
			return interaction.editReply(this.i18n('command.reminder.create.invalid_duration_format', { lng: interaction.locale }));
		}

		const dur = args.duration.match(/\d+?\.?\d+?[hm]|\d[hm]/g)!.reduce((acc, cur) => acc + ms(cur), 0);
		if (!args.message) return interaction.editReply(this.i18n('command.reminder.create.no_message', { lng: interaction.locale }));

		if (dur < 15 * 60 * 1000 || dur > 45 * 60 * 60 * 1000)
			return interaction.editReply(this.i18n('command.reminder.create.duration_limit', { lng: interaction.locale }));
		if (dur % (15 * 60 * 1000) !== 0) {
			return interaction.editReply(this.i18n('command.reminder.create.duration_order', { lng: interaction.locale }));
		}

		const CUSTOM_ID = {
			ROLES: this.client.uuid(interaction.user.id),
			TOWN_HALLS: this.client.uuid(interaction.user.id),
			REMAINING: this.client.uuid(interaction.user.id),
			CLANS: this.client.uuid(interaction.user.id),
			SAVE: this.client.uuid(interaction.user.id)
		};

		const state = {
			remaining: ['1', '2'],
			townHalls: Array(13)
				.fill(0)
				.map((_, i) => (i + 2).toString()),
			roles: ['leader', 'coLeader', 'admin', 'member'],
			clans: clans.map((clan) => clan.tag)
		};

		const mutate = (disable = false) => {
			const row1 = new ActionRowBuilder<SelectMenuBuilder>().addComponents(
				new SelectMenuBuilder()
					.setPlaceholder('Select Attacks Remaining')
					.setMaxValues(2)
					.setCustomId(CUSTOM_ID.REMAINING)
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
						}
					])
					.setDisabled(disable)
			);
			const row2 = new ActionRowBuilder<SelectMenuBuilder>().addComponents(
				new SelectMenuBuilder()
					.setPlaceholder('Select Town Halls')
					.setCustomId(CUSTOM_ID.TOWN_HALLS)
					.setMaxValues(13)
					.setOptions(
						Array(13)
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
			const row3 = new ActionRowBuilder<SelectMenuBuilder>().addComponents(
				new SelectMenuBuilder()
					.setPlaceholder('Select Clan Roles')
					.setCustomId(CUSTOM_ID.ROLES)
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
			const row4 = new ActionRowBuilder<SelectMenuBuilder>().addComponents(
				new SelectMenuBuilder()
					.setPlaceholder('Select Clans')
					.setCustomId(CUSTOM_ID.CLANS)
					.setMaxValues(clans.length)
					.setOptions(
						clans.slice(0, 25).map((clan) => ({
							label: clan.name,
							value: clan.tag,
							description: `${clan.name} (${clan.tag})`,
							default: state.clans.includes(clan.tag)
						}))
					)
					.setDisabled(disable || clans.length > 25)
			);
			const row5 = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder().setCustomId(CUSTOM_ID.SAVE).setLabel('Save').setStyle(ButtonStyle.Primary).setDisabled(disable)
			);

			return [row1, row2, row3, row4, row5];
		};

		const longText = this.i18n('command.reminder.create.too_many_clans', {
			lng: interaction.locale,
			clans: `${clans.length}`
		});
		const msg = await interaction.editReply({
			components: mutate(),
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			content: ['**War Reminder Setup**', clans.length > 25 ? `\n*${longText}*` : ''].join('\n')
		});
		const collector = msg.createMessageComponentCollector({
			filter: (action) => Object.values(CUSTOM_ID).includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === CUSTOM_ID.REMAINING && action.isSelectMenu()) {
				state.remaining = action.values;
				await action.update({ components: mutate() });
			}

			if (action.customId === CUSTOM_ID.TOWN_HALLS && action.isSelectMenu()) {
				state.townHalls = action.values;
				await action.update({ components: mutate() });
			}

			if (action.customId === CUSTOM_ID.ROLES && action.isSelectMenu()) {
				state.roles = action.values;
				await action.update({ components: mutate() });
			}

			if (action.customId === CUSTOM_ID.CLANS && action.isSelectMenu()) {
				state.clans = action.values;
				await action.update({ components: mutate() });
			}

			if (action.customId === CUSTOM_ID.SAVE && action.isButton()) {
				await action.deferUpdate();

				await action.editReply({
					components: mutate(true),
					content: this.i18n('command.reminder.create.success', { lng: interaction.locale })
				});
			}
		});

		collector.on('end', async (_, reason) => {
			for (const id of Object.values(CUSTOM_ID)) this.client.components.delete(id);
			if (!/delete/i.test(reason)) await interaction.editReply({ components: mutate(true) });
		});
	}
}
