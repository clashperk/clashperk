import { Collections } from '@app/constants';
import { captureException } from '@sentry/node';
import {
  ChangeStream,
  ChangeStreamDocument,
  Db,
  Document,
  MongoServerError,
  ResumeToken
} from 'mongodb';

const MONGO_CHANGE_STREAM_HISTORY_LOST = 286;

type ChangeHandler<T extends Document> = (change: ChangeStreamDocument<T>) => unknown;

/** One database-level change stream per process, routed to handlers by collection. */
export class ChangeStreamHub {
  private readonly routes = new Map<
    string,
    { match: Document; handler: ChangeHandler<Document> }
  >();
  private stream: ChangeStream | null = null;
  private resumeToken: ResumeToken | null = null;
  private reopenQueued = false;

  public constructor(private readonly db: Db) {}

  /** `match` filters this collection's events, like a `$match` stage on `collection.watch()`. */
  public on<T extends Document>(
    collection: Collections,
    match: Document,
    handler: ChangeHandler<T>
  ) {
    this.routes.set(collection, { match, handler: handler as ChangeHandler<Document> });
    this.queueReopen();
  }

  // Routes register at different times (startup, ready, after maintenance); batch them per tick.
  private queueReopen() {
    if (this.reopenQueued) return;
    this.reopenQueued = true;
    queueMicrotask(() => {
      this.reopenQueued = false;
      this.open();
    });
  }

  private open() {
    if (this.stream) {
      this.resumeToken = this.stream.resumeToken ?? this.resumeToken;
      this.stream.close().catch(() => null);
    }

    const $or = [...this.routes].map(([coll, { match }]) => ({ 'ns.coll': coll, ...match }));
    // Resuming from the old stream's token means reopening never drops events.
    const stream = this.db.watch([{ $match: { $or } }], {
      fullDocument: 'updateLookup',
      ...(this.resumeToken ? { startAfter: this.resumeToken } : {})
    });
    this.stream = stream;

    stream.on('change', async (change) => {
      if (!('ns' in change) || !('coll' in change.ns)) return;
      try {
        await this.routes.get(change.ns.coll)?.handler(change);
      } catch (error) {
        captureException(error);
      }
    });

    // The driver retries resumable errors itself; anything left would silence every watcher.
    stream.on('error', (error: MongoServerError) => {
      captureException(error);
      if (stream !== this.stream) return;
      // A token older than the oplog can never resume; start from now instead.
      this.resumeToken =
        error.code === MONGO_CHANGE_STREAM_HISTORY_LOST
          ? null
          : (stream.resumeToken ?? this.resumeToken);
      this.stream = null;
      setTimeout(() => this.open(), 5_000).unref();
    });
  }
}
