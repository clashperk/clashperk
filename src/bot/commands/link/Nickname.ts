import { ActionRowBuilder, CommandInteraction, ComponentType, GuildMember, StringSelectMenuBuilder } from 'discord.js';
import { Args, Command } from '../../lib/index.js';
import { PlayerLinks } from '../../types/index.js';
import { Collections, Settings } from '../../util/Constants.js';
import { TOWN_HALLS } from '../../util/Emojis.js';
import { Util } from '../../util/index.js';

export default class NickNameCommand extends Command {
	public constructor() {
		super('nickname', {
			category: 'setup',
			channel: 'guild',
			clientPermissions: ['EmbedLinks', 'ManageNicknames'],
			description: {
				content: ['Sets nickname of a member in Discord.']
			},
			defer: true
		});
	}

	public args(): Args {
		return {
			user: {
				id: 'member',
				match: 'MEMBER'
			}
		};
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: { member?: GuildMember; format?: string; enable_auto?: boolean; update_existing_members?: boolean }
	) {
		const { member } = args;
		if (!member) {
			return interaction.editReply(this.i18n('command.nickname.invalid_member', { lng: interaction.locale }));
		}

		if (member.id !== interaction.user.id && !this.client.util.isManager(interaction.member)) {
			return interaction.editReply(this.i18n('command.nickname.missing_permission', { lng: interaction.locale }));
		}

		if (
			interaction.guild.members.me!.roles.highest.position <= member.roles.highest.position ||
			member.id === interaction.guild.ownerId
		) {
			const own = member.id === interaction.user.id;
			return interaction.editReply(
				this.i18n(own ? 'command.nickname.missing_access_self' : 'command.nickname.missing_access_other', {
					lng: interaction.locale
				})
			);
		}

		const players = await this.client.resolver.getPlayers(member.user.id);
		if (!players.length) {
			return interaction.editReply(
				this.i18n('command.nickname.no_players', { lng: interaction.locale, user: member.user.displayName })
			);
		}

		let format = this.client.settings.get<string>(interaction.guildId, Settings.NICKNAME_EXPRESSION, '{NAME}');
		if (format && args.format && format !== args.format) format = args.format;

		if (/{NAME}/gi.test(format)) {
			this.client.settings.set(interaction.guildId, Settings.NICKNAME_EXPRESSION, format);
		} else {
			return interaction.editReply(`Invalid nickname format \`${format}\`, a nickname format must include \`{NAME}\``);
		}

		await this.client.settings.set(interaction.guildId, Settings.AUTO_NICKNAME, Boolean(args.enable_auto));

		const options = players.map((op) => ({
			label: op.name,
			value: op.tag,
			emoji: TOWN_HALLS[op.townHallLevel],
			description: `${op.tag}`
		}));

		const customId = this.client.uuid(interaction.user.id, member.id);
		const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder().setCustomId(customId).setPlaceholder('Select an account!').addOptions(options)
		);

		const msg = await interaction.editReply({
			content: [`**Setting up ${member.user.displayName}\'s nickname...**`, '', `**Format:** ${format}`].join('\n'),
			components: [row]
		});
		const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
			filter: (action) => action.customId === customId && [member.id, interaction.user.id].includes(action.user.id),
			time: 10 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.isStringSelectMenu() && action.customId === customId) {
				const player = players.find((p) => p.tag === action.values.at(0))!;
				const nickname = await this.client.nickHandler.handle(member, player, format);

				if (!nickname) {
					await action.reply({
						content: `Failed to set **${member.user.displayName}\'s** nickname.`,
						components: [],
						ephemeral: true
					});
					return;
				}

				await action.update({
					components: [],
					content: `**${member.user.displayName}\'s** nickname set to **${nickname}**`
				});

				// const isAuto = this.client.settings.get<boolean>(member.guild, Settings.AUTO_NICKNAME, false);
				if (args.update_existing_members) await this.processNickname(interaction);
			}
		});

		collector.on('end', () => {
			this.client.components.delete(customId);
		});
	}

	private async processNickname(interaction: CommandInteraction<'cached'>) {
		const clans = await this.client.storage.find(interaction.guildId);
		if (!clans.length) return;

		for (const { tag } of clans) {
			const { body: clan, res } = await this.client.http.getClan(tag);
			if (!res.ok) continue;

			const memberTags = clan.memberList.map((mem) => mem.tag);
			const flattened = await this.client.db
				.collection(Collections.PLAYER_LINKS)
				.aggregate<PlayerLinks>([
					{
						$match: { tag: { $in: memberTags } }
					},
					{
						$lookup: {
							from: Collections.PLAYER_LINKS,
							localField: 'userId',
							foreignField: 'userId',
							as: 'links',
							pipeline: [
								{
									$sort: { order: 1 }
								},
								{ $limit: 1 }
							]
						}
					},
					{
						$unwind: {
							path: '$links'
						}
					},
					{
						$replaceRoot: {
							newRoot: '$links'
						}
					},
					{
						$match: {
							tag: {
								$in: memberTags
							}
						}
					}
				])
				.toArray();
			if (!flattened.length) continue;

			const guildMembers = await interaction.guild.members.fetch({ user: flattened.map((link) => link.userId) }).catch(() => null);
			if (!guildMembers?.size) continue;
			const players = await this.client.http._getPlayers(flattened);

			for (const { userId, tag } of flattened) {
				const member = guildMembers.get(userId);
				if (!member) continue;

				const player = players.find((p) => p.tag === tag);
				if (!player) continue;

				await this.client.nickHandler.handle(member, player);
				await Util.delay(1500);
			}
		}
	}
}
