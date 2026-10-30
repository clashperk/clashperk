import { createGroq } from '@ai-sdk/groq';
import { createMCPClient, type MCPClient } from '@ai-sdk/mcp';
import { ASK_AGENT_INSTRUCTIONS } from '@app/constants';
import { generateText } from 'ai';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  MessageContextMenuCommandInteraction
} from 'discord.js';
import { Command } from '../../lib/handlers.js';

const DOCS_MCP_URL = 'https://docs.clashperk.com/~gitbook/mcp';
const GROQ_MODELS = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b'];

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
let mcpClient: Promise<MCPClient> | null = null;

function getMcpClient() {
  mcpClient ??= createMCPClient({ transport: { type: 'http', url: DOCS_MCP_URL } }).catch(
    (error) => {
      mcpClient = null;
      throw error;
    }
  );
  return mcpClient;
}

const NO_RESULTS =
  'No results were found. Visit our [documentation](<https://docs.clashperk.com>) to learn more or explore related topics.';

export default class AskCommand extends Command {
  public constructor() {
    super('ask', {
      category: 'config',
      channel: 'guild',
      defer: true
    });

    // Connect at startup so the first /ask doesn't pay for the MCP handshake.
    getMcpClient().catch(() => null);
  }

  public async exec(
    interaction:
      MessageContextMenuCommandInteraction<'cached'> | ChatInputCommandInteraction<'cached'>,
    args: { message: string }
  ) {
    if (!args.message?.length || !(args.message.length >= 5)) {
      return interaction.editReply(NO_RESULTS);
    }

    const content = await this.ask(args.message);
    if (!content) return interaction.editReply(NO_RESULTS);

    const targetUser = interaction.isContextMenuCommand()
      ? interaction.targetMessage.author
      : interaction.user;
    const row = this.getComponents(targetUser.id, interaction.user.id);

    const mention = ` ${targetUser.toString()}`;
    return interaction.editReply({
      components: [row],
      content: `${content.slice(0, 2000 - mention.length)}${mention}`
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

  private async ask(question: string) {
    const startedAt = Date.now();
    const context = await this.searchDocs(question).catch((error) => {
      this.client.logger.error(error, { label: 'ASK' });
      return null;
    });
    this.client.logger.info(
      `docs search: ${Date.now() - startedAt}ms, ${context ? `${context.length} chars` : 'no results'}`,
      { label: 'ASK' }
    );

    if (!context) return null;

    // Groq's free tier caps tokens per minute per model, so a burst falls through to the next one.
    for (const model of GROQ_MODELS) {
      try {
        return await this.askGroq(question, context, model);
      } catch (error) {
        this.client.logger.warn(`${model}: ${error}`, { label: 'ASK' });
      }
    }

    return null;
  }

  private async searchDocs(question: string) {
    const callSearch = async () =>
      (await getMcpClient()).callTool({
        name: 'searchDocumentation',
        arguments: { query: question.slice(0, 512) },
        options: { timeout: 10_000 }
      });

    // The server can expire an idle session, so retry once on a fresh client.
    const result = await callSearch().catch(() => {
      mcpClient = null;
      return callSearch();
    });
    const content = Array.isArray(result.content)
      ? (result.content as { type: string; text?: string }[])
      : [];
    const results = content.map((item) => (item.type === 'text' ? item.text : '')).join('\n');

    const urls = [...results.matchAll(/^Link: (\S+)/gm)].map((match) => match[1].split('#')[0]);
    const pageContents = await Promise.all(
      [...new Set(urls)].slice(0, 3).map(async (url) => {
        const res = await fetch(`${url.replace(/\/$/, '')}.md`, {
          signal: AbortSignal.timeout(10_000)
        });
        if (!res.ok) return '';
        const markdown = (await res.text()).replace(/^> For the complete documentation.*\n/m, '');
        return `<page url="${url}">\n${markdown.slice(0, 4000)}\n</page>`;
      })
    );

    if (!results) return null;
    return `Search results:\n${results.slice(0, 3000)}\n\nDocs pages:\n${pageContents.join('\n')}`;
  }

  private async askGroq(question: string, context: string, model: string) {
    const startedAt = Date.now();
    const { text, usage } = await generateText({
      model: groq(model),
      system: `${ASK_AGENT_INSTRUCTIONS}\n${context}`,
      prompt: question.slice(0, 2048),
      temperature: 0.2,
      maxOutputTokens: 1200,
      // Fall through to the next model on a 429 instead of waiting out a retry.
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(20_000),
      providerOptions: {
        groq: { reasoningEffort: model.startsWith('qwen/') ? 'none' : 'low' }
      }
    });
    this.client.logger.info(
      `${model}: ${Date.now() - startedAt}ms, ${usage.inputTokens ?? '?'} in + ${usage.outputTokens ?? '?'} out = ${usage.totalTokens ?? '?'} tokens`,
      { label: 'ASK' }
    );

    const content = text.trim();
    if (!content) throw new Error('Groq returned an empty answer');
    // Angle brackets stop Discord from embedding a preview for every link.
    return content.replace(/\]\((https?:\/\/[^)\s>]+)\)/g, '](<$1>)');
  }
}
