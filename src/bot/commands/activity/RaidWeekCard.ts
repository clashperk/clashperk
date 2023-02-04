import { Clan } from 'clashofclans.js';
import { AttachmentBuilder, CommandInteraction, User } from 'discord.js';
import moment from 'moment';
import { Command } from '../../lib/index.js';

export default class CapitalRaidWeekCommand extends Command {
	public constructor() {
		super('capital-week', {
			category: 'none',
			channel: 'guild',
			clientPermissions: ['EmbedLinks'],
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; week?: string; clear?: boolean; user?: User }) {
		if (args.clear) {
			return interaction.editReply({ components: [] });
		}

		const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
		if (!clan) return;

		const data = await this.getRaidsFromAPI(clan);
		if (!data) {
			return interaction.followUp({
				content: `Raid weekend info isn't available for ${clan.name} (${clan.tag})`
			});
		}

		const query = new URLSearchParams({
			clanName: clan.name,
			clanBadgeUrl: clan.badgeUrls.large,
			startDate: moment(data.startTime).toDate().toUTCString(),
			endDate: moment(data.endTime).toDate().toUTCString(),
			offensiveReward: data.offensiveReward.toString(),
			defensiveReward: data.defensiveReward.toString(),
			totalLoot: data.capitalTotalLoot.toString(),
			totalAttacks: data.totalAttacks.toString(),
			enemyDistrictsDestroyed: data.enemyDistrictsDestroyed.toString(),
			raidsCompleted: data.raidsCompleted.toString()
		});

		const raw = new AttachmentBuilder(`https://chart.clashperk.com/raid-weekend-card?${query.toString()}`, {
			name: 'capital-raid-weekend-card.jpeg'
		});
		return interaction.editReply({ files: [raw] });
	}

	private async getRaidsFromAPI(clan: Clan) {
		const { isRaidWeek } = this.raidWeek();
		const res = await this.client.http.getRaidLastSeason(clan);
		if (!res.ok) return null;
		if (!res.items.length) return null;
		const data = res.items[isRaidWeek ? 1 : 0];
		return data;
	}

	private raidWeek() {
		const today = new Date();
		const weekDay = today.getUTCDay();
		const hours = today.getUTCHours();
		const isRaidWeek = (weekDay === 5 && hours >= 7) || [0, 6].includes(weekDay) || (weekDay === 1 && hours < 7);
		today.setUTCDate(today.getUTCDate() - today.getUTCDay());
		if (weekDay < 5 || (weekDay <= 5 && hours < 7)) today.setDate(today.getUTCDate() - 7);
		today.setUTCDate(today.getUTCDate() + 5);
		today.setUTCMinutes(0, 0, 0);
		return { weekDate: today, weekId: today.toISOString().substring(0, 10), isRaidWeek };
	}
}
