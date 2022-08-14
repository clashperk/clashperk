import { CommandInteraction, TextChannel, PermissionString, Interaction } from 'discord.js';
import { Clan } from 'clashofclans.js';
import ms from 'ms';
import { Args, Command } from '../../lib/index.js';
import { EMOJIS } from '../../util/Emojis.js';
import { Util } from '../../util/index.js';

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

		const clans = await this.client.storage.find(interaction.guild.id);
		const fetched: Clan[] = (await Promise.all(clans.map((en) => this.client.http.clan(en.tag)))).filter((res) => res.ok);

		const patron = this.client.patrons.get(interaction.guild.id);
		const cycle = await this.client.redis.hGetAll(patron ? 'cycle_premium' : 'cycle').then((data) => ({
			clans: Number(data.CLAN_LOOP || 0),
			players: Number(data.PLAYER_LOOP || 0),
			wars: Number(data.WAR_LOOP || 0)
		}));

		const UEE_FOR_SLASH = channel.permissionsFor(interaction.guild.roles.everyone)!.has('USE_EXTERNAL_EMOJIS');
		const emojis = UEE_FOR_SLASH
			? { cross: EMOJIS.WRONG, tick: EMOJIS.OK, none: EMOJIS.EMPTY }
			: { cross: '❌', tick: '☑️', none: '⬛' };

		const chunks = Util.splitMessage(
			[
				`**${this.client.user!.username} Debug Menu**`,
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
				`**Loop Time ${cycle.clans && cycle.players && cycle.wars ? '' : '(Processing...)'}**`,
				`${emojis.none} \` ${'CLANS'.padStart(7, ' ')} \` \` ${'WARS'.padStart(7, ' ')} \` \` ${'PLAYERS'} \``,
				`${emojis.tick} \` ${this.fixTime(cycle.clans).padStart(7, ' ')} \` \` ${this.fixTime(cycle.wars).padStart(
					7,
					' '
				)} \` \` ${this.fixTime(cycle.players).padStart(7, ' ')} \``,
				'',
				'**Clan Status and Player Loop Info**',
				`${emojis.none} \`\u200e ${'CLAN NAME'.padEnd(
					15,
					' '
				)} \u200f\` \`\u200e ${'UPDATED'} \u200f\` \`\u200e ${'WAR LOG'} \u200f\``,
				clans
					.map((clan) => {
						const lastRan = clan.lastRan ? ms(Date.now() - clan.lastRan.getTime()) : '...';
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

	private fixTime(num: number) {
		return num === 0 ? `...` : `${ms(num)}`;
	}

	private fixName(perm: string) {
		if (perm === 'VIEW_CHANNEL') return 'Read Messages';
		return perm
			.replace(/_/g, ' ')
			.toLowerCase()
			.replace(/\b(\w)/g, (char) => char.toUpperCase());
	}
}
