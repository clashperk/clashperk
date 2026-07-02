import { createDecipheriv } from 'crypto';
import {
  ApplicationCommand,
  RESTPostAPIApplicationCommandsJSONBody,
  RouteBases,
  Routes
} from 'discord.js';
import { writeFileSync } from 'fs';
import { unique } from 'radash';
import { inspect } from 'util';
import { flattenApplicationCommands } from '../src/helper/commands.helper.js';
import { COMMANDS, HIDDEN_COMMANDS, MAIN_BOT_ONLY_COMMANDS, PRIVATE_COMMANDS } from './commands.js';

const getClientId = (token: string) => Buffer.from(token.split('.')[0], 'base64').toString();

const CUSTOM_BOT_SERVER_ID = '1130572457175175293';
const SUPPORT_SERVER_ID = '509784317598105619';

const BETA_TESTERS = process.env.BETA_TESTERS?.split(',') ?? [];
const BETA_TESTING_GUILD_IDS = unique([SUPPORT_SERVER_ID, '609250675431309313', ...BETA_TESTERS]);

const decrypt = (value: string) => {
  const key = Buffer.from(process.env.CRYPTO_KEY!, 'hex');
  const iv = Buffer.from(process.env.CRYPTO_IV!, 'hex');
  const decipher = createDecipheriv('aes256', key, iv);
  return Buffer.concat([decipher.update(Buffer.from(value, 'hex')), decipher.final()]).toString();
};

function commandStructureValidationCheck(obj: Record<string, any>) {
  if (obj.name_localizations) {
    for (const [locale, name] of Object.entries(obj.name_localizations as Record<string, string>)) {
      if (name.length) {
        console.log(`Locale: ${locale}, Name: ${name}, Length: ${name.length}`);
      }
    }
  }

  if (obj.description_localizations) {
    for (const [locale, description] of Object.entries(
      obj.description_localizations as Record<string, string>
    )) {
      if (description.length > 100) {
        console.log(
          `Locale: ${locale}, Description: ${description}, Length: ${description.length}`
        );
      }
    }
  }

  if (obj.options) {
    obj.options.map(commandStructureValidationCheck);
  }
}

async function exportCommands(commands: ApplicationCommand[]) {
  const result = await flattenApplicationCommands(commands);

  const items = result.map((cmd) => ({
    name: cmd.name.substring(1),
    description: cmd.description,
    description_long: cmd.description_long,
    options: cmd.options
  }));

  items.sort((a, b) => a.name.localeCompare(b.name));
  writeFileSync('./scripts/assets/commands_export.json', JSON.stringify(items, null, 2));
}

const applicationGuildCommands = async (
  token: string,
  guildId: string,
  commands: RESTPostAPIApplicationCommandsJSONBody[]
) => {
  console.log(`Building guild application commands for ${guildId}`);
  const res = await fetch(
    `${RouteBases.api}${Routes.applicationGuildCommands(getClientId(token), guildId)}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commands)
    }
  );
  await res
    .json()
    .then((data) =>
      res.ok ? console.log(JSON.stringify(data)) : console.log(inspect(data, { depth: Infinity }))
    );
  console.log(`Updated ${COMMANDS.length} Guild Application Commands`);
};

const applicationCommands = async (
  token: string,
  commands: RESTPostAPIApplicationCommandsJSONBody[]
) => {
  console.log('Building global application commands', getClientId(token));
  const res = await fetch(`${RouteBases.api}${Routes.applicationCommands(getClientId(token))}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bot ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(commands)
  });
  const data = await res.json();

  if (res.ok) {
    console.log(JSON.stringify(data));
    exportCommands(data as ApplicationCommand[]);
  } else {
    console.log(inspect(data, { depth: Infinity }));
    commands.map(commandStructureValidationCheck);
  }

  console.log(`Updated ${commands.length} Application Commands`);
};

const customBotCommands = async () => {
  const res = await fetch(`${process.env.DOCKER_SERVICE_API_BASE_URL}/services`, {
    method: 'GET',
    headers: {
      'X-API-Key': process.env.DOCKER_SERVICE_API_KEY!,
      'Content-Type': 'application/json'
    }
  });

  const body = (await res.json()) as { payload: string };
  if (!body.payload) console.log(body);

  const applications = JSON.parse(decrypt(body.payload)) as {
    serviceId: string;
    token: string;
    guildIds: string[];
  }[];

  for (const application of applications) {
    for (const guildId of [...application.guildIds, CUSTOM_BOT_SERVER_ID]) {
      if (BETA_TESTING_GUILD_IDS.includes(guildId)) {
        await applicationGuildCommands(application.token, guildId, [
          ...COMMANDS,
          ...HIDDEN_COMMANDS
        ]);
        console.log(`Beta commands for client: ${application.serviceId} guild: ${guildId}`);
      } else {
        await applicationGuildCommands(application.token, guildId, [...COMMANDS]);
      }
    }
  }
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const customBotPublicCommands = async (commands: RESTPostAPIApplicationCommandsJSONBody[]) => {
  const res = await fetch(`${process.env.DOCKER_SERVICE_API_BASE_URL}/services`, {
    method: 'GET',
    headers: {
      'X-API-Key': process.env.DOCKER_SERVICE_API_KEY!,
      'Content-Type': 'application/json'
    }
  });

  const body = (await res.json()) as { payload: string };
  if (!body.payload) console.log(body);

  const applications = JSON.parse(decrypt(body.payload)) as { token: string }[];

  for (const application of applications) {
    await applicationCommands(application.token, commands);
  }
};

(async () => {
  const token = process.env.DISCORD_TOKEN!;
  if (process.argv.includes('--gh-action')) {
    await applicationCommands(token, [...COMMANDS, ...MAIN_BOT_ONLY_COMMANDS]);

    for (const guildId of BETA_TESTING_GUILD_IDS) {
      const commands =
        guildId === SUPPORT_SERVER_ID
          ? [...HIDDEN_COMMANDS, ...PRIVATE_COMMANDS]
          : [...HIDDEN_COMMANDS];

      await applicationGuildCommands(token, guildId, commands);
    }
    return;
  }

  if (process.argv.includes('--custom-bot')) {
    await customBotCommands();
    return;
  }

  await applicationCommands(token, [
    ...COMMANDS,
    ...MAIN_BOT_ONLY_COMMANDS,
    ...PRIVATE_COMMANDS,
    ...HIDDEN_COMMANDS
  ]);
})();
