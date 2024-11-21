import { APIClanWarMember, APIWarClan } from 'clashofclans.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, User } from 'discord.js';
import { cluster } from 'radash';
import { Args, Command } from '../../lib/handlers.js';
import { BLUE_NUMBERS, EMOJIS, HERO_PETS, WHITE_NUMBERS } from '../../util/emojis.js';

const states: Record<string, string> = {
  inWar: 'Battle Day',
  preparation: 'Preparation',
  warEnded: 'War Ended'
};

export default class LineupCommand extends Command {
  public constructor() {
    super('lineup', {
      category: 'war',
      channel: 'guild',
      clientPermissions: ['UseExternalEmojis', 'EmbedLinks'],
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

  public async exec(interaction: CommandInteraction<'cached'>, args: { tag?: string; user?: User; player_list?: boolean }) {
    const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
    if (!clan) return;

    const embed = new EmbedBuilder()
      .setColor(this.client.embed(interaction))
      .setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.medium });

    if (!clan.isWarLogPublic) {
      const { res } = await this.client.coc.getClanWarLeagueGroup(clan.tag);
      if (res.ok) {
        // TODO: Fix
        return this.handler.exec(interaction, this.handler.getCommand('cwl-lineup')!, { tag: clan.tag });
      }
      embed.setDescription('Private WarLog');
      return interaction.editReply({ embeds: [embed] });
    }

    const { body, res } = await this.client.coc.getCurrentWar(clan.tag);
    if (!res.ok) return interaction.editReply('**504 Request Timeout!');

    if (body.state === 'notInWar') {
      const { res } = await this.client.coc.getClanWarLeagueGroup(clan.tag);
      if (res.ok) {
        // TODO: Fix
        return this.handler.exec(interaction, this.handler.getCommand('cwl-lineup')!, { tag: clan.tag });
      }
      embed.setDescription(this.i18n('command.lineup.not_in_war', { lng: interaction.locale }));
      return interaction.editReply({ embeds: [embed] });
    }

    const embeds = args.player_list
      ? this.getLineupList(body, body.state)
      : await this.getComparisonLineup(body.state, body.clan, body.opponent);
    for (const embed of embeds) embed.setColor(this.client.embed(interaction));

    const payload = {
      cmd: this.id,
      tag: clan.tag,
      player_list: args.player_list
    };

    const customIds = {
      refresh: this.createId(payload),
      toggle: this.createId({ ...payload, player_list: !args.player_list })
    };

    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setEmoji(EMOJIS.REFRESH).setStyle(ButtonStyle.Secondary).setCustomId(customIds.refresh),
      new ButtonBuilder()
        .setCustomId(customIds.toggle)
        .setLabel(args.player_list ? 'Compare' : 'Player List')
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.editReply({ embeds, components: [buttonRow] });
  }

  private async getComparisonLineup(state: string, clan: APIWarClan, opponent: APIWarClan) {
    const linups = await this.rosters(
      clan.members.sort((a, b) => a.mapPosition - b.mapPosition),
      opponent.members.sort((a, b) => a.mapPosition - b.mapPosition)
    );
    const embed = new EmbedBuilder();
    embed.setAuthor({ name: `\u200e${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.medium });

    embed.setDescription(
      [
        '**War Against**',
        `**\u200e${opponent.name} (${opponent.tag})**`,
        '',
        `\u200e${EMOJIS.HASH} \`TH HERO \u2002  \u2002 TH HERO \``,
        linups
          .map((lineup, i) => {
            const desc = lineup.map((en) => `${this.pad(en.t, 2)} ${this.pad(en.h, 4)}`).join(' \u2002vs\u2002 ');
            return `${BLUE_NUMBERS[i + 1]} \`${desc} \``;
          })
          .join('\n')
      ].join('\n')
    );
    embed.setFooter({ text: `${states[state]}` });

    return [embed];
  }

  private getLineupList(data: { clan: APIWarClan; opponent: APIWarClan }, state: string) {
    const embeds = [
      new EmbedBuilder()
        .setAuthor({
          name: `\u200e${data.clan.name} (${data.clan.tag})`,
          iconURL: data.clan.badgeUrls.medium,
          url: this.clanURL(data.clan.tag)
        })
        .setDescription(
          data.clan.members
            .sort((a, b) => a.mapPosition - b.mapPosition)
            .map((m, i) => `\u200e${WHITE_NUMBERS[i + 1]} [${m.name}](http://cprk.eu/p/${m.tag.replace('#', '')})`)
            .join('\n')
        )
        .setFooter({ text: `${states[state]}` }),

      new EmbedBuilder()
        .setAuthor({
          name: `\u200e${data.opponent.name} (${data.opponent.tag})`,
          iconURL: data.opponent.badgeUrls.medium,
          url: this.clanURL(data.opponent.tag)
        })
        .setDescription(
          data.opponent.members
            .sort((a, b) => a.mapPosition - b.mapPosition)
            .map((m, i) => `\u200e${WHITE_NUMBERS[i + 1]} [${m.name}](http://cprk.eu/p/${m.tag.replace('#', '')})`)
            .join('\n')
        )
        .setFooter({ text: `${states[state]}` })
    ];

    return embeds;
  }

  private async rosters(clanMembers: APIClanWarMember[], opponentMembers: APIClanWarMember[]) {
    const clanPlayers = await this.client.coc._getPlayers(clanMembers);
    const a = clanPlayers.map((m, i) => {
      const heroes = m.heroes.filter((en) => en.village === 'home');
      const pets = m.troops.filter((en) => en.village === 'home' && en.name in HERO_PETS);
      return {
        e: 0,
        m: i + 1,
        t: m.townHallLevel,
        p: pets.map((en) => en.level).reduce((prev, en) => en + prev, 0),
        h: heroes.map((en) => en.level).reduce((prev, en) => en + prev, 0)
        // .concat(...Array(4 - heroes.length).fill(' '))
      };
    });

    const opponentPlayers = await this.client.coc._getPlayers(opponentMembers);
    const b = opponentPlayers.map((m, i) => {
      const heroes = m.heroes.filter((en) => en.village === 'home');
      const pets = m.troops.filter((en) => en.village === 'home' && en.name in HERO_PETS);
      return {
        e: 1,
        m: i + 1,
        t: m.townHallLevel,
        p: pets.map((en) => en.level).reduce((prev, en) => en + prev, 0),
        h: heroes.map((en) => en.level).reduce((prev, en) => en + prev, 0)
        // .concat(...Array(4 - heroes.length).fill(' '))
      };
    });

    return cluster(
      [...a, ...b].sort((a, b) => a.e - b.e).sort((a, b) => a.m - b.m),
      2
    );
  }

  private pad(num: number, depth: number) {
    return num.toString().padStart(depth, ' ');
  }

  private clanURL(tag: string) {
    return `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(tag)}`;
  }
}
