/* eslint-disable @typescript-eslint/no-namespace */
import { readFileSync, type PathLike } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { BackendModule, InitOptions, ReadCallback, ResourceKey, Services } from 'i18next';

export class Backend implements BackendModule<Backend.Options> {
  public readonly type = 'backend';
  private paths!: readonly PathResolvable[];
  private i18nextOptions!: InitOptions;

  public init(_: Services, backendOptions: Backend.Options, i18nextOptions: InitOptions): void {
		this.paths = backendOptions.paths ?? []; // eslint-disable-line
    this.i18nextOptions = i18nextOptions;
  }

  public read(language: string, namespace: string, callback: ReadCallback): void {
    if (this.paths.length === 0) return callback(new Error('No files registered'), null);

    if (this.i18nextOptions.initImmediate === true) {
      try {
        return callback(null, this.readPathsSync(language, namespace));
      } catch (error) {
        return callback(error as Error, false);
      }
    }

    this.readPaths(language, namespace)
      .then((data) => callback(null, data))
      .catch((error) => callback(error as Error, false));
  }

  private async readPaths(language: string, namespace: string): Promise<ResourceKey> {
    if (this.paths.length === 1) return Backend.readPath(Backend.resolvePath(language, namespace, this.paths[0]));

    const results = await Promise.allSettled(this.paths.map((path) => Backend.readPath(Backend.resolvePath(language, namespace, path))));
    return Backend.handleResults(results);
  }

  private readPathsSync(language: string, namespace: string): ResourceKey {
    if (this.paths.length === 1) return Backend.readPathSync(Backend.resolvePath(language, namespace, this.paths[0]));

    const results = this.paths.map((path) => {
      try {
        return { status: 'fulfilled', value: Backend.readPathSync(Backend.resolvePath(language, namespace, path)) } as const;
      } catch (error) {
        return { status: 'rejected', reason: error } as const;
      }
    });
    return Backend.handleResults(results);
  }

  public static readonly type = 'backend';

  private static async readPath(path: PathLike): Promise<ResourceKey> {
    return JSON.parse(await readFile(path, 'utf8'));
  }

  private static readPathSync(path: PathLike): ResourceKey {
    return JSON.parse(readFileSync(path, 'utf8'));
  }

  private static handleResults(results: readonly PromiseSettledResult<ResourceKey>[]) {
    const filtered = results.filter((result) => result.status === 'fulfilled');
    if (filtered.length === 0) {
      throw new AggregateError(
        results.map((result) => (result as PromiseRejectedResult).reason),
        'Could not find the file in any of the registered paths'
      );
    }

    return Object.assign({}, ...filtered.map((result) => (result as PromiseFulfilledResult<ResourceKey>).value));
  }

  private static resolvePath(language: string, namespace: string, path: PathResolvable) {
    if (typeof path === 'function') return path(language, namespace);
    if (typeof path !== 'string') path = fileURLToPath(path);
    return path.replaceAll(/\{\{(?:lng|ns)\}\}/g, (match) => (match === '{{lng}}' ? language : namespace));
  }
}

export namespace Backend {
  export interface Options {
    paths: readonly PathResolvable[];
  }
}

export type PathResolvable = string | URL | ((language: string, namespace: string) => PathLike);

declare module 'i18next' {
  interface InitOptions {
    backend?: Backend.Options | undefined;
  }
}
