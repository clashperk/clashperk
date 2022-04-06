import { Collections, Flags } from '../../util/Constants';
import { Args, Command } from '../../lib';
import { EMOJIS, CWL_LEAGUES, TOWN_HALLS, ORANGE_NUMBERS } from '../../util/Emojis';
import { Util, CommandInteraction, MessageActionRow, MessageButton, TextChannel, Modal, MessageEmbed, Interaction } from 'discord.js';
import { Clan } from 'clashofclans.js';
import { UserInfo } from '../../types';

export default class ClanEmbedCommand extends Command {
	public constructor() {
		super('setup-clan-embed', {
			category: 'none',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			clientPermissions: ['EMBED_LINKS'],
			defer: true,
			ephemeral: true
		});
	}

	public condition(interaction: Interaction<'cached'>) {
		if (!this.client.patrons.get(interaction.guild.id)) {
			const embed = new MessageEmbed()
				.setDescription(
					[
						'**Patron Only Feature**',
						'This feature is only available on Patron servers.',
						'Visit https://patreon.com/clashperk for more details.'
					].join('\n')
				)
				.setImage('https://i.imgur.com/txkD6q7.png');
			return { embeds: [embed] };
		}
		return null;
	}

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
		}: { tag: string; description?: string; color?: number; accepts?: string; channel: TextChannel }
	) {
		const data = await this.client.resolver.enforceSecurity(interaction, tag);
		if (!data) return;

		const user = await this.getUser(data);
		if (!user) return interaction.editReply('Clan leader is not linked to the bot. Use `/link` command to link the player account.');

		const __customIds = {
			a: this.client.uuid(interaction.user.id),
			b: this.client.uuid(interaction.user.id),
			c: this.client.uuid(interaction.user.id)
		};

		const m = await interaction.editReply({
			embeds: [
				new MessageEmbed().setAuthor({ name: `${data.name} | Clan Embed`, iconURL: data.badgeUrls.medium }).setDescription(
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
				new MessageActionRow()
					.addComponents(new MessageButton().setLabel('Customize').setStyle('SECONDARY').setCustomId(__customIds.a))
					.addComponents(new MessageButton().setLabel('Save').setStyle('SECONDARY').setCustomId(__customIds.b))
			]
		});

		try {
			await m
				.awaitMessageComponent({
					filter: ({ customId }) => Object.values(__customIds).includes(customId),
					time: 5 * 60 * 1000
				})
				.then(async (interaction) => {
					const modal = new Modal({
						customId: __customIds.c,
						title: `${data.name} | Clan Embed`,
						components: [
							{
								type: 'ACTION_ROW',
								components: [
									{
										type: 'TEXT_INPUT',
										style: 'PARAGRAPH',
										customId: 'description',
										label: 'Clan Description',
										placeholder: 'Write anything or `auto` to sync with clan description.',
										maxLength: 300
									}
								]
							},
							{
								type: 'ACTION_ROW',
								components: [
									{
										type: 'TEXT_INPUT',
										style: 'PARAGRAPH',
										customId: 'accepts',
										label: 'Requirements',
										placeholder: 'Write anything as a requirement interaction (e.g TH 10+)',
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
									description = action.fields.getField('description').value;
									accepts = action.fields.getField('accepts').value;
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

		accepts = accepts?.trim() || data.requiredTownhallLevel ? `TH ${data.requiredTownhallLevel!}+` : 'Any';
		const fetched = await this.client.http.detailedClanMembers(data.memberList);
		const reduced = fetched
			.filter((res) => res.ok)
			.reduce<{ [key: string]: number }>((count, member) => {
				const townHall = member.townHallLevel;
				count[townHall] = (count[townHall] || 0) + 1;
				return count;
			}, {});

		const townHalls = Object.entries(reduced)
			.map((arr) => ({ level: Number(arr[0]), total: arr[1] }))
			.sort((a, b) => b.level - a.level);

		const location = data.location
			? data.location.isCountry
				? `:flag_${data.location.countryCode.toLowerCase()}: ${data.location.name}`
				: `🌐 ${data.location.name}`
			: `${EMOJIS.WRONG} None`;

		const embed = new MessageEmbed()
			.setTitle(`${data.name} (${data.tag})`)
			.setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(data.tag)}`)
			.setThumbnail(data.badgeUrls.medium)
			.setDescription(
				[
					`${EMOJIS.CLAN} **${data.clanLevel}** ${EMOJIS.USERS} **${data.members}** ${EMOJIS.TROPHY} **${data.clanPoints}** ${EMOJIS.VERSUS_TROPHY} **${data.clanVersusPoints}**`,
					'',
					description?.toLowerCase() === 'auto'
						? data.description
						: description?.toLowerCase() === 'none'
						? ''
						: Util.cleanContent(description ?? '', interaction.channel!)
				].join('\n')
			);
		if (color) embed.setColor(color);

		embed.addField(
			'Clan Leader',
			[
				`${EMOJIS.OWNER} ${user.toString()} (${
					data.memberList.filter((m) => m.role === 'leader').map((m) => `${m.name}`)[0] || 'None'
				})`
			].join('\n')
		);

		embed.addField(
			'Requirements',
			[
				`${EMOJIS.TOWNHALL} ${accepts}`,
				'**Trophies Required**',
				`${EMOJIS.TROPHY} ${data.requiredTrophies}`,
				`**Location** \n${location}`
			].join('\n')
		);

		embed.addField(
			'War Performance',
			[
				`${EMOJIS.OK} ${data.warWins} Won ${
					data.isWarLogPublic ? `${EMOJIS.WRONG} ${data.warLosses!} Lost ${EMOJIS.EMPTY} ${data.warTies!} Tied` : ''
				}`,
				'**War Frequency & Streak**',
				`${
					data.warFrequency.toLowerCase() === 'morethanonceperweek'
						? '🎟️ More Than Once Per Week'
						: `🎟️ ${data.warFrequency.toLowerCase().replace(/\b(\w)/g, (char) => char.toUpperCase())}`
				} ${'🏅'} ${data.warWinStreak}`,
				'**War League**',
				`${CWL_LEAGUES[data.warLeague?.name ?? ''] || EMOJIS.EMPTY} ${data.warLeague?.name ?? 'Unranked'}`
			].join('\n')
		);

		embed.addField(
			'Town Halls',
			[
				townHalls
					.slice(0, 7)
					.map((th) => `${TOWN_HALLS[th.level]} ${ORANGE_NUMBERS[th.total]}\u200b`)
					.join(' ')
			].join('\n')
		);

		embed.setFooter({ text: 'Synced', iconURL: this.client.user!.displayAvatarURL({ format: 'png' }) });
		embed.setTimestamp();

		description = description?.toLowerCase() === 'auto' ? 'auto' : description?.toLowerCase() === 'none' ? '' : description ?? '';

		const mutate = async (message: string, channel: string) => {
			const id = await this.client.storage.register(interaction, {
				op: Flags.CLAN_EMBED_LOG,
				guild: interaction.guild.id,
				channel,
				tag: data.tag,
				color,
				name: data.name,
				message,
				embed: {
					accepts,
					userId: user.id,
					description: Util.cleanContent(description ?? '', interaction.channel!)
				}
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
			const msg = await interaction.channel!.send({ embeds: [embed] });
			return mutate(msg.id, channel.id);
		}

		const customIds = {
			edit: this.client.uuid(interaction.user.id),
			create: this.client.uuid(interaction.user.id)
		};
		const row = new MessageActionRow()
			.addComponents(new MessageButton().setCustomId(customIds.edit).setStyle('SECONDARY').setLabel('Edit Existing Embed'))
			.addComponents(new MessageButton().setCustomId(customIds.create).setStyle('PRIMARY').setLabel('Create New Embed'));

		const messageURL = this.getMessageURL(interaction.guild.id, existing.channel, existing.message);
		const msg = await interaction.editReply({
			content: [`**This clan already has an active Clan Embed. [Jump ↗️](<${messageURL}>)**`].join('\n'),
			components: [row]
		});
		const collector = msg.createMessageComponentCollector({
			filter: (action) => Object.values(customIds).includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === customIds.edit) {
				try {
					const channel = interaction.guild.channels.cache.get(existing.channel);
					await (channel as TextChannel)!.messages.edit(existing.message, { embeds: [embed] });
				} catch {
					row.components[0].setDisabled(true);
					return action.update({
						content: '**Failed to update the existing embed!**',
						components: [row]
					});
				}

				await action.update({
					components: [],
					content: `**Successfully updated the existing embed. [Jump ↗️](<${messageURL}>)**`
				});
				return mutate(existing.message, existing.channel);
			}

			if (action.customId === customIds.create) {
				await action.update({ content: '**Successfully created a new embed.**', components: [] });
				const msg = await interaction.channel!.send({ embeds: [embed] });
				return mutate(msg.id, channel.id);
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

	private async getUser(clan: Clan): Promise<{ id: string; name: string; toString: () => string; entries?: any[] } | null> {
		const leader = clan.memberList.find((m) => m.role === 'leader');
		if (leader) {
			const user = await this.client.db.collection<UserInfo>(Collections.LINKED_PLAYERS).findOne({ 'entries.tag': leader.tag });
			if (user) return { id: user.user, name: leader.name, toString: () => `<@${user.user}>`, ...user };
		}
		return null;
	}
}
