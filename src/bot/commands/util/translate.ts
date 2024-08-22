import { v2 } from '@google-cloud/translate';
import { ActionRowBuilder, CommandInteraction, Locale, StringSelectMenuBuilder } from 'discord.js';
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

  public async exec(interaction: CommandInteraction<'cached'>, args: { message: string; url: string; locale?: string }) {
    const text = args.message?.trim();
    if (!text) return interaction.reply({ ephemeral: true, content: 'There is no text to translate!' });

    const [translations] = await translate.translate(args.message, interaction.locale);

    const locales = [
      {
        code: interaction.locale === Locale.EnglishGB ? 'en-GB' : 'en-US',
        name: 'English'
      },
      {
        code: 'de',
        name: 'German (Deutsch)'
      },
      {
        code: 'fr',
        name: 'French (Français)'
      },
      {
        code: 'nl',
        name: 'Dutch (Nederlands)'
      },
      {
        code: 'es-ES',
        name: 'Spanish (Español)'
      }
    ];

    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .addOptions(locales.map((locale) => ({ label: locale.name, value: locale.code })))
        .setCustomId(this.createId({ cmd: this.id, string_key: 'locale', defer: false }))
    );

    const translatedText = translations
      .split('\n')
      .map((translation) => {
        return `> ${translation}`;
      })
      .join('\n');
    const sourceText = args.message
      .split('\n')
      .map((translation) => `-# ${translation}`)
      .join('\n');
    const content = `${translatedText} \n${sourceText}`;

    return interaction.reply({
      ephemeral: true,
      content: content.length > 2000 ? content.slice(0, 2000) : content
    });
  }
}
