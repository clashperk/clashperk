import 'dotenv/config';

import { Client as ElasticClient } from '@elastic/elasticsearch';

const elastic = new ElasticClient({
  node: process.env.ES_HOST!,
  auth: {
    username: process.env.ES_USERNAME || 'elastic',
    password: process.env.ES_PASSWORD!
  },
  tls: {
    ca: process.env.ES_CA_CRT!,
    rejectUnauthorized: false
  }
});

(async () => {
  await elastic.ping();

  await elastic.indices.create(
    {
      index: 'player_progress_events',
      body: {
        mappings: {
          properties: {
            clan_tag: {
              type: 'keyword'
            },
            created_at: {
              type: 'date'
            },
            name: {
              type: 'text',
              fielddata: true
            },
            op: {
              type: 'keyword'
            },
            tag: {
              type: 'keyword'
            },
            unit_level: {
              type: 'long'
            },
            unit_name: {
              type: 'keyword'
            },
            unit_type: {
              type: 'keyword'
            }
          }
        }
      }
    },
    { ignore: [400] }
  );

  await elastic.indices.create(
    {
      index: 'player_activities',
      body: {
        mappings: {
          dynamic: 'strict',
          properties: {
            clanTag: {
              type: 'keyword'
            },
            tag: {
              type: 'keyword'
            },
            timestamp: {
              type: 'date'
            }
          }
        }
      }
    },
    { ignore: [400] }
  );

  await elastic.indices.create(
    {
      index: 'join_leave_events',
      body: {
        mappings: {
          properties: {
            clan_member_count: {
              type: 'long'
            },
            clan_name: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256
                }
              }
            },
            clan_tag: {
              type: 'keyword'
            },
            created_at: {
              type: 'date'
            },
            name: {
              type: 'text',
              fielddata: true
            },
            op: {
              type: 'keyword'
            },
            role: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256
                }
              }
            },
            tag: {
              type: 'keyword'
            }
          }
        }
      }
    },
    { ignore: [400] }
  );

  await elastic.indices.create(
    {
      index: 'war_pref_events',
      body: {
        mappings: {
          properties: {
            clan_name: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256
                }
              }
            },
            clan_tag: {
              type: 'keyword'
            },
            created_at: {
              type: 'date'
            },
            diff: {
              type: 'long'
            },
            name: {
              type: 'text',
              fielddata: true
            },
            op: {
              type: 'keyword'
            },
            role: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256
                }
              }
            },
            tag: {
              type: 'keyword'
            },
            value: {
              type: 'keyword'
            }
          }
        }
      }
    },
    { ignore: [400] }
  );

  await elastic.indices.create(
    {
      index: 'clan_member_event_logs',
      body: {
        mappings: {
          dynamic: 'strict',
          properties: {
            clan_name: {
              type: 'keyword'
            },
            clan_tag: {
              type: 'keyword'
            },
            created_at: {
              type: 'date'
            },
            diff: {
              type: 'long'
            },
            name: {
              type: 'keyword'
            },
            op: {
              type: 'keyword'
            },
            tag: {
              type: 'keyword'
            },
            value: {
              type: 'long'
            }
          }
        }
      }
    },
    { ignore: [400] }
  );

  await elastic.indices.create(
    {
      index: 'clan_event_logs',
      body: {
        mappings: {
          dynamic: 'strict',
          properties: {
            created_at: {
              type: 'date'
            },
            diff: {
              type: 'long'
            },
            name: {
              type: 'keyword'
            },
            op: {
              type: 'keyword'
            },
            tag: {
              type: 'keyword'
            },
            value: {
              type: 'long'
            }
          }
        }
      }
    },
    { ignore: [400] }
  );

  await elastic.indices.create(
    {
      index: 'user_linked_players',
      body: {
        mappings: {
          properties: {
            id: {
              type: 'keyword'
            },
            name: {
              type: 'text',
              fielddata: true
            },
            order: {
              type: 'integer'
            },
            tag: {
              type: 'text',
              fielddata: true
            },
            userId: {
              type: 'keyword'
            }
          }
        }
      }
    },
    { ignore: [400] }
  );

  await elastic.indices.create(
    {
      index: 'recently_searched_players',
      body: {
        mappings: {
          properties: {
            count: {
              type: 'integer'
            },
            lastSearch: {
              type: 'integer'
            },
            lastSearched: {
              type: 'long'
            },
            name: {
              type: 'text',
              fielddata: true
            },
            tag: {
              type: 'text',
              fielddata: true
            },
            userId: {
              type: 'keyword'
            }
          }
        }
      }
    },
    { ignore: [400] }
  );

  await elastic.indices.create(
    {
      index: 'recently_searched_clans',
      body: {
        mappings: {
          properties: {
            count: {
              type: 'integer'
            },
            lastSearch: {
              type: 'integer'
            },
            lastSearched: {
              type: 'long'
            },
            name: {
              type: 'text',
              fielddata: true
            },
            tag: {
              type: 'text',
              fielddata: true
            },
            userId: {
              type: 'keyword'
            }
          }
        }
      }
    },
    { ignore: [400] }
  );

  await elastic.indices.create(
    {
      index: 'guild_linked_clans',
      body: {
        mappings: {
          properties: {
            alias: {
              type: 'text',
              fielddata: true
            },
            guildId: {
              type: 'keyword'
            },
            id: {
              type: 'keyword'
            },
            name: {
              type: 'text',
              fielddata: true
            },
            order: {
              type: 'integer'
            },
            tag: {
              type: 'text',
              fielddata: true
            }
          }
        }
      }
    },
    { ignore: [400] }
  );

  await elastic.indices.create(
    {
      index: 'user_linked_clans',
      body: {
        mappings: {
          properties: {
            id: {
              type: 'keyword'
            },
            name: {
              type: 'text',
              fielddata: true
            },
            tag: {
              type: 'text',
              fielddata: true
            },
            userId: {
              type: 'keyword'
            }
          }
        }
      }
    },
    { ignore: [400] }
  );

  console.log('Indices created successfully!');
  elastic.close();
})();
