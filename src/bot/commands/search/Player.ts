import { EMOJIS, TOWN_HALLS, HEROES, PLAYER_LEAGUES } from '../../util/Emojis';
import { COLLECTIONS, leagueId } from '../../util/Constants';
import { MessageEmbed, Util, Message } from 'discord.js';
import { Player } from 'clashofclans.js';
import { Command } from 'discord-akairo';
import moment from 'moment';
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
				content: 'Shows info about your in-game profile.',
				usage: '<playerTag>',
				examples: ['#9Q92C8R20']
			},
			args: [
				{
					id: 'data',
					type: (msg, tag) => this.client.resolver.resolvePlayer(msg, tag)
				}
			]
		});
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
			? `**Clan Name**\n${EMOJIS.CLAN} [${data.clan.name} (${data.clan.tag})](${this.clanURL(data.clan.tag)})\n**Clan Role**\n ${EMOJIS.USER_BLUE} ${roles[data.role!]}\n`
			: '';

		const weaponLevel = data.townHallWeaponLevel ? weaponLevels[data.townHallWeaponLevel] : '';
		const embed = new MessageEmbed()
			.setColor(this.client.embed(message))
			.setTitle(`${Util.escapeMarkdown(data.name)} (${data.tag})`)
			.setURL(`https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${encodeURIComponent(data.tag)}`)
			.setThumbnail(
				data.league
					? data.league.iconUrls.small
					: `https://cdn.clashperk.com/assets/townhalls/${data.townHallLevel}.png`
			)
			.setDescription([
				`${TOWN_HALLS[data.townHallLevel]} **${data.townHallLevel}${weaponLevel}** ${EMOJIS.EXP} **${data.expLevel}** ${EMOJIS.TROPHY} **${data.trophies}** ${EMOJIS.WAR_STAR} **${data.warStars}**`
			]);
		embed.addField('**Season Stats**', [
			`**Donated**\n${EMOJIS.TROOPS_DONATE} ${data.donations} ${EMOJIS.UP_KEY}`,
			`**Received**\n${EMOJIS.TROOPS_DONATE} ${data.donationsReceived} ${EMOJIS.DOWN_KEY}`,
			`**Attacks Won**\n${EMOJIS.ATTACK_SWORD} ${data.attackWins}`,
			`**Defense Won**\n${EMOJIS.ATTACK_SWORD} ${data.defenseWins}`,
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
			`**Attacks Won**\n${EMOJIS.ATTACK_SWORD} ${data.achievements.find(d => d.name === 'Conqueror')!.value}`,
			`**Defense Won**\n${EMOJIS.SHIELD} ${data.achievements.find(d => d.name === 'Unbreakable')!.value}`,
			`**CWL War Stars**\n${EMOJIS.CWL_STAR} ${data.achievements.find(d => d.name === 'War League Legend')!.value}`,
			`**Clan Games Points**\n${EMOJIS.CLAN_GAMES} ${data.achievements.find(d => d.name === 'Games Champion')!.value}`,
			'\u200b\u2002'
		]);
		embed.addField('**Heroes**', [
			data.heroes.filter(hero => hero.village === 'home')
				.map(hero => `${HEROES[hero.name]} ${hero.level}`)
				.join(' ') || `${EMOJIS.CLAN_GAMES} None`
		]);

		const flag = await this.flag(message, data.tag);
		if (flag) {
			const user = await this.client.users.fetch(flag.user, false).catch(() => null);
			const offset = await this.offset(message);
			embed.addField('**Flag**', [
				`${flag.reason as string}`,
				`\`${user ? user.tag : 'Unknown#0000'} (${moment(flag.createdAt).utcOffset(offset).format('DD-MM-YYYY kk:mm')})\``
			]);
		}

		return message.util!.send({ embed });
	}

	private async flag(message: Message, tag: string) {
		const data = await this.client.db.collection(COLLECTIONS.FLAGGED_USERS)
			.findOne({ guild: message.guild!.id, tag });
		return data;
	}

	private clanURL(tag: string) {
		return `https://link.clashofclans.com/?action=OpenClanProfile&tag=${encodeURIComponent(tag)}`;
	}

	private async offset(message: Message) {
		const data = await this.client.db.collection(COLLECTIONS.FLAGGED_USERS).findOne({ user: message.author.id });
		const prefix = data?.timezone?.offset < 0 ? '-' : '+';
		const seconds = Math.abs(data?.timezone?.offset ?? 0);
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor(seconds % 3600 / 60);
		return `${prefix}${hours >= 1 ? `0${hours}`.slice(-2) : '00'}:${minutes >= 1 ? `0${minutes}`.slice(-2) : '00'}`;
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
}

