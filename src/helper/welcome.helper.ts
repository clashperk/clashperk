import { EmbedBuilder } from 'discord.js';
import { container } from 'tsyringe';
import { Client } from '../struct/client.js';

export const welcomeEmbedMaker = () => {
  const client = container.resolve(Client);
  const embed = new EmbedBuilder()
    .setDescription(
      [
        '### Greetings!',
        `- Let's start with ${client.commands.SETUP_CLAN} command to link your clan or enable features.`,
        `- Then ${client.commands.LINK_CREATE} command to link your Clash of Clans account to your Discord.`,
        `- That's it! You are ready to use the bot!`,
        '',
        `- Join [Support Server](https://discord.gg/ppuppun) if you need any help or visit our [Website](https://clashperk.com) for a guide.`,
        `- If you like the bot, you can support us on [Patreon](https://www.patreon.com/clashperk)`
      ].join('\n')
    )
    .setImage('https://i.imgur.com/jcWPjDf.png');

  return embed;
};
