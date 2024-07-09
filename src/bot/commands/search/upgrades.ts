import { APIPlayer } from 'clashofclans.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  EmbedBuilder,
  StringSelectMenuBuilder,
  User,
  embedLength
} from 'discord.js';
import { Args, Command } from '../../lib/index.js';
import { TroopJSON } from '../../types/index.js';
import { BUILDER_TROOPS, EMOJIS, HOME_TROOPS, TOWN_HALLS } from '../../util/emojis.js';
import { getMenuFromMessage, unitsFlatten } from '../../util/helper.js';
import { RAW_TROOPS_WITH_ICONS } from '../../util/troops.js';
import { Util } from '../../util/util.js';

export const EN_ESCAPE = '\u2002';

export const resourceMap = {
  'Elixir': EMOJIS.ELIXIR,
  'Dark Elixir': EMOJIS.DARK_ELIXIR,
  'Gold': EMOJIS.GOLD,
  'Builder Elixir': EMOJIS.BUILDER_ELIXIR,
  'Builder Gold': EMOJIS.BUILDER_GOLD
};

export default class UpgradesCommand extends Command {
  public constructor() {
    super('upgrades', {
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

  public async exec(
    interaction: CommandInteraction | ButtonInteraction<'cached'>,
    args: { tag?: string; user?: User; equipment?: boolean }
  ) {
    const data = await this.client.resolver.resolvePlayer(interaction, args.tag ?? args.user?.id);
    if (!data) return;

    const embed = this.embed(data, args.equipment).setColor(this.client.embed(interaction));
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
      player: JSON.stringify({ ...payload, cmd: 'player' }),
      rushed: JSON.stringify({ ...payload, cmd: 'rushed' }),
      equipment: JSON.stringify({ ...payload, equipment: !args.equipment })
    };

    const maxButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(customIds.equipment)
        .setLabel(args.equipment ? 'Remaining Troops' : 'Remaining Equipment')
        .setStyle(ButtonStyle.Secondary)
    );

    const refreshButton = new ButtonBuilder().setEmoji(EMOJIS.REFRESH).setStyle(ButtonStyle.Secondary).setCustomId(customIds.refresh);
    const mainRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(refreshButton)
      .addComponents(new ButtonBuilder().setLabel('Units').setStyle(ButtonStyle.Primary).setCustomId(customIds.units))
      .addComponents(new ButtonBuilder().setLabel('Profile').setStyle(ButtonStyle.Primary).setCustomId(customIds.player))
      .addComponents(new ButtonBuilder().setLabel('Rushed').setStyle(ButtonStyle.Primary).setCustomId(customIds.rushed));

    if (interaction.isMessageComponent()) {
      return interaction.editReply({
        embeds: [embed],
        components: [maxButtonRow, mainRow, ...getMenuFromMessage(interaction, data.tag, customIds.accounts)]
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

    return interaction.editReply({
      embeds: [embed],
      components: options.length > 1 ? [maxButtonRow, mainRow, menuRow] : [maxButtonRow, mainRow]
    });
  }

  public embed(data: APIPlayer, equipmentOnly?: boolean) {
    const embed = new EmbedBuilder()
      .setAuthor({ name: `${data.name} (${data.tag})` })
      .setDescription(
        [
          `Remaining upgrades at TH ${data.townHallLevel} ${data.builderHallLevel ? `& BH ${data.builderHallLevel}` : ''}`,
          'Total time & cost of the remaining units',
          'for the current TH/BH level.',
          'R = Rushed (Not maxed for the previous TH/BH)'
        ].join('\n')
      );

    const getCharacterBuilding = (unit: TroopJSON[string][number]) => {
      if (unit.allowedCharacters.includes('Barbarian King')) {
        return 'Blacksmith_bk';
      }
      if (unit.allowedCharacters.includes('Archer Queen')) {
        return 'Blacksmith_aq';
      }
      if (unit.allowedCharacters.includes('Grand Warden')) {
        return 'Blacksmith_gw';
      }
      if (unit.allowedCharacters.includes('Royal Champion')) {
        return 'Blacksmith_rc';
      }
      return 'Blacksmith';
    };

    const apiTroops = unitsFlatten(data);
    const Troops = RAW_TROOPS_WITH_ICONS.filter((unit) => {
      const apiTroop = apiTroops.find((u) => u.name === unit.name && u.village === unit.village && u.type === unit.category);
      const homeTroops = unit.village === 'home' && unit.levels[data.townHallLevel - 1] > (apiTroop?.level ?? 0);
      const builderTroops = unit.village === 'builderBase' && unit.levels[data.builderHallLevel! - 1] > (apiTroop?.level ?? 0);
      return Boolean(homeTroops || builderTroops);
    }).reduce<TroopJSON>((prev, curr) => {
      const unlockBuilding =
        curr.category === 'hero'
          ? curr.village === 'home'
            ? curr.name === 'Grand Warden'
              ? 'Elixir Hero'
              : 'Dark Hero'
            : 'Builder Hall'
          : curr.category === 'equipment'
            ? getCharacterBuilding(curr)
            : curr.unlock.building;
      if (!(unlockBuilding in prev)) prev[unlockBuilding] = [];
      prev[unlockBuilding].push(curr);
      return prev;
    }, {});

    const rem = RAW_TROOPS_WITH_ICONS.reduce(
      (prev, unit) => {
        const apiTroop = apiTroops.find((u) => u.name === unit.name && u.village === unit.village && u.type === unit.category);
        if (unit.village === 'home') {
          prev.levels += apiTroop?.level ?? 0;
          prev.total += unit.levels[data.townHallLevel - 1];
        }
        return prev;
      },
      { total: 0, levels: 0 }
    );
    const remaining = Number((100 - (rem.levels * 100) / rem.total).toFixed(2));

    const _troops: Record<string, string> = {
      'Barracks': `${EMOJIS.ELIXIR} Elixir Troops`,
      'Dark Barracks': `${EMOJIS.DARK_ELIXIR} Dark Troops`,
      'Spell Factory': `${EMOJIS.ELIXIR} Elixir Spells`,
      'Dark Spell Factory': `${EMOJIS.DARK_ELIXIR} Dark Spells`
    };
    const _heroes: Record<string, string> = {
      'Dark Hero': `${EMOJIS.DARK_ELIXIR} Heroes`,
      'Elixir Hero': `${EMOJIS.ELIXIR} Heroes`
    };
    const _pets: Record<string, string> = {
      'Pet House': `${EMOJIS.DARK_ELIXIR} Pets`
    };
    const _workshops: Record<string, string> = {
      Workshop: `${EMOJIS.ELIXIR} Siege Machines`
    };
    const _equipment: Record<string, string> = {
      Blacksmith: `${EMOJIS.EQUIPMENT} Equipment`,
      Blacksmith_bk: `${EMOJIS.EQUIPMENT} Equipment (BK)`,
      Blacksmith_aq: `${EMOJIS.EQUIPMENT} Equipment (AQ)`,
      Blacksmith_gw: `${EMOJIS.EQUIPMENT} Equipment (GW)`,
      Blacksmith_rc: `${EMOJIS.EQUIPMENT} Equipment (RC)`
    };
    const _builderBase: Record<string, string> = {
      'Builder Barracks': `${EMOJIS.BUILDER_ELIXIR} Builder Troops`,
      'Builder Hall': `${EMOJIS.BUILDER_ELIXIR} Builder Base Hero`
    };

    const titles: Record<string, string> = equipmentOnly
      ? {
          ..._heroes,
          ..._pets,
          ..._equipment
        }
      : {
          ..._troops,
          ..._heroes,
          ..._pets,
          ..._workshops,
          ..._builderBase
        };

    const units = [];
    const indexes = Object.values(titles);
    for (const [key, value] of Object.entries(Troops)) {
      const title = titles[key];
      if (!title) continue;
      units.push({
        index: indexes.indexOf(title),
        title,
        key,
        units: value
      });
    }

    const summary: Record<string, number> = {
      'Elixir': 0,
      'Dark Elixir': 0,
      'Starry Ore': 0,
      'Glowy Ore': 0,
      'Shiny Ore': 0,
      'Time': 0
    };

    for (const category of units.sort((a, b) => a.index - b.index)) {
      const unitsArray = category.units.map((unit) => {
        const apiTroop = apiTroops.find((u) => u.name === unit.name && u.village === unit.village && u.type === unit.category);
        const maxLevel = apiTroop?.maxLevel ?? unit.levels[unit.levels.length - 1];
        const _level = apiTroop?.level ?? 0;
        const hallLevel = unit.village === 'home' ? data.townHallLevel : data.builderHallLevel ?? 0;
        const level = _level === 0 ? 0 : Math.max(_level, unit.minLevel ?? _level);
        const isRushed = unit.levels[hallLevel - 2] > level;
        const hallMaxLevel = unit.levels[hallLevel - 1];

        const remainingCost = level
          ? unit.upgrade.cost.slice(level - (unit.minLevel ?? 1), hallMaxLevel - 1).reduce((prev, curr) => prev + curr, 0)
          : unit.upgrade.cost.slice(0, hallMaxLevel - 1).reduce((prev, curr) => prev + curr, 0); // + unit.unlock.cost;

        const remainingTime = level
          ? unit.upgrade.time.slice(level - (unit.minLevel ?? 1), hallMaxLevel - 1).reduce((prev, curr) => prev + curr, 0)
          : unit.upgrade.time.slice(0, hallMaxLevel - 1).reduce((prev, curr) => prev + curr, 0); // + unit.unlock.time;

        const resources = unit.upgrade.resources
          .slice(level ? level - (unit.minLevel ?? 1) : 0, hallMaxLevel - 1)
          .flat()
          .reduce<Record<string, number>>((prev, curr) => {
            prev[curr.resource] ??= 0;
            prev[curr.resource] += curr.cost;
            return prev;
          }, {});

        return {
          name: unit.name,
          level,
          type: unit.category,
          village: unit.village,
          isRushed,
          hallMaxLevel,
          maxLevel: Math.max(unit.levels[unit.levels.length - 1], maxLevel),
          resource: unit.upgrade.resource,
          resources,
          // upgradeCost: level ? unit.upgrade.cost[level - (unit.minLevel ?? 1)] : unit.unlock.cost,
          // upgradeTime: level ? unit.upgrade.time[level - (unit.minLevel ?? 1)] : unit.unlock.time,
          remainingCost,
          remainingTime
        };
      });

      const _totalTime = unitsArray.reduce((prev, curr) => prev + curr.remainingTime, 0);
      const _totalCost = unitsArray.reduce((prev, curr) => prev + curr.remainingCost, 0);
      const totalTime = this.dur(_totalTime).padStart(5, ' ');
      const totalCost = this.format(_totalCost).padStart(6, ' ');

      const totalMaxLevel = unitsArray.reduce((prev, curr) => prev + curr.hallMaxLevel, 0);
      const totalLevel = unitsArray.reduce((prev, curr) => prev + curr.level, 0);
      const remaining = `${Math.round((totalLevel * 100) / totalMaxLevel)}%`;

      const costPerResource = unitsArray.reduce<Record<string, number>>((prev, curr) => {
        prev[curr.resource] ??= 0;
        if (curr.type === 'equipment') {
          for (const [resource, cost] of Object.entries(curr.resources)) {
            prev[resource] ??= 0;
            prev[resource] += cost;
          }
        } else {
          prev[curr.resource] += curr.remainingCost;
        }
        return prev;
      }, {});

      for (const [key, value] of Object.entries(costPerResource)) {
        if (!(key in summary)) summary[key] = 0;
        summary[key] += value;
      }
      summary['Time'] += _totalTime;

      const descriptionTexts = [
        `**${category.title}**`,
        unitsArray
          .map((unit) => {
            const unitIcon = (unit.village === 'home' ? HOME_TROOPS : BUILDER_TROOPS)[unit.name] || unit.name;
            const level = this.padStart(unit.level);
            const maxLevel = this.padEnd(unit.hallMaxLevel);
            const upgradeTime = this.dur(unit.remainingTime).padStart(5, ' ');
            const upgradeCost = this.format(unit.remainingCost).padStart(6, ' ');
            const rushed = unit.isRushed ? `\` R \`` : '`   `';

            const shinyOre = (unit.resources['Shiny Ore'] ? this.format(unit.resources['Shiny Ore']) : '').padStart(6, ' ');
            const glowyOre = (unit.resources['Glowy Ore'] ? this.format(unit.resources['Glowy Ore']) : '').padStart(5, ' ');
            const starryOre = (unit.resources['Starry Ore'] ? this.format(unit.resources['Starry Ore']) : '').padStart(3, ' ');

            if (unit.type === 'equipment') {
              return `\u200e${unitIcon} \` ${level}/${maxLevel} \` \` ${shinyOre}\` \` ${glowyOre}\` \` ${starryOre} \` ${rushed}`;
            }

            return `\u200e${unitIcon} \` ${level}/${maxLevel} \` \` ${upgradeTime} \` \` ${upgradeCost} \` ${rushed}`;
          })
          .join('\n'),
        unitsArray.length > 1 && !category.key.includes('Blacksmith')
          ? `\u200e${EMOJIS.CLOCK} \` ${this.centerText(remaining, 5)} \` \` ${totalTime} \` \` ${totalCost} \` \`   \``
          : ''
      ];

      if (category.key === 'Barracks' && unitsArray.length) {
        embed.setDescription([embed.data.description, '', ...descriptionTexts].join('\n'));
      }

      if (unitsArray.length && category.key !== 'Barracks') {
        embed.addFields([
          {
            name: '\u200b',
            value: [...descriptionTexts].join('\n')
          }
        ]);
      }
    }

    if (!embed.data.fields?.length && !embed.data.description?.length) {
      embed.setDescription(
        `No remaining upgrades at TH ${data.townHallLevel} ${data.builderHallLevel ? ` and BH ${data.builderHallLevel}` : ''}`
      );
    }

    if (remaining > 0) {
      const elixir = this.format(summary['Elixir'] || 0);
      const dark = this.format(summary['Dark Elixir'] || 0);
      const time = this.dur(summary['Time'] || 0);
      const shinyOre = this.format(summary['Shiny Ore'] || 0);
      const glowyOre = this.format(summary['Glowy Ore'] || 0);
      const starryOre = this.format(summary['Starry Ore'] || 0);
      const ore = (summary['Shiny Ore'] || 0) + (summary['Glowy Ore'] || 0) + (summary['Starry Ore'] || 0);

      embed.setFooter({
        text: [
          `Remaining ${remaining}%`,
          `Total ${elixir} Elixir, ${dark} Dark, ${time}`,
          ore ? `${shinyOre} Shiny, ${glowyOre} Glowy, ${starryOre} Starry` : ''
        ].join('\n')
      });
    }

    function trimEmbedFields() {
      while (embedLength(embed.toJSON()) > 6000 && embed.data.fields!.length > 0) {
        embed.spliceFields(embed.data.fields!.length - 1, 1);
      }
    }
    trimEmbedFields();

    return embed;
  }

  private padEnd(num: number) {
    return num.toString().padEnd(2, ' ');
  }

  private padStart(num: number) {
    return num.toString().padStart(2, ' ');
  }

  public centerText(text: string, width: number) {
    const padding = width - text.length;
    const leftPadding = Math.floor(padding / 2);
    return text.padStart(text.length + leftPadding, ' ').padEnd(width, ' ');
  }

  private format(num = 0) {
    // Nine Zeroes for Billions
    return Math.abs(num) >= 1.0e9
      ? `${(Math.abs(num) / 1.0e9).toFixed(Math.abs(num) / 1.0e9 >= 100 ? 1 : 2)}B`
      : // Six Zeroes for Millions
        Math.abs(num) >= 1.0e6
        ? `${(Math.abs(num) / 1.0e6).toFixed(Math.abs(num) / 1.0e6 >= 100 ? 1 : 2)}M`
        : // Three Zeroes for Thousands
          Math.abs(num) >= 1.0e3
          ? `${(Math.abs(num) / 1.0e3).toFixed(Math.abs(num) / 1.0e3 >= 100 ? 1 : 2)}K`
          : Math.abs(num).toFixed(0);
  }

  private dur(sec: number) {
    if (!sec) return '  -  ';
    return Util.ms(sec * 1000);
  }

  private toGameString(num: number) {
    return num.toLocaleString('en-US').replace(/,/g, ' ');
  }
}
