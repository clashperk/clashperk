import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, Guild } from 'discord.js';
import { URL } from 'node:url';
import { Command } from '../../lib/handlers.js';
import {
  DARK_ELIXIR_TROOPS,
  DARK_SPELLS,
  ELIXIR_SPELLS,
  ELIXIR_TROOPS,
  EMOJIS,
  HERO_EQUIPMENT,
  HERO_PETS,
  HOME_HEROES,
  SIEGE_MACHINES,
  SUPER_TROOPS
} from '../../util/emojis.js';
import { ARMY_CAPACITY, RAW_SUPER_TROOPS, RAW_TROOPS } from '../../util/troops.js';

const [TOTAL_UNITS, TOTAL_SPELLS] = [340, 11];
const ARMY_URL_REGEX = /^https?:\/\/link\.clashofclans\.com\/[a-z]{1,2}[\/]?\?action=CopyArmy&army=\S+$/;

export default class ArmyCommand extends Command {
  public constructor() {
    super('army', {
      category: 'search',
      clientPermissions: ['EmbedLinks', 'UseExternalEmojis'],
      defer: true
    });
  }

  public async exec(interaction: CommandInteraction, args: { link: string }) {
    const payload = this.embed(interaction.guild!, interaction.locale, args);
    return interaction.editReply(payload);
  }

  public embed(guild: Guild, locale: string, args: { link: string; message?: string; army_name?: string; tips?: string }) {
    const url = this.getURL(args.link ?? args.message!);
    const army = url?.searchParams.get('army');
    if (!army) return { embeds: [], content: this.i18n('command.army.no_link', { lng: locale }) };

    const troopParts: string[] = [];
    const spellParts: string[] = [];
    const heroParts: string[] = [];
    const ccTroopParts: string[] = [];
    const ccSpellParts: string[] = [];

    for (const char of army.split(/(?=[hsiud])/)) {
      // troops
      if (char.startsWith('u')) {
        const regex = /^u\d+x\d+(-\d+x\d+)*-?$/;

        if (regex.test(char)) {
          troopParts.push(...char.slice(1).split('-'));
        }
      }

      // spells
      if (char.startsWith('s')) {
        const regex = /^s\d+x\d+(-\d+x\d+)*-?$/;

        if (regex.test(char)) {
          spellParts.push(...char.slice(1).split('-'));
        }
      }

      // heroes
      if (char.startsWith('h')) {
        const regex = /^h(\d+(p\d+)?e\d+_\d+(-\d+(p\d+)?e\d+_\d+)*)-?$/;
        if (regex.test(char)) {
          heroParts.push(...char.slice(1).split('-'));
        }
      }

      // cc spells
      if (char.startsWith('d')) {
        const regex = /^d\d+x\d+(-\d+x\d+)*-?$/;

        if (regex.test(char)) {
          ccSpellParts.push(...char.slice(1).split('-'));
        }
      }

      // cc troops
      if (char.startsWith('i')) {
        const regex = /^i\d+x\d+(-\d+x\d+)*-?$/;
        if (regex.test(char)) {
          ccTroopParts.push(...char.slice(1).split('-'));
        }
      }
    }

    const parseArmyCombinations = (combinations: string[]) => {
      return combinations
        .map((parts) => parts.split(/x/))
        .map((parts) => ({
          id: parts.length > 2 ? 0 : Number(parts[1]),
          total: Number(parts[0])
        }));
    };

    const parseHeroCombinations = (combinations: string[]) => {
      return combinations
        .map((parts) => parts.split(/(?=[pe])/)) // [ '6', 'p4', 'e42_43' ],
        .map((parts) => {
          return {
            id: Number(parts[0]),
            pets: parts[1]?.startsWith('p') ? [Number(parts[1].slice(1))] : [],
            equipment: parts[2]?.startsWith('e')
              ? parts[2]
                  .slice(1)
                  .split('_')
                  .map((en) => Number(en))
              : []
          };
        });
    };

    if (!troopParts.length && !spellParts.length) {
      return { embeds: [], content: this.i18n('command.army.invalid_link', { lng: locale }) };
    }

    const troopList = parseArmyCombinations(troopParts);
    const spellList = parseArmyCombinations(spellParts);
    const heroList = parseHeroCombinations(heroParts);
    const ccTroopList = parseArmyCombinations(ccTroopParts);
    const ccSpellList = parseArmyCombinations(ccSpellParts);

    const malformed = ![...troopList, ...spellList].every(
      (en) => typeof en.id === 'number' && typeof en.total === 'number' && en.total <= TOTAL_UNITS
    );
    if (malformed) return { embeds: [], content: this.i18n('command.army.invalid_link', { lng: locale }) };

    const SPELLS: Record<string, string> = {
      ...DARK_SPELLS,
      ...ELIXIR_SPELLS
    };
    const TROOPS: Record<string, string> = {
      ...ELIXIR_TROOPS,
      ...DARK_ELIXIR_TROOPS
    };
    const CC_TROOPS: Record<string, string> = {
      ...TROOPS,
      ...SIEGE_MACHINES,
      ...SUPER_TROOPS
    };

    const findUnits = ({
      emojiRecords,
      category,
      subCategory,
      parts
    }: {
      category: string;
      subCategory?: string;
      parts: { id: number; total: number }[];
      emojiRecords: Record<string, string>;
    }) => {
      const _findOne = (id: number) => {
        return RAW_TROOPS.find(
          (en) =>
            en.id === id && en.category === category && (subCategory ? en.subCategory === subCategory : true) && en.name in emojiRecords
        );
      };

      return parts
        .filter((parts) => _findOne(parts.id))
        .map((parts) => {
          const unit = _findOne(parts.id)!;
          return {
            id: parts.id,
            total: parts.total,
            name: unit.name,
            category: unit.category,
            housing: unit.housingSpace,
            hallLevel: unit.unlock.hall,
            subCategory: unit.subCategory
          };
        });
    };

    const troops = findUnits({ category: 'troop', emojiRecords: TROOPS, parts: troopList });
    const spells = findUnits({ category: 'spell', emojiRecords: SPELLS, parts: spellList });
    const siegeMachines = findUnits({ category: 'siege', emojiRecords: SIEGE_MACHINES, parts: troopList });
    const ccTroops = findUnits({ category: 'troop', emojiRecords: CC_TROOPS, parts: ccTroopList });
    const ccSpells = findUnits({ category: 'spell', emojiRecords: SPELLS, parts: ccSpellList });

    const superTroops = troopList
      .filter((parts) => RAW_SUPER_TROOPS.find((en) => en.id === parts.id && en.name in SUPER_TROOPS))
      .map((parts) => {
        const unit = RAW_SUPER_TROOPS.find((en) => en.id === parts.id && en.name in SUPER_TROOPS)!;
        return {
          id: parts.id,
          total: parts.total,
          name: unit.name,
          category: 'troop',
          subCategory: 'super',
          hallLevel: RAW_TROOPS.find((en) => en.name === unit.original)!.levels.findIndex((en) => en >= unit.minOriginalLevel) + 1,
          housing: unit.housingSpace
        };
      });

    const heroes = heroList
      .filter((parts) => RAW_TROOPS.find((en) => en.id === parts.id && en.category === 'hero' && en.name in HOME_HEROES))
      .map((parts) => {
        const unit = RAW_TROOPS.find((en) => en.id === parts.id && en.category === 'hero' && en.name in HOME_HEROES)!;
        return {
          id: parts.id,
          total: 0,
          name: unit.name,
          pets: findUnits({
            subCategory: 'pet',
            category: 'troop',
            parts: parts.pets.map((i) => ({
              id: i,
              total: 1
            })),
            emojiRecords: HERO_PETS
          }),
          equipment: findUnits({
            category: 'equipment',
            parts: parts.equipment.map((i) => ({
              id: i,
              total: 1
            })),
            emojiRecords: HERO_EQUIPMENT
          }),
          category: unit.category,
          subCategory: unit.subCategory,
          hallLevel: unit.unlock.hall,
          housing: unit.housingSpace
        };
      });

    if (!spells.length && !troops.length && !superTroops.length && !siegeMachines.length) {
      return { embeds: [], content: this.i18n('command.army.invalid_link', { lng: locale }) };
    }

    const hallByUnlockTH = Math.max(
      ...troops.map((en) => en.hallLevel),
      ...spells.map((en) => en.hallLevel),
      ...siegeMachines.map((en) => en.hallLevel),
      ...superTroops.map((en) => en.hallLevel)
    );

    const [totalTroop, totalSpell] = [
      troops.reduce((pre, cur) => pre + cur.housing * cur.total, 0) + superTroops.reduce((pre, curr) => pre + curr.housing * curr.total, 0),
      spells.reduce((pre, cur) => pre + cur.housing * cur.total, 0),
      siegeMachines.reduce((pre, cur) => pre + cur.housing * cur.total, 0)
    ];

    const hallByTroops = ARMY_CAPACITY.find((en) => en.troops >= Math.min(totalTroop, TOTAL_UNITS))?.hall ?? 0;
    const hallBySpells = ARMY_CAPACITY.find((en) => en.spells >= Math.min(totalSpell, TOTAL_SPELLS))?.hall ?? 0;
    const townHallLevel = Math.max(hallByUnlockTH, hallByTroops, hallBySpells);

    const embed = new EmbedBuilder()
      .setColor(this.client.embed(guild.id))
      .setDescription(
        [
          `**${args.army_name ?? 'Shared Army Composition'} [TH ${townHallLevel}${townHallLevel === 14 ? '' : '+'}]**`,
          '',
          `${EMOJIS.TROOPS} **${totalTroop}** ${EMOJIS.SPELLS} **${totalSpell}**`
        ].join('\n')
      );

    if (heroes.length) {
      embed.setDescription(
        [
          embed.data.description,
          '',
          '**Heroes**',
          heroes
            .map((en) => {
              const exts = en.pets
                .map((eq) => `${EMOJIS.GAP} ${HERO_PETS[eq.name]} ${eq.name}`)
                .concat(...en.equipment.map((eq) => `${EMOJIS.GAP} ${HERO_EQUIPMENT[eq.name]} ${eq.name}`))
                .join('\n');
              return `${HOME_HEROES[en.name]} ${en.name}${exts.length ? '\n' : ''}${exts}`;
            })
            .join('\n')
        ].join('\n')
      );
    }

    if (troops.length) {
      embed.setDescription(
        [
          embed.data.description,
          '',
          '**Troops**',
          troops.map((en) => `\u200e\`${this.padding(en.total)}\` ${TROOPS[en.name]}  ${en.name}`).join('\n')
        ].join('\n')
      );
    }

    if (spells.length) {
      embed.addFields([
        {
          name: '\u200b',
          value: ['**Spells**', spells.map((en) => `\u200e\`${this.padding(en.total)}\` ${SPELLS[en.name]} ${en.name}`).join('\n')].join(
            '\n'
          )
        }
      ]);
    }

    if (superTroops.length) {
      embed.addFields([
        {
          name: '\u200b',
          value: [
            '**Super Troops**',
            superTroops.map((en) => `\u200e\`${this.padding(en.total)}\` ${SUPER_TROOPS[en.name]}  ${en.name}`).join('\n')
          ].join('\n')
        }
      ]);
    }

    if (siegeMachines.length) {
      embed.addFields([
        {
          name: '\u200b',
          value: [
            '**Siege Machines**',
            siegeMachines.map((en) => `\u200e\`${this.padding(en.total)}\` ${SIEGE_MACHINES[en.name]}  ${en.name}`).join('\n')
          ].join('\n')
        }
      ]);
    }

    if (ccTroops.length || ccSpells.length) {
      embed.addFields([
        {
          name: '\u200b',
          value: [
            `**Clan Castle**`,
            [...ccTroops, ...ccSpells]
              .map((en) => `\u200e\`${this.padding(en.total)}\` ${{ ...CC_TROOPS, ...SPELLS }[en.name]}  ${en.name}`)
              .join('\n')
          ].join('\n')
        }
      ]);
    }

    if (args.tips) {
      embed.addFields([
        {
          name: '\u200b',
          value: ['📌 **Tips**', `${args.tips}`].join('\n')
        }
      ]);
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(url!.href).setLabel('Copy Army Link').setEmoji(EMOJIS.TROOPS)
    );

    return {
      embeds: [embed],
      components: [row]
    };
  }

  private padding(num: number) {
    return `${num.toString().padStart(2, ' ')}${num > 99 ? '' : 'x'}`;
  }

  private getURL(url: string) {
    if (!ARMY_URL_REGEX.test(url)) return null;
    return new URL(url.match(ARMY_URL_REGEX)![0]!);
  }
}
