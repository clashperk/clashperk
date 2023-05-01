import { CommandInteraction, EmbedBuilder, time } from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/index.js';
import { Season } from '../../util/index.js';

export default class GameEvents extends Command {
	public constructor() {
		super('events', {
			category: 'config',
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>) {
		const now = moment().toDate();

		const clanGamesStartTime = moment(Season.ID).startOf('month').add(21, 'days').add(8, 'hours').toDate();
		const clanGamesEndTime = moment(Season.ID)
			.startOf('month')
			.add(21 + 6, 'days')
			.add(8, 'hours')
			.toDate();

		const CWLStartTime =
			moment(now).date() >= 9
				? moment(now).startOf('month').add(1, 'month').add(8, 'hour').toDate()
				: moment(now).startOf('month').add(8, 'hours').toDate();
		const CWLSignupEndTime = moment(CWLStartTime).add(2, 'days').toDate();

		const seasonEndTime = moment(Season.endTimestamp).toDate();
		const { raidWeekEndTime, raidWeekStartTime } = this.getRaidWeek(now);

		const events = [
			{
				name: `Clan Games`,
				value: `${time(clanGamesStartTime, 'R')}\n${time(clanGamesStartTime, 'f')}`,
				timestamp: clanGamesStartTime.getTime(),
				visible: moment(now).isBefore(clanGamesStartTime) || moment(now).isAfter(clanGamesEndTime)
			},
			{
				name: 'Clan Games (Ending)',
				value: `${time(clanGamesEndTime, 'R')}\n${time(clanGamesEndTime, 'f')}`,
				timestamp: clanGamesEndTime.getTime(),
				visible: moment(now).isAfter(clanGamesStartTime) && moment(now).isBefore(clanGamesEndTime)
			},
			{
				name: `CWL`,
				value: `${time(CWLStartTime, 'R')}\n${time(CWLStartTime, 'f')}`,
				timestamp: CWLStartTime.getTime(),
				// visible: moment(now).isBefore(CWLStartTime) || moment(now).isAfter(CWLSignupEndTime),
				visible: moment(now).isBefore(CWLStartTime)
			},
			{
				name: 'CWL Signup (Ending)',
				value: `${time(CWLSignupEndTime, 'R')}\n${time(CWLSignupEndTime, 'f')}`,
				timestamp: CWLSignupEndTime.getTime(),
				visible: moment(now).isAfter(CWLStartTime) && moment(now).isBefore(CWLSignupEndTime)
			},
			{
				name: 'League Reset',
				value: `${time(seasonEndTime, 'R')}\n${time(seasonEndTime, 'f')}`,
				timestamp: seasonEndTime.getTime(),
				visible: true
			},
			{
				name: 'Raid Week',
				value: `${time(raidWeekStartTime, 'R')}\n${time(raidWeekStartTime, 'f')}`,
				timestamp: raidWeekStartTime.getTime(),
				visible: moment(now).isBefore(raidWeekStartTime) || moment(now).isAfter(raidWeekEndTime)
			},
			{
				name: 'Raid Week (Ending)',
				value: `${time(raidWeekEndTime, 'R')}\n${time(raidWeekEndTime, 'f')}`,
				timestamp: raidWeekEndTime.getTime(),
				visible: moment(now).isAfter(raidWeekStartTime) && moment(now).isBefore(raidWeekEndTime)
			}
		];

		events.sort((a, b) => a.timestamp - b.timestamp);
		const visibleEvents = events.filter((event) => event.visible);

		const embed = new EmbedBuilder()
			.setAuthor({ name: 'Next Events in the Game' })
			.addFields(visibleEvents.map((event) => ({ name: event.name, value: `${event.value}\n\u200b` })))
			.setFooter({ text: `${visibleEvents.length} upcoming events` });
		return interaction.editReply({ embeds: [embed] });
	}

	private getRaidWeek(now: Date) {
		const start = moment(now);
		const day = start.day();
		const hour = start.hours();

		if (day === 1) {
			if (hour < 7) {
				start.day(-7).weekday(5);
			} else {
				start.weekday(5);
			}
		}

		if (day === 0) {
			start.day(-1).weekday(5);
		}

		if (day > 1 && day < 5) {
			start.weekday(5);
		}

		if (day === 6) {
			start.weekday(5);
		}

		start.hour(7).minute(0).second(0).millisecond(0);
		const end = moment(start).add(3, 'days');

		return { raidWeekStartTime: start.toDate(), raidWeekEndTime: end.toDate() };
	}
}
