import Client from './Client.js';

export class CommandsMap {
  private commands: Map<string, string>;

  public constructor(private readonly client: Client) {
    this.commands = new Map();
  }

  public set(key: string, value: string) {
    return this.commands.set(key, value);
  }

  public get(name: string) {
    return this.commands.get(name) ?? `${name}`;
  }

  public get SETUP_ENABLE() {
    return this.get('/setup enable');
  }

  public get LINK_CREATE() {
    return this.get('/link create');
  }

  public get REDEEM() {
    return this.get('/redeem');
  }

  public get VERIFY() {
    return this.get('/verify');
  }

  public get HISTORY() {
    return this.get('/history');
  }

  public get AUTOROLE_REFRESH() {
    return this.get('/autorole refresh');
  }
}
