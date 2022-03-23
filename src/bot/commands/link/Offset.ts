import { Collections } from '../../util/Constants';
import { Command } from '../../lib';
import Google from '../../struct/Google';
import { CommandInteraction, MessageEmbed } from 'discord.js';
import moment from 'moment';

export default class OffsetCommand extends Command {
	public constructor() {
		super('offset', {
			category: 'none',
			clientPermissions: ['EMBED_LINKS'],
			channel: 'guild',
			description: {
				content: 'Sets your timezone offset.'
			},
			defer: true
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>, args: { location: string }) {
		const raw = await Google.timezone(args.location);
		if (!raw) return interaction.editReply('Location not found, make your search more specific and try again.');

		const offset = Number(raw.timezone.rawOffset) + Number(raw.timezone.dstOffset);
		await this.client.db.collection(Collections.LINKED_PLAYERS).updateOne(
			{ user: interaction.user.id },
			{
				$set: {
					user_tag: interaction.user.tag,
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
			},
			{ upsert: true }
		);

		const embed = new MessageEmbed()
			.setColor(this.client.embed(interaction))
			.setTitle(`${raw.location.formatted_address}`)
			.setDescription(
				[
					`**${raw.timezone.timeZoneName as string}**`,
					moment(new Date(Date.now() + offset * 1000)).format('MM/DD/YYYY hh:mm A'),
					'',
					'**Offset**',
					`${offset < 0 ? '-' : '+'}${this.offset(offset * 1000)}`
				].join('\n')
			)
			.setFooter({ text: `${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
		return interaction.editReply({ embeds: [embed], content: `Time zone set to **${raw.timezone.timeZoneName as string}**` });
	}

	private offset(seconds: number, ms = true) {
		seconds = Math.abs(seconds);
		if (ms) seconds /= 1000;
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		return `${hours >= 1 ? `0${hours}`.slice(-2) : '00'}:${minutes >= 1 ? `0${minutes}`.slice(-2) : '00'}`;
	}
}
