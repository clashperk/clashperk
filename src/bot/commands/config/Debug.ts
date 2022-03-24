import { CommandInteraction, TextChannel, PermissionString, Interaction } from 'discord.js';
import { Args, Command } from '../../lib';
import { EMOJIS } from '../../util/Emojis';
import { Clan } from 'clashofclans.js';
import { Util } from '../../util';
import ms from 'ms';

interface RPC {
	clans: number;
	wars: number;
	heapUsed: number;
	players: number;
}

export default class DebugCommand extends Command {
	public constructor() {
		super('debug', {
			category: 'config',
			channel: 'guild',
			description: {
				content: 'Shows some basic debug information.'
			},
			defer: true
		});
	}

	public args(interaction: Interaction): Args {
		return {
			channel: {
				match: 'CHANNEL',
				default: interaction.channel
			}
		};
	}

	public async exec(interaction: CommandInteraction<'cached'>, { channel }: { channel: TextChannel }) {
		const permissions: PermissionString[] = [
			'VIEW_CHANNEL',
			'SEND_MESSAGES',
			'EMBED_LINKS',
			'ADD_REACTIONS',
			'ATTACH_FILES',
			'USE_EXTERNAL_EMOJIS',
			'READ_MESSAGE_HISTORY'
		];

		const clans = await this.client.storage.findAll(interaction.guild.id);
		const fetched: Clan[] = (await Promise.all(clans.map((en) => this.client.http.clan(en.tag)))).filter((res) => res.ok);

		const rpc: RPC = await new Promise((resolve) =>
			this.client.rpc.stats({}, (err: any, res: any) => {
				if (res) resolve(JSON.parse(res?.data));
				else resolve({ heapUsed: 0, clans: 0, players: 0, wars: 0 });
			})
		);

		const UEE_FOR_SLASH = channel.permissionsFor(interaction.guild.roles.everyone)!.has('USE_EXTERNAL_EMOJIS');
		const UEE_FOR_TEXT = channel.permissionsFor(interaction.guild.me!)!.has('USE_EXTERNAL_EMOJIS');
		const emojis =
			UEE_FOR_SLASH || UEE_FOR_TEXT
				? { cross: EMOJIS.WRONG, tick: EMOJIS.OK, none: EMOJIS.EMPTY }
				: { cross: '❌', tick: '☑️', none: '⬛' };

		const chunks = Util.splitMessage(
			[
				`**${this.client.user!.username} Debug Menu**`,
				'',
				'**Command Prefix**',
				'/',
				'',
				'**Server ID**',
				`${interaction.guild.id}`,
				'**Shard ID**',
				`[${interaction.guild.shard.id} / ${this.client.shard!.count}]`,
				'**Channel ID**',
				`${interaction.channel!.id}`,
				'',
				'**Channel Permissions**',
				permissions
					.map((perm) => {
						const hasPerm = channel.permissionsFor(interaction.guild.me!)!.has(perm);
						return `${hasPerm ? emojis.tick : emojis.cross} ${this.fixName(perm)}`;
					})
					.join('\n'),
				'',
				'**Slash Command Permission**',
				`${UEE_FOR_SLASH ? emojis.tick : emojis.cross} Use External Emojis ${UEE_FOR_SLASH ? '' : '(for @everyone)'}`,
				'',
				`**Loop Time ${rpc.clans && rpc.players && rpc.wars ? '' : '(Processing...)'}**`,
				`${emojis.none} \` ${'CLANS'.padStart(7, ' ')} \` \` ${'WARS'.padStart(7, ' ')} \` \` ${'PLAYERS'} \``,
				`${emojis.tick} \` ${this.fixTime(rpc.clans, '2m').padStart(7, ' ')} \` \` ${this.fixTime(rpc.wars, '10m').padStart(
					7,
					' '
				)} \` \` ${this.fixTime(rpc.players, '1h').padStart(7, ' ')} \``,
				'',
				'**Clan Status and Player Loop Info**',
				`${emojis.none} \`\u200e ${'CLAN NAME'.padEnd(
					15,
					' '
				)} \u200f\` \`\u200e ${'UPDATED'} \u200f\` \`\u200e ${'WAR LOG'} \u200f\``,
				clans
					.map((clan) => {
						const lastRan = clan.lastRan ? ms(Date.now() - clan.lastRan.getTime()) : 'Unknown';
						const warLog = fetched.find((res) => res.tag === clan.tag)?.isWarLogPublic;
						const sign = clan.active && !clan.paused && clan.flag > 0 && warLog ? emojis.tick : emojis.cross;
						return `${sign} \`\u200e ${clan.name.padEnd(15, ' ')} \u200f\` \`\u200e ${lastRan.padStart(
							3,
							' '
						)} ago \u200f\` \`\u200e ${(warLog ? 'Public' : 'Private').padStart(7, ' ')} \u200f\``;
					})
					.join('\n')
			].join('\n')
		);

		for (const chunk of chunks) await interaction.followUp(chunk);
	}

	private fixTime(num: number, total: string) {
		return num === 0 ? `.../${total}` : `${ms(num)}/${total}`;
	}

	private fixName(perm: string) {
		if (perm === 'VIEW_CHANNEL') return 'Read Messages';
		return perm
			.replace(/_/g, ' ')
			.toLowerCase()
			.replace(/\b(\w)/g, (char) => char.toUpperCase());
	}
}
