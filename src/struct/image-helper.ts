import { WAR_LEAGUE_MAP } from '@app/constants';
import moment from 'moment';
import { CWLRankCard } from '../helper/cwl.helper.js';

function formatNumber(num: number) {
  return `${num > 0 ? '+' : ''}${num.toFixed(0)}`;
}

export const createLegendGraph = async ({
  datasets,
  labels,
  data,
  season,
  seasonStart,
  seasonEnd,
  lastSeason,
  prevFinalTrophies
}: {
  datasets: any[];
  labels: Date[];
  data: {
    name: string;
    townHallLevel: number;
    trophies: number;
    clan?: {
      name: string;
      badgeUrls: {
        large: string;
      };
    };
  };
  season: any;
  seasonStart: Date;
  seasonEnd: Date;
  lastSeason?: any;
  prevFinalTrophies: number | string;
}) => {
  const arrayBuffer = await fetch(`${process.env.IMAGE_GEN_API_BASE_URL}/legends/graph`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      datasets,
      labels,
      name: data.name,
      avgNetGain: formatNumber(season.avgGain),
      avgOffense: formatNumber(season.avgOffense),
      avgDefense: formatNumber(season.avgDefense),
      prevAvgNetGain: lastSeason ? formatNumber(lastSeason.avgGain) : '',
      prevAvgOffense: lastSeason ? formatNumber(lastSeason.avgOffense) : '',
      prevAvgDefense: lastSeason ? formatNumber(lastSeason.avgDefense) : '',
      townHall: data.townHallLevel.toString(),
      prevFinalTrophies,
      prevSeason: lastSeason ? `${moment(lastSeason._id).format('MMM')}` : '',
      currentTrophies: data.trophies.toFixed(0),
      clanName: data.clan?.name,
      clanBadgeURL: data.clan?.badgeUrls.large,
      season: `${moment(season._id).format('MMMM YYYY')} (${moment(seasonStart).format('DD MMM')} - ${moment(seasonEnd).format('DD MMM')})`
    })
  }).then((res) => res.arrayBuffer());

  return {
    file: Buffer.from(arrayBuffer),
    name: 'legend-rank-card.jpeg' as const,
    attachmentKey: 'attachment://legend-rank-card.jpeg' as const
  };
};

export const getCWLSummaryImage = async ({
  ranks,
  activeRounds,
  leagueId,
  medals,
  rankIndex,
  season,
  totalRounds
}: {
  ranks: CWLRankCard[];
  rankIndex: number;
  season: string;
  medals: number;
  leagueId: number;
  activeRounds: number;
  totalRounds: number;
}) => {
  const arrayBuffer = await fetch(`${process.env.IMAGE_GEN_API_BASE_URL}/wars/cwl-ranks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ranks,
      rankIndex,
      season,
      medals,
      leagueName: WAR_LEAGUE_MAP[leagueId],
      rounds: `${activeRounds}/${totalRounds}`
    })
  }).then((res) => res.arrayBuffer());

  return {
    file: Buffer.from(arrayBuffer),
    name: 'clan-war-league-ranking.jpeg' as const,
    attachmentKey: 'attachment://clan-war-league-ranking.jpeg' as const
  };
};

export const createTrophyThresholdsGraph = async ({ datasets, labels, title }: { datasets: any[]; labels: string[]; title: string }) => {
  const arrayBuffer = await fetch(`${process.env.IMAGE_GEN_API_BASE_URL!}/clans/activity`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      labels: labels,
      datasets,
      offset: 0,
      unit: 'day',
      title
    })
  }).then((res) => res.arrayBuffer());

  return {
    file: Buffer.from(arrayBuffer),
    name: 'legend-ranking-threshold.jpeg' as const,
    attachmentKey: 'attachment://legend-ranking-threshold.jpeg' as const
  };
};
