import { Command } from 'discord-akairo';
import { Message, MessageActionRow, MessageButton, MessageEmbed } from 'discord.js';
import { Util } from '../../util/Util';

export default class PingCommand extends Command {
	public constructor() {
		super('ping', {
			aliases: ['ping', 'pong'],
			category: 'none',
			description: {
				content: 'Pings me!'
			}
		});
	}

	public async exec(message: Message) {
		const chunks = Array(7).fill(0).map((_, i) => new MessageEmbed().setDescription(`${++i}/7`));
		const paginated = Util.paginate(chunks);

		const [nextID, prevID] = [this.client.uuid(), this.client.uuid()];
		const row = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setCustomID(prevID)
					.setLabel('Previous')
					.setEmoji('⬅️')
					.setStyle('SECONDARY')
			)
			.addComponents(
				new MessageButton()
					.setCustomID(nextID)
					.setLabel('Next')
					.setEmoji('➡️')
					.setStyle('SECONDARY')
			);
		const msg = await message.util!.send(
			{
				embeds: [paginated.first()],
				components: [row]
			}
		);

		const collector = msg.createMessageComponentInteractionCollector(
			action => [nextID, prevID].includes(action.customID) && action.user.id === message.author.id,
			{ time: 15 * 60 * 1000 }
		);

		collector.on('collect', async action => {
			if (action.customID === nextID) {
				const next = paginated.next();
				await action.update({ embeds: [Util.paginate(chunks, next.page).first()] });
			}

			if (action.customID === prevID) {
				const next = paginated.previous();
				await action.update({ embeds: [Util.paginate(chunks, next.page).first()], components: [row] });
			}
		});

		collector.on('end', async () => {
			this.client.components.delete(nextID);
			this.client.components.delete(prevID);
			if (msg.editable) await msg.edit({ components: [] });
		});
	}
}
