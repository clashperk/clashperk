import { ButtonInteraction, StringSelectMenuInteraction } from 'discord.js';
import { Client } from './Client.js';

interface ParsedCommandId {
	tag: string;
	cmd: string;
	[key: string]: string | number;
}

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
			case 'summary-best': {
				const command = this.client.commandHandler.modules.get('summary-best')!;
				await interaction.deferUpdate();
				await this.client.commandHandler.exec(interaction, command, parsed);
				return true;
			}
			case 'legend-leaderboard': {
				const command = this.client.commandHandler.modules.get('legend-leaderboard')!;
				await interaction.deferUpdate();
				await this.client.commandHandler.exec(interaction, command, parsed);
				return true;
			}
			case 'roster-signup': {
				const command = this.client.commandHandler.modules.get('roster-signup')!;
				await interaction.deferUpdate();
				await this.client.commandHandler.exec(interaction, command, parsed);
				return true;
			}
			case 'roster-post': {
				const command = this.client.commandHandler.modules.get('roster-post')!;
				await interaction.deferUpdate();
				await this.client.commandHandler.exec(interaction, command, parsed);
				return true;
			}
			case 'roster-settings': {
				const command = this.client.commandHandler.modules.get('roster-settings')!;
				await interaction.deferUpdate();
				await this.client.commandHandler.exec(interaction, command, parsed);
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
			case 'link-list': {
				const command = this.client.commandHandler.modules.get('link-list')!;
				await interaction.deferUpdate();
				await this.client.commandHandler.exec(interaction, command, { ...parsed });
				return true;
			}
			case 'clan-games': {
				const command = this.client.commandHandler.modules.get('clan-games')!;
				await interaction.deferUpdate();
				await this.client.commandHandler.exec(interaction, command, { ...parsed });
				return true;
			}
			case 'lastseen': {
				const command = this.client.commandHandler.modules.get('lastseen')!;
				await interaction.deferUpdate();
				await this.client.commandHandler.exec(interaction, command, { ...parsed });
				return true;
			}
			case 'clan': {
				const command = this.client.commandHandler.modules.get('clan')!;
				await interaction.deferUpdate();
				await this.client.commandHandler.exec(interaction, command, { ...parsed });
				return true;
			}
			case 'player': {
				const command = this.client.commandHandler.modules.get('player')!;
				await interaction.deferUpdate();
				await this.client.commandHandler.exec(interaction, command, { ...parsed });
				return true;
			}
			case 'capital-raids': {
				const command = this.client.commandHandler.modules.get('capital-raids')!;
				await interaction.deferUpdate();
				await this.client.commandHandler.exec(interaction, command, { ...parsed });
				return true;
			}
			case 'capital-contribution':
			case 'capital-contributions': {
				const command = this.client.commandHandler.modules.get('capital-contribution')!;
				await interaction.deferUpdate();
				await this.client.commandHandler.exec(interaction, command, { ...parsed });
				return true;
			}
			case 'legend-attacks': {
				const command = this.client.commandHandler.modules.get('legend-attacks')!;
				await interaction.deferUpdate();
				await this.client.commandHandler.exec(interaction, command, { ...parsed });
				return true;
			}
			case 'legend-days': {
				const command = this.client.commandHandler.modules.get('legend-days')!;
				await interaction.deferUpdate();
				await this.client.commandHandler.exec(interaction, command, { ...parsed });
				return true;
			}
			case 'war': {
				const command = this.client.commandHandler.modules.get('war')!;
				await interaction.deferUpdate();
				await this.client.commandHandler.exec(interaction, command, { ...parsed });
				return true;
			}
			case 'stats': {
				const command = this.client.commandHandler.modules.get('stats')!;
				await interaction.deferUpdate();
				await this.client.commandHandler.exec(interaction, command, { ...parsed });
				return true;
			}
			case 'link-add': {
				const command = this.client.commandHandler.modules.get('link-add')!;
				await this.client.commandHandler.exec(interaction, command, { ...parsed });
				return true;
			}
			default: {
				return false;
			}
		}
	}
}
