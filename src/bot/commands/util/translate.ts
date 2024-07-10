import { v2 } from '@google-cloud/translate';
import { CommandInteraction } from 'discord.js';
import { Command } from '../../lib/index.js';

const translate = new v2.Translate({
  key: process.env.GOOGLE_TRANSLATION_KEY
});

export default class TranslateCommand extends Command {
  public constructor() {
    super('translate', {
      category: 'none',
      defer: false,
      ephemeral: true
    });
  }

  public async exec(interaction: CommandInteraction<'cached'>, args: { message: string; url: string }) {
    const text = args.message?.trim();
    if (!text) {
      return interaction.reply({ ephemeral: true, content: 'There is no text to translate!' });
    }
    const [translations] = await translate.translate(args.message, 'en');
    return interaction.reply({ ephemeral: true, content: [`> ${translations}`, `> ${args.url}`].join('\n') });
  }
}
