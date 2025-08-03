import { Client } from './client.js';

export class AnalyticsManager {
  constructor(private readonly client: Client) {}
  private records: AnalyticsEntity[] = [];
  private timeoutId: NodeJS.Timeout | null = null;

  public track(input: AnalyticsEntity) {
    this.records.push(input);
  }

  private async bulkInsert() {
    if (!this.records.length) return;

    const values = this.records;
    this.records = [];

    await this.client.clickhouse.insert({
      table: 'bot_command_logs',
      format: 'JSONEachRow',
      values
    });
  }

  public async flush() {
    if (this.timeoutId) clearInterval(this.timeoutId);

    try {
      await this.bulkInsert();
    } finally {
      this.timeoutId = setTimeout(this.flush.bind(this), 1000 * 30);
    }
  }
}

interface AnalyticsEntity {
  commandId: string;
  applicationCommandName: string | null;

  userId: string;
  username: string;
  displayName: string;
  userLocale: string;

  guildId: string;
  guildName: string | '_unknown' | '_dm';
  guildLocale: string | null;

  isCommand: boolean;
  isUserInstalled: boolean;
  interactionType: string;

  args: string;

  applicationId: string;

  createdAt: number;
}
