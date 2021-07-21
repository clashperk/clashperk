import { MessageEmbed, Message, TextChannel, User, PermissionString, Channel } from 'discord.js';
import { Flags, missingPermissions, Settings, Collections, EMBEDS } from '../../util/Constants';
import { Command, PrefixSupplier } from 'discord-akairo';
import { Clan } from 'clashofclans.js';

export default class ClanGamesBoardCommand extends Command {
	public constructor() {
		super('setup-clan-games', {
			category: 'setup',
			channel: 'guild',
			description: {},
			optionFlags: ['--tag', '--channel', '--extra'],
			userPermissions: ['MANAGE_GUILD'],
			clientPermissions: ['ADD_REACTIONS', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY']
		});
	}

	public *args(msg: Message): unknown {
		const data = yield {
			flag: '--tag',
			match: msg.interaction ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.getClan(msg, tag)
		};

		const channel = yield {
			'flag': '--channel',
			'unordered': [1, 2],
			'type': 'textChannel',
			'default': (msg: Message) => msg.channel,
			'match': msg.interaction ? 'option' : 'phrase'
		};

		const hexColor = yield {
			'type': 'color',
			'flag': '--extra',
			'unordered': [1, 2],
			'default': (msg: Message) => this.client.embed(msg),
			'match': msg.interaction ? 'option' : 'phrase'
		};

		return { data, channel, hexColor };
	}

	public async exec(message: Message, { data, channel, hexColor }: { data: Clan; channel: TextChannel; hexColor?: number }) {
		const prefix = (this.handler.prefix as PrefixSupplier)(message) as string;
		const clans = await this.client.storage.findAll(message.guild!.id);
		const max = this.client.settings.get<number>(message.guild!.id, Settings.CLAN_LIMIT, 2);
		if (clans.length >= max && !clans.filter(clan => clan.active).map(clan => clan.tag).includes(data.tag)) {
			return message.util!.send({ embeds: [EMBEDS.CLAN_LIMIT(prefix)] });
		}

		const dbUser = await this.client.db.collection(Collections.LINKED_PLAYERS)
			.findOne({ user: message.author.id });
		const code = ['CP', message.guild!.id.substr(-2)].join('');
		const clan = clans.find(clan => clan.tag === data.tag) ?? { verified: false };
		if (!clan.verified && !this.verifyClan(code, data, dbUser?.entries ?? [])) {
			const embed = EMBEDS.VERIFY_CLAN(data, code, prefix);
			return message.util!.send({ embeds: [embed] });
		}

		const permission = missingPermissions(channel, this.client.user as User, this.clientPermissions as PermissionString[]);
		if (permission.missing) {
			return message.util!.send(`I\'m missing ${permission.missingPerms} to run that command.`);
		}

		const patron = this.client.patrons.get(message.guild!.id);
		const id = await this.client.storage.register(message, {
			op: Flags.CLAN_GAMES_LOG,
			guild: message.guild!.id,
			channel: channel.id,
			message: null,
			name: data.name,
			tag: data.tag,
			color: this.client.patrons.get(message) ? hexColor : null
		});

		await this.client.rpcHandler.add(id, {
			op: Flags.CLAN_GAMES_LOG,
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
				'Enabled'
			].join('\n'));
		if (hexColor) embed.setColor(hexColor);
		return message.util!.send({ embeds: [embed] });
	}

	private verifyClan(code: string, clan: Clan, tags: { tag: string; verified: boolean }[]) {
		const verifiedTags = tags.filter(en => en.verified).map(en => en.tag);
		return clan.memberList.filter(m => ['coLeader', 'leader'].includes(m.role))
			.some(m => verifiedTags.includes(m.tag)) || clan.description.toUpperCase().includes(code);
	}
}
