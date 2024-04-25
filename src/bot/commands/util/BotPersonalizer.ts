import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	CommandInteraction,
	DiscordjsError,
	DiscordjsErrorCodes,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle
} from 'discord.js';
import moment from 'moment';
import { WithId } from 'mongodb';
import { Command } from '../../lib/index.js';
import { Patron, rewards } from '../../struct/PatreonHandler.js';
import { getInviteLink } from '../../util/Constants.js';
import { EMOJIS } from '../../util/Emojis.js';
import { createInteractionCollector } from '../../util/Pagination.js';

export default class BotPersonalizerCommand extends Command {
	public constructor() {
		super('bot-personalizer', {
			category: 'setup',
			clientPermissions: ['EmbedLinks', 'AttachFiles'],
			defer: true,
			ephemeral: false
		});
	}

	private isEligible(patron: WithId<Patron>) {
		if (patron.rewardId === rewards.gold || patron.rewardId === rewards.platinum) return true;
		if (patron.rewardId === rewards.bronze) return patron.sponsored;
	}

	private isAllowedGuild(patron: Patron, guildId: string) {
		return patron.guilds.some((guild) => guild.id === guildId);
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { opt_out?: boolean }) {
		const customIds = {
			token: this.client.uuid(interaction.user.id)
		};

		const patron = await this.client.patreonHandler.findOne(interaction.user.id);
		const isEligible =
			Boolean(patron && this.isEligible(patron) && this.isAllowedGuild(patron, interaction.guildId)) ||
			this.client.isOwner(interaction.user.id);

		if (patron && patron.applicationId && args.opt_out) {
			await this.client.customBotManager.deleteService(patron.applicationId);
			return interaction.editReply(`Successfully deleted the personalized bot!`);
		}

		if (patron?.applicationId && !this.client.isOwner(interaction.user.id)) {
			return interaction.editReply(
				[
					`${EMOJIS.WRONG} You have already deployed a custom bot!`,
					`\nContact us on [Support Server](<https://discord.gg/ppuppun>) for assistance.`
				].join('\n')
			);
		}

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(customIds.token)
				.setLabel("Let's start!")
				.setDisabled(!isEligible)
				.setStyle(ButtonStyle.Primary),
			new ButtonBuilder()
				.setURL(isEligible ? 'https://discord.com/developers/applications' : 'https://www.patreon.com/clashperk')
				.setLabel(isEligible ? 'Developer Portal' : 'Subscribe on Patreon')
				.setStyle(ButtonStyle.Link)
		);

		const message = await interaction.editReply({
			content: [
				'### Build your own Discord bot!',
				'',
				'Customize your bot by changing its avatar and name while utilizing the power of ClashPerk',
				'',
				'[How to setup your personalized bot?](<https://docs.clashperk.com/features/bot-personalizer>)'
			].join('\n'),
			components: [row]
		});

		const handleSubmit = async (action: ButtonInteraction<'cached'>) => {
			const modalCustomId = this.client.uuid(action.user.id);

			const modal = new ModalBuilder().setCustomId(modalCustomId).setTitle('Bot Personalizer');
			const tokenInput = new TextInputBuilder()
				.setCustomId(customIds.token)
				.setLabel('BOT TOKEN')
				.setPlaceholder('Enter Bot Token')
				.setStyle(TextInputStyle.Short)
				.setMaxLength(100)
				.setRequired(true);
			modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(tokenInput));

			await action.showModal(modal);

			try {
				const modalSubmit = await action.awaitModalSubmit({
					time: 10 * 60 * 1000,
					filter: (action) => action.customId === modalCustomId
				});
				const now = Date.now();
				await modalSubmit.deferUpdate();

				if (!patron) {
					return await modalSubmit.editReply({ content: `You must be a Patreon member to deploy your own bot!`, components: [] });
				}

				const botToken = modalSubmit.fields.getTextInputValue(customIds.token);
				const app = await this.client.customBotManager.getApplication(botToken);

				if (!app?.id) {
					return await modalSubmit.editReply({
						content: `Failed to retrieve information of the application! The token might be invalid.`,
						components: []
					});
				}

				if (!this.client.customBotManager.hasIntents(app)) {
					return await modalSubmit.editReply({ content: `The bot does not have the all the intents enabled.`, components: [] });
				}

				if (this.client.customBotManager.isPublic(app)) {
					return await modalSubmit.editReply({ content: `The bot is public! You must keep the bot private.`, components: [] });
				}

				const timeTaken = () => moment.duration(Date.now() - now).format('h[h], m[m], s[s]', { trim: 'both mid' });

				const messages: string[] = [];
				messages.push(`${EMOJIS.OK} Setting up **[${app.name} (${app.id})](${getInviteLink(app.id)})**`);
				await modalSubmit.editReply({
					content: [...messages, `${EMOJIS.OK} Creating application commands...`].join('\n'),
					components: []
				});

				const commands = await this.client.customBotManager.createCommands(app.id, interaction.guildId, botToken);
				if (!commands.length) {
					const member = await interaction.guild.members.fetch(app.id).catch(() => null);
					messages.push(`${EMOJIS.WRONG} Failed to create application commands...`);
					if (!member) messages.push(`\n[Click here to invite the bot](${getInviteLink(app.id)}) and try again.`);

					messages.push(`\nContact us on [Support Server](<https://discord.gg/ppuppun>) for assistance.`);
					return await modalSubmit.editReply({ content: messages.join('\n'), components: [] });
				}

				messages.push(`${EMOJIS.OK} Created ${commands.length} application commands. [took ${timeTaken()}]`);
				await modalSubmit.editReply({
					content: [...messages, `${EMOJIS.LOADING} Deploying application...`].join('\n'),
					components: []
				});

				const service = await this.client.customBotManager.createService({
					application: app,
					guildId: interaction.guildId,
					patronId: patron.id,
					token: botToken,
					user: interaction.user
				});
				await this.client.patreonHandler.attachCustomBot(patron.id, app.id);

				if (!service) {
					messages.push(`${EMOJIS.WRONG} Failed to deploy application...`);
					messages.push(`\nContact us on [Support Server](<https://discord.gg/ppuppun>) for assistance.`);
					return await modalSubmit.editReply({ content: messages.join('\n'), components: [] });
				}

				messages.push(`${EMOJIS.OK} Successfully deployed application! [took ${timeTaken()}]`);
				messages.push(`Last step is to invite the bot into our custom emoji servers.`);
				messages.push(
					`Join [Support Server](<https://discord.gg/ppuppun>) and check <#1130139203213197434> for the list of the emoji servers.`
				);
				return modalSubmit.editReply({ content: messages.join('\n'), components: [] });
			} catch (e) {
				if (!(e instanceof DiscordjsError && e.code === DiscordjsErrorCodes.InteractionCollectorError)) {
					throw e;
				}
			}
		};

		createInteractionCollector({
			interaction,
			customIds,
			message,
			onClick: (action) => {
				if (action.customId === customIds.token) {
					return handleSubmit(action);
				}
			}
		});
	}
}
