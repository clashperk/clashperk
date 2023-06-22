import { ButtonInteraction, StringSelectMenuInteraction } from 'discord.js';
import { Client } from './Client.js';

interface ParsedCommandId {
	tag: string;
	cmd: string;
	[key: string]: string | number;
}

const deferredDisallowed = ['link-add'];

export default class ComponentHandler {
	public constructor(private readonly client: Client) {}

	private async parseCommandId(customId: string): Promise<ParsedCommandId | null> {
		if (/^{.*}$/g.test(customId)) return JSON.parse(customId);
		if (customId.startsWith('CMD-')) {
			return this.client.redis.getCustomId<ParsedCommandId>(customId);
		}
		return null;
	}

	public async exec(interaction: ButtonInteraction | StringSelectMenuInteraction) {
		const parsed = await this.parseCommandId(interaction.customId);
		if (!parsed) return false;

		switch (parsed.cmd) {
			case 'help': {
				const command = this.client.commandHandler.modules.get('help')!;
				await interaction.deferUpdate();
				await this.client.commandHandler.exec(interaction, command, {
					category: interaction.isStringSelectMenu() ? interaction.values.at(0) : null,
					...parsed
				});
				return true;
			}
			case 'boosts': {
				const command = this.client.commandHandler.modules.get('boosts')!;
				await interaction.deferUpdate();
				await this.client.commandHandler.exec(interaction, command, {
					value: interaction.isStringSelectMenu() ? interaction.values[0] : null,
					...parsed
				});
				return true;
			}
			case 'donations': {
				const command = this.client.commandHandler.modules.get('donations')!;
				await interaction.deferUpdate();
				await this.client.commandHandler.exec(interaction, command, {
					sortBy: interaction.isStringSelectMenu() ? interaction.values : null,
					orderBy: interaction.isStringSelectMenu() ? interaction.values[0] : null,
					...parsed
				});
				return true;
			}
			case 'link-add': {
				const command = this.client.commandHandler.modules.get('link-add')!;
				await this.client.commandHandler.exec(interaction, command, { ...parsed });
				return true;
			}
			default: {
				const command = this.client.commandHandler.modules.get(parsed.cmd);
				if (!command) return false;
				if (!deferredDisallowed.includes(parsed.cmd)) await interaction.deferUpdate();
				const selected = interaction.isStringSelectMenu() ? interaction.values[0] : null;
				await this.client.commandHandler.exec(interaction, command, { selected, ...parsed });
				return true;
			}
		}
	}
}
