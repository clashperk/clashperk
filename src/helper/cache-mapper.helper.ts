import { BUILDER_BASE_LEAGUES_MAP, PLAYER_LEAGUE_MAP } from '@app/constants';
import { APIPlayer, RawData } from 'clashofclans.js';

export interface PartialPlayer {
  name: string;
  tag: string;
  townHallLevel: number;
  townHallWeaponLevel?: number;
  expLevel: number;
  trophies: number;
  bestTrophies: number;
  warStars: number;
  attackWins: number;
  defenseWins: number;
  builderHallLevel?: number;
  builderBaseTrophies?: number;
  bestBuilderBaseTrophies?: number;
  donations: number;
  donationsReceived: number;
  clanCapitalContributions: number;
  role?: string | null;
  warPreference?: string | null;
  clan?: {
    tag: string;
    name: string;
    donations: number;
    donationsReceived: number;
  } | null;
  leagueId: number;
  builderBaseLeagueId: number;

  achievements: { [id: string]: number };
  units: { [id: string]: number };
  heroes: {
    [id: string]: {
      level: number;
      equipment: { [id: string]: number };
    };
  };
  superTroops: { [id: string]: number };

  initialClanGamesPoints: number;
  builderBattleWins: number;

  labels: number[];

  seasonId: string;
  monthId: string;
  ex: number;
  version: number;
}

export function mapToPlayerInterface(player: PartialPlayer): APIPlayer {
  const url = 'https://cdn.discordapp.com/emojis/696317142307700747.png';
  return {
    name: player.name,
    tag: player.tag,
    townHallLevel: player.townHallLevel,
    townHallWeaponLevel: player.townHallWeaponLevel || 0,
    expLevel: player.expLevel,
    trophies: player.trophies,
    bestTrophies: player.bestTrophies || player.trophies,
    warStars: player.warStars,
    attackWins: player.attackWins,
    defenseWins: player.defenseWins,
    donations: player.donations,
    donationsReceived: player.donationsReceived,
    clanCapitalContributions: player.clanCapitalContributions || 0,
    bestBuilderBaseTrophies: player.bestBuilderBaseTrophies || 0,
    builderBaseLeague: {
      id: player.builderBaseLeagueId || 44000000,
      name: BUILDER_BASE_LEAGUES_MAP[player.builderBaseLeagueId] || 'Wood League V'
    },
    leagueTier: {
      id: player.leagueId,
      name: PLAYER_LEAGUE_MAP[player.leagueId],
      iconUrls: {
        small: url,
        large: url
      }
    },
    builderBaseTrophies: player.builderBaseTrophies,
    builderHallLevel: player.builderHallLevel,
    legendStatistics: undefined,
    playerHouse: undefined,
    role: player.role!,
    warPreference: player.warPreference! as 'in' | 'out',
    clan: player.clan
      ? {
          tag: player.clan.tag,
          name: player.clan.name,
          clanLevel: 1,
          badgeUrls: {
            large: url,
            small: url,
            medium: url
          }
        }
      : undefined,
    achievements: ACHIEVEMENT_LIST.filter((ach) => player.achievements?.[ach.id] >= 0).map(({ name, id }) => ({
      name,
      value: player.achievements[id],
      completionInfo: null,
      info: name,
      stars: 0,
      target: 0,
      village: 'home'
    })),

    troops: UNITS_LIST.filter((unit) => RAW_UNITS_MAP[unit.name]?.category === 'troop' && player.units?.[unit.id]).map((unit) => {
      const raw = RAW_UNITS_MAP[unit.name];
      return {
        name: unit.name,
        level: player.units[unit.id],
        maxLevel: raw.maxLevel,
        village: raw.village,
        superTroopIsActive: player.superTroops[unit.name] === 1
      };
    }),
    spells: UNITS_LIST.filter((unit) => RAW_UNITS_MAP[unit.name]?.category === 'spell' && player.units?.[unit.id]).map((unit) => {
      const raw = RAW_UNITS_MAP[unit.name];
      return { name: unit.name, level: player.units[unit.id], maxLevel: raw.maxLevel, village: raw.village };
    }),
    heroEquipment: UNITS_LIST.filter((unit) => RAW_UNITS_MAP[unit.name]?.category === 'equipment' && player.units?.[unit.id]).map(
      (unit) => {
        const raw = RAW_UNITS_MAP[unit.name];
        return { name: unit.name, level: player.units[unit.id], maxLevel: raw.maxLevel, village: raw.village };
      }
    ),
    heroes: UNITS_LIST.filter((unit) => RAW_UNITS_MAP[unit.name]?.category === 'hero' && player.units?.[unit.id]).map((hero) => {
      const raw = RAW_UNITS_MAP[hero.name];
      return {
        name: hero.name,
        level: player.units[hero.id],
        maxLevel: raw.maxLevel,
        village: raw.village,
        equipment: UNITS_LIST.filter(
          (equip) => RAW_UNITS_MAP[equip.name]?.category === 'equipment' && player.heroes?.[hero.id]?.equipment[equip.name]
        ).map((unit) => {
          const raw = RAW_UNITS_MAP[unit.name];
          return { name: unit.name, level: player.units[unit.id], maxLevel: raw.maxLevel, village: raw.village };
        })
      };
    }),
    labels: []
  };
}

const ACHIEVEMENTS_MAP_BY_NAME: Record<string, number> = {
  'Bigger Coffers': 1,
  'Get those Goblins!': 2,
  'Bigger & Better': 3,
  'Nice and Tidy': 4,
  'Discover New Troops': 5,
  'Gold Grab': 6,
  'Elixir Escapade': 7,
  'Sweet Victory!': 8,
  'Empire Builder': 9,
  'Wall Buster': 10,
  'Humiliator': 11,
  'Union Buster': 12,
  'Conqueror': 13,
  'Unbreakable': 14,
  'Friend in Need': 15,
  'Mortar Mauler': 16,
  'Heroic Heist': 17,
  'League All-Star': 18,
  'X-Bow Exterminator': 19,
  'Firefighter': 20,
  'War Hero': 21,
  'Clan War Wealth': 22,
  'Anti-Artillery': 23,
  'Sharing is caring': 24,
  'Keep Your Account Safe!': 35,
  'Master Engineering': 26,
  'Next Generation Model': 27,
  'Un-Build It': 28,
  'Champion Builder': 29,
  'High Gear': 30,
  'Hidden Treasures': 31,
  'Games Champion': 32,
  'Dragon Slayer': 33,
  'War League Legend': 34,
  'Well Seasoned': 36,
  'Shattered and Scattered': 37,
  'Not So Easy This Time': 38,
  'Bust This!': 39,
  'Superb Work': 40,
  'Siege Sharer': 41,
  'Aggressive Capitalism': 42,
  'Most Valuable Clanmate': 43,
  'Counterspell': 44,
  'Monolith Masher': 45,
  'Ungrateful Child': 46,
  'Supercharger': 47
};

export const UNITS_MAP_BY_NAME: Record<string, number> = {
  'Barbarian': 1,
  'Archer': 2,
  'Goblin': 3,
  'Giant': 4,
  'Wall Breaker': 5,
  'Balloon': 6,
  'Wizard': 7,
  'Healer': 8,
  'Dragon': 9,
  'P.E.K.K.A': 10,
  'Minion': 11,
  'Hog Rider': 12,
  'Valkyrie': 13,
  'Golem': 14,
  'Witch': 15,
  'Lava Hound': 16,
  'Bowler': 17,
  'Baby Dragon': 32,
  'Miner': 19,
  'Super Barbarian': 20,
  'Super Archer': 21,
  'Super Wall Breaker': 22,
  'Super Giant': 23,
  'Raged Barbarian': 24,
  'Sneaky Archer': 25,
  'Beta Minion': 26,
  'Boxer Giant': 27,
  'Bomber': 28,
  'Power P.E.K.K.A': 29,
  'Cannon Cart': 30,
  'Drop Ship': 31,
  'Night Witch': 33,
  'Wall Wrecker': 34,
  'Battle Blimp': 35,
  'Yeti': 36,
  'Sneaky Goblin': 37,
  'Super Miner': 38,
  'Rocket Balloon': 39,
  'Ice Golem': 40,
  'Electro Dragon': 41,
  'Stone Slammer': 42,
  'Inferno Dragon': 43,
  'Super Valkyrie': 44,
  'Dragon Rider': 45,
  'Super Witch': 46,
  'Hog Glider': 47,
  'Siege Barracks': 48,
  'Ice Hound': 49,
  'Super Bowler': 50,
  'Super Dragon': 51,
  'Headhunter': 52,
  'Super Wizard': 53,
  'Super Minion': 54,
  'Log Launcher': 55,
  'Flame Flinger': 56,
  'Battle Drill': 57,
  'Electro Titan': 58,
  'Apprentice Warden': 59,
  'Super Hog Rider': 60,
  'Electrofire Wizard': 61,
  'Root Rider': 62,
  'Druid': 63,
  'Lightning Spell': 64,
  'Healing Spell': 65,
  'Rage Spell': 66,
  'Jump Spell': 67,
  'Freeze Spell': 68,
  'Poison Spell': 69,
  'Earthquake Spell': 70,
  'Haste Spell': 71,
  'Clone Spell': 72,
  'Skeleton Spell': 73,
  'Bat Spell': 74,
  'Invisibility Spell': 75,
  'Recall Spell': 76,
  'Overgrowth Spell': 77,
  'Barbarian King': 78,
  'Archer Queen': 79,
  'Grand Warden': 80,
  'Battle Machine': 81,
  'Royal Champion': 82,
  'Battle Copter': 83,
  'L.A.S.S.I': 84,
  'Mighty Yak': 85,
  'Electro Owl': 86,
  'Unicorn': 87,
  'Phoenix': 88,
  'Poison Lizard': 89,
  'Diggy': 90,
  'Frosty': 91,
  'Spirit Fox': 92,
  'Angry Jelly': 93,
  'Barbarian Puppet': 94,
  'Rage Vial': 95,
  'Archer Puppet': 96,
  'Invisibility Vial': 97,
  'Eternal Tome': 98,
  'Life Gem': 99,
  'Seeking Shield': 100,
  'Royal Gem': 101,
  'Earthquake Boots': 102,
  'Hog Rider Puppet': 103,
  'Giant Gauntlet': 104,
  'Vampstache': 105,
  'Haste Vial': 106,
  'Rocket Spear': 107,
  'Spiky Ball': 108,
  'Frozen Arrow': 109,
  'Giant Arrow': 110,
  'Heroic Torch': 111,
  'Healer Puppet': 112,
  'Fireball': 113,
  'Rage Gem': 114,
  'Healing Tome': 115,
  'Magic Mirror': 116,
  'Electro Boots': 117,
  'Thrower': 118,
  'Troop Launcher': 119,
  'Super Yeti': 120,
  'Furnace': 121,
  'Revive Spell': 122,
  'Minion Prince': 123,
  'Sneezy': 124,
  'Snake Bracelet': 125,
  'Dark Crown': 126,
  'Lavaloon Puppet': 127,
  'Henchmen Puppet': 128,
  'Dark Orb': 129,
  'Noble Iron': 130,
  'Ice Block Spell': 131,
  'Metal Pants': 132,
  'Action Figure': 133,
  'Meteor Staff': 134,
  'Meteor Golem': 135,
  'Totem Spell': 136
};

const ACHIEVEMENT_LIST = Object.entries(ACHIEVEMENTS_MAP_BY_NAME).reduce<{ name: string; id: string }[]>((record, [name, id]) => {
  record.push({ name, id: `${id}` });
  return record;
}, []);

const UNITS_LIST = Object.entries(UNITS_MAP_BY_NAME).reduce<{ name: string; id: string }[]>((record, [name, id]) => {
  record.push({ name, id: `${id}` });
  return record;
}, []);

interface RawUnit {
  id: number;
  name: string;
  village: 'home' | 'builderBase';
  category: string;
  subCategory: string;
  maxLevel: number;
}

const RAW_UNITS_MAP = RawData.RawUnits.reduce<Record<string, RawUnit>>((record, unit) => {
  record[unit.name] = {
    id: unit.id,
    name: unit.name,
    village: unit.village as 'home' | 'builderBase',
    category: unit.category,
    subCategory: unit.subCategory,
    maxLevel: unit.levels[unit.levels.length - 1]
  };
  return record;
}, {});
