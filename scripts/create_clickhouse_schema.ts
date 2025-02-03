import 'dotenv/config';

import { createClient as createClickHouseClient } from '@clickhouse/client';

const clickhouse = createClickHouseClient({
  url: process.env.CLICKHOUSE_HOST,
  username: process.env.CLICKHOUSE_USER,
  password: process.env.CLICKHOUSE_PASSWORD
});

(async () => {
  await clickhouse.ping();

  await clickhouse.query({
    query: `
      CREATE TABLE IF NOT EXISTS donation_records (
        tag String,
        name String,
        clanTag String,
        clan String,
        value Int32,
        action String,
        createdAt DATETIME DEFAULT now()
      ) ENGINE = MergeTree()
      PARTITION BY toYYYYMM(createdAt)
      PRIMARY KEY (tag, createdAt);
    `
  });

  await clickhouse.query({
    query: `
      CREATE TABLE IF NOT EXISTS player_activities (
        tag String,
        clanTag String,
        createdAt DATETIME DEFAULT now()
      ) ENGINE = MergeTree()
      PARTITION BY toYYYYMM(createdAt)
      PRIMARY KEY (tag, createdAt);
    `
  });

  console.log('Tables created successfully!');
  clickhouse.close();
})();
