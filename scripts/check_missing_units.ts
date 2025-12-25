import { RawData } from 'clashofclans.js';
import { writeFileSync } from 'node:fs';
import { UNITS_MAP_BY_NAME } from '../src/helper/cache-mapper.helper.js';
import {
  ALL_TROOPS,
  BUILDER_ELIXIR_TROOPS,
  BUILDER_HEROES,
  BUILDER_TROOPS,
  DARK_ELIXIR_TROOPS,
  DARK_SPELLS,
  ELIXIR_SPELLS,
  ELIXIR_TROOPS,
  HERO_EQUIPMENT,
  HERO_PETS,
  HEROES,
  HOME_HEROES,
  HOME_TROOPS,
  SIEGE_MACHINES,
  SUPER_TROOPS
} from '../src/util/emojis.js';

const units = {
  ...ALL_TROOPS,
  ...SUPER_TROOPS
};

for (const unit of RawData.RawUnits) {
  if (!units[unit.name]) {
    console.log({ missingType: 'emoji', name: unit.name, type: unit.subCategory });
  }

  if (!UNITS_MAP_BY_NAME[unit.name]) {
    console.log({ missingType: 'mapping', name: unit.name, type: unit.subCategory });
  }
}

const troopsMap = {
  HOME_HEROES,
  ELIXIR_TROOPS,
  HERO_PETS,
  HERO_EQUIPMENT,
  DARK_ELIXIR_TROOPS,
  SIEGE_MACHINES,
  ELIXIR_SPELLS,
  DARK_SPELLS,
  SUPER_TROOPS,
  BUILDER_ELIXIR_TROOPS,
  BUILDER_HEROES,
  HEROES,
  HOME_TROOPS,
  BUILDER_TROOPS
};

const chunk: Record<string, string[]> = {};

const chunkKeys = Object.keys(troopsMap);
for (const key of chunkKeys) {
  chunk[key] = Object.keys(troopsMap[key as keyof typeof troopsMap]);
}

writeFileSync('./scripts/assets/troops_export.json', JSON.stringify(chunk, null, 2));
