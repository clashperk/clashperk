import { CommandInteraction, MessageActionRow, MessageButton, MessageSelectMenu, TextChannel } from 'discord.js';
import { Collections } from '../../util/Constants';
import { Reminder } from '../../struct/RemindScheduler';
import { Command } from '../../lib';
import ms from 'ms';
import { ObjectId } from 'mongodb';

export default class ReminderCreateCommand extends Command {
	public constructor() {
		super('reminder-create', {
			category: 'reminder',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			clientPermissions: ['EMBED_LINKS'],
			defer: true
		});
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: { duration: string; message: string; channel?: TextChannel; clans?: string }
	) {
		const tags = args.clans?.split(/ +/g) ?? [];
		const clans = tags.length
			? await this.client.storage.search(interaction.guildId, tags)
			: await this.client.storage.findAll(interaction.guildId);

		if (!clans.length && tags.length) return interaction.editReply(this.i18n('common.no_clans_linked', { lng: interaction.locale }));
		if (!clans.length) return interaction.editReply(this.i18n('common.no_clans_linked', { lng: interaction.locale }));

		const reminders = await this.client.db.collection<Reminder>(Collections.REMINDERS).countDocuments({ guild: interaction.guild.id });
		if (reminders >= 25 && !this.client.patrons.get(interaction.guild.id)) {
			return interaction.editReply(`**You can only have 25 reminders.**`);
		}
		if (!/\d+?\.?\d+?[hm]|\d[hm]/g.test(args.duration)) {
			return interaction.editReply('**You must provide a valid duration. e.g 2h, 2.5h, 30m**');
		}

		const dur = args.duration.match(/\d+?\.?\d+?[hm]|\d[hm]/g)!.reduce((acc, cur) => acc + ms(cur), 0);
		if (!args.message) return interaction.editReply('**You must provide a interaction for the reminder!**');

		if (dur < 15 * 60 * 1000) return interaction.editReply('**Duration must be at least 15 minutes.**');
		if (dur > 45 * 60 * 60 * 1000) return interaction.editReply('**Duration must be less than 45 hours.**');
		if (dur % (15 * 60 * 1000) !== 0) {
			return interaction.editReply('**Duration must be a multiple of 15 minutes. e.g 15m, 30m, 45m, 1h, 1.25h, 1.5h, 1.75h**');
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
			const row1 = new MessageActionRow().addComponents(
				new MessageSelectMenu()
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
			const row2 = new MessageActionRow().addComponents(
				new MessageSelectMenu()
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

			const row3 = new MessageActionRow().addComponents(
				new MessageSelectMenu()
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

			const row4 = new MessageActionRow().addComponents(
				new MessageSelectMenu()
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

			const row5 = new MessageActionRow().addComponents(
				new MessageButton().setCustomId(CUSTOM_ID.SAVE).setLabel('Save').setStyle('PRIMARY').setDisabled(disable)
			);

			return [row1, row2, row3, row4, row5];
		};

		const msg = await interaction.editReply({
			components: mutate(),
			content: [
				'**War Reminder Setup**',
				...(clans.length > 25
					? [
							'',
							`*Clan selection menu is not available for more than 25 clans. ${clans.length} clans were selected automatically!*`,
							`*To create a reminder for specific clans, pass clan tags or aliases through 'clans' option while executing the command.*`
					  ]
					: [])
			].join('\n')
		});
		const collector = msg.createMessageComponentCollector({
			filter: (action) => Object.values(CUSTOM_ID).includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === CUSTOM_ID.REMAINING && action.isSelectMenu()) {
				state.remaining = action.values;
				return action.update({ components: mutate() });
			}

			if (action.customId === CUSTOM_ID.TOWN_HALLS && action.isSelectMenu()) {
				state.townHalls = action.values;
				return action.update({ components: mutate() });
			}

			if (action.customId === CUSTOM_ID.ROLES && action.isSelectMenu()) {
				state.roles = action.values;
				return action.update({ components: mutate() });
			}

			if (action.customId === CUSTOM_ID.CLANS && action.isSelectMenu()) {
				state.clans = action.values;
				return action.update({ components: mutate() });
			}

			if (action.customId === CUSTOM_ID.SAVE && action.isButton()) {
				await action.deferUpdate();
				const reminder = {
					// TODO: remove this
					_id: new ObjectId(),
					guild: interaction.guild.id,
					channel: args.channel?.id ?? interaction.channel!.id,
					remaining: state.remaining.map((num) => Number(num)),
					townHalls: state.townHalls.map((num) => Number(num)),
					roles: state.roles,
					clans: state.clans,
					message: args.message.trim(),
					duration: dur,
					createdAt: new Date()
				};

				const { insertedId } = await this.client.db.collection<Reminder>(Collections.REMINDERS).insertOne(reminder);
				this.client.remindScheduler.create({ ...reminder, _id: insertedId });
				await action.editReply({ components: mutate(true), content: '**Successfully saved!**' });
			}
		});

		collector.on('end', async (_, reason) => {
			for (const id of Object.values(CUSTOM_ID)) this.client.components.delete(id);
			if (!/delete/i.test(reason)) await interaction.editReply({ components: mutate(true) });
		});
	}
}
