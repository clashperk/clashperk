import { COLLECTIONS, Op, SETTINGS, Util as Utility, EMBEDS } from '../../util/Constants';
import { Command, Argument, Flag, PrefixSupplier } from 'discord-akairo';
import { EMOJIS, CWL_LEAGUES, TOWN_HALLS } from '../../util/Emojis';
import { ORANGE_NUMBERS } from '../../util/NumEmojis';
import { Util, Message, User } from 'discord.js';
import { Clan } from 'clashofclans.js';

export default class ClanEmbedCommand extends Command {
	public constructor() {
		super('setup-clan-embed', {
			category: 'setup',
			channel: 'guild',
			description: {},
			optionFlags: ['--tag'],
			userPermissions: ['MANAGE_GUILD'],
			clientPermissions: ['EMBED_LINKS']
		});
	}

	public *args(msg: Message): unknown {
		const data = yield {
			flag: '--tag',
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase',
			type: async (msg: Message, args: string) => {
				if (!this.client.patrons.get(msg.guild!.id)) return this.bePatron(msg);
				return this.client.resolver.resolveClan(msg, args);
			}
		};

		const user = yield {
			match: 'none',
			type: 'member',
			prompt: {
				start: 'Who is the leader of the clan? (@mention clan leader)',
				retry: 'Please mention a valid member...'
			}
		};

		const accepts = yield {
			'match': 'none',
			'type': Argument.validate('string', (msg, txt) => txt.length <= 200),
			'prompt': {
				start: 'What Town-Halls are accepted? (write anything)',
				retry: 'Embed field must be 200 or fewer in length.',
				time: 1 * 60 * 1000
			},
			'default': ''
		};

		const description = yield {
			'match': 'none',
			'type': Argument.validate('string', (msg, txt) => txt.length <= 300),
			'prompt': {
				start: 'What would you like to set the description? (write anything or `auto` to sync with clan description or `none` to leave it empty)',
				retry: 'Embed description must be 300 or fewer in length.',
				time: 1.5 * 60 * 1000
			},
			'default': ' \u200b'
		};

		const yesNo = yield {
			match: 'none',
			type: (msg: Message, txt: string) => {
				if (!txt) return null;
				if (/^y(?:e(?:a|s)?)?$/i.test(txt)) return true;
				return false;
			},
			prompt: {
				start: 'Would you like to set a custom color of the embed? (yes/no)'
			}
		};

		const color = yield (
			// eslint-disable-next-line multiline-ternary
			yesNo ? {
				match: 'none',
				type: (msg: Message, txt: string) => {
					if (!txt) return null;
					const resolver = this.handler.resolver.types.get('color')!;
					return resolver(msg, txt) || this.client.embed(msg);
				},
				prompt: {
					start: 'What is the hex code of the color? (e.g. #f96854)'
				}
			} : {
				'match': 'none',
				'default': (msg: Message) => this.client.embed(msg)
			}
		);

		return { data, user, accepts, description, color };
	}

	public async exec(message: Message, { data, accepts, user, description, color }: { data: Clan; accepts: string; user: User; description: string; color?: number }) {
		const clans = await this.clans(message);

		const prefix = (this.handler.prefix as PrefixSupplier)(message) as string;
		const max = this.client.settings.get<number>(message.guild!.id, SETTINGS.LIMIT, 2);
		if (clans.length >= max && !clans.filter(clan => clan.active).map(clan => clan.tag).includes(data.tag)) {
			return message.util!.send({ embed: EMBEDS.CLAN_LIMIT(prefix) });
		}

		const dbUser = await this.client.db.collection(COLLECTIONS.LINKED_USERS)
			.findOne({ user: message.author.id });
		const code = ['CP', message.guild!.id.substr(-2)].join('');
		const clan = clans.find(clan => clan.tag === data.tag) ?? { verified: false };
		if (!clan.verified && !Utility.verifyClan(code, data, dbUser?.entries ?? [])) {
			const embed = EMBEDS.VERIFY_CLAN(data, code, prefix);
			return message.util!.send({ embed });
		}

		const fetched = await this.client.http.detailedClanMembers(data.memberList);
		const reduced = fetched.filter(res => res.ok).reduce((count, member) => {
			const townHall = member.townHallLevel;
			count[townHall] = (count[townHall] || 0) + 1;
			return count;
		}, {} as { [key: string]: number });

		const townHalls = Object.entries(reduced)
			.map(arr => ({ level: Number(arr[0]), total: arr[1] }))
			.sort((a, b) => b.level - a.level);

		const location = data.location
			? data.location.isCountry
				? `:flag_${data.location.countryCode.toLowerCase()}: ${data.location.name}`
				: `🌐 ${data.location.name}`
			: `${EMOJIS.WRONG} None`;

		const embed = this.client.util.embed()
			.setTitle(`${data.name} (${data.tag})`)
			.setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(data.tag)}`)
			.setThumbnail(data.badgeUrls.medium)
			.setDescription([
				`${EMOJIS.CLAN} **${data.clanLevel}** ${EMOJIS.USERS} **${data.members}** ${EMOJIS.TROPHY} **${data.clanPoints}** ${EMOJIS.VERSUS_TROPHY} **${data.clanVersusPoints}**`,
				'',
				description.toLowerCase() === 'auto'
					? data.description
					: description.toLowerCase() === 'none'
						? ''
						: Util.cleanContent(description, message) || ''
			])
			.addField('Clan Leader', [
				`${EMOJIS.OWNER} ${user.toString()} (${data.memberList.filter(m => m.role === 'leader').map(m => `${m.name}`)[0] || 'None'})`
			])
			.addField('Requirements', [
				`${EMOJIS.TOWNHALL} ${accepts}`,
				'**Trophies Required**',
				`${EMOJIS.TROPHY} ${data.requiredTrophies}`,
				`**Location** \n${location}`
			])
			.addField('War Performance', [
				`${EMOJIS.OK} ${data.warWins} Won ${data.isWarLogPublic ? `${EMOJIS.WRONG} ${data.warLosses!} Lost ${EMOJIS.EMPTY} ${data.warTies!} Tied` : ''}`,
				'**War Frequency & Streak**',
				`${data.warFrequency.toLowerCase() === 'morethanonceperweek'
					? '🎟️ More Than Once Per Week'
					: `🎟️ ${data.warFrequency.toLowerCase().replace(/\b(\w)/g, char => char.toUpperCase())}`} ${'🏅'} ${data.warWinStreak}`,
				'**War League**', `${CWL_LEAGUES[data.warLeague?.name ?? ''] || EMOJIS.EMPTY} ${data.warLeague?.name ?? 'Unranked'}`
			])
			.addField('Town Halls', [
				townHalls.slice(0, 7).map(th => `${TOWN_HALLS[th.level]} ${ORANGE_NUMBERS[th.total]}\u200b`).join(' ')
			])
			.setFooter('Synced', this.client.user!.displayAvatarURL())
			.setTimestamp();
		if (color) embed.setColor(color);

		description = description.toLowerCase() === 'auto'
			? 'auto'
			: description.toLowerCase() === 'none'
				? ''
				: description;

		const msg = await message.util!.send({ embed });
		const id = await this.client.storage.register(message, {
			op: Op.CLAN_EMBED_LOG,
			guild: message.guild!.id,
			channel: message.channel.id,
			tag: data.tag,
			color,
			name: data.name,
			message: msg.id,
			embed: {
				accepts,
				userId: user.id,
				description: Util.cleanContent(description, message)
			}
		});

		this.client.rpcHandler.add(id, {
			op: Op.CLAN_EMBED_LOG,
			guild: message.guild!.id,
			tag: data.tag
		});
	}

	private async bePatron(message: Message) {
		const embed = this.client.util.embed()
			.setImage('https://i.imgur.com/txkD6q7.png')
			.setDescription([
				'[Become a Patron](https://www.patreon.com/clashperk) to create Live auto updating Promotional Embed.'
			]);
		return message.util!.send({ embed }).then(() => Flag.cancel()).catch(() => Flag.cancel());
	}

	private async clans(message: Message) {
		const collection = await this.client.db.collection(COLLECTIONS.CLAN_STORES)
			.find({ guild: message.guild!.id })
			.toArray();
		return collection;
	}
}
