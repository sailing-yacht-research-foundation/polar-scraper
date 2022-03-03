import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mainFolder = path.resolve(__dirname, '../../files/jeiterPolars');
// Difference for these 3 files are in the writeFile

// (async () => {
//   // Fix2020
//   const fileContent = await readFile(`${mainFolder}/2020_polars.json`, 'utf-8');

//   const fixedContent = fileContent
//     .replace(/None/g, `"None"`)
//     .replace(/'/g, '"')
//     .replace(/\(/g, '[')
//     .replace(/\)/g, ']')
//     .replace(/[0-9]+:/g, (match) => {
//       return `"${match.replace(':', '')}":`;
//     })
//     .replace(/(: ")(.*?)(",)/g, (match, p1, p2, p3) => {
//       return `: "${p2.replace(/"/g, '').replace(/'/g, '')}",`;
//     });
//   await writeFile(
//     `${mainFolder}/fixed_2020_polars.json`,
//     `[${fixedContent}`,
//     'utf-8',
//   );
// })();

// (async () => {
//   // Fixing 2021 file
//   // 2021 files have a line where designer: H\x8f something, I manually remove the escape char
//   // because vscode is throwing error on that line because of that esc char
//   const fileContent = await readFile(`${mainFolder}/All2021.json`, 'utf-8');

//   const fixedContent = fileContent
//     .replace(/None/g, `"None"`)
//     .replace(/'/g, '"')
//     .replace(/\(/g, '[')
//     .replace(/\)/g, ']')
//     .replace(/[0-9]+(:)/g, (match) => {
//       return `"${match.replace(':', '')}":`;
//     })
//     .replace(/(: ")(.*?)(",)/g, (match, p1, p2, p3) => {
//       return `: "${p2.replace(/"/g, '').replace(/'/g, '')}",`;
//     });
//   await writeFile(`${mainFolder}/fixed_2021.json`, `${fixedContent}`, 'utf-8');
// })();

(async () => {
  // Fixing 2019 file
  const fileContent = await readFile(`${mainFolder}/ALLORG2019.json`, 'utf-8');

  const fixedContent = fileContent
    .replace(/None/g, `"None"`)
    .replace(/'/g, '"')
    .replace(/\(/g, '[')
    .replace(/\)/g, ']')
    .replace(/[0-9]+(:)/g, (match) => {
      return `"${match.replace(':', '')}":`;
    })
    .replace(/(: ")(.*?)(",)/g, (match, p1, p2, p3) => {
      return `: "${p2.replace(/"/g, '').replace(/'/g, '')}",`;
    });
  await writeFile(`${mainFolder}/fixed_2019.json`, `${fixedContent}`, 'utf-8');
})();
