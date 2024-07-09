import { RawData } from 'clashofclans.js';
import { ALL_TROOPS, SUPER_TROOPS } from './emojis.js';

export const RAW_TROOPS = RawData.RawUnits;

export const RAW_SUPER_TROOPS = RawData.RawSuperUnits;

// For calculating rushed and remaining upgrades
export const RAW_TROOPS_FILTERED = RawData.RawUnits.filter((unit) => !unit.seasonal)
  .filter((u) => u.category !== 'equipment')
  .filter((unit) => !(unit.name in SUPER_TROOPS) && unit.name in ALL_TROOPS);

export const RAW_TROOPS_WITH_ICONS = RawData.RawUnits.filter((unit) => !unit.seasonal)
  // .filter((u) => u.category !== 'equipment')
  .filter((unit) => !(unit.name in SUPER_TROOPS) && unit.name in ALL_TROOPS);

export const ARMY_CAPACITY = [
  {
    hall: 1,
    troops: 20,
    spells: 0
  },
  {
    hall: 2,
    troops: 30,
    spells: 0
  },
  {
    hall: 3,
    troops: 70,
    spells: 0
  },
  {
    hall: 4,
    troops: 80,
    spells: 0
  },
  {
    hall: 5,
    troops: 135,
    spells: 2
  },
  {
    hall: 6,
    troops: 150,
    spells: 4
  },
  {
    hall: 7,
    troops: 200,
    spells: 6
  },
  {
    hall: 8,
    troops: 200,
    spells: 7
  },
  {
    hall: 9,
    troops: 220,
    spells: 9
  },
  {
    hall: 10,
    troops: 240,
    spells: 11
  },
  {
    hall: 11,
    troops: 260,
    spells: 11
  },
  {
    hall: 12,
    troops: 280,
    spells: 11
  },
  {
    hall: 13,
    troops: 300,
    spells: 11
  },
  {
    hall: 14,
    troops: 300,
    spells: 11
  },
  {
    hall: 15,
    troops: 320,
    spells: 11
  },
  {
    hall: 16,
    troops: 320,
    spells: 11
  }
];
