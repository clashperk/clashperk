import { CommandInteraction, ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } from 'discord.js';
import { Clan } from 'clashofclans.js';
import { Collections } from '../../util/Constants.js';
import { EMOJIS } from '../../util/Emojis.js';
import { Command } from '../../lib/index.js';
import { Util } from '../../util/index.js';

export default class LastSeenCommand extends Command {
	public constructor() {
		super('lastseen', {
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			description: {
				content: ['Approximate last seen of all clan members.', '', '**[How does it work?](https://clashperk.com/faq)**']
			},
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, { tag, score }: { tag?: string; score?: boolean }) {
		const clan = await this.client.resolver.resolveClan(interaction, tag);
		if (!clan) return;

		const allowed = await this.client.db
			.collection(Collections.CLAN_STORES)
			.countDocuments({ guild: interaction.guild.id, tag: clan.tag });
		if (!allowed && interaction.guild.id !== '509784317598105619') {
			return interaction.editReply(
				this.i18n('common.guild_unauthorized', { lng: interaction.locale, clan: `${clan.name} (${clan.tag})` })
			);
		}

		const enough = await this.client.db.collection(Collections.LAST_SEEN).countDocuments({ 'clan.tag': clan.tag });
		if (!enough) {
			return interaction.editReply(this.i18n('common.no_clan_data', { lng: interaction.locale, clan: `${clan.name} (${clan.tag})` }));
		}

		const getTime = (ms?: number) => {
			if (!ms) return ''.padEnd(7, ' ');
			return Util.duration(ms + 1e3).padEnd(7, ' ');
		};

		const members = await this.aggregationQuery(clan, score ? 30 : 1);
		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.medium });
		if (score) {
			members.sort((a, b) => b.count - a.count);
			embed.setDescription(
				[
					this.i18n('command.lastseen.title_activity', { lng: interaction.locale }),
					`\`\`\`\n\u200e${'TOTAL'.padStart(4, ' ')} AVG  ${'NAME'}\n${members
						.map(
							(m) =>
								`${m.count.toString().padEnd(4, ' ')}  ${Math.floor(m.count / 30)
									.toString()
									.padStart(3, ' ')}  ${m.name}`
						)
						.join('\n')}`,
					'```'
				].join('\n')
			);
		} else {
			embed.setDescription(
				[
					`**[${this.i18n('command.lastseen.title_lastseen', { lng: interaction.locale })}](https://clashperk.com/faq)**`,
					`\`\`\`\n\u200eLAST-ON 24H  NAME\n${members
						.map((m) => `${getTime(m.lastSeen)}  ${Math.min(m.count, 99).toString().padStart(2, ' ')}  ${m.name}`)
						.join('\n')}`,
					'```'
				].join('\n')
			);
		}
		if (interaction.webhook.id === interaction.applicationId) {
			embed.setFooter({ text: `Members [${clan.members}/50]`, iconURL: interaction.user.displayAvatarURL() });
		} else {
			embed.setFooter({ text: `Synced [${members.length}/${clan.members}]` });
			embed.setTimestamp();
		}

		const row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(
				new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setCustomId(JSON.stringify({ cmd: this.id, _: 0, tag: clan.tag }))
					.setEmoji(EMOJIS.REFRESH)
			)
			.addComponents(
				new ButtonBuilder()
					.setStyle(ButtonStyle.Primary)
					.setCustomId(JSON.stringify({ cmd: this.id, tag: clan.tag, score: !score }))
					.setLabel(score ? 'Last Seen' : 'Scoreboard')
			);

		return interaction.editReply({ embeds: [embed], components: [row] });
	}

	private filter(clan: Clan, db: any) {
		if (!db?.members) {
			return clan.memberList.map((m) => ({ tag: m.tag, name: m.name, lastSeen: 0, count: 0 }));
		}

		const members = clan.memberList.map((m) => {
			const clan = db.members.find((d: any) => d.tag === m.tag);
			return {
				tag: m.tag,
				name: m.name,
				count: clan ? Number(clan.count) : 0,
				lastSeen: clan ? new Date().getTime() - new Date(clan.lastSeen).getTime() : 0
			};
		});

		members.sort((a, b) => a.lastSeen - b.lastSeen);
		return members.filter((m) => m.lastSeen > 0).concat(members.filter((m) => m.lastSeen === 0));
	}

	private async aggregationQuery(clan: Clan, days = 1) {
		const db = this.client.db.collection(Collections.LAST_SEEN);
		const collection = await db
			.aggregate([
				{
					$match: {
						// 'clan.tag': clan.tag,
						tag: { $in: [...clan.memberList.map((m) => m.tag)] }
					}
				},
				{
					$match: {
						'clan.tag': clan.tag
					}
				},
				{
					$project: {
						tag: '$tag',
						clan: '$clan',
						lastSeen: '$lastSeen',
						entries: {
							$filter: {
								input: '$entries',
								as: 'en',
								cond: {
									$gte: ['$$en.entry', new Date(Date.now() - days * 24 * 60 * 60 * 1000)]
								}
							}
						}
					}
				},
				{
					$project: {
						tag: '$tag',
						clan: '$clan',
						lastSeen: '$lastSeen',
						count: {
							$sum: '$entries.count'
						}
					}
				},
				{
					$group: {
						_id: null,
						members: {
							$addToSet: {
								count: '$count',
								tag: '$tag',
								lastSeen: '$lastSeen'
							}
						}
					}
				}
			])
			.toArray();
		return this.filter(clan, collection[0]);
	}
}
