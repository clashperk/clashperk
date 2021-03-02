import { EMOJIS, TOWN_HALLS, HEROES, PLAYER_LEAGUES } from '../../util/Emojis';
import { COLLECTIONS, leagueId } from '../../util/Constants';
import { MessageEmbed, Util, Message } from 'discord.js';
import { Command, Argument } from 'discord-akairo';
import { ClanWarClan, Player } from 'clashofclans.js';
import { Collections, Season } from '@clashperk/node';
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

	public *args(msg: Message) {
		const base = yield {
			flag: '--base',
			unordered: true,
			type: Argument.range('integer', 1, 25),
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase'
		};

		const data = yield {
			flag: '--tag',
			unordered: true,
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolvePlayer(msg, tag, base ?? 1)
		};

		return { data };
	}

	public async exec(message: Message, { data }: { data: Player }) {
		const collection = await this.client.db.collection(COLLECTIONS.LAST_ONLINES)
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
			.toArray();

		const lastSeen = collection[0]?.lastSeen
			? `${ms(new Date().getTime() - new Date(collection[0]?.lastSeen).getTime(), { 'long': true })} ago`
			: 'Unknown';
		const clan = data.clan
			? `**Clan Info**\n${EMOJIS.CLAN} [${data.clan.name}](${this.clanURL(data.clan.tag)}) (${roles[data.role!]})\n`
			: '';

		const war = await this.getWars(data.tag);
		const warStats = `${EMOJIS.CROSS_SWORD} ${war.total} ${EMOJIS.SWORD} ${war.attacks} ${EMOJIS.STAR} ${war.stars} ${EMOJIS.THREE_STARS} ${war.starTypes.filter(num => num === 3).length} ${EMOJIS.EMPTY_SWORD} ${war.of - war.attacks}`;
		const weaponLevel = data.townHallWeaponLevel ? weaponLevels[data.townHallWeaponLevel] : '';
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setTitle(`${Util.escapeMarkdown(data.name)} (${data.tag})`)
			.setURL(`https://link.clashofclans.com/en?action=OpenPlayerProfile&tag=${encodeURIComponent(data.tag)}`)
			.setThumbnail(
				data.league?.iconUrls.small ?? `https://cdn.clashperk.com/assets/townhalls/${data.townHallLevel}.png`
			)
			.setDescription([
				`${TOWN_HALLS[data.townHallLevel]} **${data.townHallLevel}${weaponLevel}** ${EMOJIS.EXP} **${data.expLevel}** ${EMOJIS.TROPHY} **${data.trophies}** ${EMOJIS.WAR_STAR} **${data.warStars}**`
			]);
		embed.addField('**Season Stats**', [
			`**Donated**\n${EMOJIS.TROOPS_DONATE} ${data.donations} ${EMOJIS.UP_KEY}`,
			`**Received**\n${EMOJIS.TROOPS_DONATE} ${data.donationsReceived} ${EMOJIS.DOWN_KEY}`,
			`**Attacks Won**\n${EMOJIS.SWORD} ${data.attackWins}`,
			`**Defense Won**\n${EMOJIS.SHIELD} ${data.defenseWins}${war.total > 0 ? `\n**War Stats**\n${warStats}` : ''}`,
			'\u200b\u2002'
		]);
		embed.addField('**Other Stats**', [
			`**Best Trophies**\n${PLAYER_LEAGUES[leagueId(data.bestTrophies)]} ${data.bestTrophies}`,
			`${clan}**Last Seen**\n${EMOJIS.CLOCK} ${lastSeen}`,
			'\u200b\u2002'
		]);
		embed.addField('**Achievement Stats**', [
			'**Total Loots**',
			[
				`${EMOJIS.GOLD} ${this.format(data.achievements.find(d => d.name === 'Gold Grab')!.value)}`,
				`${EMOJIS.ELIXIER} ${this.format(data.achievements.find(d => d.name === 'Elixir Escapade')!.value)}`,
				`${EMOJIS.DARK_ELIXIR} ${this.format(data.achievements.find(d => d.name === 'Heroic Heist')!.value)}`
			].join(' '),
			`**Troops Donated**\n${EMOJIS.TROOPS_DONATE} ${data.achievements.find(d => d.name === 'Friend in Need')!.value}`,
			`**Spells Donated**\n${EMOJIS.SPELL_DONATE} ${data.achievements.find(d => d.name === 'Sharing is caring')!.value}`,
			`**Attacks Won**\n${EMOJIS.SWORD} ${data.achievements.find(d => d.name === 'Conqueror')!.value}`,
			`**Defense Won**\n${EMOJIS.SHIELD} ${data.achievements.find(d => d.name === 'Unbreakable')!.value}`,
			`**CWL War Stars**\n${EMOJIS.STAR} ${data.achievements.find(d => d.name === 'War League Legend')!.value}`,
			`**Clan Games Points**\n${EMOJIS.CLAN_GAMES} ${data.achievements.find(d => d.name === 'Games Champion')!.value}`,
			'\u200b\u2002'
		]);
		embed.addField('**Heroes**', [
			data.heroes.filter(hero => hero.village === 'home')
				.map(hero => `${HEROES[hero.name]} ${hero.level}`)
				.join(' ') || `${EMOJIS.WRONG} None`
		]);

		return message.util!.send({ embed });
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
			const clan: ClanWarClan = data.clan.members.find((m: any) => m.tag === tag) ? data.clan : data.opponent;
			member.total += 1;
			for (const m of clan.members) {
				if (m.tag !== tag) continue;
				member.of += data.groupWar ? 1 : 2;

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
}

