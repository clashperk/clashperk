import { CommandInteraction, MessageActionRow, MessageButton, MessageEmbed } from 'discord.js';
import { Collections } from '../../util/Constants';
import { EMOJIS } from '../../util/Emojis';
import { Command } from '../../lib';
import { Clan } from 'clashofclans.js';
import { Util } from '../../util';

export default class LastSeenCommand extends Command {
	public constructor() {
		super('lastseen', {
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: ['Approximate last seen of all clan members.', '', '**[How does it work?](https://clashperk.com/faq)**']
			},
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, { tag }: { tag?: string }) {
		const clan = await this.client.resolver.resolveClan(interaction, tag);
		if (!clan) return;

		const allowed = await this.client.db
			.collection(Collections.CLAN_STORES)
			.countDocuments({ guild: interaction.guild.id, tag: clan.tag });
		if (!allowed && interaction.guild.id !== '509784317598105619') {
			return interaction.editReply({
				content: '**You must link this clan to a channel to use this command!**',
				files: ['https://cdn.discordapp.com/attachments/752914644779139242/852062721280311327/unknown.png']
			});
		}

		const enough = await this.client.db.collection(Collections.LAST_SEEN).countDocuments({ 'clan.tag': clan.tag });
		if (!enough) {
			return interaction.editReply(`Not enough data available for **${clan.name} (${clan.tag})**`);
		}

		const getTime = (ms?: number) => {
			if (!ms) return ''.padEnd(7, ' ');
			return Util.duration(ms + 1e3).padEnd(7, ' ');
		};

		const members = await this.aggregationQuery(clan);
		const embed = new MessageEmbed()
			.setColor(this.client.embed(interaction))
			.setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.medium })
			.setDescription(
				[
					'**[Last seen and last 24h activity scores](https://clashperk.com/faq)**',
					`\`\`\`\n\u200eLAST-ON 24H  NAME\n${members
						.map((m) => `${getTime(m.lastSeen)}  ${Math.min(m.count, 99).toString().padStart(2, ' ')}  ${m.name}`)
						.join('\n')}`,
					'```'
				].join('\n')
			)
			.setFooter({ text: `Members [${clan.members}/50]`, iconURL: interaction.user.displayAvatarURL() });

		const customID = this.client.uuid(interaction.user.id);
		const button = new MessageButton()
			.setStyle('SECONDARY')
			.setCustomId(customID)
			.setEmoji(EMOJIS.ACTIVITY)
			.setLabel('Show Activity Scores');

		const msg = await interaction.editReply({ embeds: [embed], components: [new MessageActionRow({ components: [button] })] });
		const collector = msg.createMessageComponentCollector({
			filter: (action) => action.customId === customID && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === customID) {
				collector.stop();
				const members = await this.aggregationQuery(clan, 30);

				members.sort((a, b) => b.count - a.count);
				embed.setDescription(
					[
						`Clan Member Activities (Last ${30} Days)`,
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
				return action.update({ embeds: [embed], components: [] });
			}
		});

		collector.on('end', async (_, reason) => {
			this.client.components.delete(customID);
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
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
