import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	CommandInteraction,
	ComponentType,
	StringSelectMenuBuilder
} from 'discord.js';
import { Command } from '../../lib/index.js';
import { EMOJIS } from '../../util/Emojis.js';
import { Util } from '../../util/index.js';

export default class CapitalReminderNowCommand extends Command {
	public constructor() {
		super('clan-games-reminder-now', {
			category: 'reminder',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { message: string; clans?: string }) {
		if (!args.message) return interaction.editReply(this.i18n('command.reminder.now.no_message', { lng: interaction.locale }));

		const tags = args.clans === '*' ? [] : await this.client.resolver.resolveArgs(args.clans);
		const clans =
			args.clans === '*'
				? await this.client.storage.find(interaction.guildId)
				: await this.client.storage.search(interaction.guildId, tags);

		if (!clans.length && tags.length) return interaction.editReply(this.i18n('common.no_clans_found', { lng: interaction.locale }));
		if (!clans.length) {
			return interaction.editReply(this.i18n('common.no_clans_linked', { lng: interaction.locale }));
		}

		const CUSTOM_ID = {
			ROLES: this.client.uuid(interaction.user.id),
			REMAINING: this.client.uuid(interaction.user.id),
			MEMBER_TYPE: this.client.uuid(interaction.user.id),
			CLANS: this.client.uuid(interaction.user.id),
			SAVE: this.client.uuid(interaction.user.id)
		};

		const state = {
			remaining: ['1', '2', '3', '4', '5', '6'],
			allMembers: true,
			roles: ['leader', 'coLeader', 'admin', 'member'],
			clans: clans.map((clan) => clan.tag)
		};

		const mutate = (disable = false) => {
			const row1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				new StringSelectMenuBuilder()
					.setPlaceholder('Select Attacks Remaining')
					.setMaxValues(6)
					.setCustomId(CUSTOM_ID.REMAINING)
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
					.setCustomId(CUSTOM_ID.MEMBER_TYPE)
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

			const row4 = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId(CUSTOM_ID.SAVE)
					.setLabel('Remind Now')
					.setEmoji('🔔')
					.setStyle(ButtonStyle.Primary)
					.setDisabled(disable)
			);

			return [row1, row2, row3, row4];
		};

		const msg = await interaction.editReply({ components: mutate(), content: '**Instant Capital Reminder Options**' });
		const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
			filter: (action) => Object.values(CUSTOM_ID).includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === CUSTOM_ID.REMAINING && action.isStringSelectMenu()) {
				state.remaining = action.values;
				await action.update({ components: mutate() });
			}

			if (action.customId === CUSTOM_ID.ROLES && action.isStringSelectMenu()) {
				state.roles = action.values;
				await action.update({ components: mutate() });
			}

			if (action.customId === CUSTOM_ID.CLANS && action.isStringSelectMenu()) {
				state.clans = action.values;
				await action.update({ components: mutate() });
			}

			if (action.customId === CUSTOM_ID.MEMBER_TYPE && action.isStringSelectMenu()) {
				state.allMembers = action.values.includes('all');
				await action.update({ components: mutate() });
			}

			if (action.customId === CUSTOM_ID.SAVE && action.isButton()) {
				await action.update({ components: [], content: `**Fetching capital raids...** ${EMOJIS.LOADING}` });

				const texts = await this.getWars(action, {
					remaining: state.remaining.map((num) => Number(num)),
					roles: state.roles,
					clans: state.clans,
					message: args.message,
					allMembers: state.allMembers
				});

				if (texts.length) {
					await action.editReply({ content: `\u200e🔔 ${args.message}` });
				} else {
					await action.editReply({ content: this.i18n('command.reminder.now.no_match', { lng: interaction.locale }) });
				}

				await this.send(action, texts);
			}
		});

		collector.on('end', async (_, reason) => {
			for (const id of Object.values(CUSTOM_ID)) this.client.components.delete(id);
			if (!/delete/i.test(reason)) await interaction.editReply({ components: mutate(true) });
		});
	}

	public async getWars(
		interaction: ButtonInteraction<'cached'>,
		reminder: {
			roles: string[];
			remaining: number[];
			clans: string[];
			message: string;
			allMembers: boolean;
		}
	) {
		const texts: string[] = [];
		for (const tag of reminder.clans) {
			const data = await this.client.raidReminder.getRaidSeason(tag);
			if (!data) continue;
			const text = await this.client.raidReminder.getReminderText({ ...reminder, guild: interaction.guild.id }, { tag }, data);
			if (text) texts.push(text);
		}
		return texts;
	}

	private async send(interaction: ButtonInteraction<'cached'>, texts: string[]) {
		for (const text of texts) {
			for (const content of Util.splitMessage(text, { maxLength: 2000 })) {
				await interaction.followUp({ content, allowedMentions: { parse: ['users'] } });
			}
			await Util.delay(1000);
		}
	}
}
