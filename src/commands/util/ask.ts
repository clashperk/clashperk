import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageContextMenuCommandInteraction } from 'discord.js';
import { Command } from '../../lib/handlers.js';
import { createInteractionCollector } from '../../util/pagination.js';

export default class AskCommand extends Command {
  public constructor() {
    super('ask', {
      category: 'config',
      channel: 'guild',
      defer: true
    });
  }

  public async exec(interaction: MessageContextMenuCommandInteraction<'cached'>, args: { message: string }) {
    if (!args.message?.length || !(args.message.length >= 5)) {
      return interaction.editReply(
        'No results were found. Visit our [documentation](https://docs.clashperk.com) to learn more or explore related topics.'
      );
    }

    const res = await fetch(`https://api.gitbook.com/v1/orgs/quopd6hgTLS6pbOQ3351/ask?format=markdown&details=true`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Authorization': `Bearer ${process.env.GITBOOK_API_TOKEN}`
      },
      method: 'POST',
      body: JSON.stringify({
        query: [
          `INSTRUCTIONS:`,
          `- DO NOT PROVIDE ANY HYPERLINKS`,
          '- DO NOT PROVIDE ANY REFERENCE ABOUT LINKS',
          '- DO NOT SHOW ANY EXAMPLES IN CODE BLOCK',
          `PROMPT: ${args.message}`
        ].join('\n')
      })
    });

    const body = (await res.json()) as { answer: { answer: { markdown: string } } };
    const content = body['answer']?.['answer']?.['markdown'];
    if (!content)
      return interaction.editReply(
        'No results were found. Visit our [documentation](https://docs.clashperk.com) to learn more or explore related topics.'
      );

    const customIds = {
      accept: this.client.uuid(),
      ignore: this.client.uuid()
    };

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(customIds.accept).setLabel('Helpful').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(customIds.ignore).setLabel('Not Helpful').setStyle(ButtonStyle.Danger)
    );

    const msg = await interaction.editReply({
      components: [row],
      content: content.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    });

    createInteractionCollector({
      customIds,
      interaction,
      message: msg,
      clear: true,
      onClick: async (action) => {
        await action.deferUpdate();
        const isAuthorized =
          [interaction.user.id, interaction.targetMessage.author.id].includes(action.user.id) || this.client.util.isManager(action.member);

        if (action.customId === customIds.ignore && isAuthorized) {
          await action.deleteReply(msg.id);
        }

        if (action.customId === customIds.accept && isAuthorized) {
          await action.editReply({ components: [] });
        }
      }
    });
  }
}
