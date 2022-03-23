import { MessageEmbed, CommandInteraction, TextChannel, Role } from 'discord.js';
import { Flags, missingPermissions } from '../../util/Constants';
import { Args, Command } from '../../lib';
import { Clan } from 'clashofclans.js';

const FEATURES: Record<string, string> = {
	[Flags.DONATION_LOG]: 'Donation Log',
	[Flags.CLAN_FEED_LOG]: 'Clan Feed',
	[Flags.LAST_SEEN_LOG]: 'Last Seen',
	[Flags.CLAN_EMBED_LOG]: 'Clan Embed',
	[Flags.CLAN_GAMES_LOG]: 'Clan Games',
	[Flags.CLAN_WAR_LOG]: 'War Feed'
};

export default class ClanLogCommand extends Command {
	public constructor() {
		super('setup-clan-log', {
			category: 'none',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			clientPermissions: ['ADD_REACTIONS', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'],
			defer: true,
			ephemeral: true
		});
	}

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
		args: { tag?: string; channel: TextChannel; role?: Role; option: string; color?: number }
	) {
		const data = await this.client.resolver.enforceSecurity(interaction, args.tag);
		if (!data) return;

		const flag = {
			'lastseen': Flags.LAST_SEEN_LOG,
			'clan-feed': Flags.CLAN_FEED_LOG,
			'donation-log': Flags.DONATION_LOG,
			'clan-games': Flags.CLAN_GAMES_LOG,
			'war-feed': Flags.CLAN_WAR_LOG
		}[args.option];
		if (!flag) return interaction.editReply({ content: 'Something went wrong!' });

		const permission = missingPermissions(args.channel, interaction.guild.me!, this.clientPermissions!);
		if (permission.missing) {
			return interaction.editReply(`I\'m missing ${permission.missingPerms} to run that command.`);
		}

		const id = await this.client.storage.register(interaction, {
			op: flag,
			guild: interaction.guild.id,
			channel: args.channel.id,
			tag: data.tag,
			name: data.name,
			role: args.role ? args.role.id : null
		});

		await this.client.rpcHandler.add(id, {
			op: flag,
			guild: interaction.guild.id,
			tag: data.tag
		});

		const embed = new MessageEmbed()
			.setTitle(`\u200e${data.name} | ${FEATURES[flag]}`)
			.setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(data.tag)}`)
			.setThumbnail(data.badgeUrls.small)
			.setColor(this.client.embed(interaction));
		if (args.role) embed.addField('Role', args.role.toString());
		embed.addField('Channel', args.channel.toString()); // eslint-disable-line
		if (args.color) embed.setColor(args.color);
		embed.addField('Color', args.color?.toString(16) ?? 'None');

		return interaction.editReply({ embeds: [embed] });
	}

	private verifyClan(code: string, clan: Clan, tags: { tag: string; verified: boolean }[]) {
		const verifiedTags = tags.filter((en) => en.verified).map((en) => en.tag);
		return (
			clan.memberList.filter((m) => ['coLeader', 'leader'].includes(m.role)).some((m) => verifiedTags.includes(m.tag)) ||
			clan.description.toUpperCase().includes(code)
		);
	}
}
