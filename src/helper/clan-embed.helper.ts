import { Collections, UNRANKED_CAPITAL_LEAGUE_ID } from '@app/constants';
import { APIClan } from 'clashofclans.js';
import { EmbedBuilder } from 'discord.js';
import { container } from 'tsyringe';
import { Client } from '../struct/client.js';
import { ClanEmbedFields } from '../util/command.options.js';
import { CAPITAL_LEAGUES, CWL_LEAGUES, EMOJIS, ORANGE_NUMBERS, TOWN_HALLS } from '../util/emojis.js';

export const clanEmbedMaker = async (
  clan: APIClan,
  {
    description,
    accepts,
    color,
    bannerImage,
    fields
  }: {
    description?: string;
    accepts?: string;
    color?: number | null;
    bannerImage?: string;
    isDryRun?: boolean;
    fields?: string[];
  }
) => {
  if (!fields || fields?.includes('*')) fields = Object.values(ClanEmbedFields);

  const client = container.resolve(Client);
  const reduced = clan.memberList.reduce<{ [key: string]: number }>((count, member) => {
    const townHall = member.townHallLevel;
    count[townHall] = (count[townHall] || 0) + 1;
    return count;
  }, {});

  const townHalls = Object.entries(reduced)
    .map(([level, total]) => ({ level: Number(level), total }))
    .sort((a, b) => b.level - a.level);

  const capitalHall = clan.clanCapital.capitalHallLevel ? ` ${EMOJIS.CAPITAL_HALL} **${clan.clanCapital.capitalHallLevel}**` : '';

  const embed = new EmbedBuilder()
    .setTitle(`${clan.name} (${clan.tag})`)
    .setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(clan.tag)}`)
    .setThumbnail(clan.badgeUrls.medium)
    .setDescription(
      [
        `${EMOJIS.CLAN} **${clan.clanLevel}**${capitalHall} ${EMOJIS.USERS} **${clan.members}** ${EMOJIS.TROPHY} **${clan.clanPoints}** ${EMOJIS.BB_TROPHY} **${clan.clanBuilderBasePoints}**`,
        '',
        description?.toLowerCase() === 'auto' ? clan.description : description ?? ''
      ].join('\n')
    );

  if (color) embed.setColor(color);
  if (bannerImage) embed.setImage(bannerImage);

  const leaders = clan.memberList.filter((m) => m.role === 'leader');
  if (leaders.length && fields?.includes(ClanEmbedFields.CLAN_LEADER)) {
    const users = await client.db
      .collection(Collections.PLAYER_LINKS)
      .find({ tag: { $in: leaders.map(({ tag }) => tag) } })
      .toArray();

    embed.addFields([
      {
        name: 'Clan Leader',
        value: leaders
          .map((leader) => {
            const user = users.find((u) => u.tag === leader.tag);
            return user ? `${EMOJIS.OWNER} <@${user.userId}> (${leader.name})` : `${EMOJIS.OWNER} ${leader.name}`;
          })
          .join('\n')
      }
    ]);
  }

  if (fields?.includes(ClanEmbedFields.REQUIREMENTS)) {
    embed.addFields({
      name: 'Requirements',
      value: `${EMOJIS.TOWN_HALL} ${
        !accepts || accepts?.toLowerCase() === 'auto'
          ? clan.requiredTownhallLevel
            ? `TH ${clan.requiredTownhallLevel}+`
            : 'Any'
          : accepts ?? 'Any'
      }`
    });
  }

  if (fields?.includes(ClanEmbedFields.TROPHIES_REQUIRED)) {
    embed.addFields({
      name: 'Trophies Required',
      value: `${EMOJIS.TROPHY} ${clan.requiredTrophies}${
        clan.requiredBuilderBaseTrophies ? ` ${EMOJIS.BB_TROPHY} ${clan.requiredBuilderBaseTrophies}` : ''
      }`
    });
  }

  if (fields?.includes(ClanEmbedFields.LOCATION) && clan.location) {
    const location = clan.location
      ? clan.location.isCountry
        ? `:flag_${clan.location.countryCode!.toLowerCase()}: ${clan.location.name}`
        : `🌐 ${clan.location.name}`
      : `${EMOJIS.WRONG} None`;

    embed.addFields({
      name: 'Location',
      value: `${location}`
    });
  }

  if (fields?.includes(ClanEmbedFields.WAR_PERFORMANCE)) {
    embed.addFields({
      name: 'War Performance',
      value: `${EMOJIS.OK} ${clan.warWins} Won${
        clan.isWarLogPublic ? ` ${EMOJIS.WRONG} ${clan.warLosses!} Lost ${EMOJIS.EMPTY} ${clan.warTies!} Tied` : ''
      } ${clan.warWinStreak > 0 ? `🏅 ${clan.warWinStreak} Win Streak` : ''}`
    });
  }

  if (!['unknown', 'never'].includes(clan.warFrequency) && fields?.includes(ClanEmbedFields.WAR_FREQUENCY)) {
    embed.addFields({
      name: 'War Frequency',
      value: `${
        clan.warFrequency.toLowerCase() === 'morethanonceperweek'
          ? '🎟️ More Than Once Per Week'
          : `🎟️ ${clan.warFrequency.toLowerCase().replace(/\b(\w)/g, (char) => char.toUpperCase())}`
      }`
    });
  }

  if (fields?.includes(ClanEmbedFields.CLAN_WAR_LEAGUE)) {
    embed.addFields({
      name: 'Clan War League',
      value: `${CWL_LEAGUES[clan.warLeague?.name ?? 'Unranked']} ${clan.warLeague?.name ?? 'Unranked'}`
    });
  }

  if (fields?.includes(ClanEmbedFields.CLAN_CAPITAL_LEAGUE)) {
    embed.addFields({
      name: 'Clan Capital League',
      value: `${CAPITAL_LEAGUES[clan.capitalLeague?.id ?? UNRANKED_CAPITAL_LEAGUE_ID]} ${clan.capitalLeague?.name ?? 'Unranked'} ${
        EMOJIS.CAPITAL_TROPHY
      } ${clan.clanCapitalPoints || 0}`
    });
  }

  if (townHalls.length && fields?.includes(ClanEmbedFields.TOWN_HALLS)) {
    embed.addFields([
      {
        name: 'Town Halls',
        value: [
          townHalls
            .slice(0, 7)
            .map((th) => `${TOWN_HALLS[th.level]} ${ORANGE_NUMBERS[th.total]}\u200b`)
            .join(' ')
        ].join('\n')
      }
    ]);
  }

  embed.setFooter({ text: 'Synced' });
  embed.setTimestamp();
  return embed;
};
