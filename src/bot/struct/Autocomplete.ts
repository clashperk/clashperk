import { AutocompleteInteraction } from 'discord.js';
import { Filter } from 'mongodb';
import { Collections } from '../util/Constants.js';
import Client from './Client.js';

interface IFlag {
	tag: string;
	name: string;
}

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

	public async flagSearchAutoComplete(interaction: AutocompleteInteraction<'cached'>, args: { player_tag?: string }) {
		const filter: Filter<IFlag> = {
			guild: interaction.guild.id
		};

		if (args.player_tag) {
			const text = args.player_tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			if (this.client.http.isValidTag(text)) {
				filter.$or = [{ tag: this.client.http.fixTag(text) }, { name: { $regex: `.*${text}.*`, $options: 'i' } }];
			} else {
				filter.name = { $regex: `.*${text}.*`, $options: 'i' };
			}
		}

		const cursor = this.client.db.collection<IFlag>(Collections.FLAGS).find(filter);
		if (!args.player_tag) cursor.sort({ _id: -1 });

		const flags = await cursor.limit(24).toArray();
		const players = flags.filter((flag, index) => flags.findIndex((f) => f.tag === flag.tag) === index);
		return interaction.respond(players.map((flag) => ({ name: `${flag.name} (${flag.tag})`, value: flag.tag })));
	}
}
