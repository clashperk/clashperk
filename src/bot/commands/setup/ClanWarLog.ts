import { MessageEmbed, Message, TextChannel, User, PermissionString, Channel } from 'discord.js';
import { Flags, missingPermissions, Settings, Collections, EMBEDS } from '../../util/Constants';
import { Command } from 'discord-akairo';
import { Clan } from 'clashofclans.js';

export default class WarLogCommand extends Command {
	public constructor() {
		super('setup-clan-wars', {
			category: 'none',
			description: {},
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			optionFlags: ['--tag', '--channel'],
			clientPermissions: ['ADD_REACTIONS', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS', 'READ_MESSAGE_HISTORY']
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
			'type': 'textChannel',
			'default': (msg: Message) => msg.channel,
			'match': msg.interaction ? 'option' : 'phrase'
		};

		return { data, channel };
	}

	public async exec(message: Message, { data, channel }: { data: Clan; channel: TextChannel }) {
		const clans = await this.client.storage.findAll(message.guild!.id);
		const max = this.client.settings.get<number>(message.guild!.id, Settings.CLAN_LIMIT, 2);
		if (clans.length >= max && !clans.filter(clan => clan.active).map(clan => clan.tag).includes(data.tag)) {
			return message.util!.send({ embeds: [EMBEDS.CLAN_LIMIT()] });
		}

		const dbUser = await this.client.db.collection(Collections.LINKED_PLAYERS)
			.findOne({ user: message.author.id });
		const code = ['CP', message.guild!.id.substr(-2)].join('');
		const clan = clans.find(clan => clan.tag === data.tag) ?? { verified: false };
		if (!clan.verified && !this.verifyClan(code, data, dbUser?.entries ?? [])) {
			const embed = EMBEDS.VERIFY_CLAN(data, code);
			return message.util!.send({ embeds: [embed] });
		}

		const permission = missingPermissions(channel, this.client.user as User, this.clientPermissions as PermissionString[]);
		if (permission.missing) {
			return message.util!.send(`I\'m missing ${permission.missingPerms} to run that command.`);
		}

		const id = await this.client.storage.register(message, {
			op: Flags.CLAN_WAR_LOG,
			guild: message.guild!.id,
			channel: channel.id,
			tag: data.tag,
			name: data.name
		});

		await this.client.rpcHandler.add(id, {
			op: Flags.CLAN_WAR_LOG,
			guild: message.guild!.id,
			tag: data.tag
		});

		const embed = new MessageEmbed()
			.setTitle(`${data.name}`)
			.setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(data.tag)}`)
			.setThumbnail(data.badgeUrls.small)
			.setDescription([
				'**War Log**',
				`${data.isWarLogPublic ? 'Public' : 'Private'}`,
				'',
				'**Channel**',
				`${(channel as Channel).toString()}`,
				'',
				'**Clan War Embed**',
				'Enabled'
			].join('\n'))
			.setColor(this.client.embed(message));
		return message.util!.send({ embeds: [embed] });
	}

	private verifyClan(code: string, clan: Clan, tags: { tag: string; verified: boolean }[]) {
		const verifiedTags = tags.filter(en => en.verified).map(en => en.tag);
		return clan.memberList.filter(m => ['coLeader', 'leader'].includes(m.role))
			.some(m => verifiedTags.includes(m.tag)) || clan.description.toUpperCase().includes(code);
	}
}
