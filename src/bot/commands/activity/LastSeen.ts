import { Message, MessageActionRow, MessageButton } from 'discord.js';
import { Collections } from '../../util/Constants';
import { EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';
import { Clan } from 'clashofclans.js';
import { Util } from '../../util/Util';

export default class LastSeenCommand extends Command {
	public constructor() {
		super('lastseen', {
			aliases: ['lastseen', 'lastonline', 'lo', 'ls'],
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: [
					'Approximate last seen of all clan members.',
					'',
					'**[How does it work?](https://clashperk.com/faq)**'
				],
				usage: '<#clanTag>',
				examples: ['#8QU8J9LP']
			},
			optionFlags: ['--tag']
		});
	}

	public *args(msg: Message): unknown {
		const data = yield {
			flag: '--tag',
			match: msg.interaction ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolveClan(msg, tag)
		};

		return { data };
	}

	public async exec(message: Message, { data }: { data: Clan }) {
		const allowed = await this.client.db.collection(Collections.CLAN_STORES)
			.find({ guild: message.guild!.id, tag: data.tag })
			.count();
		if (!allowed && message.guild!.id !== '509784317598105619') {
			return message.util!.send(
				{
					content: '**You must link this clan to a channel to use this command!**',
					files: ['https://cdn.discordapp.com/attachments/752914644779139242/852062721280311327/unknown.png']
				}
			);
		}

		const enough = await this.client.db.collection(Collections.LAST_SEEN)
			.find({ 'clan.tag': data.tag })
			.count();
		if (!enough) {
			return message.util!.send([
				`Not enough data available for **${data.name} (${data.tag})**`
			].join('\n'));
		}

		const getTime = (ms?: number) => {
			if (!ms) return ''.padEnd(7, ' ');
			return Util.duration(ms + 1e3).padEnd(7, ' ');
		};

		const members = await this.aggregationQuery(data);
		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setAuthor({ name: `${data.name} (${data.tag})`, iconURL: data.badgeUrls.medium })
			.setDescription([
				'**[Last seen and last 24h activity scores](https://clashperk.com/faq)**',
				`\`\`\`\n\u200eLAST-ON 24H  NAME\n${members
					.map(m => `${getTime(m.lastSeen)}  ${Math.min(m.count, 99).toString().padStart(2, ' ')}  ${m.name}`)
					.join('\n')}`,
				'```'
			].join('\n'))
			.setFooter({ text: `Members [${data.members}/50]`, iconURL: message.author.displayAvatarURL() });

		const customID = this.client.uuid(message.author.id);
		const button = new MessageButton()
			.setStyle('SECONDARY')
			.setCustomId(customID)
			.setEmoji(EMOJIS.ACTIVITY)
			.setLabel('Show Activity Scores');

		const msg = await message.util!.send({ embeds: [embed], components: [new MessageActionRow({ components: [button] })] });
		const collector = msg.createMessageComponentCollector({
			filter: action => action.customId === customID && action.user.id === message.author.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async action => {
			if (action.customId === customID) {
				collector.stop();
				const members = await this.aggregationQuery(data, 30);

				members.sort((a, b) => b.count - a.count);
				embed.setDescription([
					`Clan Member Activities (Last ${30} Days)`,
					`\`\`\`\n\u200e${'TOTAL'.padStart(4, ' ')} AVG  ${'NAME'}\n${members
						.map(
							m => `${m.count.toString().padEnd(4, ' ')}  ${Math.floor(m.count / 30).toString().padStart(3, ' ')}  ${m.name}`
						)
						.join('\n')}`,
					'```'
				].join('\n'));
				return action.update({ embeds: [embed], components: [] });
			}
		});

		collector.on('end', async (_, reason) => {
			this.client.components.delete(customID);
			if (!/delete/i.test(reason)) await msg.edit({ components: [] });
		});
	}

	private filter(clan: Clan, db: any) {
		if (!db?.members) {
			return clan.memberList.map(m => ({ tag: m.tag, name: m.name, lastSeen: 0, count: 0 }));
		}

		const members = clan.memberList.map(m => {
			const data = db.members.find((d: any) => d.tag === m.tag);
			return {
				tag: m.tag,
				name: m.name,
				count: data ? Number(data.count) : 0,
				lastSeen: data ? new Date().getTime() - new Date(data.lastSeen).getTime() : 0
			};
		});

		members.sort((a, b) => a.lastSeen - b.lastSeen);
		return members.filter(m => m.lastSeen > 0).concat(members.filter(m => m.lastSeen === 0));
	}

	private async aggregationQuery(clan: Clan, days = 1) {
		const db = this.client.db.collection(Collections.LAST_SEEN);
		const collection = await db.aggregate([
			{
				$match: {
					// 'clan.tag': clan.tag,
					tag: { $in: [...clan.memberList.map(m => m.tag)] }
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
								$gte: [
									'$$en.entry', new Date(Date.now() - (days * 24 * 60 * 60 * 1000))
								]
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
		]).toArray();
		return this.filter(clan, collection[0]);
	}
}
