import { EMOJIS, CWL_LEAGUES, CLAN_LABELS } from '../../util/Emojis';
import { MessageEmbed, Util, Message } from 'discord.js';
import { Command } from 'discord-akairo';
import { Clan } from 'clashofclans.js';

const clanTypes: { [key: string]: string } = {
	inviteOnly: 'Invite Only',
	closed: 'Closed',
	open: 'Anybody Can Join'
};

export default class ClanCommand extends Command {
	public constructor() {
		super('clan', {
			aliases: ['clan', 'myclan', 'c'],
			category: 'search',
			description: {
				content: 'Shows some basic info about your clan.',
				usage: '<clanTag>',
				examples: ['#8QU8J9LP', '8QU8J9LP']
			},
			clientPermissions: ['EMBED_LINKS', 'USE_EXTERNAL_EMOJIS'],
			optionFlags: ['--tag']
		});
	}

	public *args(msg: Message): unknown {
		const data = yield {
			flag: '--tag',
			match: msg.hasOwnProperty('token') ? 'option' : 'phrase',
			type: (msg: Message, tag: string) => this.client.resolver.resolveClan(msg, tag)
		};

		return { data };
	}

	private async clanRank(tag: string, clanPoints: number) {
		if (clanPoints >= 50000) {
			const clanRank = await this.client.http.clanRanks('global').catch(() => null);
			if (!clanRank?.ok) return null;
			const clan = clanRank.items?.find((clan: any) => clan?.tag === tag);
			if (!clan) return null;

			return {
				rank: Number(clan.rank),
				gain: Number(clan.previousRank - clan.rank)
			};
		}
		return null;
	}

	public async exec(message: Message, { data }: { data: Clan }) {
		const embed = new MessageEmbed()
			.setTitle(`${Util.escapeMarkdown(data.name)} (${data.tag})`)
			.setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(data.tag)}`)
			.setColor(this.client.embed(message))
			.setThumbnail(data.badgeUrls.medium);

		embed.setDescription([
			data.description || 'No Description Available',
			'\u200b\u2002'
		]);

		const location = data.location
			? data.location.isCountry
				? `:flag_${data.location.countryCode.toLowerCase()}: ${data.location.name}`
				: `🌐 ${data.location.name}`
			: `${EMOJIS.WRONG} None`;

		const leader = data.memberList.find(m => m.role === 'leader');

		const rankInfo = await this.clanRank(data.tag, data.clanPoints);

		const rank = rankInfo
			? rankInfo.gain > 0
				? `\n**Global Rank**\n📈 #${rankInfo.rank} ${EMOJIS.UP_KEY} +${rankInfo.gain}`
				: `\n**Global Rank**\n📈 #${rankInfo.rank} ${EMOJIS.DOWN_KEY} ${rankInfo.gain}`
			: '';

		embed.addField('**General**', [
			'**Clan Level**',
			`${EMOJIS.CLAN} ${data.clanLevel}`,
			'**Members**',
			`${EMOJIS.USERS} ${data.members}`,
			'**Clan Points**',
			`${EMOJIS.TROPHY} ${data.clanPoints} ${EMOJIS.VERSUS_TROPHY} ${data.clanVersusPoints}`,
			'**Leader**',
			`${EMOJIS.OWNER} ${leader ? `${Util.escapeMarkdown(leader.name)}` : 'No Leader'}`,
			'**Location**',
			`${location}${rank}`,
			'\u200b\u2002'
		]);

		embed.addField('**Requirements**', [
			'**Trophies Required**',
			`${EMOJIS.TROPHY} ${data.requiredTrophies}`,
			'**Clan Type**',
			`⚙️ ${clanTypes[data.type]}`,
			'**Clan Labels**',
			`${data.labels.length ? data.labels.map(d => `${CLAN_LABELS[d.name]} ${d.name}`).join('\n') : `${EMOJIS.WRONG} None`}`,
			'\u200b\u2002'
		]);

		embed.addField('**War and League**', [
			'**War Log**',
			`${data.isWarLogPublic ? '🔓 Public' : '🔒 Private'}`,
			'**War Performance**',
			`${EMOJIS.OK} ${data.warWins} Won ${data.isWarLogPublic ? `${EMOJIS.WRONG} ${data.warLosses!} Lost ${EMOJIS.EMPTY} ${data.warTies!} Tied` : ''}`,
			'**Win Streak**',
			`${'🏅'} ${data.warWinStreak}`,
			'**War Frequency**',
			data.warFrequency.toLowerCase() === 'morethanonceperweek'
				? '🎟️ More Than Once Per Week'
				: `🎟️ ${data.warFrequency.toLowerCase().replace(/\b(\w)/g, char => char.toUpperCase())}`,
			'**War League**',
			`${CWL_LEAGUES[data.warLeague?.name ?? ''] || EMOJIS.EMPTY} ${data.warLeague?.name ?? 'Unranked'}`
		]);

		return message.util!.send({ embed });
	}
}
