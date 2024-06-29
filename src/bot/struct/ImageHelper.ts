// import type { LegendAttacksAggregated } from '../commands/legend/LegendDays.js';

// function formatNumber(num: number) {
//   return `${num > 0 ? '+' : ''}${num.toFixed(0)}`;
// }

// const createLegendGraph = async (params: {
//   datasets: LegendAttacksAggregated[];
//   labels: Date[];
//   name: string;
//   avgNetGain: number;
//   avgOffense: number;
//   avgDefense: number;
//   townHallLevel: number;
// }) => {
//   await fetch(`${process.env.ASSET_API_BACKEND!}/legends/graph`, {
//     method: 'PUT',

//     headers: {
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify({
//       datasets: params.datasets.slice(0, 2),
//       labels: params,
//       name: params.name,
//       avgNetGain: formatNumber(params.avgNetGain),
//       avgOffense: formatNumber(params.avgOffense),
//       avgDefense: formatNumber(params.avgDefense),
//       prevAvgNetGain: prevSeason ? formatNumber(prevSeason.avgGain) : '',
//       prevAvgOffense: prevSeason ? formatNumber(prevSeason.avgOffense) : '',
//       prevAvgDefense: prevSeason ? formatNumber(prevSeason.avgDefense) : '',
//       townHall: data.townHallLevel.toString(),
//       prevFinalTrophies,
//       prevSeason: prevSeason ? `${moment(prevSeason._id).format('MMM')}` : '',
//       currentTrophies: data.trophies.toFixed(0),
//       clanName: data.clan?.name,
//       clanBadgeURL: data.clan?.badgeUrls.large,
//       season: `${moment(season._id).format('MMMM YYYY')} (${moment(seasonStart).format('DD MMM')} - ${moment(seasonEnd).format('DD MMM')})`
//     })
//   }).then((res) => res.json());
// };
