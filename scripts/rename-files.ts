#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { dash } from 'radash';
import yargs from 'yargs';

const INDEX_FILE_NAME = 'index.ts';

const argv = yargs(process.argv.slice(2))
  .scriptName('make-index')
  .option('d', {
    alias: 'directory',
    demandOption: true,
    describe: 'directory to make an index in',
    type: 'string'
  })
  .help().argv;

const main = (): void => {
  if ('then' in argv) {
    throw new Error('Expected argv to be an object but got Promise instead, exiting');
  }

  const dirPath = path.join(process.cwd(), argv.d);
  console.log(`-> Making index file in: ${dirPath}`);

  // read files in the directory
  const files = fs.readdirSync(dirPath).filter((f) => f !== INDEX_FILE_NAME);
  console.log(`-> Found ${files.length} files`);

  // rename files and to convert to lower case
  for (const file of files) {
    const underScored = file.startsWith('_');

    const oldPath = path.join(dirPath, file);

    if (underScored) {
      const newPath = path.join(dirPath, file.toLowerCase().replace(/^_/, ''));
      console.log(`-> Renaming ${oldPath} to ${newPath}`);

      fs.renameSync(oldPath, newPath);
      continue;
    }

    if (file === file.toLowerCase()) continue;

    const dashed = dash(file.replace(/\.ts$/, ''));

    // is pascal case
    if (dashed.includes('-')) {
      const newPath = path.join(dirPath, dashed + '.ts');
      console.log(`-> Renaming ${oldPath} to ${newPath}`);

      fs.renameSync(oldPath, newPath);
      continue;
    }

    if (!dashed.includes('-')) {
      const newPath = path.join(dirPath, `_${file.toLowerCase()}`);
      console.log(`-> Renaming ${oldPath} to ${newPath}`);

      fs.renameSync(oldPath, newPath);
      continue;
    }
  }
};

main();
