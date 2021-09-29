import { EMOJIS, TOWN_HALLS, HEROES, PLAYER_LEAGUES, SEIGE_MACHINES } from '../../util/Emojis';
import { MessageEmbed, Util, Message, User, MessageSelectMenu, MessageActionRow } from 'discord.js';
import { Collections, leagueId, STOP_REASONS } from '../../util/Constants';
import { Command, Argument } from 'discord-akairo';
import { Player, WarClan } from 'clashofclans.js';
import { Season } from '../../util/Util';
import ms from 'ms';

const roles: { [key: string]: string } = {
	member: 'Member',
	admin: 'Elder',
	coLeader: 'Co-Leader',
	leader: 'Leader'
};

const weaponLevels: { [key: string]: string } = {
	1: '¹',
	2: '²',
	3: '³',
	4: '⁴',
	5: '⁵'
};

export default class PlayerCommand extends Command {
	public constructor() {
		super('player', {
			aliases: ['player', 'p'],
			category: 'search',
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			description: {
				content: 'Player summary and some basic details.',
				usage: '<playerTag>',
				examples: ['#9Q92C8R20']
			},
			optionFlags: ['--tag', '--base']
		});
	}

	public *args(msg: Message): unknown {
		const base = yield {
			flag: '--base',
			unordered: true,
			type: Argument.range('integer', 1, 25),
			match: msg.interaction ? 'option' : 'phrase'
		};

		const data = yield {
			flag: '--tag',
			unordered: true,
			match: msg.interaction ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolvePlayer(msg, tag, base ?? 1)
		};

		return { data };
	}

	public async exec(message: Message, { data }: { data: Player & { user?: User } }) {
		const embed = (await this.embed(data)).setColor(this.client.embed(message));
		const msg = await message.util!.send({ embeds: [embed] });

		if (!data.user) return;
		const players = await this.client.links.getPlayers(data.user);
		if (!players.length) return;

		const options = players.map(op => ({
			description: op.tag,
			label: op.name, value: op.tag,
			emoji: TOWN_HALLS[op.townHallLevel]
		}));

		const customID = this.client.uuid(message.author.id);
		const menu = new MessageSelectMenu()
			.setCustomId(customID)
			.setPlaceholder('Select an account!')
			.addOptions(options);

		await msg.edit({ components: [new MessageActionRow({ components: [menu] })] });

		const collector = msg.createMessageComponentCollector({
			filter: action => [customID].includes(action.customId) && action.user.id === message.author.id,
			time: 5 * 60 * 1000
		});

		collector.on('collect', async action => {
			if (action.customId === customID && action.isSelectMenu()) {
				await action.deferUpdate();
				const data = players.find(en => en.tag === action.values[0])!;
				const embed = (await this.embed(data)).setColor(this.client.embed(message));
				await action.editReply({ embeds: [embed] });
			}
		});

		collector.on('end', async (_, reason) => {
			this.client.components.delete(customID);
			if (STOP_REASONS.includes(reason)) return;
			if (!msg.deleted) await msg.edit({ components: [] });
		});
	}

	private async embed(data: Player) {
		const aggregated = await this.client.db.collection(Collections.LAST_SEEN)
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
		const warStats = `${EMOJIS.CROSS_SWORD} ${war.total} ${EMOJIS.SWORD} ${war.attacks} ${EMOJIS.STAR} ${war.stars} ${EMOJIS.THREE_STARS} ${war.starTypes.filter(num => num === 3).length} ${EMOJIS.EMPTY_SWORD} ${war.of - war.attacks}`;
		const weaponLevel = data.townHallWeaponLevel ? weaponLevels[data.townHallWeaponLevel] : '';
		const embed = new MessageEmbed()
			.setTitle(`${Util.escapeMarkdown(data.name)} (${data.tag})`)
			.setURL(`https://link.clashofclans.com/en?action=OpenPlayerProfile&tag=${encodeURIComponent(data.tag)}`)
			.setThumbnail(
				data.league?.iconUrls.small ?? `https://cdn.clashperk.com/assets/townhalls/${data.townHallLevel}.png`
			)
			.setDescription([
				`${TOWN_HALLS[data.townHallLevel]} **${data.townHallLevel}${weaponLevel}** ${EMOJIS.EXP} **${data.expLevel}** ${EMOJIS.TROPHY} **${data.trophies}** ${EMOJIS.WAR_STAR} **${data.warStars}**`
			].join('\n'));
		embed.addField('**Season Stats**', [
			`**Donated**\n${EMOJIS.TROOPS_DONATE} ${data.donations} ${EMOJIS.UP_KEY}`,
			`**Received**\n${EMOJIS.TROOPS_DONATE} ${data.donationsReceived} ${EMOJIS.DOWN_KEY}`,
			`**Attacks Won**\n${EMOJIS.SWORD} ${data.attackWins}`,
			`**Defense Won**\n${EMOJIS.SHIELD} ${data.defenseWins}${war.total > 0 ? `\n**War Stats**\n${warStats}` : ''}`,
			'\u200b\u2002'
		].join('\n'));
		embed.addField('**Other Stats**', [
			`**Best Trophies**\n${PLAYER_LEAGUES[leagueId(data.bestTrophies)]} ${data.bestTrophies}`,
			`${clan}**Last Seen**\n${EMOJIS.CLOCK} ${lastSeen}`,
			'\u200b\u2002'
		].join('\n'));
		embed.addField('**Achievement Stats**', [
			'**Total Loots**',
			[
				`${EMOJIS.GOLD} ${this.format(data.achievements.find(d => d.name === 'Gold Grab')!.value)}`,
				`${EMOJIS.ELIXIER} ${this.format(data.achievements.find(d => d.name === 'Elixir Escapade')!.value)}`,
				`${EMOJIS.DARK_ELIXIR} ${this.format(data.achievements.find(d => d.name === 'Heroic Heist')!.value)}`
			].join(' '),
			`**Troops Donated**\n${EMOJIS.TROOPS_DONATE} ${data.achievements.find(d => d.name === 'Friend in Need')!.value}`,
			`**Spells Donated**\n${EMOJIS.SPELL_DONATE} ${data.achievements.find(d => d.name === 'Sharing is caring')!.value}`,
			`**Siege Donated**\n${SEIGE_MACHINES['Wall Wrecker']} ${data.achievements.find(d => d.name === 'Siege Sharer')!.value}`,
			`**Attacks Won**\n${EMOJIS.SWORD} ${data.achievements.find(d => d.name === 'Conqueror')!.value}`,
			`**Defense Won**\n${EMOJIS.SHIELD} ${data.achievements.find(d => d.name === 'Unbreakable')!.value}`,
			`**CWL War Stars**\n${EMOJIS.STAR} ${data.achievements.find(d => d.name === 'War League Legend')!.value}`,
			`**Clan Games Points**\n${EMOJIS.CLAN_GAMES} ${data.achievements.find(d => d.name === 'Games Champion')!.value}`,
			'\u200b\u2002'
		].join('\n'));
		embed.addField('**Heroes**', [
			data.heroes.filter(hero => hero.village === 'home')
				.map(hero => `${HEROES[hero.name]} ${hero.level}`)
				.join(' ') || `${EMOJIS.WRONG} None`
		].join('\n'));

		return embed;
	}

	private clanURL(tag: string) {
		return `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(tag)}`;
	}

	private format(num = 0) {
		// Nine Zeroes for Billions
		return Math.abs(num) >= 1.0e+9

			? `${(Math.abs(num) / 1.0e+9).toFixed(2)}B`
			// Six Zeroes for Millions
			: Math.abs(num) >= 1.0e+6

				? `${(Math.abs(num) / 1.0e+6).toFixed(2)}M`
				// Three Zeroes for Thousands
				: Math.abs(num) >= 1.0e+3

					? `${(Math.abs(num) / 1.0e+3).toFixed(2)}K`

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

		const wars = await this.client.db.collection(Collections.CLAN_WARS)
			.find({
				preparationStartTime: { $gte: Season.startTimestamp },
				$or: [{ 'clan.members.tag': tag }, { 'opponent.members.tag': tag, 'groupWar': true }],
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
					member.starTypes.push(...m.attacks.map(atk => atk.stars));
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

	private async getSeason(tag: string, clanTag: string) {
		const data = await this.client.db.collection(Collections.CLAN_MEMBERS)
			.findOne({ tag, season: Season.ID, clanTag });
		if (!data) return null;

		return {}; // TODO: Finish it
	}

	private getLastSeen(lastSeen: Date) {
		const timestamp = Date.now() - lastSeen.getTime();
		return timestamp <= (1 * 24 * 60 * 60 * 1000)
			? 'Today'
			: timestamp <= (2 * 24 * 60 * 60 * 1000)
				? 'Yesterday'
				: `${ms(timestamp, { 'long': true })} ago`;
	}
}

