import { AutocompleteInteraction } from 'discord.js';
import Client from './Client.js';

export class Autocomplete {
	public constructor(private readonly client: Client) {}

	public handle(interaction: AutocompleteInteraction<'cached'>) {
		const args = this.client.commandHandler.rawArgs(interaction);
		return this.exec(interaction, args);
	}

	public exec(interaction: AutocompleteInteraction<'cached'>, args: Record<string, unknown>) {
		const command = this.client.commandHandler.getCommand(args.commandName as string);
		if (!command) return null;
		return command.autocomplete(interaction, args);
	}
}
