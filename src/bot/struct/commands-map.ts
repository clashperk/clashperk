import Client from './client-module.js';

export class CommandsMap {
  private nameMappings: Map<string, string>;
  private idMappings: Map<string, string>;

  public constructor(private readonly client: Client) {
    this.nameMappings = new Map();
    this.idMappings = new Map();
  }

  public set(name: string, formatted: string, mappedId: string) {
    this.nameMappings.set(name, formatted);
    this.idMappings.set(mappedId, name);
  }

  public entries() {
    return [...this.nameMappings.keys()];
  }

  /**
   * @param name - `/command name`
   */
  public get(name: string) {
    return this.nameMappings.get(name) ?? `${name}`;
  }

  /**
   * @param id - `command-id`
   */
  public resolve(id: string) {
    return this.get(this.idMappings.get(id) ?? `/${id}`);
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
