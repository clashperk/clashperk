import { flattenApplicationCommands } from '../../helper/commands.helper.js';
import { Listener } from '../../lib/handlers.js';

export default class ReadyListener extends Listener {
  public constructor() {
    super('clientReady', {
      event: 'clientReady',
      emitter: 'client',
      category: 'client'
    });
  }

  public async exec() {
    this.client.logger.info(
      `${this.client.user.displayName} (${this.client.user.id}) [${(process.env.NODE_ENV ?? 'development').toUpperCase()}]`,
      { label: 'READY' }
    );

    const applicationCommands = await this.client.application.commands.fetch();
    const commands = await flattenApplicationCommands([...applicationCommands.values()]);

    commands.map((cmd) => {
      this.client.commands.set(cmd.name, cmd.formatted, cmd.mappedId);
      const name = cmd.name.replace('/', '').replace(/\s+/g, '-');
      const mod = this.client.commandHandler.getCommand(name);
      if (!mod) this.client.logger.warn(`${cmd.name}`, { label: 'MissingCommand' });
    });

    if (this.client.isCustom()) await this.onReady();
  }

  private async onReady() {
    const app = await this.client.customBotManager.findBot({ serviceId: this.client.user.id });
    if (!app) return;

    await this.client.customBotManager.checkGuild(app);
    if (!app.isLive) await this.client.customBotManager.handleOnReady(app);
  }
}
