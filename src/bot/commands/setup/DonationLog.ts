import { MessageEmbed, Message, TextChannel, User, PermissionString, Channel } from 'discord.js';
import { Op, missingPermissions, SETTINGS, Util, COLLECTIONS, EMBEDS } from '../../util/Constants';
import { Command, PrefixSupplier } from 'discord-akairo';
import { Clan } from 'clashofclans.js';

export default class DonationLogCommand extends Command {
	public constructor() {
		super('setup-donations', {
			category: 'setup-hidden',
			channel: 'guild',
			userPermissions: ['MANAGE_GUILD'],
			clientPermissions: ['ADD_REACTIONS', 'EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Setup donation log in a channel.',
				usage: '<clanTag> [channel/color]',
				examples: ['#8QU8J9LP', '#8QU8J9LP #donations #5970C1', '#8QU8J9LP #5970C1 #donations']
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
			op: Op.DONATION_LOG,
			guild: message.guild!.id,
			channel: channel.id,
			tag: data.tag,
			name: data.name,
			color: hexColor
		});

		await this.client.rpcHandler.add(id, {
			op: Op.DONATION_LOG,
			guild: message.guild!.id,
			tag: data.tag
		});

		const embed = new MessageEmbed()
			.setTitle(`${data.name}`)
			.setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(data.tag)}`)
			.setThumbnail(data.badgeUrls.small)
			.setDescription([
				'**Wait Time**',
				'120 sec',
				'',
				'**Color**',
				`\`#${hexColor.toString(16)}\``,
				'',
				'**Channel**',
				`${(channel as Channel).toString()}`,
				'',
				'**Donation Log**',
				`[Enabled](${message.url})`
			])
			.setColor(hexColor);
		return message.util!.send({ embed });
	}
}
