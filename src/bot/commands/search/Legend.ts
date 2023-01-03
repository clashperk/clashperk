import {
	EmbedBuilder,
	CommandInteraction,
	StringSelectMenuBuilder,
	ActionRowBuilder,
	escapeMarkdown,
	ComponentType,
	time
} from 'discord.js';
import { Player, WarClan } from 'clashofclans.js';
import ms from 'ms';
import { EMOJIS, TOWN_HALLS } from '../../util/Emojis.js';
import { Collections } from '../../util/Constants.js';
import { Command } from '../../lib/index.js';
import { Season } from '../../util/index.js';
import { UserInfoModel } from '../../types/index.js';

const weaponLevels: Record<string, string> = {
	1: '¹',
	2: '²',
	3: '³',
	4: '⁴',
	5: '⁵'
};

export default class LegendLogsCommand extends Command {
	public constructor() {
		super('legend-logs', {
			category: 'search',
			channel: 'guild',
			clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
			description: {
				content: 'Player summary and some basic details.'
			},
			defer: true
		});
	}

	public async getPlayers(userId: string) {
		const data = await this.client.db.collection<UserInfoModel>(Collections.LINKED_PLAYERS).findOne({ user: userId });
		const others = await this.client.http.getPlayerTags(userId);

		const playerTagSet = new Set([...(data?.entries ?? []).map((en) => en.tag), ...others.map((tag) => tag)]);

		return (
			await Promise.all(
				Array.from(playerTagSet)
					.slice(0, 25)
					.map((tag) => this.client.http.player(tag))
			)
		).filter((res) => res.ok);
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string }) {
		const data = await this.client.resolver.resolvePlayer(interaction, args.tag, 1);
		if (!data) return;

		const embed = (await this.embed(interaction, data)).setColor(this.client.embed(interaction));
		const msg = await interaction.editReply({ embeds: [embed] });

		if (!data.user) return;
		const players = await this.getPlayers(data.user.id);
		if (!players.length) return;

		const options = players.map((op) => ({
			description: op.tag,
			label: op.name,
			value: op.tag,
			emoji: TOWN_HALLS[op.townHallLevel]
		}));

		const customID = this.client.uuid(interaction.user.id);
		const menu = new StringSelectMenuBuilder().setCustomId(customID).setPlaceholder('Select an account!').addOptions(options);

		await interaction.editReply({ components: [new ActionRowBuilder<StringSelectMenuBuilder>({ components: [menu] })] });
		const collector = msg.createMessageComponentCollector<ComponentType.Button | ComponentType.StringSelect>({
			filter: (action) => [customID].includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === customID && action.isStringSelectMenu()) {
				await action.deferUpdate();
				const data = players.find((en) => en.tag === action.values[0])!;
				const embed = (await this.embed(interaction, data)).setColor(this.client.embed(interaction));
				await action.editReply({ embeds: [embed] });
			}
		});

		collector.on('end', async (_, reason) => {
			this.client.components.delete(customID);
			if (!/delete/i.test(reason)) await interaction.editReply({ components: [] });
		});
	}

	private async embed(interaction: CommandInteraction<'cached'>, data: Player) {
		const legend = (await this.client.redis.json.get(`LP${data.tag}`)) as {
			name: string;
			tag: string;
			logs: { start: number; end: number; timestamp: number; inc: number }[];
		} | null;

		const weaponLevel = data.townHallWeaponLevel ? weaponLevels[data.townHallWeaponLevel] : '';
		const embed = new EmbedBuilder()
			.setColor(this.client.embed(interaction))
			.setTitle(`${escapeMarkdown(data.name)} (${data.tag})`)
			.setURL(`https://link.clashofclans.com/en?action=OpenPlayerProfile&tag=${encodeURIComponent(data.tag)}`)
			.setThumbnail(data.league?.iconUrls.small ?? `https://cdn.clashperk.com/assets/townhalls/${data.townHallLevel}.png`)
			.setDescription(
				[
					`${TOWN_HALLS[data.townHallLevel]} **${data.townHallLevel}${weaponLevel}** ${EMOJIS.EXP} **${data.expLevel}** ${
						EMOJIS.TROPHY
					} **${data.trophies}** ${EMOJIS.WAR_STAR} **${data.warStars}**`
				].join('\n')
			);
		embed.addFields([
			{
				name: '**Attacks**',
				value: legend
					? [
							...legend.logs
								.filter((m) => m.inc > 0)
								.map((m) => `\` +${m.inc.toString().padStart(2, ' ')} \` ${time(new Date(m.timestamp), 'R')}`),
							'\u200b'
					  ].join('\n')
					: 'No data found.'
			}
		]);
		embed.addFields([
			{
				name: '**Defenses**',
				value: legend
					? [
							...legend.logs
								.filter((m) => m.inc < 0)
								.map((m) => `\` ${m.inc.toString().padStart(2, ' ')} \` ${time(new Date(m.timestamp), 'R')}`),
							'\u200b'
					  ].join('\n')
					: 'No data found.'
			}
		]);
		return embed;
	}

	private clanURL(tag: string) {
		return `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(tag)}`;
	}

	private format(num = 0) {
		// Nine Zeroes for Billions
		return Math.abs(num) >= 1.0e9
			? `${(Math.abs(num) / 1.0e9).toFixed(2)}B`
			: // Six Zeroes for Millions
			Math.abs(num) >= 1.0e6
			? `${(Math.abs(num) / 1.0e6).toFixed(2)}M`
			: // Three Zeroes for Thousands
			Math.abs(num) >= 1.0e3
			? `${(Math.abs(num) / 1.0e3).toFixed(2)}K`
			: Math.abs(num).toFixed(2);
	}

	private async getWars(tag: string) {
		const member = {
			tag,
			total: 0,
			of: 0,
			attacks: 0,
			stars: 0,
			dest: 0,
			defStars: 0,
			defDestruction: 0,
			starTypes: [] as number[],
			defCount: 0
		};

		const wars = await this.client.db
			.collection(Collections.CLAN_WARS)
			.find({
				preparationStartTime: { $gte: Season.startTimestamp },
				$or: [{ 'clan.members.tag': tag }, { 'opponent.members.tag': tag }],
				state: { $in: ['inWar', 'warEnded'] }
			})
			.sort({ preparationStartTime: -1 })
			.toArray();

		for (const data of wars) {
			const clan: WarClan = data.clan.members.find((m: any) => m.tag === tag) ? data.clan : data.opponent;
			member.total += 1;
			for (const m of clan.members) {
				if (m.tag !== tag) continue;
				member.of += data.attacksPerMember;

				if (m.attacks) {
					member.attacks += m.attacks.length;
					member.stars += m.attacks.reduce((prev, atk) => prev + atk.stars, 0);
					member.dest += m.attacks.reduce((prev, atk) => prev + atk.destructionPercentage, 0);
					member.starTypes.push(...m.attacks.map((atk) => atk.stars));
				}

				if (m.bestOpponentAttack) {
					member.defStars += m.bestOpponentAttack.stars;
					member.defDestruction += m.bestOpponentAttack.destructionPercentage;
					member.defCount += 1;
				}
			}
		}

		return member;
	}

	private getLastSeen(lastSeen: Date) {
		const timestamp = Date.now() - lastSeen.getTime();
		return timestamp <= 1 * 24 * 60 * 60 * 1000
			? 'Today'
			: timestamp <= 2 * 24 * 60 * 60 * 1000
			? 'Yesterday'
			: `${ms(timestamp, { long: true })} ago`;
	}

	private async getLinkedUser(interaction: CommandInteraction<'cached'>, tag: string) {
		const data = await Promise.any([this.getLinkedFromDb(tag), this.client.http.getLinkedUser(tag)]);
		if (!data) return null;

		const user = await interaction.guild.members.fetch(data.user).catch(() => null);
		return { mention: user?.toString() ?? null, userId: data.user };
	}

	private async getLinkedFromDb(tag: string) {
		const data = await this.client.db.collection<UserInfoModel>(Collections.LINKED_PLAYERS).findOne({ 'entries.tag': tag });
		if (!data) return Promise.reject(0);
		return data;
	}
}
