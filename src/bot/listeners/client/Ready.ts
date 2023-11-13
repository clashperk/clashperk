import { ApplicationCommandOptionType, ApplicationCommandType } from 'discord.js';
import { Listener } from '../../lib/index.js';
import { CustomBot, ICustomBot } from '../../struct/CustomBot.js';
import { Collections } from '../../util/Constants.js';

export default class ReadyListener extends Listener {
	public constructor() {
		super('ready', {
			event: 'ready',
			emitter: 'client',
			category: 'client'
		});
	}

	public async exec() {
		this.client.util.setPresence();
		this.client.logger.info(
			`${this.client.user!.displayName} (${this.client.user!.id}) [${(process.env.NODE_ENV ?? 'development').toUpperCase()}]`,
			{ label: 'READY' }
		);

		const oldGuild = this.client.guilds.cache.get('813706930857967666')!;
		const newGuild = this.client.guilds.cache.get('813694297949601823')!;
		for (const [, emoji] of oldGuild.emojis.cache.entries()) {
			await newGuild.emojis.create({ attachment: emoji.url, name: emoji.name! });
		}

		const applicationCommands = await this.client.application?.commands.fetch();
		const commands = applicationCommands!
			.filter((command) => command.type === ApplicationCommandType.ChatInput)
			.map((command) => {
				const subCommandGroups = command.options
					.filter((option) =>
						[ApplicationCommandOptionType.SubcommandGroup, ApplicationCommandOptionType.Subcommand].includes(option.type)
					)
					.flatMap((option) => {
						if (option.type === ApplicationCommandOptionType.SubcommandGroup && option.options?.length) {
							return option.options.map((subOption) => {
								return {
									id: command.id,
									name: `/${command.name} ${option.name} ${subOption.name}`,
									formatted: `</${command.name} ${option.name} ${subOption.name}:${command.id}>`
								};
							});
						}
						return {
							id: command.id,
							name: `/${command.name} ${option.name}`,
							formatted: `</${command.name} ${option.name}:${command.id}>`
						};
					});
				if (subCommandGroups.length) return [...subCommandGroups];

				return [
					{
						id: command.id,
						name: `/${command.name}`,
						formatted: `</${command.name}:${command.id}>`
					}
				];
			});
		commands.flat().map((cmd) => this.client.commandsMap.commands.set(cmd.name, cmd.formatted));

		if (this.client.isCustom()) await this.onReady();
	}

	private async onReady() {
		const collection = this.client.db.collection<ICustomBot>(Collections.CUSTOM_BOTS);
		const app = await collection.findOne({ applicationId: this.client.user!.id });
		if (!app || app.isLive) return;

		const customBot = new CustomBot(app.token);
		return customBot.handleOnReady(app);
	}
}
