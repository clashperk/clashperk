import { config } from 'dotenv';
config();

import { Collections } from '@app/constants';
import { Client, EmbedBuilder, GatewayIntentBits, WebhookClient } from 'discord.js';
import { PatreonMembersEntity } from '../src/entities/patrons.entity.js';
import { mongoClient } from '../src/struct/database.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on('clientReady', async () => {
  await mongoClient.connect().then(() => console.log('MongoDB Connected!'));
  const collection = mongoClient.db('clashperk').collection<PatreonMembersEntity>(Collections.PATREON_MEMBERS);
  const patrons = await collection.find().toArray();

  const channel = client.channels.cache.get('689103059455967251');
  if (!channel || !channel.isTextBased()) return;

  const messages = await channel.messages.fetch({ limit: 100 });
  const webhook = new WebhookClient({
    url: process.env.PATREON_DISCORD_WEBHOOK_URL!
  });

  let updatedCount = 0;
  for (const [, message] of messages.entries()) {
    if (!message.embeds.length) continue;

    const embed = new EmbedBuilder(message.embeds[0].toJSON());
    if (embed.data.author) continue;

    const patronId = embed.data.description?.match(/\(([^)]+)\)/)?.[1];
    const paton = patrons.find((p) => p.id === patronId);
    if (!paton) continue;

    if (embed.data.description && /<@!?(\d{17,19})>/.test(embed.data.description)) continue;

    const descriptionParts = embed.data.description!.split('\n\n');
    descriptionParts!.unshift(`<@${paton.userId}>`);

    if (paton.userId && paton.username) {
      embed.setDescription(descriptionParts?.join('\n\n'));
      if (!embed.data.author) embed.setAuthor({ name: `${paton.username} (${paton.userId})` });
    }

    await webhook.editMessage(message, { embeds: [embed] });
    updatedCount += 1;
    console.log(`Updated for ${paton.username} (${paton.userId})`);
  }

  console.log(`Updated ${updatedCount} patrons in the channel.`);
});

client.login(process.env.DISCORD_TOKEN);
