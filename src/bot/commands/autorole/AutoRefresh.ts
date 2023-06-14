import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';
import { Settings } from '../../util/Constants.js';
import { Util } from '../../util/index.js';

export default class AutoTownHallRoleCommand extends Command {
	public constructor() {
		super('autorole-refresh', {
			category: 'none',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			clientPermissions: ['EmbedLinks', 'ManageRoles'],
			defer: true
			// ephemeral: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>) {
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
			const data = await this.client.http.clan(clan.tag);
			if (!data.ok) continue;

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
				if (!war.ok) continue;
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
}
