import { MessageEmbed, Message, TextChannel, User, PermissionString, Channel } from 'discord.js';
import { Op, missingPermissions, SETTINGS } from '../../util/Constants';
import Resolver from '../../struct/Resolver';
import { Command } from 'discord-akairo';
import { Clan } from 'clashofclans.js';

export default class ClanGamesBoardCommand extends Command {
	public constructor() {
		super('setup-clangames', {
			category: 'setup-hidden',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			clientPermissions: ['ADD_REACTIONS', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'],
			description: {
				content: 'Set Live Updating Clan Games Board in a Channel.',
				usage: '<clanTag> [channel/color]',
				examples: ['#8QU8J9LP', '#8QU8J9LP #clan-boards #5970C1', '#8QU8J9LP #5970C1 #clan-boards']
			},
			args: [
				{
					id: 'data',
					type: (msg, tag) => this.client.resolver.getClan(msg, tag)
				},
				{
					'id': 'channel',
					'type': 'textChannel',
					'unordered': [1, 2],
					'default': (msg: Message) => msg.channel
				},
				{
					'id': 'hexColor',
					'type': 'color',
					'unordered': [1, 2],
					'default': (msg: Message) => this.client.embed(msg)
				}
			]
		});
	}

	public async exec(message: Message, { data, channel, hexColor }: { data: Clan; channel: TextChannel; hexColor: number }) {
		const clans = await this.client.storage.findAll(message.guild!.id);
		const max = this.client.settings.get<number>(message.guild!.id, SETTINGS.LIMIT, 2);
		if (clans.length >= max && !clans.filter(clan => clan.active).map(clan => clan.tag).includes(data.tag)) {
			const embed = Resolver.limitEmbed();
			return message.util!.send({ embed });
		}

		const code = ['CP', message.guild!.id.substr(-2)].join('');
		const clan = clans.find(clan => clan.tag === data.tag) ?? { verified: false };
		if (!clan.verified && !data.description.toUpperCase().includes(code)) {
			const embed = Resolver.verifyEmbed(data, code);
			return message.util!.send({ embed });
		}

		const permission = missingPermissions(channel, this.client.user as User, this.clientPermissions as PermissionString[]);
		if (permission.missing) {
			return message.util!.send(`I\'m missing ${permission.missingPerms} to run that command.`);
		}

		const patron = this.client.patrons.get(message.guild!.id);
		const id = await this.client.storage.register(message, {
			op: Op.CLAN_GAMES_LOG,
			guild: message.guild!.id,
			channel: channel.id,
			message: null,
			name: data.name,
			tag: data.tag,
			color: hexColor
		});

		await this.client.rpcHandler.add(id, {
			op: Op.CLAN_GAMES_LOG,
			tag: data.tag,
			guild: message.guild!.id
		});

		const embed = new MessageEmbed()
			.setTitle(`${data.name}`)
			.setURL(`https://link.clashofclans.com/?action=OpenClanProfile&tag=${encodeURIComponent(data.tag)}`)
			.setThumbnail(data.badgeUrls.small)
			.setDescription([
				'**Wait Time**',
				`${patron ? 15 : 30} min`,
				'',
				'**Color**',
				`\`#${hexColor.toString(16)}\``,
				'',
				'**Channel**',
				`${(channel as Channel).toString()}`,
				'',
				'**Clan Games Board**',
				`[Enabled](${message.url})`
			])
			.setColor(hexColor);
		return message.util!.send({ embed });
	}
}
