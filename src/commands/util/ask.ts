import { ASK_AGENT_INSTRUCTIONS } from '@app/constants';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  MessageContextMenuCommandInteraction
} from 'discord.js';
import { Command } from '../../lib/handlers.js';

const GITBOOK_ORG_ID = 'quopd6hgTLS6pbOQ3351';
const GITBOOK_SITE_ID = 'site_62cse';
const DOCS_BASE_URL = 'https://docs.clashperk.com/';
const DOCS_MCP_URL = 'https://docs.clashperk.com/~gitbook/mcp';
const GROQ_MODELS = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b'];
const PAGE_CACHE_TTL = 60 * 60 * 1000;

const NO_RESULTS =
  'No results were found. Visit our [documentation](<https://docs.clashperk.com>) to learn more or explore related topics.';

interface DocLeaf {
  text: string;
  marks?: { type: string }[];
}

interface DocNode {
  object: 'block' | 'inline' | 'text';
  type?: string;
  key?: string;
  data?: { ref?: { kind: string; page?: string; space?: string; url?: string } };
  nodes?: DocNode[];
  leaves?: DocLeaf[];
}

interface DocPage {
  id: string;
  title: string;
  path?: string;
  pages?: DocPage[];
}

const pages = new Map<string, { title: string; url: string }>();
const spacesLoadedAt = new Map<string, number>();

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

    // Groq's free tier caps tokens per minute per model, so a burst falls through to the next one.
    if (context) {
      for (const model of GROQ_MODELS) {
        try {
          return await this.askGroq(question, context, model);
        } catch (error) {
          this.client.logger.warn(`${model}: ${error}`, { label: 'ASK' });
        }
      }
    }

    return this.askGitBook(question).catch((error) => {
      this.client.logger.error(error, { label: 'ASK' });
      return null;
    });
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

  private async askGitBook(question: string) {
    const res = await fetch(
      `https://api.gitbook.com/v1/orgs/${GITBOOK_ORG_ID}/sites/${GITBOOK_SITE_ID}/ai/response`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GITBOOK_API_TOKEN}`
        },
        body: JSON.stringify({
          model: 'fast',
          channel: { type: 'api' },
          input: [
            { role: 'developer', content: ASK_AGENT_INSTRUCTIONS },
            { role: 'user', content: question.slice(0, 2048) }
          ]
        }),
        signal: AbortSignal.timeout(60_000)
      }
    );
    if (!res.ok) throw new Error(`GitBook AI responded ${res.status}: ${await res.text()}`);

    // The stream re-sends each block as it grows; keep the latest version of each by key.
    const steps = new Map<number, DocNode[]>();
    const phases = new Map<number, string>();
    for (const line of (await res.text()).split('\n')) {
      if (!line.startsWith('data: {')) continue;
      const event = JSON.parse(line.slice(6));

      if (event.type === 'response_step_start') phases.set(event.stepIndex, event.phase);
      if (event.type !== 'response_document') continue;

      const blocks = steps.get(event.stepIndex) ?? [];
      for (const block of event.blocks as DocNode[]) {
        const index = blocks.findIndex((b) => b.key === block.key);
        if (index >= 0) blocks[index] = block;
        else blocks.push(block);
      }
      steps.set(event.stepIndex, blocks);
    }

    // Commentary steps are the agent narrating its searches ("I'll check the docs…").
    const blocks = [...steps]
      .filter(([step]) => phases.get(step) !== 'commentary')
      .flatMap(([, blocks]) => blocks);
    await this.loadPages(blocks);

    return blocks
      .map((block) => renderBlock(block))
      .join('\n')
      .trim();
  }

  private async loadPages(blocks: DocNode[]) {
    const spaceIds = new Set<string>();
    const collect = (node: DocNode) => {
      if (node.data?.ref?.kind === 'page' && node.data.ref.space) spaceIds.add(node.data.ref.space);
      node.nodes?.forEach(collect);
    };
    blocks.forEach(collect);

    for (const spaceId of spaceIds) {
      if (Date.now() - (spacesLoadedAt.get(spaceId) ?? 0) < PAGE_CACHE_TTL) continue;

      const res = await fetch(`https://api.gitbook.com/v1/spaces/${spaceId}/content`, {
        headers: { Authorization: `Bearer ${process.env.GITBOOK_API_TOKEN}` },
        signal: AbortSignal.timeout(10_000)
      });
      if (!res.ok) continue;

      const body = (await res.json()) as { pages: DocPage[] };
      const walk = (items?: DocPage[]) =>
        items?.forEach((page) => {
          pages.set(page.id, { title: page.title, url: `${DOCS_BASE_URL}${page.path ?? ''}` });
          walk(page.pages);
        });
      walk(body.pages);
      spacesLoadedAt.set(spaceId, Date.now());
    }
  }
}

function renderLeaf({ text, marks = [] }: DocLeaf) {
  if (!text.trim()) return text;
  const types = marks.map((mark) => mark.type);
  if (types.includes('code')) text = `\`${text}\``;
  if (types.includes('bold')) text = `**${text}**`;
  if (types.includes('italic')) text = `*${text}*`;
  return text;
}

function renderInline(nodes: DocNode[] = []): string {
  return nodes
    .map((node) => {
      if (node.object === 'text') return node.leaves?.map(renderLeaf).join('') ?? '';

      const ref = node.data?.ref;
      const page = ref?.kind === 'page' && ref.page ? pages.get(ref.page) : null;
      if (node.type === 'mention') return page ? `[${page.title}](<${page.url}>)` : '';
      if (node.type === 'link') {
        const url = page?.url ?? ref?.url;
        const text = renderInline(node.nodes);
        return url ? `[${text}](<${url}>)` : text;
      }
      return renderInline(node.nodes);
    })
    .join('');
}

function renderBlock(block: DocNode, prefix = ''): string {
  const children = block.nodes ?? [];
  switch (block.type) {
    case 'paragraph':
      return prefix + renderInline(children);
    case 'heading-1':
    case 'heading-2':
      return `## ${renderInline(children)}`;
    case 'heading-3':
      return `### ${renderInline(children)}`;
    case 'list-unordered':
    case 'list-ordered':
      return children
        .map((item, i) => {
          const bullet = block.type === 'list-ordered' ? `${i + 1}. ` : '- ';
          return (item.nodes ?? [])
            .map((child, j) => renderBlock(child, j === 0 ? bullet : '  '))
            .join('\n');
        })
        .join('\n');
    case 'code':
      return `\`\`\`${children.map((line) => renderInline(line.nodes)).join('\n')}\`\`\``;
    case 'blockquote':
      return children.map((child) => renderBlock(child, '> ')).join('\n');
    default:
      return children
        .map((child) => (child.object === 'block' ? renderBlock(child) : renderInline([child])))
        .join('\n');
  }
}
