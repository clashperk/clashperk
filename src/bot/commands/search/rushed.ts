import { APIClan, APIPlayer } from 'clashofclans.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  StringSelectMenuBuilder,
  User
} from 'discord.js';
import { Args, Command } from '../../lib/index.js';
import { TroopJSON } from '../../types/index.js';
import { BUILDER_TROOPS, EMOJIS, HOME_TROOPS, TOWN_HALLS } from '../../util/_emojis.js';
import { getMenuFromMessage, unitsFlatten } from '../../util/_Helper.js';
import { RAW_TROOPS_FILTERED, RAW_TROOPS_WITH_ICONS } from '../../util/_Troops.js';
import { Util } from '../../util/index.js';

export default class RushedCommand extends Command {
  public constructor() {
    super('rushed', {
      category: 'search',
      channel: 'dm',
      clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
      defer: true
    });
  }

  public args(): Args {
    return {
      player_tag: {
        id: 'tag',
        match: 'STRING'
      }
    };
  }

  public async exec(interaction: CommandInteraction | ButtonInteraction<'cached'>, args: { clan_tag?: string; tag?: string; user?: User }) {
    if (args.clan_tag && interaction.inCachedGuild()) {
      const clan = await this.client.resolver.resolveClan(interaction, args.clan_tag);
      if (!clan) return null;
      return this.clan(interaction, clan);
    }

    const data = await this.client.resolver.resolvePlayer(interaction, args.tag ?? args.user?.id);
    if (!data) return null;

    const embed = this.embed(data, interaction.locale).setColor(this.client.embed(interaction));
    if (!interaction.isMessageComponent()) await interaction.editReply({ embeds: [embed] });
    if (!interaction.inCachedGuild()) return;

    const payload = {
      cmd: this.id,
      tag: data.tag
    };

    const customIds = {
      accounts: JSON.stringify({ ...payload, string_key: 'tag' }),
      refresh: JSON.stringify({ ...payload }),
      units: JSON.stringify({ ...payload, cmd: 'units' }),
      upgrades: JSON.stringify({ ...payload, cmd: 'upgrades' }),
      player: JSON.stringify({ ...payload, cmd: 'player' })
    };

    const refreshButton = new ButtonBuilder().setEmoji(EMOJIS.REFRESH).setStyle(ButtonStyle.Secondary).setCustomId(customIds.refresh);
    const mainRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(refreshButton)
      .addComponents(new ButtonBuilder().setLabel('Units').setStyle(ButtonStyle.Primary).setCustomId(customIds.units))
      .addComponents(new ButtonBuilder().setLabel('Upgrades').setStyle(ButtonStyle.Primary).setCustomId(customIds.upgrades))
      .addComponents(new ButtonBuilder().setLabel('Profile').setStyle(ButtonStyle.Primary).setCustomId(customIds.player));

    if (interaction.isMessageComponent()) {
      return interaction.editReply({
        embeds: [embed],
        components: [mainRow, ...getMenuFromMessage(interaction, data.tag, customIds.accounts)]
      });
    }

    const players = data.user ? await this.client.resolver.getPlayers(data.user.id) : [];
    const options = players.map((op) => ({
      description: op.tag,
      label: op.name,
      value: op.tag,
      default: op.tag === data.tag,
      emoji: TOWN_HALLS[op.townHallLevel]
    }));

    const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder().setCustomId(customIds.accounts).setPlaceholder('Select an account!').addOptions(options)
    );

    return interaction.editReply({ embeds: [embed], components: options.length > 1 ? [mainRow, menuRow] : [mainRow] });
  }

  private embed(data: APIPlayer, locale: string) {
    const embed = new EmbedBuilder().setAuthor({ name: `${data.name} (${data.tag})` });

    const apiTroops = unitsFlatten(data);
    const Troops = RAW_TROOPS_WITH_ICONS.filter((unit) => {
      const apiTroop = apiTroops.find((u) => u.name === unit.name && u.village === unit.village && u.type === unit.category);
      const homeTroops = unit.village === 'home' && unit.levels[data.townHallLevel - 2] > (apiTroop?.level ?? 0);
      // const builderTroops = unit.village === 'builderBase' && unit.levels[data.builderHallLevel! - 2] > (apiTroop?.level ?? 0);
      // return Boolean(homeTroops || builderTroops);
      return Boolean(homeTroops);
    });

    const TroopsObj = Troops.reduce<TroopJSON>((prev, curr) => {
      const unlockBuilding = curr.category === 'hero' ? (curr.village === 'home' ? 'Town Hall' : 'Builder Hall') : curr.unlock.building;
      if (!(unlockBuilding in prev)) prev[unlockBuilding] = [];
      prev[unlockBuilding].push(curr);
      return prev;
    }, {});

    const titles: Record<string, string> = {
      'Barracks': 'Elixir Troops',
      'Dark Barracks': 'Dark Troops',
      'Spell Factory': 'Elixir Spells',
      'Dark Spell Factory': 'Dark Spells',
      'Town Hall': 'Heroes',
      'Pet House': 'Pets',
      'Workshop': 'Siege Machines',
      'Blacksmith': 'Equipment'
      // 'Builder Hall': 'Builder Base Hero',
      // 'Builder Barracks': 'Builder Troops'
    };

    const units = [];
    const indexes = Object.values(titles);
    for (const [key, value] of Object.entries(TroopsObj)) {
      const title = titles[key];
      units.push({
        index: indexes.indexOf(title),
        title,
        units: value
      });
    }

    for (const category of units.sort((a, b) => a.index - b.index)) {
      const unitsArray = category.units.map((unit) => {
        const hallLevel = unit.village === 'home' ? data.townHallLevel : data.builderHallLevel;
        const { maxLevel, level: _level } = apiTroops.find(
          (u) => u.name === unit.name && u.village === unit.village && u.type === unit.category
        ) ?? { maxLevel: unit.levels[unit.levels.length - 1], level: 0 };

        const level = _level === 0 ? 0 : Math.max(_level, unit.minLevel ?? _level);

        return {
          type: unit.category,
          village: unit.village,
          name: unit.name,
          level,
          hallMaxLevel: unit.levels[hallLevel! - 2],
          maxLevel: Math.max(unit.levels[unit.levels.length - 1], maxLevel)
        };
      });

      if (unitsArray.length) {
        embed.addFields([
          {
            name: `${category.title} (${unitsArray.length})`,
            value: Util.chunk(unitsArray, 4)
              .map((chunks) =>
                chunks
                  .map((unit) => {
                    const unitIcon = (unit.village === 'home' ? HOME_TROOPS : BUILDER_TROOPS)[unit.name];
                    const level = this.padStart(unit.level);
                    const maxLevel = this.padEnd(unit.hallMaxLevel);
                    return `${unitIcon} \`\u200e${level}/${maxLevel}\u200f\``;
                  })
                  .join(' ')
              )
              .join('\n')
          }
        ]);
      }
    }

    embed.setDescription(
      [
        `Rushed units for Town Hall ${data.townHallLevel}`,
        'Rushed = Not maxed for the previous Town Hall level.',
        '',
        '**Percentage**',
        `${this.rushedPercentage(data)}% (Lab)`,
        `${this.heroRushed(data)}% (Hero)`,
        `${this.rushedOverall(data)}% (Overall) (equipment are excluded)`,
        '\u200b'
      ].join('\n')
    );

    if (embed.data.fields?.length) {
      embed.setFooter({ text: `Total ${this.totalPercentage(data.townHallLevel, Troops.length)}` });
    } else {
      embed.setDescription(this.i18n('command.rushed.no_rushed', { lng: locale, townhall: data.townHallLevel.toString() }));
    }
    return embed;
  }

  private async clan(interaction: CommandInteraction<'cached'> | ButtonInteraction<'cached'>, data: APIClan) {
    if (data.members < 1) {
      return interaction.editReply(this.i18n('common.no_clan_members', { lng: interaction.locale, clan: data.name }));
    }

    const fetched = await this.client.http._getPlayers(data.memberList);
    const members = [];
    for (const obj of fetched) {
      members.push({ name: obj.name, rushed: this.reduce(obj), townHallLevel: obj.townHallLevel });
    }

    const embed = new EmbedBuilder().setAuthor({ name: `${data.name} (${data.tag})` }).setDescription(
      [
        'Rushed Percentage',
        '```\u200eTH   LAB  HERO  NAME',
        members
          .sort((a, b) => Number(b.rushed.overall) - Number(a.rushed.overall))
          .map((en) => `${this.padding(en.townHallLevel)}  ${this.per(en.rushed.lab)}  ${this.per(en.rushed.hero)}  ${en.name}`)
          .join('\n'),
        '```'
      ].join('\n')
    );

    return interaction.editReply({ embeds: [embed] });
  }

  private per(num: number) {
    if (Number(num) === 100) return '100%';
    return Math.round(num).toFixed(0).concat('%').padStart(4, ' ');
  }

  private padding(num: number) {
    return num.toFixed(0).padStart(2, ' ');
  }

  private reduce(data: APIPlayer) {
    return {
      overall: this.rushedOverall(data),
      lab: this.rushedPercentage(data),
      hero: this.heroRushed(data)
    };
  }

  private padEnd(num: number) {
    return num.toString().padEnd(2, ' ');
  }

  private padStart(num: number) {
    return num.toString().padStart(2, ' ');
  }

  private rushedPercentage(data: APIPlayer) {
    const apiTroops = unitsFlatten(data);
    const rem = RAW_TROOPS_FILTERED.reduce(
      (prev, unit) => {
        const apiTroop = apiTroops.find((u) => u.name === unit.name && u.village === unit.village && u.type === unit.category);
        if (unit.village === 'home' && unit.category !== 'hero') {
          prev.levels += Math.min(apiTroop?.level ?? 0, unit.levels[data.townHallLevel - 2]);
          prev.total += unit.levels[data.townHallLevel - 2];
        }
        return prev;
      },
      { total: 0, levels: 0 }
    );
    if (rem.total === 0) return 0;
    return Number((100 - (rem.levels * 100) / rem.total).toFixed(2));
  }

  private heroRushed(data: APIPlayer) {
    const apiTroops = unitsFlatten(data);
    const rem = RAW_TROOPS_FILTERED.reduce(
      (prev, unit) => {
        const apiTroop = apiTroops.find((u) => u.name === unit.name && u.village === unit.village && u.type === unit.category);
        if (unit.category === 'hero' && unit.village === 'home') {
          prev.levels += Math.min(apiTroop?.level ?? 0, unit.levels[data.townHallLevel - 2]);
          prev.total += unit.levels[data.townHallLevel - 2];
        }
        return prev;
      },
      { total: 0, levels: 0 }
    );
    if (rem.total === 0) return 0;
    return Number((100 - (rem.levels * 100) / rem.total).toFixed(2));
  }

  private rushedOverall(data: APIPlayer) {
    const apiTroops = unitsFlatten(data);
    const rem = RAW_TROOPS_FILTERED.reduce(
      (prev, unit) => {
        const apiTroop = apiTroops.find((u) => u.name === unit.name && u.village === unit.village && u.type === unit.category);
        if (unit.village === 'home') {
          prev.levels += Math.min(apiTroop?.level ?? 0, unit.levels[data.townHallLevel - 2]);
          prev.total += unit.levels[data.townHallLevel - 2];
        }
        return prev;
      },
      { total: 0, levels: 0 }
    );
    if (rem.total === 0) return 0;
    return Number((100 - (rem.levels * 100) / rem.total).toFixed(2));
  }

  private totalPercentage(hallLevel: number, rushed: number) {
    const totalTroops = RAW_TROOPS_FILTERED.filter((unit) => unit.village === 'home' && unit.levels[hallLevel - 2] > 0);
    return `${rushed}/${totalTroops.length} (${((rushed * 100) / totalTroops.length).toFixed(2)}%)`;
  }
}
