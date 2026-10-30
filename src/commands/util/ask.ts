import { ASK_AGENT_INSTRUCTIONS } from '@app/constants';
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

const NO_RESULTS =
  'No results were found. Visit our [documentation](<https://docs.clashperk.com>) to learn more or explore related topics.';

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
    const context = await this.searchDocs(question).catch((error) => {
      this.client.logger.error(error, { label: 'ASK' });
      return null;
    });

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
    const res = await fetch(DOCS_MCP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'searchDocumentation', arguments: { query: question.slice(0, 512) } }
      }),
      signal: AbortSignal.timeout(10_000)
    });
    if (!res.ok) throw new Error(`Docs search responded ${res.status}`);

    const data = (await res.text()).split('\n').find((line) => line.startsWith('data: '));
    const result = data
      ? (JSON.parse(data.slice(6)) as { result?: { content?: { text: string }[] } }).result
      : null;
    const results = result?.content?.map((item) => item.text).join('\n') ?? '';

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
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_completion_tokens: 1200,
        reasoning_effort: model.startsWith('qwen/') ? 'none' : 'low',
        messages: [
          { role: 'system', content: `${ASK_AGENT_INSTRUCTIONS}\n${context}` },
          { role: 'user', content: question.slice(0, 2048) }
        ]
      }),
      signal: AbortSignal.timeout(20_000)
    });
    if (!res.ok) throw new Error(`Groq responded ${res.status}: ${await res.text()}`);

    const body = (await res.json()) as { choices: { message: { content: string } }[] };
    const content = body.choices[0]?.message.content?.trim();
    if (!content) throw new Error('Groq returned an empty answer');
    // Angle brackets stop Discord from embedding a preview for every link.
    return content.replace(/\]\((https?:\/\/[^)\s>]+)\)/g, '](<$1>)');
  }
}
