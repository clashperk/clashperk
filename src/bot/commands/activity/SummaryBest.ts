import { Collections, Season } from '@clashperk/node';
import { Clan } from 'clashofclans.js';
import { Command } from 'discord-akairo';
import { Message } from 'discord.js';
import { EMOJIS } from '../../util/Emojis';

export interface Aggregated {
	members: {
		tag: string;
		name: string;
		clanTag: string;
		donations: number;
		donationsReceived: number;
	}[];
}

export default class SummaryBestCommand extends Command {
	public constructor() {
		super('summary-best', {
			category: 'activity',
			channel: 'guild',
			clientPermissions: ['EMBED_LINKS'],
			description: {}
		});
	}

	public async exec(message: Message) {
		await message.util!.send(`**Fetching data... ${EMOJIS.LOADING}**`);

		const clans = await this.client.db.collection(Collections.CLAN_STORES)
			.find({ guild: message.guild!.id })
			.toArray();
		if (!clans.length) {
			return message.util!.send(`**${message.guild!.name} does not have any clans. Why not add some?**`);
		}

		const fetched: Clan[] = (await Promise.all(clans.map(en => this.client.http.clan(en.tag)))).filter(res => res.ok);
		if (!fetched.length) {
			return message.util!.send('**Something went wrong. I couldn\'t fetch all clans!**');
		}

		await this.client.db.collection(Collections.CLAN_MEMBERS)
			.aggregate([
				{
					$match: {
						season: Season.ID,
						clanTag: {
							$in: fetched.map(clan => clan.tag)
						},
						tag: {
							$in: fetched.map(clan => clan.memberList).flat().map(mem => mem.tag)
						}
					}
				}
			]).toArray();
	}

	private donation(num: number, space: number) {
		return num.toString().padStart(space, ' ');
	}

	private predict(num: number) {
		return num > 999999 ? 7 : num > 99999 ? 6 : 5;
	}
}
