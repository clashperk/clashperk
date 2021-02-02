import { MessageEmbed, Message, TextChannel, User, PermissionString, Channel } from 'discord.js';
import { Op, missingPermissions, SETTINGS, COLLECTIONS, Util, EMBEDS } from '../../util/Constants';
import { Command, PrefixSupplier } from 'discord-akairo';
import { Clan } from 'clashofclans.js';

export default class WarLogCommand extends Command {
	public constructor() {
		super('setup-clan-wars', {
			category: 'setup-hidden',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			clientPermissions: ['ADD_REACTIONS', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Setup live war and CWL feed in a channel.',
				usage: '<clanTag> [channel]',
				examples: ['#8QU8J9LP', '#8QU8J9LP #war-update']
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
				}
			]
		});
	}

	public async exec(message: Message, { data, channel }: { data: Clan; channel: TextChannel }) {
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

		const id = await this.client.storage.register(message, {
			op: Op.CLAN_WAR_LOG,
			guild: message.guild!.id,
			channel: channel.id,
			tag: data.tag,
			name: data.name
		});

		await this.client.rpcHandler.add(id, {
			op: Op.CLAN_WAR_LOG,
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
				'**Live Clan War Log**',
				`[Enabled](${message.url})`
			])
			.setColor(this.client.embed(message));
		return message.util!.send({ embed });
	}
}
