import { MessageEmbed, Message, TextChannel, User, PermissionString, Channel } from 'discord.js';
import { Op, missingPermissions, SETTINGS, COLLECTIONS, Util, EMBEDS } from '../../util/Constants';
import { Command, PrefixSupplier } from 'discord-akairo';
import { Clan } from 'clashofclans.js';

export default class ClanGamesBoardCommand extends Command {
	public constructor() {
		super('setup-clan-games', {
			category: 'setup',
			channel: 'guild',
			description: {},
			optionFlags: ['--tag', '--channel', '--color'],
			userPermissions: ['MANAGE_GUILD'],
			clientPermissions: ['ADD_REACTIONS', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY']
		});
	}

	public *args(msg: Message) {
		const data = yield {
			flag: '--tag',
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.getClan(msg, tag)
		};

		const channel = yield {
			'flag': '--channel',
			'unordered': [1, 2],
			'type': 'textChannel',
			'default': (msg: Message) => msg.channel,
			'match': msg.hasOwnProperty('token') ? 'option' : 'phrase'
		};

		const hexColor = yield {
			'type': 'color',
			'flag': '--color',
			'unordered': [1, 2],
			'default': (msg: Message) => this.client.embed(msg),
			'match': msg.hasOwnProperty('token') ? 'option' : 'phrase'
		};

		return { data, channel, hexColor };
	}

	public async exec(message: Message, { data, channel, hexColor }: { data: Clan; channel: TextChannel; hexColor?: number }) {
		const prefix = (this.handler.prefix as PrefixSupplier)(message) as string;
		const clans = await this.client.storage.findAll(message.guild!.id);
		const max = this.client.settings.get<number>(message.guild!.id, SETTINGS.LIMIT, 2);
		if (clans.length >= max && !clans.filter(clan => clan.active).map(clan => clan.tag).includes(data.tag)) {
			return message.util!.send({ embed: EMBEDS.CLAN_LIMIT(prefix) });
		}

		const dbUser = await this.client.db.collection(COLLECTIONS.LINKED_USERS)
			.findOne({ user: message.author.id });
		const code = ['CP', message.guild!.id.substr(-2)].join('');
		const clan = clans.find(clan => clan.tag === data.tag) ?? { verified: false };
		if (!clan.verified && !Util.verifyClan(code, data, dbUser?.entries ?? [])) {
			const embed = EMBEDS.VERIFY_CLAN(data, code, prefix);
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
			.setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(data.tag)}`)
			.setThumbnail(data.badgeUrls.small)
			.setDescription([
				'**Sync Rate**',
				`${patron ? 15 : 30} min`,
				'',
				'**Color**',
				`\`${hexColor ? '#' : ''}${hexColor?.toString(16) ?? 'None'}\``,
				'',
				'**Channel**',
				`${(channel as Channel).toString()}`,
				'',
				'**Clan Games Board**',
				`[Enabled](${message.url})`
			]);
		if (hexColor) embed.setColor(hexColor);
		return message.util!.send({ embed });
	}
}
