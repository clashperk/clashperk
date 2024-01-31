import { CommandInteraction, EmbedBuilder, escapeMarkdown } from 'discord.js';
import { Command } from '../../lib/index.js';
import { ClanStore } from '../../struct/StorageHandler.js';

export default class ClansCommand extends Command {
	public constructor() {
		super('clans', {
			category: 'setup',
			channel: 'guild',
			clientPermissions: ['EmbedLinks']
		});
	}

	public async exec(interaction: CommandInteraction<'cached'>) {
		const clans = await this.client.storage.find(interaction.guildId);
		const categories = await this.getCategoriesMap(interaction.guildId);
		const categoryIds = Object.keys(categories);

		const clansReduced = clans.reduce<Record<string, ClanStore[]>>((prev, curr) => {
			let categoryId = curr.categoryId?.toHexString() || 'general';
			if (!(categoryId in categories)) categoryId = 'general';

			prev[categoryId] ??= [];
			prev[categoryId].push(curr);
			return prev;
		}, {});
		const clanGroups = Object.entries(clansReduced).sort(([a], [b]) => categoryIds.indexOf(a) - categoryIds.indexOf(b));

		const embed = new EmbedBuilder()
			.setAuthor({ name: `${interaction.guild.name} Clans`, iconURL: interaction.guild.iconURL()! })
			.setColor(this.client.embed(interaction))
			.setFooter({ text: `Total ${clans.length}` });

		embed.setDescription(
			clanGroups
				.map(([categoryId, clans]) => {
					return [
						`**${categories[categoryId] || 'General'}**`,
						...clans.map((clan) => `[${escapeMarkdown(clan.name)} (${clan.tag})](${this.client.http.getClanURL(clan.tag)})`)
					].join('\n');
				})
				.join('\n\n')
		);

		return interaction.reply({ embeds: [embed] });
	}

	private async getCategoriesMap(guildId: string) {
		const categories = await this.client.storage.getOrCreateDefaultCategories(guildId);
		return Object.fromEntries(categories.map((cat) => [cat.value, cat.name]));
	}
}
