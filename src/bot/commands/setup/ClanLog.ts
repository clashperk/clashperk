import { AnyThreadChannel, CommandInteraction, EmbedBuilder, PermissionsString, Role, TextChannel } from 'discord.js';
import { Args, Command } from '../../lib/index.js';
import { Flags, missingPermissions } from '../../util/Constants.js';

const FEATURES: Record<string, string> = {
	[Flags.DONATION_LOG]: 'Donation Log',
	[Flags.CLAN_FEED_LOG]: 'Clan Feed',
	[Flags.LAST_SEEN_LOG]: 'Last Seen',
	[Flags.CLAN_EMBED_LOG]: 'Clan Embed',
	[Flags.CLAN_GAMES_LOG]: 'Clan Games',
	[Flags.CLAN_WAR_LOG]: 'War Feed',
	[Flags.LEGEND_LOG]: 'Legend Log',
	[Flags.JOIN_LEAVE_LOG]: 'Join/Leave Log',
	[Flags.CAPITAL_LOG]: 'Capital Log'
};

export default class ClanLogCommand extends Command {
	public constructor() {
		super('setup-clan-log', {
			category: 'none',
			channel: 'guild',
			userPermissions: ['ManageGuild'],
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			defer: true,
			ephemeral: true
		});
	}

	private readonly permissions: PermissionsString[] = [
		'AddReactions',
		'EmbedLinks',
		'UseExternalEmojis',
		'SendMessages',
		'ReadMessageHistory',
		'ManageWebhooks',
		'ViewChannel'
	];

	public args(interaction: CommandInteraction<'cached'>): Args {
		return {
			channel: {
				match: 'CHANNEL',
				default: interaction.channel!
			},
			color: {
				match: 'COLOR',
				default: this.client.embed(interaction)
			}
		};
	}

	public async exec(
		interaction: CommandInteraction<'cached'>,
		args: { tag?: string; channel: TextChannel | AnyThreadChannel; role?: Role; option: string; color?: number }
	) {
		const data = await this.client.resolver.enforceSecurity(interaction, args.tag);
		if (!data) return;

		const flag = {
			'lastseen': Flags.LAST_SEEN_LOG,
			'clan-feed': Flags.CLAN_FEED_LOG,
			'donation-log': Flags.DONATION_LOG,
			'clan-games': Flags.CLAN_GAMES_LOG,
			'war-feed': Flags.CLAN_WAR_LOG,
			'legend-log': Flags.LEGEND_LOG,
			'join-leave': Flags.JOIN_LEAVE_LOG,
			'capital-log': Flags.CAPITAL_LOG
		}[args.option];
		if (!flag) return interaction.editReply(this.i18n('common.something_went_wrong', { lng: interaction.locale }));

		const permission = missingPermissions(args.channel, interaction.guild.members.me!, this.permissions);
		if (permission.missing) {
			return interaction.editReply(
				this.i18n('command.setup.enable.missing_access', {
					lng: interaction.locale,
					channel: args.channel.toString(), // eslint-disable-line
					permission: permission.missingPerms
				})
			);
		}

		const webhook = await this.client.storage.getWebhook(args.channel.isThread() ? args.channel.parent! : args.channel);
		if (!webhook) {
			return interaction.editReply(
				// eslint-disable-next-line
				this.i18n('command.setup.enable.too_many_webhooks', { lng: interaction.locale, channel: args.channel.toString() })
			);
		}

		const id = await this.client.storage.register(interaction, {
			op: flag,
			guild: interaction.guild.id,
			channel: args.channel.id,
			tag: data.tag,
			name: data.name,
			role: args.role ? args.role.id : null,
			webhook: {
				id: webhook.id,
				token: webhook.token
			}
		});

		await this.client.rpcHandler.add(id, {
			op: flag,
			guild: interaction.guild.id,
			tag: data.tag
		});

		const embed = new EmbedBuilder()
			.setTitle(`\u200e${data.name} | ${FEATURES[flag]}`)
			.setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(data.tag)}`)
			.setThumbnail(data.badgeUrls.small)
			.setColor(this.client.embed(interaction))
			.addFields([{ name: 'Channel', value: args.channel.toString() }]); // eslint-disable-line

		if (args.role && flag === Flags.JOIN_LEAVE_LOG) embed.addFields([{ name: 'Flag Notification Role', value: args.role.toString() }]);
		if ([Flags.DONATION_LOG, Flags.LAST_SEEN_LOG, Flags.CLAN_GAMES_LOG].includes(flag)) {
			embed.addFields([{ name: 'Color', value: args.color?.toString(16) ?? 'None' }]);
			if (args.color) embed.setColor(args.color);
		}

		return interaction.editReply({ embeds: [embed] });
	}
}
