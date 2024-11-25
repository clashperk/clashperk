import { RawData } from 'clashofclans.js';
import { ALL_TROOPS, SUPER_TROOPS } from '../src/util/emojis.js';

const units = {
  ...ALL_TROOPS,
  ...SUPER_TROOPS
};

for (const unit of RawData.RawUnits) {
  if (!units[unit.name]) {
    console.log(unit.name);
  }
}
