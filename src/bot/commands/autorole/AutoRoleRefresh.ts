import { CommandInteraction, EmbedBuilder } from 'discord.js';
import moment from 'moment';
import { cluster } from 'radash';
import { Command } from '../../lib/index.js';
import { Settings } from '../../util/Constants.js';
import { EMOJIS } from '../../util/Emojis.js';
import { handleMessagePagination } from '../../util/Pagination.js';
import { Util } from '../../util/index.js';

export default class AutoTownHallRoleCommand extends Command {
	public constructor() {
		super('autorole-refresh', {
			category: 'none',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			clientPermissions: ['EmbedLinks', 'ManageRoles'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { is_dry_run?: boolean }) {
		const useV2 = this.client.settings.get<boolean>(interaction.guild, Settings.USE_V2_ROLES_MANAGER, false);
		if (useV2) return this.v2(interaction, args);

		const clans = await this.client.storage.find(interaction.guildId);
		if (!clans.length) {
			return interaction.editReply(
				this.i18n('common.no_clans_linked', { lng: interaction.locale, command: this.client.commands.SETUP_ENABLE })
			);
		}

		const lastRefresh = this.client.settings.get<number>(interaction.guildId, Settings.ROLE_REFRESHED, 0);
		if (Date.now() - 1000 * 60 * 30 < lastRefresh) {
			return interaction.editReply('You can only refresh roles once every 30 minutes.');
		}

		this.client.settings.set(interaction.guildId, Settings.ROLE_REFRESHED, Date.now());
		await interaction.editReply('Started refreshing roles...');

		// const collection = this.client.db.collection<PlayerLinks>(Collections.PLAYER_LINKS);
		for (const clan of clans) {
			const { body: data, res } = await this.client.http.getClan(clan.tag);
			if (!res.ok) continue;

			// const links = await collection.find({ tag: { $in: data.memberList.map((mem) => mem.tag) } }).toArray();
			// const unknowns = await this.client.http.getDiscordLinks(data.memberList);

			// for (const { userId, tag } of unknowns) {
			// 	if (links.find((mem) => mem.tag === tag && mem.userId === userId)) continue;
			// 	const lastAccount = await collection.findOne({ userId }, { sort: { order: -1 } });

			// 	const player = data.memberList.find((mem) => mem.tag === tag) ?? (await this.client.http.player(tag));
			// 	if (!player.name) continue;

			// 	const user = await this.client.users.fetch(userId).catch(() => null);
			// 	if (!user) continue;

			// 	try {
			// 		await collection.insertOne({
			// 			userId: user.id,
			// 			username: user.username,
			// 			displayName: user.displayName,
			// 			discriminator: user.discriminator,
			// 			tag,
			// 			name: player.name,
			// 			verified: false,
			// 			order: lastAccount?.order ? lastAccount.order + 1 : 0,
			// 			createdAt: new Date()
			// 		});
			// 	} catch {}
			// }

			await interaction.editReply(`Refreshing clan roles for ${clan.name}...`);
			await this.client.rpcHandler.roleManager.queue(data, {});
			await Util.delay(1000 * 5);

			await interaction.editReply(`Refreshing town hall roles for ${clan.name}...`);
			await this.client.rpcHandler.roleManager.queue(data, { isThRole: true });
			await Util.delay(1000 * 5);

			await interaction.editReply(`Refreshing league roles for ${clan.name}...`);
			await this.client.rpcHandler.roleManager.queue(data, { isLeagueRole: true });
			await Util.delay(1000 * 5);

			await interaction.editReply(`Refreshing war roles for ${clan.name}...`);
			const wars = await this.client.http.getCurrentWars(clan.tag);
			for (const war of wars) {
				if (war.state === 'notInWar') continue;
				await this.client.rpcHandler.warRoleManager.exec(clan.tag, {
					...war,
					clan: {
						...war.clan,
						_members: war.clan.members.map((mem) => mem.tag)
					},
					id: 1,
					uid: '0x',
					result: '0x',
					warTag: war.warTag,
					round: war.round!
				});
				await Util.delay(1000 * 5);
			}
		}
		return interaction.editReply('Successfully refreshed roles.').catch(() => null);
	}

	public async v2(interaction: CommandInteraction<'cached'>, args: { is_dry_run?: boolean }) {
		const inProgress = this.client.rolesManager.getChanges(interaction.guildId);
		if (inProgress) {
			return interaction.editReply('Role refresh is currently being processed.');
		}

		const startTime = Date.now();

		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setDescription(`### Refreshing Server Roles ${EMOJIS.LOADING}`)
			.setFooter({ text: `Progress: -/- (0%)` });
		const message = await interaction.editReply({ embeds: [embed] });

		const handleChanges = async (closed = false) => {
			const changes = this.client.rolesManager.getChanges(interaction.guildId);
			if (!changes) return null;

			if (closed) embed.setDescription('### Roles Refreshed Successfully');
			const percentage = ((changes.progress / changes.memberCount) * 100).toFixed(2);
			embed.setFooter({
				text: [
					`Time Elapsed: ${moment.duration(Date.now() - startTime).format('h[h] m[m] s[s]', { trim: 'both mid' })}`,
					`Progress: ${changes.progress}/${changes.memberCount} (${percentage}%)`
				].join('\n')
			});

			const roleChanges = changes.changes.filter(
				({ excluded, included, nickname }) => included.length || excluded.length || nickname
			);
			const embeds: EmbedBuilder[] = [];

			cluster(roleChanges, 15).forEach((changes) => {
				const roleChangeEmbed = new EmbedBuilder(embed.toJSON());
				changes.forEach(({ included, excluded, nickname, userId, displayName }, itemIndex) => {
					const values = [`> \u200e${displayName} | <@${userId}>`];
					if (included.length) values.push(`**+** ${included.map((id) => `<@&${id}>`).join(' ')}`);
					if (excluded.length) values.push(`**-** ~~${excluded.map((id) => `<@&${id}>`).join(' ')}~~`);
					if (nickname) values.push(`**+** \`${nickname}\``);

					roleChangeEmbed.addFields({
						name: itemIndex === 0 ? `Changes Detected: ${roleChanges.length}\n\u200b` : '\u200b',
						value: values.join('\n')
					});
				});
				embeds.push(roleChangeEmbed);
			});

			if (closed) {
				return handleMessagePagination(interaction.user.id, message, embeds.length ? embeds : [embed]);
			} else {
				return message.edit({ embeds: [embeds.length ? embeds.at(-1)! : embed] });
			}
		};

		const timeoutId = setInterval(handleChanges, 5000);

		try {
			const changes = await this.client.rolesManager.updateMany(interaction.guildId, Boolean(args.is_dry_run));
			if (!changes) {
				return message.edit({ embeds: [embed.setDescription('No role changes happened!')] });
			}

			return await handleChanges(true);
		} finally {
			clearInterval(timeoutId);
			this.client.rolesManager.clearChanges(interaction.guildId);
		}
	}
}
