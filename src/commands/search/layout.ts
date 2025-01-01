import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, CommandInteraction } from 'discord.js';
import { Command } from '../../lib/handlers.js';

const LAYOUT_REGEX = /https?:\/\/link.clashofclans.com\/[a-z]{1,2}[\/]?\?action=OpenLayout&id=TH[0-9]{1,2}.*$/;
const ARMY_URL_REGEX = /https?:\/\/link.clashofclans.com\/[a-z]{1,2}[\/]?\?action=CopyArmy&army=[u|s]([\d+x-])+[s|u]?([\d+x-])+/;

interface PredictionResult {
  id: string;
  project: string;
  iteration: string;
  created: string;
  predictions: {
    probability: number;
    tagId: string;
    tagName: string;
    boundingBox: {
      left: number;
      top: number;
      width: number;
      height: number;
    };
  }[];
}

export default class LayoutCommand extends Command {
  public constructor() {
    super('layout', {
      category: 'search',
      channel: 'guild',
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>,
    args: { screenshot: string; title?: string; layout_link: string; army_link?: string; render_army?: boolean }
  ) {
    if (interaction.isButton() && args.render_army) {
      const button = interaction.message.components.at(1)?.components.at(1);
      // @ts-expect-error it exists
      return this.handler.getCommand('army')?.exec(interaction, { link: button?.data.url });
    }

    if (!LAYOUT_REGEX.test(args.layout_link)) {
      return interaction.editReply({ content: 'Invalid base layout link was provided.' });
    }

    // const isValidLayout = await this.validateScreenshot(args.screenshot);
    // if (!isValidLayout) {
    //   return interaction.editReply({ content: 'Invalid base layout screenshot was provided.' });
    // }

    const layoutTypes: Record<string, string> = {
      'HV': 'Town Hall',
      'BB2': 'Builder Base',
      'CC:0': 'Capital Peak',
      'CC:1': 'Barbarian Champ',
      'CC:2': 'Wizard Valley',
      'CC:3': 'Ballon Lagoon',
      'CC:4': "Builder's Workshop",
      'CC:5': 'Dragon Cliff',
      'CC:6': 'Golem Quarry',
      'CC:7': 'Skeleton Park',
      'CC:8': 'Goblin Mines'
    };

    const layoutId = new URL(args.layout_link).searchParams.get('id')!;
    const [levelString, layoutType, buildingType] = layoutId.split(':');
    const level = levelString.replace('TH', '');
    const buildingLabel = ['HV', 'BB2'].includes(layoutType) ? layoutTypes[layoutType] : layoutTypes[`CC:${buildingType}`];

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Copy Layout').setURL(args.layout_link)
    );

    const armyRow = new ActionRowBuilder<ButtonBuilder>();
    const isValidArmyLink = args.army_link && ARMY_URL_REGEX.test(args.army_link);
    if (args.army_link && isValidArmyLink && layoutType === 'HV') {
      armyRow.addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Primary)
          .setLabel('View Army')
          .setCustomId(JSON.stringify({ cmd: this.id, render_army: true, defer: false })),
        new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Copy Army').setURL(args.army_link)
      );
    }

    return interaction.editReply({
      content: args.title ?? `## ${buildingLabel} ${level} Layout`,
      files: [new AttachmentBuilder(args.screenshot)],
      components: isValidArmyLink ? [row, armyRow] : [row]
    });
  }

  async validateScreenshot(screenshotUrl: string) {
    const res = await fetch(
      `https://southcentralus.api.cognitive.microsoft.com/customvision/v3.0/Prediction/2f3793f7-6f80-498c-aff0-87b69aba6f36/detect/iterations/Iteration2/url`,
      {
        headers: {
          'Prediction-Key': process.env.CUSTOM_VISION_PREDICTION_KEY!,
          'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify({ Url: screenshotUrl })
      }
    );
    const body = (await res.json()) as unknown as PredictionResult;
    return body.predictions.some((prediction) => prediction.probability * 100 >= 95);
  }
}
