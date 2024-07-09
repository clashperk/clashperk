import { ApplicationCommandOptionType, ApplicationCommandType } from 'discord.js';
import { Listener } from '../../lib/index.js';
import { Migrator } from '../../core/_Migrator.js';

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

    const migrator = new Migrator(this.client);
    await migrator.migrate();

    const applicationCommands = await this.client.application?.commands.fetch();
    const commands = applicationCommands!
      .filter((command) => command.type === ApplicationCommandType.ChatInput)
      .map((command) => {
        const subCommandGroups = command.options
          .filter((option) => [ApplicationCommandOptionType.SubcommandGroup, ApplicationCommandOptionType.Subcommand].includes(option.type))
          .flatMap((option) => {
            if (option.type === ApplicationCommandOptionType.SubcommandGroup && option.options?.length) {
              return option.options.map((subOption) => {
                return {
                  id: command.id,
                  name: `/${command.name} ${option.name} ${subOption.name}`,
                  mappedId: `${command.name}-${option.name}-${subOption.name}`,
                  formatted: `</${command.name} ${option.name} ${subOption.name}:${command.id}>`
                };
              });
            }
            return {
              id: command.id,
              name: `/${command.name} ${option.name}`,
              mappedId: `${command.name}-${option.name}`,
              formatted: `</${command.name} ${option.name}:${command.id}>`
            };
          });
        if (subCommandGroups.length) return [...subCommandGroups];

        return [
          {
            id: command.id,
            name: `/${command.name}`,
            mappedId: `${command.name}`,
            formatted: `</${command.name}:${command.id}>`
          }
        ];
      });

    commands.flat().map((cmd) => {
      this.client.commands.set(cmd.name, cmd.formatted, cmd.mappedId);

      const name = cmd.name.replace('/', '').replace(/\s+/g, '-');
      const mod = this.client.commandHandler.getCommand(name);
      if (!mod) this.client.logger.warn(`${cmd.name}`, { label: 'MissingCommand' });
    });

    if (this.client.isCustom()) await this.onReady();
  }

  private async onReady() {
    const app = await this.client.customBotManager.findBot({ applicationId: this.client.user!.id });
    if (!app) return;

    await this.client.customBotManager.checkGuild(app);
    if (!app.isLive) await this.client.customBotManager.handleOnReady(app);
  }
}
