import { Message, ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } from 'discord.js';
import { Collections, Settings } from '../../util/Constants.js';
import { Patron } from '../../struct/Patrons.js';
import { Args, Command } from '../../lib/index.js';

export default class PatronCommand extends Command {
	public constructor() {
		super('patron', {
			category: 'none',
			clientPermissions: ['EmbedLinks'],
			description: {
				content: "Get info about the bot's patreon."
			}
		});
	}

	public args(): Args {
		return {
			action: {
				match: 'STRING'
			},
			id: {
				match: 'STRING'
			}
		};
	}

	public async run(message: Message, { action, id }: { action: string; id: string }) {
		if (action && id && this.client.isOwner(message.author.id)) {
			const patrons = await this.patrons();
			const patron = patrons.find((d) => d.userId === id || d.id === id);
			for (const guild of patron?.guilds ?? []) {
				if (action === 'add') await this.add(guild.id);
				if (['del', 'dec'].includes(action)) await this.del(guild.id);
			}

			if (action === 'add' && patron) {
				await this.client.db
					.collection(Collections.PATRONS)
					.updateOne({ id: patron.id }, { $set: { active: true, declined: false, cancelled: false } });

				await this.client.patrons.refresh();
				return message.channel.send('Success!');
			}

			if (['del', 'dec'].includes(action) && patron) {
				await this.client.db
					.collection(Collections.PATRONS)
					.updateOne({ id: patron.id }, { $set: { active: false, declined: action === 'dec', cancelled: action === 'del' } });

				await this.client.patrons.refresh();
				return message.channel.send('Success!');
			}

			return message.channel.send('Failed!');
		}

		const content = [
			'Help us with our hosting related expenses.',
			'Any help is beyond appreciated. Thanks!',
			'<https://www.patreon.com/clashperk>'
		].join('\n');

		const customId = this.client.uuid(message.author.id);
		const button = new ButtonBuilder().setCustomId(customId).setStyle(ButtonStyle.Secondary).setLabel('Our Current Patrons');

		if (!this.client.isOwner(message.author.id)) {
			return message.channel.send({ content });
		}

		const msg = await message.channel.send({ content, components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)] });
		const collector = msg.createMessageComponentCollector({
			filter: (action) => action.customId === customId && action.user.id === message.author.id,
			time: 5 * 60 * 1000
		});

		const patrons = (await this.patrons()).filter((patron) => patron.active && patron.userId !== this.client.ownerId);
		collector.on('collect', async (action) => {
			if (action.customId === customId) {
				const embed = new EmbedBuilder();
				embed.setDescription(
					[`**Our Current Patrons (${patrons.length})**`, patrons.map((patron) => `• ${patron.username}`).join('\n')].join('\n')
				);

				await action.reply({ embeds: [embed], ephemeral: true });
				return collector.stop();
			}
		});

		collector.on('end', async (_, reason) => {
			this.client.components.delete(customId);
			if (!/delete/i.test(reason)) await msg.edit({ components: [] });
		});
	}

	private patrons() {
		return this.client.db.collection<Patron>(Collections.PATRONS).find().sort({ createdAt: 1 }).toArray();
	}

	private async add(guild: string) {
		await this.client.db.collection(Collections.CLAN_STORES).updateMany({ guild }, { $set: { active: true, patron: true } });

		await this.client.db
			.collection(Collections.CLAN_STORES)
			.find({ guild })
			.forEach((data) => {
				this.client.rpcHandler.add(data._id.toString(), { tag: data.tag, guild: data.guild, op: 0 });
			});
	}

	private async del(guild: string) {
		await this.client.settings.delete(guild, Settings.CLAN_LIMIT); // Delete ClanLimit

		await this.client.db.collection(Collections.CLAN_STORES).updateMany({ guild }, { $set: { patron: false } });

		await this.client.db
			.collection(Collections.CLAN_STORES)
			.find({ guild })
			.skip(2)
			.forEach((data) => {
				this.client.db.collection(Collections.CLAN_STORES).updateOne({ _id: data._id }, { $set: { active: false } });
				this.client.rpcHandler.delete(data._id.toString(), { tag: data.tag, op: 0, guild });
			});
	}
}
