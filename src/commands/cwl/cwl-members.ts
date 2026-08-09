import { APIPlayerItem } from 'clashofclans.js';
import { CommandInteraction, EmbedBuilder, escapeInlineCode, User } from 'discord.js';
import { Args, Command } from '../../lib/handlers.js';
import { padStart } from '../../util/helper.js';

export default class CWLMembersCommand extends Command {
  public constructor() {
    super('cwl-members', {
      category: 'cwl',
      clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
      defer: true
    });
  }

  public args(): Args {
    return {
      clan: {
        id: 'tag',
        match: 'STRING'
      }
    };
  }

  public async exec(
    interaction: CommandInteraction<'cached'>,
    args: { tag?: string; user?: User }
  ) {
    const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
    if (!clan) return;

    const { body, res } = await this.client.coc.getClanWarLeagueGroup(clan.tag);
    if (res.status === 504 || body.state === 'notInWar') {
      return interaction.editReply(
        this.i18n('command.cwl.still_searching', {
          lng: interaction.locale,
          clan: `${clan.name} (${clan.tag})`
        })
      );
    }

    if (!res.ok) {
      return interaction.editReply(
        this.i18n('command.cwl.not_in_season', {
          lng: interaction.locale,
          clan: `${clan.name} (${clan.tag})`
        })
      );
    }

    const clanMembers = body.clans.find((_clan) => _clan.tag === clan.tag)!.members;
    const fetched = await this.client.coc._getPlayers(clanMembers);
    const memberList = fetched.map((data) => ({
      name: data.name,
      tag: data.tag,
      townHallLevel: data.townHallLevel,
      heroes: data.heroes.length ? data.heroes.filter((a) => a.village === 'home') : []
    }));

    let members = '';
    const embed = new EmbedBuilder().setColor(this.client.embed(interaction)).setAuthor({
      name: `${clan.name} (${clan.tag})`,
      iconURL: clan.badgeUrls.medium
    });

    memberList.sort((a, b) => b.townHallLevel - a.townHallLevel);
    memberList.forEach((member, idx) => {
      members += `\u200e${padStart(idx + 1, 2)}  ${padStart(member.townHallLevel, 2)}  ${padStart(this.heroes(member.heroes), 4)}  ${escapeInlineCode(member.name)}`;
      members += '\n';
    });

    const header = ` #  TH  HERO  PLAYER`;
    embed.setDescription(`\`\`\`\u200e${header}\n${members}\`\`\``);
    embed.setFooter({ text: `Total: ${memberList.length}` });

    return interaction.editReply({ embeds: [embed] });
  }

  private heroes(items: APIPlayerItem[]) {
    return items.reduce((record, hero) => {
      record += hero.level;
      return record;
    }, 0);
  }
}
