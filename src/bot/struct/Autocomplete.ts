import { AutocompleteInteraction } from 'discord.js';
import { Filter } from 'mongodb';
import { nanoid } from 'nanoid';
import { unique } from 'radash';
import { UserInfoModel } from '../types/index.js';
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
		console.log(args.commandName);
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

	public async clanCategoriesAutoComplete(interaction: AutocompleteInteraction<'cached'>) {
		const categories = await this.client.storage.getOrCreateDefaultCategories(interaction.guildId);
		return interaction.respond(categories.slice(0, 25));
	}

	public async clanAutoComplete(interaction: AutocompleteInteraction<'cached'>, isMulti: boolean) {
		const [clans, userClans] = await Promise.all([
			this.client.storage.find(interaction.guildId),
			this.getUserLinkedClan(interaction.user.id)
		]);

		const choices = unique(
			[...userClans, ...clans].map((clan) => ({ value: clan.tag, name: `${clan.name} (${clan.tag})` })),
			(e) => e.value
		);
		if (!choices.length) return interaction.respond([{ name: 'Enter a clan tag.', value: '0' }]);

		if (isMulti) {
			const value = await this.generateShortKey(choices.map((choice) => choice.value).join(','));
			choices.unshift({ value, name: `All of these (${clans.length})` });
		}

		return interaction.respond(choices.slice(0, 25));
	}

	private async generateShortKey(query: string) {
		query = query.trim();
		if (query.length > 100) {
			const key = `AC-${nanoid()}`;
			await this.client.redis.connection.set(key, query, { EX: 60 * 60 });
			return key;
		}
		return query;
	}

	private async getUserLinkedClan(userId: string) {
		const user = await this.client.db.collection<UserInfoModel>(Collections.USERS).findOne({ userId });
		if (!user?.clan) return [];
		return [{ name: user.clan.name ?? 'Unknown', tag: user.clan.tag }];
	}
}
