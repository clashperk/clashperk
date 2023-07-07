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

	private async getCustomId<T>(id: string) {
		const data = await this.client.redis.connection.json.get(id);
		return data as unknown as T;
	}

	private async parseCommandId(customId: string): Promise<ParsedCommandId | null> {
		if (/^{.*}$/g.test(customId)) return JSON.parse(customId);
		if (customId.startsWith('CMD-')) {
			return this.getCustomId<ParsedCommandId>(customId);
		}
		return null;
	}

	public parseStringSelectMenu(interaction: StringSelectMenuInteraction, parsed: ParsedCommandId) {
		const values = interaction.values;
		if (parsed.array_key) return { [parsed.array_key]: values };
		if (parsed.string_key) return { [parsed.string_key]: values.at(0) };
		return { selected: values.length === 1 ? values.at(0) : values };
	}

	public async exec(interaction: ButtonInteraction | StringSelectMenuInteraction) {
		const parsed = await this.parseCommandId(interaction.customId);
		if (!parsed) return false;

		const command = this.client.commandHandler.modules.get(parsed.cmd);
		if (!command) return false;

		const deferredDisabled = parsed.hasOwnProperty('defer') && !parsed.defer;
		if (!deferredDisallowed.includes(parsed.cmd) && !deferredDisabled) await interaction.deferUpdate();

		const selected = interaction.isStringSelectMenu() ? this.parseStringSelectMenu(interaction, parsed) : {};
		await this.client.commandHandler.exec(interaction, command, { ...parsed, ...selected });
		return true;
	}
}
