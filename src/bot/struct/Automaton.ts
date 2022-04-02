import { ButtonInteraction, SelectMenuInteraction } from 'discord.js';
import { Client } from '../struct/Client';

interface ParsedCommandId {
	tag: string;
	cmd: string;
	[key: string]: any;
}

export class Automaton {
	public constructor(public client: Client) {}

	private parseCommandId(customId: string): ParsedCommandId | null {
		if (/^{.*}$/g.test(customId)) return JSON.parse(customId);
		return null;
	}

	public async exec(interaction: ButtonInteraction | SelectMenuInteraction) {
		const parsed = this.parseCommandId(interaction.customId);
		if (!parsed) return false;

		switch (parsed.cmd) {
			case 'booster':
			case 'boosts': {
				const command = this.client.commandHandler.modules.get('boosts')!;
				await interaction.deferUpdate();
				await this.client.commandHandler.exec(interaction, command, {
					recent: parsed.sort === -1,
					value: interaction.isSelectMenu() ? interaction.values[0] : null,
					...parsed
				});
				return true;
			}
			case 'donation':
			case 'donations': {
				const command = this.client.commandHandler.modules.get('donations')!;
				await interaction.deferUpdate();
				await this.client.commandHandler.exec(interaction, command, { reverse: parsed.sort === -1, ...parsed });
				return true;
			}
			case 'links':
			case 'link-list': {
				const command = this.client.commandHandler.modules.get('link-list')!;
				await interaction.deferUpdate();
				await this.client.commandHandler.exec(interaction, command, { showTags: parsed.args, ...parsed });
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
			default: {
				return false;
			}
		}
	}
}
