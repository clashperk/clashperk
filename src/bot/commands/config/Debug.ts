import { Message, TextChannel, PermissionString, User } from 'discord.js';
import { Command, PrefixSupplier } from 'discord-akairo';
import { EMOJIS } from '../../util/Emojis';
import { Clan } from 'clashofclans.js';
import ms from 'ms';

interface RPC {
	wars: number;
	clans: number;
	players: number;
	heapUsed: number;
}

export default class DebugCommand extends Command {
	public constructor() {
		super('debug', {
			aliases: ['debug'],
			category: 'config',
			description: {
				content: 'Shows some basic debug informations.'
			}
		});
	}

	public *args(msg: Message): unknown {
		const channel = yield {
			'type': 'textChannel',
			'default': (message: Message) => message.channel,
			'match': msg.hasOwnProperty('token') ? 'option' : 'phrase'
		};

		return { channel };
	}

	public async exec(message: Message, { channel }: { channel: TextChannel }) {
		const prefix = (this.handler.prefix as PrefixSupplier)(message) as string;
		const permissions: PermissionString[] = [
			'VIEW_CHANNEL', 'SEND_MESSAGES', 'EMBED_LINKS', 'ADD_REACTIONS',
			'ATTACH_FILES', 'USE_EXTERNAL_EMOJIS', 'READ_MESSAGE_HISTORY'
		];

		const clans = await this.client.storage.findAll(message.guild!.id);
		const fetched: Clan[] = (await Promise.all(clans.map(en => this.client.http.clan(en.tag)))).filter(res => res.ok);

		// @ts-expect-error
		const interaction = await this.client.api.applications(this.client.user!.id)
			.guilds(message.guild!.id).commands.get()
			.catch(() => null);

		const rpc: RPC = await new Promise(resolve => this.client.rpc.stats({}, (err: any, res: any) => {
			if (res) resolve(JSON.parse(res?.data));
			else resolve({ heapUsed: 0, clans: 0, players: 0, wars: 0 });
		}));

		const UEE_FOR_SLASH = channel.permissionsFor(message.guild!.id)!.has('USE_EXTERNAL_EMOJIS');
		const UEE_FOR_TEXT = channel.permissionsFor(this.client.user!)!.has('USE_EXTERNAL_EMOJIS');
		const emojis = (message.hasOwnProperty('token') && UEE_FOR_SLASH) || (!message.hasOwnProperty('token') && UEE_FOR_TEXT)
			? { cross: EMOJIS.WRONG, tick: EMOJIS.OK, none: EMOJIS.EMPTY }
			: { cross: '❌', tick: '☑️', none: '⬛' };

		return message.util!.send({
			split: true,
			allowedMentions: { parse: ['users'] },
			content: [
				`**${this.client.user!.username} Debug Menu**`,
				'',
				'**Command Prefix',
				`**${prefix}`,
				'**Slash Command**',
				`${interaction ? 'Enabled' : 'Disabled'}`,
				'',
				'**Server ID**',
				`${message.guild!.id}`,
				'**Shard ID**',
				`[${message.guild!.shard.id} / ${this.client.shard!.count}]`,
				'**Channel ID**',
				`${message.channel.id}`,
				'',
				'**Channel Permissions**',
				permissions.map(perm => {
					const hasPerm = channel.permissionsFor(message.guild!.me!)!.has(perm);
					return `${hasPerm ? emojis.tick : emojis.cross} ${this.fixName(perm)}`;
				}).join('\n'),
				'',
				'**Slash Command Permission**',
				`${UEE_FOR_SLASH ? emojis.tick : emojis.cross} Use External Emojis ${UEE_FOR_SLASH ? '' : '(for @everyone)'}`,
				'',
				`**Loop Time ${(rpc.clans && rpc.players && rpc.wars) ? '' : '(Processing...)'}**`,
				`${emojis.none} \` ${'CLANS'.padStart(7, ' ')} \` \` ${'WARS'.padStart(7, ' ')} \` \` ${'PLAYERS'} \``,
				`${emojis.tick} \` ${this.fixTime(rpc.clans, '2m').padStart(7, ' ')} \` \` ${this.fixTime(rpc.wars, '10m').padStart(7, ' ')} \` \` ${this.fixTime(rpc.players, '1h').padStart(7, ' ')} \``,
				'',
				'**Clan Status and Player Loop Info**',
				`${emojis.none} \`\u200e ${'CLAN NAME'.padEnd(15, ' ')} \u200f\` \`\u200e ${'UPDATED'} \u200f\` \`\u200e ${'WAR LOG'} \u200f\``,
				clans.map(clan => {
					const lastRan = clan.lastRan ? ms(Date.now() - clan.lastRan.getTime()) : 'Unknown';
					const warLog = fetched.find(res => res.tag === clan.tag)?.isWarLogPublic;
					const sign = (clan.active && !clan.paused && clan.flag > 0 && warLog) ? emojis.tick : emojis.cross;
					return `${sign} \`\u200e ${clan.name.padEnd(15, ' ')} \u200f\` \`\u200e ${lastRan.padStart(3, ' ')} ago \u200f\` \`\u200e ${(warLog ? 'Public' : 'Private').padStart(7, ' ')} \u200f\``;
				}).join('\n')
			].join('\n')
		});
	}

	private fixTime(num: number, total: string) {
		return num === 0 ? `.../${total}` : `${ms(num)}/${total}`;
	}

	private fixName(perm: string) {
		if (perm === 'VIEW_CHANNEL') return 'Read Messages';
		return perm.replace(/_/g, ' ').toLowerCase().replace(/\b(\w)/g, char => char.toUpperCase());
	}

	private missingPermissions(channel: TextChannel, user: User, permissions: PermissionString[]) {
		const missingPerms = channel.permissionsFor(user)!.missing(permissions)
			.map(str => {
				if (str === 'VIEW_CHANNEL') return 'Read Messages';
				return str.replace(/_/g, ' ').toLowerCase().replace(/\b(\w)/g, char => char.toUpperCase());
			});
		return missingPerms.join('\n');
	}
}
