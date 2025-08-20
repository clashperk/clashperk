import { RawData } from 'clashofclans.js';
import { UNITS_MAP_BY_NAME } from '../src/helper/cache-mapper.helper.js';
import { ALL_TROOPS, SUPER_TROOPS } from '../src/util/emojis.js';

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
