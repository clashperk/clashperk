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
import { Command } from '../../lib/index.js';
import { CustomBot } from '../../struct/CustomBot.js';
import { createInteractionCollector } from '../../util/Pagination.js';
import { EMOJIS } from '../../util/Emojis.js';
import { getInviteLink } from '../../util/Constants.js';

export default class BotPersonalizerCommand extends Command {
	public constructor() {
		super('bot-personalizer', {
			category: 'owner',
			description: {
				content: "You can't use this anyway, so why explain?"
			},
			clientPermissions: ['EmbedLinks', 'AttachFiles'],
			defer: true,
			// ownerOnly: true,
			ephemeral: false
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>) {
		const customIds = {
			token: this.client.uuid(interaction.user.id)
		};

		const isEligible = await this.client.patrons.isEligible(interaction.user.id, interaction.guildId);
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(customIds.token)
				.setLabel("Let's start!")
				// .setDisabled(!isEligible),
				.setStyle(ButtonStyle.Primary),
			new ButtonBuilder()
				// .setURL(isEligible ? 'https://discord.com/developers/applications' : 'https://www.patreon.com/clashperk')
				.setLabel(isEligible ? 'Developer Portal' : 'Become a Patron')
				.setURL('https://discord.com/developers/applications')
				.setLabel('Developer Portal')
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

				const inputValue = modalSubmit.fields.getTextInputValue(customIds.token);
				const customBot = new CustomBot(inputValue);
				const app = await customBot.getApplication();

				if (!app?.id) {
					return await modalSubmit.editReply({
						content: `Failed to retrieve information of the application! The token might be invalid.`,
						components: []
					});
				}

				if (!customBot.hasIntents(app)) {
					return await modalSubmit.editReply({ content: `The bot does not have the all the intents enabled.`, components: [] });
				}

				if (customBot.isPublic(app)) {
					return await modalSubmit.editReply({ content: `The bot is public! You must keep the bot private.`, components: [] });
				}

				const timeTaken = () => moment.duration(Date.now() - now).format('h[h], m[m], s[s]', { trim: 'both mid' });

				const messages: string[] = [];
				messages.push(`${EMOJIS.OK} Setting up **[${app.name} (${app.id})](${getInviteLink(app.id)})**`);
				await modalSubmit.editReply({
					content: [...messages, `${EMOJIS.OK} Creating application commands...`].join('\n'),
					components: []
				});

				const commands = await customBot.createCommands(app, interaction.guildId);
				if (!commands.length) {
					messages.push(`${EMOJIS.WRONG} Failed to create application commands...`);
					messages.push(`\nPlease contact us on [Support Server](https://discord.gg/ppuppun) for assistance.`);
					return await modalSubmit.editReply({ content: messages.join('\n'), components: [] });
				}

				messages.push(`${EMOJIS.OK} Created ${commands.length} application commands. [took ${timeTaken()}]`);
				await modalSubmit.editReply({
					content: [...messages, `${EMOJIS.LOADING} Deploying application...`].join('\n'),
					components: []
				});

				const service = await customBot.createService(inputValue, app);
				if (!service) {
					messages.push(`${EMOJIS.WRONG} Failed to deploy application...`);
					messages.push(`\nPlease contact us on [Support Server](https://discord.gg/ppuppun) for assistance.`);
					return await modalSubmit.editReply({ content: messages.join('\n'), components: [] });
				}

				await modalSubmit.editReply({
					content: [...messages, `${EMOJIS.LOADING} Deploying application... [took ${timeTaken()}]`].join('\n'),
					components: []
				});

				const status = await customBot.checkDeploymentStatus(service.id, async (status) => {
					await modalSubmit.editReply({
						components: [],
						content: [...messages, `${EMOJIS.LOADING} Deploying! Status **${status}** [took ${timeTaken()}]`].join('\n')
					});
				});

				if (status === 'SUCCESS') {
					messages.push(`${EMOJIS.OK} Successfully deployed application! [took ${timeTaken()}]`);
					return await modalSubmit.editReply({ content: messages.join('\n'), components: [] });
				}

				messages.push(`${EMOJIS.WRONG} Failed to deploy application! (with status **${status}**)`);
				messages.push(`Please contact us on [Support Server](https://discord.gg/ppuppun) for assistance.`);
				return await modalSubmit.editReply({ content: messages.join('\n'), components: [] });
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
