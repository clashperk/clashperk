import { CWL_LEAGUES, BLUE_EMOJI, TOWN_HALLS, EMOJIS } from '../../util/Emojis';
import { Command } from 'discord-akairo';
import { Clan } from 'clashofclans.js';
import { Message } from 'discord.js';

export default class ClanEmbedCommand extends Command {
	public constructor() {
		super('setup-simple-clanembed', {
			category: 'hidden',
			clientPermissions: ['EMBED_LINKS'],
			userPermissions: ['MANAGE_GUILD'],
			description: {
				content: 'Creates a live promotional embed for clans.',
				usage: '<clanTag>'
			},
			args: [
				{
					id: 'data',
					type: (msg, tag) => this.client.resolver.resolveClan(msg, tag)
				}
			]
		});
	}

	public async exec(message: Message, { data }: { data: Clan }) {
		if (!this.client.patrons.get(message)) {
			const embed = this.client.util.embed()
				.setImage('https://i.imgur.com/txkD6q7.png')
				.setDescription([
					'[Become a Patron](https://www.patreon.com/clashperk) to create Live auto updating Promotional Embed'
				]);
			return message.util!.send({ embed });
		}

		const fetched = await this.client.http.detailedClanMembers(data.memberList);
		const reduced = fetched.filter(res => res.ok).reduce((count, member) => {
			const townHall = member.townHallLevel;
			count[townHall] = (count[townHall] || 0) + 1;
			return count;
		}, {} as { [key: string]: number });

		const townHalls = Object.entries(reduced)
			.map(arr => ({ level: Number(arr[0]), total: arr[1] }))
			.sort((a, b) => b.level - a.level);

		const location = data.location
			? data.location.isCountry
				? `:flag_${data.location.countryCode.toLowerCase()}: ${data.location.name}`
				: `🌐 ${data.location.name}`
			: `${EMOJIS.WRONG} None`;

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setTitle(`${data.name} (${data.tag})`)
			.setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(data.tag)}`)
			.setThumbnail(data.badgeUrls.medium)
			.setDescription([
				`${EMOJIS.CLAN} **${data.clanLevel}** ${EMOJIS.USERS} **${data.members}** ${EMOJIS.TROPHY} **${data.clanPoints}** ${EMOJIS.VERSUS_TROPHY} **${data.clanVersusPoints}**`,
				'',
				data.description || ''
			])
			.addField('Clan Leader', [
				`${EMOJIS.OWNER} ${data.memberList.filter(m => m.role === 'leader').map(m => `${m.name}`)[0] || 'None'}`
			])
			.addField('Requirements', [
				`${EMOJIS.TOWNHALL} TH 10+`,
				'**Trophies Required**',
				`${EMOJIS.TROPHY} ${data.requiredTrophies}`,
				`**Location** \n${location}`
			])
			.addField('War Performance', [
				`${EMOJIS.OK} ${data.warWins} Won ${data.isWarLogPublic ? `${EMOJIS.WRONG} ${data.warLosses!} Lost ${EMOJIS.EMPTY} ${data.warTies!} Tied` : ''}`,
				'**War Frequency & Streak**',
				`${data.warFrequency.toLowerCase() === 'morethanonceperweek'
					? '🎟️ More Than Once Per Week'
					: `🎟️ ${data.warFrequency.toLowerCase().replace(/\b(\w)/g, char => char.toUpperCase())}`} ${'🏅'} ${data.warWinStreak}`,
				'**War League**', `${CWL_LEAGUES[data.warLeague?.name ?? ''] || EMOJIS.EMPTY} ${data.warLeague?.name ?? 'Unranked'}`
			])
			.addField('Town Halls', [
				townHalls.slice(0, 7).map(th => `${TOWN_HALLS[th.level]} ${BLUE_EMOJI[th.total]}\u200b`).join(' ')
			])
			.setFooter('Synced', this.client.user!.displayAvatarURL())
			.setTimestamp();
		return message.channel.send({ embed });
	}
}
