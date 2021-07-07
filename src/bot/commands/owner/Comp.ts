/* eslint-disable @typescript-eslint/no-unused-vars */
import { Command } from 'discord-akairo';
import { Message, MessageActionRow, MessageButton, MessageEmbed, MessageSelectMenu } from 'discord.js';
import { Util } from '../../util/Util';

export default class ComponentCommand extends Command {
	public constructor() {
		super('component', {
			aliases: ['button', 'select'],
			category: 'none',
			ownerOnly: true,
			description: {
				content: 'Shows nothing!'
			}
		});
	}

	public async exec(message: Message) {
		const chunks = Array(7).fill(0).map((_, i) => new MessageEmbed().setDescription(`${++i}/7`));
		const paginated = Util.paginate(chunks);

		const [nextID, prevID] = [this.client.uuid(), this.client.uuid()];
		const row = new MessageActionRow()
			/* .addComponents(
				new MessageButton()
					.setCustomId(prevID)
					// .setLabel('Previous')
					.setEmoji('⬅️')
					.setStyle('SECONDARY')
			)*/
			.addComponents(
				new MessageSelectMenu()
					.setCustomId(nextID)
					.setPlaceholder('Nothing selected')
					.setMinValues(2)
					.addOptions([
						{
							label: 'Select me',
							description: 'This is a description',
							value: 'first_option'
						},
						{
							label: 'You can select me too',
							description: 'This is also a description',
							value: 'second_option'
						},
						{
							label: 'Select me 3 ',
							description: 'This is a description lol ',
							value: 'first_option 8 '
						},
						{
							label: 'You can select me too 4',
							description: 'This is also a description lol ',
							value: 'second_option 6 '
						}
					])
			);
		const msg = await message.util!.send(
			{
				embeds: [paginated.first()],
				components: [row, new MessageActionRow().addComponents(new MessageButton()
					.setCustomId(prevID)
					// .setLabel('Previous')
					.setEmoji('⬅️')
					.setStyle('SECONDARY'))]
			}
		);

		const collector = msg.createMessageComponentCollector({
			filter: action => [nextID, prevID].includes(action.customId) && action.user.id === message.author.id,
			time: 15 * 60 * 1000
		});

		collector.on('collect', async action => {
			if (action.customId === nextID) {
				const next = paginated.next();
				await action.update({ embeds: [Util.paginate(chunks, next.page).first()] });
			}

			if (action.customId === prevID) {
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
