import { Collections } from '../../util/Constants';
import { Command } from 'discord-akairo';
import Google from '../../struct/Google';
import { Message } from 'discord.js';
import moment from 'moment';

export default class OffsetCommand extends Command {
	public constructor() {
		super('offset', {
			aliases: ['offset', 'timezone', 't'],
			category: 'none',
			clientPermissions: ['EMBED_LINKS'],
			channel: 'guild',
			description: {
				content: 'Sets your timezone offset.',
				usage: '<location>',
				examples: ['Kolkata', 'New York']
			},
			optionFlags: ['--location']
		});
	}

	public *args(msg: Message): unknown {
		const query = yield {
			type: 'string',
			flag: '--location',
			match: msg.interaction ? 'option' : 'content'
		};

		return { query };
	}

	public async exec(message: Message, { query }: { query: string }) {
		const raw = await Google.timezone(query);
		if (!raw) return message.util!.send('Location not found, make your search more specific and try again.');

		const offset = (Number(raw.timezone.rawOffset) + Number(raw.timezone.dstOffset));
		await this.client.db.collection(Collections.LINKED_PLAYERS)
			.updateOne({ user: message.author.id }, {
				$set: {
					user_tag: message.author.tag,
					timezone: {
						id: raw.timezone.timeZoneId,
						offset: Number(offset),
						name: raw.timezone.timeZoneName,
						location: raw.location.formatted_address
					}
				},
				$setOnInsert: {
					entries: [],
					createdAt: new Date()
				}
			}, { upsert: true });

		const embed = this.client.util.embed()
			.setColor(this.client.embed(message))
			.setTitle(`${raw.location.formatted_address as string}`)
			.setDescription([
				`**${raw.timezone.timeZoneName as string}**`,
				moment(new Date(Date.now() + (offset * 1000))).format('MM/DD/YYYY hh:mm A'),
				'',
				'**Offset**',
				`${offset < 0 ? '-' : '+'}${this.offset(offset * 1000)}`
			].join('\n'))
			.setFooter(`${message.author.tag}`, message.author.displayAvatarURL());
		return message.util!.send({ embeds: [embed], content: `Time zone set to **${raw.timezone.timeZoneName as string}**` });
	}

	private offset(seconds: number, ms = true) {
		seconds = Math.abs(seconds);
		if (ms) seconds /= 1000;
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor(seconds % 3600 / 60);
		return `${hours >= 1 ? `0${hours}`.slice(-2) : '00'}:${minutes >= 1 ? `0${minutes}`.slice(-2) : '00'}`;
	}
}
