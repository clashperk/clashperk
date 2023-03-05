import { Clan } from 'clashofclans.js';
import {
	ActionRowBuilder,
	AnyThreadChannel,
	ButtonBuilder,
	ButtonStyle,
	cleanContent,
	CommandInteraction,
	ComponentType,
	EmbedBuilder,
	Interaction,
	ModalBuilder,
	PermissionsString,
	TextChannel,
	TextInputStyle,
	WebhookClient
} from 'discord.js';
import { Args, Command } from '../../lib/index.js';
import { PlayerLinks } from '../../types/index.js';
import { Collections, Flags, missingPermissions } from '../../util/Constants.js';
import { clanEmbedMaker } from '../../util/Helper.js';

export default class ClanEmbedCommand extends Command {
	public constructor() {
		super('setup-clan-embed', {
			category: 'none',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			defer: true,
			ephemeral: true
		});
	}

	private readonly permissions: PermissionsString[] = [
		'EmbedLinks',
		'UseExternalEmojis',
		'SendMessages',
		'ReadMessageHistory',
		'ManageWebhooks',
		'ViewChannel'
	];

	public args(interaction: Interaction<'cached'>): Args {
		return {
			color: {
				match: 'COLOR',
				default: this.client.embed(interaction)
			},
			channel: {
				match: 'CHANNEL',
				default: interaction.channel!
			}
		};
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		{
			tag,
			description,
			color,
			accepts,
			channel
		}: { tag: string; description?: string; color?: number; accepts?: string; channel: TextChannel | AnyThreadChannel }
	) {
		const data = await this.client.resolver.enforceSecurity(interaction, tag);
		if (!data) return;

		const permission = missingPermissions(channel, interaction.guild.members.me!, this.permissions);
		if (permission.missing) {
			return interaction.editReply(
				this.i18n('command.setup.enable.missing_access', {
					lng: interaction.locale,
					channel: channel.toString(), // eslint-disable-line
					permission: permission.missingPerms
				})
			);
		}

		const user = await this.getUser(data);
		if (!user)
			return interaction.editReply(
				'Clan leader is not linked to the bot. Use </link create:1051836259389157453> command to link the player account.'
			);

		const __customIds = {
			a: this.client.uuid(interaction.user.id),
			b: this.client.uuid(interaction.user.id),
			c: this.client.uuid(interaction.user.id)
		};

		const m = await interaction.editReply({
			embeds: [
				new EmbedBuilder().setAuthor({ name: `${data.name} | Clan Embed`, iconURL: data.badgeUrls.medium }).setDescription(
					[
						data.description,
						'',
						'**Leader**',
						// eslint-disable-next-line
						`${user.name} (${user.toString()})`
					].join('\n')
				)
			],
			components: [
				new ActionRowBuilder<ButtonBuilder>()
					.addComponents(new ButtonBuilder().setLabel('Customize').setStyle(ButtonStyle.Secondary).setCustomId(__customIds.a))
					.addComponents(new ButtonBuilder().setLabel('Save').setStyle(ButtonStyle.Secondary).setCustomId(__customIds.b))
			]
		});

		try {
			await m
				.awaitMessageComponent<ComponentType.Button | ComponentType.StringSelect>({
					filter: ({ customId }) => Object.values(__customIds).includes(customId),
					time: 5 * 60 * 1000
				})
				.then(async (interaction) => {
					const modal = new ModalBuilder({
						customId: __customIds.c,
						title: `${data.name} | Clan Embed`,
						components: [
							{
								type: ComponentType.ActionRow,
								components: [
									{
										type: ComponentType.TextInput,
										style: TextInputStyle.Paragraph,
										customId: 'description',
										label: 'Clan Description',
										placeholder: 'Write anything or `auto` to sync with the clan.',
										maxLength: 300
									}
								]
							},
							{
								type: ComponentType.ActionRow,
								components: [
									{
										type: ComponentType.TextInput,
										style: TextInputStyle.Paragraph,
										customId: 'accepts',
										label: 'Requirements',
										placeholder: 'Write anything or `auto` to sync with the clan.',
										maxLength: 100
									}
								]
							}
						]
					});

					if (interaction.customId === __customIds.b) {
						await interaction.update({ components: [] });
					} else {
						await interaction.showModal(modal);
						await interaction.editReply({ components: [] });
						try {
							await interaction
								.awaitModalSubmit({
									time: 5 * 60 * 1000,
									filter: (interaction) => interaction.customId === __customIds.c
								})
								.then(async (action) => {
									description = action.fields.getTextInputValue('description');
									accepts = action.fields.getTextInputValue('accepts');
									await action.deferUpdate();
								});
						} catch {
							return interaction.update({ components: [] });
						}
					}
				});
		} catch {
			return;
		}

		description = description?.toLowerCase() === 'auto' ? 'auto' : cleanContent(description ?? '', interaction.channel!);
		accepts = !accepts || accepts.toLowerCase() === 'auto' ? 'auto' : cleanContent(accepts, interaction.channel!);
		const embed = await clanEmbedMaker(data, { description, requirements: accepts, color, userId: user.id });

		const webhook = await this.client.storage.getWebhook(channel.isThread() ? channel.parent! : channel);
		if (!webhook) {
			return interaction.editReply(
				// eslint-disable-next-line
				this.i18n('command.setup.enable.too_many_webhooks', { lng: interaction.locale, channel: channel.toString() })
			);
		}

		const mutate = async (message: string, channel: string, webhook: { id: string; token: string }) => {
			const id = await this.client.storage.register(interaction, {
				op: Flags.CLAN_EMBED_LOG,
				guild: interaction.guild.id,
				channel,
				tag: data.tag,
				color,
				name: data.name,
				message,
				embed: {
					userId: user.id,
					accepts: cleanContent(accepts!, interaction.channel!),
					description: cleanContent(description!, interaction.channel!)
				},
				webhook: { id: webhook.id, token: webhook.token }
			});

			this.client.rpcHandler.add(id, {
				op: Flags.CLAN_EMBED_LOG,
				guild: interaction.guild.id,
				tag: data.tag
			});
		};

		const existing = await this.client.db
			.collection(Collections.CLAN_EMBED_LOGS)
			.findOne({ tag: data.tag, guild: interaction.guild.id });

		if (!existing) {
			const msg = await webhook.send(channel.isThread() ? { embeds: [embed], threadId: channel.id } : { embeds: [embed] });
			return mutate(msg.id, channel.id, { id: webhook.id, token: webhook.token! });
		}

		const customIds = {
			edit: this.client.uuid(interaction.user.id),
			create: this.client.uuid(interaction.user.id)
		};
		const row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(new ButtonBuilder().setCustomId(customIds.edit).setStyle(ButtonStyle.Secondary).setLabel('Edit Existing Embed'))
			.addComponents(new ButtonBuilder().setCustomId(customIds.create).setStyle(ButtonStyle.Primary).setLabel('Create New Embed'));

		const messageURL = this.getMessageURL(interaction.guild.id, existing.channel, existing.message);
		const msg = await interaction.editReply({
			content: [`**This clan already has an active Clan Embed. [Jump ↗️](<${messageURL}>)**`].join('\n'),
			components: [row]
		});
		const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
			filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === customIds.edit) {
				try {
					const channel = interaction.guild.channels.cache.get(existing.channel);
					const webhook = new WebhookClient(existing.webhook);
					const msg = await webhook.editMessage(
						existing.message,
						channel?.isThread() ? { embeds: [embed], threadId: channel.id } : { embeds: [embed] }
					);
					await mutate(existing.message, msg.channel_id, existing.webhook);
				} catch {
					row.components[0].setDisabled(true);
					await action.update({
						content: '**Failed to update the existing embed!**',
						components: [row]
					});
					return;
				}

				await action.update({
					components: [],
					content: `**Successfully updated the existing embed. [Jump ↗️](<${messageURL}>)**`
				});
			}

			if (action.customId === customIds.create) {
				await action.update({ content: '**Successfully created a new embed.**', components: [] });

				try {
					const webhook = new WebhookClient(existing.webhook);
					const msg = await webhook.send(channel.isThread() ? { embeds: [embed], threadId: channel.id } : { embeds: [embed] });
					return await mutate(msg.id, msg.channel_id, existing.webhook);
				} catch (error: any) {
					this.client.logger.error(error, { label: 'ClanEmbedSetup' });
					const msg = await webhook.send(channel.isThread() ? { embeds: [embed], threadId: channel.id } : { embeds: [embed] });
					return mutate(msg.id, msg.channel.id, { id: webhook.id, token: webhook.token! });
				}
			}
		});

		collector.on('end', () => {
			this.client.components.delete(customIds.edit);
			this.client.components.delete(customIds.create);
		});
	}

	private getMessageURL(guildId: string, channelId: string, messageId: string) {
		return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
	}

	private async getUser(clan: Clan): Promise<{ id: string; name: string; toString: () => string } | null> {
		const leader = clan.memberList.find((m) => m.role === 'leader');
		if (leader) {
			const user = await this.client.db.collection<PlayerLinks>(Collections.PLAYER_LINKS).findOne({ tag: leader.tag });
			if (user) return { id: user.userId, toString: () => `<@${user.userId}>`, ...user, name: leader.name };
		}
		return null;
	}
}
