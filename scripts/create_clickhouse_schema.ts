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
        action String DEFAULT 'UNKNOWN',
        createdAt DATETIME DEFAULT now()
      ) ENGINE = MergeTree()
      PARTITION BY toYYYYMM(createdAt)
      PRIMARY KEY (tag, createdAt);
    `
  });

  await clickhouse.query({
    query: `
      CREATE MATERIALIZED VIEW daily_activity_views
      ENGINE = SummingMergeTree()
      PARTITION BY toYYYYMM(timestamp)
      ORDER BY (timestamp, clanTag)
      POPULATE
      AS
      SELECT
        toDate(createdAt) AS timestamp,
        clanTag,
        COUNT(*) AS activity_count,
        uniq(tag) AS active_members
      FROM player_activities
      WHERE createdAt >= now() - INTERVAL 30 DAY
      GROUP BY timestamp, clanTag;
    `
  });

  await clickhouse.query({
    query: `
      CREATE MATERIALIZED VIEW hourly_activity_views
      ENGINE = SummingMergeTree()
      PARTITION BY toYYYYMM(timestamp)
      ORDER BY (timestamp, clanTag)
      POPULATE
      AS
      SELECT
        toStartOfHour(createdAt) AS timestamp,
        clanTag,
        uniq(tag) AS active_members
      FROM player_activities
      WHERE createdAt >= now() - INTERVAL 1 DAY
      GROUP BY timestamp, clanTag;
    `
  });

  console.log('Tables created successfully!');
  clickhouse.close();
})();
