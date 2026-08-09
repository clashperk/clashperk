import { APIPlayer } from 'clashofclans.js';
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
import { cluster, unique } from 'radash';
import { Args, Command } from '../../lib/handlers.js';
import {
  BUILDER_TROOPS,
  EMOJIS,
  HOME_TROOPS,
  SUPER_TROOPS,
  TOWN_HALLS
} from '../../util/emojis.js';
import { getMenuFromMessage, padEnd, padStart, unitsFlatten } from '../../util/helper.js';
import { RAW_SUPER_TROOPS, RAW_TROOPS_WITH_ICONS, TroopJSON } from '../../util/troops.js';

export default class UnitsCommand extends Command {
  public constructor() {
    super('units', {
      category: 'search',
      channel: 'dm',
      clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
      defer: true
    });
  }

  public args(): Args {
    return {
      player: {
        id: 'tag',
        match: 'STRING'
      }
    };
  }

  public async exec(
    interaction: CommandInteraction | ButtonInteraction<'cached'>,
    args: { tag?: string; user?: User; max_level?: boolean; equipment_only?: boolean }
  ) {
    const data = await this.client.resolver.resolvePlayer(interaction, args.tag ?? args.user?.id);
    if (!data) return;

    const embed = this.embed(data, Boolean(args.max_level), Boolean(args.equipment_only))
      .setColor(this.client.embed(interaction))
      .setDescription(
        `Units for TH${data.townHallLevel} Max ${data.builderHallLevel ? `and BH${data.builderHallLevel} Max` : ''}`
      );
    if (!interaction.isMessageComponent()) await interaction.editReply({ embeds: [embed] });
    if (!interaction.inCachedGuild()) return;

    const payload = { cmd: this.id, tag: data.tag };
    const customIds = {
      accounts: JSON.stringify({ ...payload, string_key: 'tag' }),
      refresh: JSON.stringify({ ...payload }),
      player: JSON.stringify({ ...payload, cmd: 'player' }),
      upgrades: JSON.stringify({ ...payload, cmd: 'upgrades' }),
      rushed: JSON.stringify({ ...payload, cmd: 'rushed' }),
      maxLevel: JSON.stringify({ ...payload, max_level: !args.max_level }),
      equipmentOnly: JSON.stringify({ ...payload, equipment_only: !args.equipment_only })
    };

    const maxButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(customIds.maxLevel)
        .setLabel(args.max_level ? 'Town Hall Max Level' : 'Max Level')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(customIds.equipmentOnly)
        .setLabel(args.equipment_only ? 'Troops' : 'Equipment')
        .setStyle(ButtonStyle.Secondary)
    );

    const refreshButton = new ButtonBuilder()
      .setEmoji(EMOJIS.REFRESH)
      .setStyle(ButtonStyle.Secondary)
      .setCustomId(customIds.refresh);
    const mainRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(refreshButton)
      .addComponents(
        new ButtonBuilder()
          .setLabel('Profile')
          .setStyle(ButtonStyle.Primary)
          .setCustomId(customIds.player)
      )
      .addComponents(
        new ButtonBuilder()
          .setLabel('Upgrades')
          .setStyle(ButtonStyle.Primary)
          .setCustomId(customIds.upgrades)
      )
      .addComponents(
        new ButtonBuilder()
          .setLabel('Rushed')
          .setStyle(ButtonStyle.Primary)
          .setCustomId(customIds.rushed)
      );

    if (interaction.isMessageComponent()) {
      return interaction.editReply({
        embeds: [embed],
        components: [
          maxButtonRow,
          mainRow,
          ...getMenuFromMessage(interaction, data.tag, customIds.accounts)
        ]
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
      new StringSelectMenuBuilder()
        .setCustomId(customIds.accounts)
        .setPlaceholder('Select an account!')
        .addOptions(options)
    );

    return interaction.editReply({
      embeds: [embed],
      components: options.length > 1 ? [maxButtonRow, mainRow, menuRow] : [mainRow]
    });
  }

  private embed(data: APIPlayer, showMaxLevel = false, equipmentOnly = false) {
    const embed = new EmbedBuilder().setAuthor({ name: `${data.name} (${data.tag})` });

    const unlockedEquipment = unique([
      ...data.heroes.flatMap((u) => u.equipment ?? []).map((u) => u.name),
      ...data.heroEquipment.map((u) => u.name)
    ]);
    const Troops = RAW_TROOPS_WITH_ICONS.filter(
      (troop) => !troop.seasonal && !(troop.name in SUPER_TROOPS)
    )
      .filter((unit) => {
        if (unit.category === 'equipment' && !unlockedEquipment.includes(unit.name)) return false;
        const homeTroops = unit.village === 'home' && unit.levels[data.townHallLevel - 1] > 0;
        const builderTroops =
          unit.village === 'builderBase' && unit.levels[data.builderHallLevel! - 1] > 0;
        return Boolean(homeTroops || builderTroops);
      })
      .reduce<TroopJSON>((prev, curr) => {
        const unlockBuilding =
          curr.category === 'hero'
            ? curr.village === 'home'
              ? 'Town Hall'
              : 'Builder Hall'
            : curr.unlock.building;
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
      'Blacksmith': 'Equipment',
      'Pet House': 'Pets',
      'Workshop': 'Siege Machines',
      'Builder Hall': 'Builder Base Hero',
      'Builder Barracks': 'Builder Troops'
    };

    const apiTroops = unitsFlatten(data, { withEquipment: true });
    const units = [];
    const indexes = Object.values(titles);
    for (const [key, value] of Object.entries(Troops)) {
      const title = titles[key];
      units.push({
        index: indexes.indexOf(title),
        title,
        units: value
      });
    }

    const filteredUnits = units.filter((category) =>
      equipmentOnly ? category.title === 'Equipment' : category.title !== 'Equipment'
    );

    for (const category of filteredUnits.sort((a, b) => a.index - b.index)) {
      const unitsArray = category.units.map((unit) => {
        const { maxLevel, level: _level } = apiTroops.find(
          (u) => u.name === unit.name && u.village === unit.village && u.type === unit.category
        ) ?? { maxLevel: unit.levels[unit.levels.length - 1], level: 0 };
        const hallLevel = unit.village === 'home' ? data.townHallLevel : data.builderHallLevel;

        const level = _level === 0 ? 0 : Math.max(_level, unit.minLevel ?? _level);

        return {
          type: unit.category,
          village: unit.village,
          name: unit.name,
          level,
          hallMaxLevel: unit.levels[hallLevel! - 1],
          maxLevel: Math.max(unit.levels[unit.levels.length - 1], maxLevel)
        };
      });

      if (unitsArray.length) {
        const chunkedUnitsArray = cluster(unitsArray, 20);
        chunkedUnitsArray.forEach((chunk, index) => {
          embed.addFields([
            {
              name: index === 0 ? category.title : `\u200b`,
              value: cluster(chunk, 4)
                .map((units) =>
                  units
                    .map((unit) => {
                      const unitIcon =
                        (unit.village === 'home' ? HOME_TROOPS : BUILDER_TROOPS)[unit.name] ||
                        unit.name;
                      const level = padStart(unit.level, 2);
                      const maxLevel = showMaxLevel
                        ? padEnd(unit.maxLevel, 2)
                        : padEnd(unit.hallMaxLevel, 2);
                      return `${unitIcon} \`\u200e${level}/${maxLevel}\u200f\``;
                    })
                    .join(' ')
                )
                .join('\n')
            }
          ]);
        });
      }
    }

    if (equipmentOnly) return embed;

    const superTroops = RAW_SUPER_TROOPS.filter((unit) =>
      apiTroops.find(
        (un) =>
          un.name === unit.original &&
          un.village === unit.village &&
          un.level >= unit.minOriginalLevel
      )
    ).map((unit) => {
      const { maxLevel, level, name } = apiTroops.find(
        (u) => u.name === unit.original && u.village === unit.village
      ) ?? {
        maxLevel: 0,
        level: 0
      };
      const hallLevel = data.townHallLevel;

      const originalTroop = RAW_TROOPS_WITH_ICONS.find(
        (un) => un.name === name && un.category === 'troop' && un.village === 'home'
      );

      return {
        village: unit.village,
        name: unit.name,
        level,
        hallMaxLevel: originalTroop!.levels[hallLevel - 1],
        maxLevel
      };
    });

    const activeSuperTroops = data.troops
      .filter((en) => en.superTroopIsActive)
      .map((en) => en.name);
    if (superTroops.length && data.townHallLevel >= 11) {
      embed.addFields([
        {
          name: `Super Troops (${activeSuperTroops.length ? 'Active' : 'Usable'})`,
          value: [
            cluster(
              superTroops.filter((en) =>
                activeSuperTroops.length ? activeSuperTroops.includes(en.name) : true
              ),
              4
            )
              .map((chunks) =>
                chunks
                  .map((unit) => {
                    const unitIcon = SUPER_TROOPS[unit.name] || unit.name;
                    const level = padStart(unit.level, 2);
                    const maxLevel = showMaxLevel
                      ? padEnd(unit.maxLevel, 2)
                      : padEnd(unit.hallMaxLevel, 2);
                    return `${unitIcon} \`\u200e${level}/${maxLevel}\u200f\``;
                  })
                  .join(' ')
              )
              .join('\n')
          ].join('\n')
        }
      ]);
    }

    return embed;
  }
}
