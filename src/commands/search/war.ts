import { APIClanWar, APIClanWarAttack, APIClanWarMember, APIWarClan } from 'clashofclans.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  MessageComponentInteraction,
  SelectMenuComponentOptionData,
  StringSelectMenuBuilder,
  User,
  escapeMarkdown
} from 'discord.js';
import moment from 'moment';
import { CallersEntity } from '../../entities/callers.entity.js';
import { Command } from '../../lib/handlers.js';
import { CreateGoogleSheet, createGoogleSheet } from '../../struct/google.js';
import { WarCommandOptionValues, WarCommandOptions } from '../../util/command.options.js';
import { Collections, WarType } from '../../util/constants.js';
import { EMOJIS, TOWN_HALLS, WHITE_NUMBERS } from '../../util/emojis.js';
import { getExportComponents } from '../../util/helper.js';
import { Util } from '../../util/toolkit.js';

const stars: Record<string, string> = {
  0: '☆☆☆',
  1: '★☆☆',
  2: '★★☆',
  3: '★★★'
};

export default class WarCommand extends Command {
  public constructor() {
    super('war', {
      category: 'war',
      channel: 'guild',
      clientPermissions: ['UseExternalEmojis', 'EmbedLinks'],
      defer: true
    });
  }

  public async exec(
    interaction: CommandInteraction<'cached'> | MessageComponentInteraction<'cached'>,
    args: {
      tag?: string;
      war_id?: number;
      user?: User;
      attacks?: boolean;
      open_bases?: boolean;
      openBases?: boolean;
      export?: boolean;
      selected?: WarCommandOptionValues;
    }
  ) {
    const clan = await this.client.resolver.resolveClan(interaction, args.tag ?? args.user?.id);
    if (!clan) return;

    if (args.attacks && args.war_id) {
      const collection = this.client.db.collection(Collections.CLAN_WARS);
      const body = await collection.findOne({ id: args.war_id });
      if (!body) return interaction.followUp({ content: 'No war found with that ID.', ephemeral: true });

      const clan = body.clan.tag === args.tag ? body.clan : body.opponent;
      const opponent = body.clan.tag === args.tag ? body.opponent : body.clan;

      const embed = this.attacks(interaction, { ...body, clan, opponent } as unknown as APIClanWar);
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    if ((args.open_bases || args.openBases) && args.war_id) {
      const collection = this.client.db.collection(Collections.CLAN_WARS);
      const body = await collection.findOne({ id: args.war_id });
      if (!body) return interaction.followUp({ content: 'No war found with that ID.', ephemeral: true });

      const clan = body.clan.tag === args.tag ? body.clan : body.opponent;
      const opponent = body.clan.tag === args.tag ? body.opponent : body.clan;

      const embed = await this.openBases(interaction, { ...body, clan, opponent } as unknown as APIClanWar);
      return interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    let body: APIClanWar | null = null;
    if (args.war_id) {
      const war = await this.getWar(args.war_id, clan.tag);
      if (!war) return interaction.editReply(this.i18n('command.war.no_war_id', { lng: interaction.locale }));
      body = war;
    }

    const embed = new EmbedBuilder()
      .setColor(this.client.embed(interaction))
      .setAuthor({ name: `\u200e${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.medium });

    if (!clan.isWarLogPublic && !interaction.isMessageComponent()) {
      const { res } = await this.client.http.getClanWarLeagueGroup(clan.tag);
      if (res.ok) {
        return this.handler.exec(interaction, this.handler.getCommand('cwl-round')!, { tag: clan.tag });
      }
      embed.setDescription('Private War Log');
      return interaction.followUp({ embeds: [embed] });
    }

    if (!body) {
      const { body: war, res } = await this.client.http.getCurrentWar(clan.tag);
      if (!res.ok) return interaction.followUp('**504 Request Timeout!**');
      body = war;
    }

    if (body.state === 'notInWar') {
      const { res } = await this.client.http.getClanWarLeagueGroup(clan.tag);
      if (res.ok) {
        return this.handler.exec(interaction, this.handler.getCommand('cwl-round')!, { tag: clan.tag });
      }
      embed.setDescription(this.i18n('command.war.not_in_war', { lng: interaction.locale }));
      return interaction.followUp({ embeds: [embed] });
    }

    if (args.selected === WarCommandOptions.ATTACKS) {
      const clan = body.clan.tag === args.tag ? body.clan : body.opponent;
      const opponent = body.clan.tag === args.tag ? body.opponent : body.clan;

      const embed = this.attacks(interaction, { ...body, clan, opponent } as unknown as APIClanWar);
      const components = this.getComponents({ body, selected: args.selected });
      return interaction.editReply({ embeds: [embed], components });
    }

    if (args.selected === WarCommandOptions.DEFENSES) {
      const opponent = body.clan.tag === args.tag ? body.clan : body.opponent;
      const clan = body.clan.tag === args.tag ? body.opponent : body.clan;

      const embed = this.attacks(interaction, { ...body, clan, opponent } as unknown as APIClanWar);
      const components = this.getComponents({ body, selected: args.selected });
      return interaction.editReply({ embeds: [embed], components });
    }

    if (args.selected === WarCommandOptions.OPEN_BASES) {
      const clan = body.clan.tag === args.tag ? body.clan : body.opponent;
      const opponent = body.clan.tag === args.tag ? body.opponent : body.clan;

      const embed = await this.openBases(interaction, { ...body, clan, opponent } as unknown as APIClanWar);
      const components = this.getComponents({ body, selected: args.selected });
      return interaction.editReply({ embeds: [embed], components });
    }

    if (args.export) {
      const components = this.getComponents({ body, selected: args.selected, exportDisabled: true });
      await interaction.editReply({ components });
      return this.export(interaction, body);
    }

    return this.sendResult(interaction, body);
  }

  private async getWar(id: number | string, tag: string) {
    const collection = this.client.db.collection(Collections.CLAN_WARS);
    const data =
      id === 'last'
        ? await collection.findOne(
            {
              $or: [{ 'clan.tag': tag }, { 'opponent.tag': tag }],
              warType: { $ne: WarType.CWL },
              state: 'warEnded'
            },
            { sort: { _id: -1 } }
          )
        : await collection.findOne({ id: Number(id), $or: [{ 'clan.tag': tag }, { 'opponent.tag': tag }] });

    if (!data) return null;

    const clan = data.clan.tag === tag ? data.clan : data.opponent;
    const opponent = data.clan.tag === tag ? data.opponent : data.clan;

    return { ...data, clan, opponent } as unknown as APIClanWar;
  }

  private async sendResult(
    interaction: CommandInteraction<'cached'> | MessageComponentInteraction<'cached'>,
    body: APIClanWar & { id?: number }
  ) {
    const embed = new EmbedBuilder()
      .setColor(this.client.embed(interaction))
      .setAuthor({ name: `\u200e${body.clan.name} (${body.clan.tag})`, iconURL: body.clan.badgeUrls.medium });

    if (body.state === 'preparation') {
      const startTimestamp = new Date(moment(body.startTime).toDate()).getTime();
      embed.setDescription(
        [
          '**War Against**',
          `\u200e${escapeMarkdown(body.opponent.name)} (${body.opponent.tag})`,
          '',
          '**War State**',
          'Preparation',
          `War Start Time: ${Util.getRelativeTime(startTimestamp)}`,
          '',
          '**War Size**',
          `${body.teamSize} vs ${body.teamSize}`
        ].join('\n')
      );
    }

    if (body.state === 'inWar') {
      const endTimestamp = new Date(moment(body.endTime).toDate()).getTime();
      embed.setDescription(
        [
          '**War Against**',
          `\u200e${escapeMarkdown(body.opponent.name)} (${body.opponent.tag})`,
          '',
          '**War State**',
          `Battle Day (${body.teamSize} vs ${body.teamSize})`,
          `End Time: ${Util.getRelativeTime(endTimestamp)}`,
          '',
          '**War Size**',
          `${body.teamSize} vs ${body.teamSize}`,
          '',
          '**War Stats**',
          `${this.getLeaderBoard(body.clan, body.opponent, body.attacksPerMember ?? 2)}`
        ].join('\n')
      );
    }

    if (body.state === 'warEnded') {
      const endTimestamp = new Date(moment(body.endTime).toDate()).getTime();
      embed.setDescription(
        [
          '**War Against**',
          `\u200e${escapeMarkdown(body.opponent.name)} (${body.opponent.tag})`,
          '',
          '**War State**',
          `War Ended (${body.teamSize} vs ${body.teamSize})`,
          `Ended: ${Util.getRelativeTime(endTimestamp)}`,
          '',
          '**War Stats**',
          `${this.getLeaderBoard(body.clan, body.opponent, body.attacksPerMember ?? 2)}`
        ].join('\n')
      );
    }

    embed.addFields([
      {
        name: 'Rosters',
        value: [`\u200e${escapeMarkdown(body.clan.name)}`, `${this.count(body.clan.members)}`].join('\n')
      },
      {
        name: '\u200b',
        value: [`\u200e${escapeMarkdown(body.opponent.name)}`, `${this.count(body.opponent.members)}`].join('\n')
      }
    ]);

    if (body.id) {
      embed.setFooter({ text: `War ID #${body.id}` });
    }

    const components = this.getComponents({ body, selected: WarCommandOptions.OVERVIEW });
    return interaction.editReply({ embeds: [embed], components: [...components] });
  }

  private getComponents({
    body,
    selected,
    exportDisabled
  }: {
    body: APIClanWar & { id?: number };
    selected?: WarCommandOptionValues;
    exportDisabled?: boolean;
  }) {
    const payload = {
      cmd: this.id,
      tag: body.clan.tag,
      war_id: body.id
    };

    const customIds = {
      refresh: this.createId(payload),
      menu: this.createId({ ...payload, string_key: 'selected' }),
      export: this.createId({ ...payload, export: true })
    };

    const primaryRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setEmoji(EMOJIS.REFRESH).setCustomId(customIds.refresh).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setEmoji(EMOJIS.EXPORT)
        .setStyle(ButtonStyle.Secondary)
        .setCustomId(customIds.export)
        .setDisabled(Boolean(exportDisabled))
    );

    const options: SelectMenuComponentOptionData[] = [
      {
        label: 'Attacks',
        description: 'View clan attacks.',
        value: WarCommandOptions.ATTACKS,
        emoji: EMOJIS.SWORD
      },
      {
        label: 'Defenses',
        description: 'View opponent attacks.',
        value: WarCommandOptions.DEFENSES,
        emoji: EMOJIS.SHIELD
      },
      {
        label: 'Open Bases',
        description: 'View open bases.',
        value: WarCommandOptions.OPEN_BASES,
        emoji: EMOJIS.EMPTY_STAR
      }
      // {
      // 	label: 'Lineup',
      // 	description: 'View clan lineup.',
      // 	value: WarCommandOptions.LINEUP,
      // 	emoji: EMOJIS.TOWN_HALL
      // },
      // {
      // 	label: 'Remaining',
      // 	description: 'View remaining attacks.',
      // 	value: WarCommandOptions.REMAINING,
      // 	emoji: EMOJIS.EMPTY_STAR
      // }
    ];

    if (selected && selected !== WarCommandOptions.OVERVIEW) {
      options.unshift({
        label: 'Overview',
        description: 'View war overview.',
        value: WarCommandOptions.OVERVIEW,
        emoji: EMOJIS.WAR
      });
    }

    const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(customIds.menu)
        .setPlaceholder('Select an option...')
        .setOptions(
          options.map((option) => ({
            ...option,
            default: option.value === selected
          }))
        )
    );

    return [primaryRow, menuRow];
  }

  private count(members: APIClanWarMember[] = []) {
    const reduced = members.reduce<{ [key: string]: number }>((count, member) => {
      const townHall = member.townhallLevel;
      count[townHall] = (count[townHall] || 0) + 1;
      return count;
    }, {});

    const townHalls = Object.entries(reduced)
      .map((entry) => ({ level: Number(entry[0]), total: Number(entry[1]) }))
      .sort((a, b) => b.level - a.level);

    return Util.chunk(townHalls, 5)
      .map((chunks) => chunks.map((th) => `${TOWN_HALLS[th.level]}${WHITE_NUMBERS[th.total]}`).join(' '))
      .join('\n');
  }

  private async export(interaction: CommandInteraction<'cached'> | MessageComponentInteraction<'cached'>, round: APIClanWar) {
    const data = this.flatHits(round);

    const sheets: CreateGoogleSheet[] = [
      {
        columns: [
          { name: 'NAME', width: 160, align: 'LEFT' },
          { name: 'TAG', width: 120, align: 'LEFT' },
          { name: 'STARS', width: 100, align: 'RIGHT' },
          { name: 'TRUE STARS', width: 100, align: 'RIGHT' },
          { name: 'DESTRUCTION', width: 100, align: 'RIGHT' },
          { name: 'DEFENDER', width: 160, align: 'LEFT' },
          { name: 'DEFENDER TAG', width: 120, align: 'LEFT' },
          { name: 'ATTACKER MAP', width: 100, align: 'RIGHT' },
          { name: 'ATTACKER TH', width: 100, align: 'RIGHT' },
          { name: 'DEFENDER MAP', width: 100, align: 'RIGHT' },
          { name: 'DEFENDER TH', width: 100, align: 'RIGHT' },
          { name: 'DEFENSE STAR', width: 100, align: 'RIGHT' },
          { name: 'DEFENSE DESTRUCTION', width: 100, align: 'RIGHT' }
        ],
        rows: data.map((m) => [
          m.name,
          m.tag,
          m.attack?.stars,
          m.attack?.trueStars,
          this.toFixed(m.attack?.destructionPercentage),
          m.defender?.name,
          m.defender?.tag,
          m.mapPosition,
          m.townhallLevel,
          m.defender?.mapPosition,
          m.defender?.townhallLevel,
          m.bestOpponentAttack?.stars,
          this.toFixed(m.bestOpponentAttack?.destructionPercentage)
        ]),
        title: `${round.clan.name} vs ${round.opponent.name}`
      }
    ];

    const spreadsheet = await createGoogleSheet(`${interaction.guild.name} [War Export]`, sheets);
    return interaction.followUp({
      ephemeral: true,
      content: `**War (${round.clan.name} vs ${round.opponent.name})**`,
      components: getExportComponents(spreadsheet)
    });
  }

  private toFixed(num: number) {
    if (!num) return num;
    return Number(num.toFixed(2));
  }

  private getLeaderBoard(clan: APIWarClan, opponent: APIWarClan, attacksPerMember: number) {
    const attacksTotal = Math.floor(clan.members.length * attacksPerMember);
    return [
      `\`\u200e${clan.stars.toString().padStart(8, ' ')} \u200f\`\u200e \u2002 ${EMOJIS.STAR} \u2002 \`\u200e ${opponent.stars
        .toString()
        .padEnd(8, ' ')}\u200f\``,
      `\`\u200e${`${clan.attacks}/${attacksTotal}`.padStart(8, ' ')} \u200f\`\u200e \u2002 ${
        EMOJIS.SWORD
      } \u2002 \`\u200e ${`${opponent.attacks}/${attacksTotal}`.padEnd(8, ' ')}\u200f\``,
      `\`\u200e${`${clan.destructionPercentage.toFixed(2)}%`.padStart(8, ' ')} \u200f\`\u200e \u2002 ${
        EMOJIS.FIRE
      } \u2002 \`\u200e ${`${opponent.destructionPercentage.toFixed(2)}%`.padEnd(8, ' ')}\u200f\``
    ].join('\n');
  }

  private flatHits(data: APIClanWar) {
    const __attacks = data.clan.members.flatMap((m) => m.attacks ?? []);
    const members = data.clan.members.map((member) => {
      const attacks = (member.attacks ?? []).map((atk) => {
        const previousBestAttack = this.getPreviousBestAttack(__attacks, data.opponent, atk);
        return {
          ...atk,
          trueStars: previousBestAttack ? Math.max(0, atk.stars - previousBestAttack.stars) : atk.stars
        };
      });

      return {
        ...member,
        attacks
      };
    });

    return members
      .sort((a, b) => a.mapPosition - b.mapPosition)
      .reduce<any[]>((previous, member) => {
        const atk = member.attacks.map((attack, num) => ({
          attack,
          tag: member.tag,
          name: member.name,
          mapPosition: member.mapPosition,
          townhallLevel: member.townhallLevel,
          bestOpponentAttack: num === 0 ? member.bestOpponentAttack : {},
          defender: data.opponent.members.find((m) => m.tag === attack.defenderTag)
        }));

        if (atk.length) {
          previous.push(...atk);
        } else {
          previous.push({
            tag: member.tag,
            name: member.name,
            mapPosition: member.mapPosition,
            townhallLevel: member.townhallLevel,
            bestOpponentAttack: member.bestOpponentAttack
          });
        }

        previous.push({});
        return previous;
      }, []);
  }

  private getPreviousBestAttack(attacks: APIClanWarAttack[], opponent: APIWarClan, atk: APIClanWarAttack) {
    const defender = opponent.members.find((m) => m.tag === atk.defenderTag)!;
    const defenderDefenses = attacks.filter((atk) => atk.defenderTag === defender.tag);
    const isFresh = defenderDefenses.length === 0 || atk.order === Math.min(...defenderDefenses.map((d) => d.order));
    const previousBestAttack = isFresh
      ? null
      : [...attacks]
          .filter((_atk) => _atk.defenderTag === defender.tag && _atk.order < atk.order && _atk.attackerTag !== atk.attackerTag)
          .sort((a, b) => b.destructionPercentage ** b.stars - a.destructionPercentage ** a.stars)
          .at(0) ?? null;
    return isFresh ? null : previousBestAttack;
  }

  private attacks(interaction: CommandInteraction<'cached'> | MessageComponentInteraction<'cached'>, body: APIClanWar) {
    const embed = new EmbedBuilder()
      .setColor(this.client.embed(interaction))
      .setAuthor({ name: `\u200e${body.clan.name} (${body.clan.tag})`, iconURL: body.clan.badgeUrls.medium });

    embed.setDescription(
      [
        embed.data.description,
        '',
        `**Total Attacks - ${body.clan.attacks}/${body.teamSize * (body.attacksPerMember ?? 1)}**`,
        `**\u200e\` # TH ${stars[3]} DEST ${'NAME'.padEnd(15, ' ')}\u200f\`**`,
        body.clan.members
          .sort((a, b) => a.mapPosition - b.mapPosition)
          .map((member, n) => ({ ...member, mapPosition: n + 1 }))
          .filter((m) => m.attacks?.length)
          .map((member) => {
            return member
              .attacks!.map((atk, i) => {
                const n = i === 0 ? member.mapPosition.toString() : ' ';
                const th = i === 0 ? member.townhallLevel.toString() : ' ';
                const name = i === 0 ? member.name : ' ';

                return `\`\u200e${this.index(n)} ${th.padStart(2, ' ')} ${stars[atk.stars]} ${this.percentage(
                  atk.destructionPercentage
                )}% ${this.padEnd(`${name}`)}\``;
              })
              .join('\n');
          })
          .join('\n')
      ].join('\n')
    );

    return embed;
  }

  private toDate(ISO: string) {
    return new Date(moment(ISO).toDate());
  }

  private createWarId(data: APIClanWar) {
    const ISO = this.toDate(data.preparationStartTime).toISOString().slice(0, 16);
    return `${ISO}-${[data.clan.tag, data.opponent.tag].sort((a, b) => a.localeCompare(b)).join('-')}`;
  }

  private async openBases(interaction: CommandInteraction<'cached'> | MessageComponentInteraction<'cached'>, body: APIClanWar) {
    const openBases = body.opponent.members
      .sort((a, b) => a.mapPosition - b.mapPosition)
      .map((member, n) => ({
        ...member,
        mapPosition: n + 1,
        originalMapPosition: member.mapPosition,
        stars: member.bestOpponentAttack?.stars ?? 0,
        isOpen: body.attacksPerMember === 1 ? !member.bestOpponentAttack : member.bestOpponentAttack?.stars !== 3,
        destructionPercentage: member.bestOpponentAttack?.destructionPercentage ?? 0
      }))
      .filter((m) => m.isOpen);

    const callerData = await this.client.db
      .collection<CallersEntity>(Collections.WAR_BASE_CALLS)
      .findOne({ warId: this.createWarId(body), guild: interaction.guildId });
    const caller = callerData?.caller ?? {};

    const embed = new EmbedBuilder()
      .setColor(this.client.embed(interaction))
      .setAuthor({ name: `\u200e${body.clan.name} (${body.clan.tag})`, iconURL: body.clan.badgeUrls.medium });
    embed.setDescription(
      [
        embed.data.description,
        '',
        `**Enemy Clan Open Bases - ${openBases.length}/${body.teamSize}**`,
        `**\u200e\`${stars[3]} DEST  # TH ${'Caller'.padEnd(15, ' ')}\u200f\`**`,
        openBases
          .map((member) => {
            const n = member.mapPosition.toString();
            const map = this.index(n);
            const th = member.townhallLevel.toString().padStart(2, ' ');
            const dest = this.percentage(member.destructionPercentage);
            const key = `${member.tag}-${member.originalMapPosition}`;
            const callerName = this.padEnd(caller[key]?.note ?? ''); // eslint-disable-line
            return `\u200e\`${stars[member.stars]} ${dest}% ${map} ${th} ${callerName}\``;
          })
          .join('\n'),
        '',
        `Use ${this.client.commands.get('/caller assign')} command to assign a caller to a base.`
      ].join('\n')
    );
    return embed;
  }

  private padEnd(name: string) {
    return Util.escapeBackTick(name).padEnd(15, ' ');
  }

  private index(num: number | string) {
    return num.toString().padStart(2, ' ');
  }

  private percentage(num: number) {
    return num.toString().padStart(3, ' ');
  }
}
