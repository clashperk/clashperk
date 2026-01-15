import { createCerebras } from '@ai-sdk/cerebras';
import { createMCPClient } from '@ai-sdk/mcp';
import { FeatureFlags, SYSTEM_PROMPT } from '@app/constants';
import { generateText, stepCountIs } from 'ai';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  MessageContextMenuCommandInteraction
} from 'discord.js';
import { Command } from '../../lib/handlers.js';

const cerebras = createCerebras({
  apiKey: process.env.CEREBRAS_API_KEY
});

export default class AskCommand extends Command {
  public constructor() {
    super('ask', {
      category: 'config',
      channel: 'guild',
      defer: true
    });
  }

  public async exec(
    interaction:
      | MessageContextMenuCommandInteraction<'cached'>
      | ChatInputCommandInteraction<'cached'>,
    args: { message: string }
  ) {
    if (!args.message?.length || !(args.message.length >= 5)) {
      return interaction.editReply(
        'No results were found. Visit our [documentation](<https://docs.clashperk.com>) to learn more or explore related topics.'
      );
    }

    const useMcpSearch = this.client.isFeatureEnabled(FeatureFlags.USE_MCP_SEARCH, 'global');
    const content = await (useMcpSearch
      ? this.askMcp(args.message)
      : this.askGitBook(args.message));

    if (!content)
      return interaction.editReply(
        'No results were found. Visit our [documentation](<https://docs.clashperk.com>) to learn more or explore related topics.'
      );

    const row = this.getComponents(
      interaction.isContextMenuCommand()
        ? interaction.targetMessage.author.id
        : interaction.user.id,
      interaction.user.id
    );

    return interaction.editReply({
      components: [row],
      content: `${content} ${interaction.isContextMenuCommand() ? interaction.targetMessage.author.toString() : interaction.user.toString()}` // .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    });
  }

  private getComponents(targetUserId: string, userId: string) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`action-consume:${targetUserId}:${userId}`)
        .setLabel('Helpful')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`action-delete:${targetUserId}:${userId}`)
        .setLabel('Not Helpful')
        .setStyle(ButtonStyle.Danger)
    );
  }

  private async askGitBook(message: string) {
    const res = await fetch(
      `https://api.gitbook.com/v1/orgs/quopd6hgTLS6pbOQ3351/ask?format=markdown&details=true`,
      {
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
            `PROMPT: ${message}`
          ].join('\n')
        })
      }
    );

    const body = (await res.json()) as { answer: { answer: { markdown: string } } };
    return body['answer']?.['answer']?.['markdown'];
  }

  private async askMcp(message: string) {
    const mcpClient = await createMCPClient({
      transport: {
        type: 'http',
        url: 'https://docs.clashperk.com/~gitbook/mcp'
      }
    });

    const tools = await mcpClient.tools();

    const result = await generateText({
      model: cerebras('gpt-oss-120b'),
      tools,
      stopWhen: stepCountIs(5),
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: [{ type: 'text', text: message }]
        }
      ],
      maxOutputTokens: 4000,
      onFinish: async () => {
        await mcpClient.close();
      }
    });

    return result.text;
  }
}
