import { EmbedBuilder, CommandInteraction, SelectMenuBuilder, ActionRowBuilder, escapeMarkdown } from 'discord.js';
import { Player, WarClan } from 'clashofclans.js';
import ms from 'ms';
import { EMOJIS, TOWN_HALLS, HEROES, SIEGE_MACHINES } from '../../util/Emojis.js';
import { Collections } from '../../util/Constants.js';
import { Command } from '../../lib/index.js';
import { Season } from '../../util/index.js';
import { UserInfoModel } from '../../types/index.js';

const roles: Record<string, string> = {
	member: 'Member',
	admin: 'Elder',
	coLeader: 'Co-Leader',
	leader: 'Leader'
};

const weaponLevels: Record<string, string> = {
	1: '¹',
	2: '²',
	3: '³',
	4: '⁴',
	5: '⁵'
};

export default class PlayerCommand extends Command {
	public constructor() {
		super('player', {
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
		const menu = new SelectMenuBuilder().setCustomId(customID).setPlaceholder('Select an account!').addOptions(options);

		await interaction.editReply({ components: [new ActionRowBuilder<SelectMenuBuilder>({ components: [menu] })] });
		const collector = msg.createMessageComponentCollector({
			filter: (action) => [customID].includes(action.customId) && action.user.id === interaction.user.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async (action) => {
			if (action.customId === customID && action.isSelectMenu()) {
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
		const aggregated = await this.client.db
			.collection(Collections.LAST_SEEN)
			.aggregate([
				{
					$match: {
						tag: data.tag
					}
				},
				{
					$project: {
						tag: '$tag',
						lastSeen: '$lastSeen'
					}
				}
			])
			.next();

		const lastSeen = aggregated?.lastSeen ? this.getLastSeen(aggregated.lastSeen) : 'Unknown';
		const clan = data.clan
			? `**Clan Info**\n${EMOJIS.CLAN} [${data.clan.name}](${this.clanURL(data.clan.tag)}) (${roles[data.role!]})\n`
			: '';

		const war = await this.getWars(data.tag);
		const warStats = `${EMOJIS.CROSS_SWORD} ${war.total} ${EMOJIS.SWORD} ${war.attacks} ${EMOJIS.STAR} ${war.stars} ${
			EMOJIS.THREE_STARS
		} ${war.starTypes.filter((num) => num === 3).length} ${EMOJIS.EMPTY_SWORD} ${war.of - war.attacks}`;
		const weaponLevel = data.townHallWeaponLevel ? weaponLevels[data.townHallWeaponLevel] : '';
		const embed = new EmbedBuilder()
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
				name: '**Season Stats**',
				value: [
					`**Donated**\n${EMOJIS.TROOPS_DONATE} ${data.donations} ${EMOJIS.UP_KEY}`,
					`**Received**\n${EMOJIS.TROOPS_DONATE} ${data.donationsReceived} ${EMOJIS.DOWN_KEY}`,
					`**Attacks Won**\n${EMOJIS.SWORD} ${data.attackWins}`,
					`**Defense Won**\n${EMOJIS.SHIELD} ${data.defenseWins}${war.total > 0 ? `\n**War Stats**\n${warStats}` : ''}`,
					'\u200b\u2002'
				].join('\n')
			}
		]);
		embed.addFields([
			{
				name: '**Other Stats**',
				value: [
					`**Best Trophies**\n${EMOJIS.TROPHY} ${data.bestTrophies}`,
					`${clan}**Last Seen**\n${EMOJIS.CLOCK} ${lastSeen}`,
					'\u200b\u2002'
				].join('\n')
			}
		]);
		embed.addFields([
			{
				name: '**Achievement Stats**',
				value: [
					'**Total Loots**',
					[
						`${EMOJIS.GOLD} ${this.format(data.achievements.find((d) => d.name === 'Gold Grab')!.value)}`,
						`${EMOJIS.ELIXIR} ${this.format(data.achievements.find((d) => d.name === 'Elixir Escapade')!.value)}`,
						`${EMOJIS.DARK_ELIXIR} ${this.format(data.achievements.find((d) => d.name === 'Heroic Heist')!.value)}`
					].join(' '),
					`**Troops Donated**\n${EMOJIS.TROOPS_DONATE} ${data.achievements.find((d) => d.name === 'Friend in Need')!.value}`,
					`**Spells Donated**\n${EMOJIS.SPELL_DONATE} ${data.achievements.find((d) => d.name === 'Sharing is caring')!.value}`,
					`**Siege Donated**\n${SIEGE_MACHINES['Wall Wrecker']} ${
						data.achievements.find((d) => d.name === 'Siege Sharer')!.value
					}`,
					`**Attacks Won**\n${EMOJIS.SWORD} ${data.achievements.find((d) => d.name === 'Conqueror')!.value}`,
					`**Defense Won**\n${EMOJIS.SHIELD} ${data.achievements.find((d) => d.name === 'Unbreakable')!.value}`,
					`**CWL War Stars**\n${EMOJIS.STAR} ${data.achievements.find((d) => d.name === 'War League Legend')!.value}`,
					`**Clan Games Points**\n${EMOJIS.CLAN_GAMES} ${data.achievements.find((d) => d.name === 'Games Champion')!.value}`,
					`**Capital Gold Looted**\n${EMOJIS.CAPITAL_GOLD} ${
						data.achievements.find((d) => d.name === 'Aggressive Capitalism')?.value ?? 0
					}`,
					`**Capital Gold Contributed**\n${EMOJIS.CAPITAL_GOLD} ${
						data.achievements.find((d) => d.name === 'Most Valuable Clanmate')?.value ?? 0
					}`,
					'\u200b\u2002'
				].join('\n')
			}
		]);

		const heroes = data.heroes.filter((hero) => hero.village === 'home').map((hero) => `${HEROES[hero.name]} ${hero.level}`);
		embed.addFields([
			{ name: '**Heroes**', value: [`${heroes.length ? heroes.join(' ') : `${EMOJIS.WRONG} None`}`, '\u200b\u2002'].join('\n') }
		]);

		const user = await this.getLinkedUser(interaction, data.tag);
		if (user) {
			embed.addFields([{ name: '**Discord**', value: user.mention ?? `${EMOJIS.OK} Connected` }]);
		} else {
			embed.addFields([{ name: '**Discord**', value: `${EMOJIS.WRONG} Not Found` }]);
		}

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
