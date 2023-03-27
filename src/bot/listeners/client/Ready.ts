import { ApplicationCommandOptionType, ApplicationCommandType } from 'discord.js';
import { Listener } from '../../lib/index.js';

export default class ReadyListener extends Listener {
	public constructor() {
		super('ready', {
			event: 'ready',
			emitter: 'client',
			category: 'client'
		});
	}

	public async exec() {
		this.client.logger.info(
			`${this.client.user!.tag} (${this.client.user!.id}) [${(process.env.NODE_ENV ?? 'development').toUpperCase()}]`,
			{ label: 'READY' }
		);

		const applicationCommands = (await this.client.application?.commands.fetch())!;
		const commands = applicationCommands
			.filter((command) => command.type === ApplicationCommandType.ChatInput)
			.map((command) => {
				const subCommands = command.options
					.filter((option) => option.type === ApplicationCommandOptionType.Subcommand)
					.map((option) => {
						return {
							id: command.id,
							name: `/${command.name} ${option.name}`,
							formatted: `</${command.name} ${option.name}:${command.id}>`
						};
					});
				if (subCommands.length) return [...subCommands];
				return [
					{
						id: command.id,
						name: `/${command.name}`,
						formatted: `</${command.name}:${command.id}>`
					}
				];
			});
		commands.flat().map((cmd) => this.client._commands.set(cmd.name, cmd.formatted));
	}
}
