// import { convertKnotsToSecPerMile } from './src/utils/conversionUtils';

// const speeds = [
//   3.1760035288928097, 3.8030847242763572, 4.296455424274973, 4.648160103292446,
//   4.785325003323143, 4.830917874396135, 4.761274963629149,
// ];
// const expectedInverse = [1133.5, 946.6, 837.9, 774.5, 752.3, 745.2, 756.1];

// speeds.forEach((speed, index) => {
//   const result = convertKnotsToSecPerMile(speed);
//   console.log(`Result is ${result === expectedInverse[index]}`);
// });

// import fs from 'fs';
// import path from 'path';
// import { promisify } from 'util';

// const readDirectory = promisify(fs.readdir);

// async function getSubdirectories(mainFolder: string) {
//   const subFolders = await readDirectory(mainFolder, { withFileTypes: true });
//   return subFolders.reduce((arr: string[], row) => {
//     if (row.isDirectory()) {
//       arr.push(row.name);
//     }
//     return arr;
//   }, []);
// }

// (async () => {
//   const orcDirectory = path.resolve(__dirname, `./files/jeiterPolars/2016-2`);
//   const subDirs = await getSubdirectories(orcDirectory);
//   console.log(subDirs);
// })();

const map = new Map<string, { a: string; b: string }[]>();
map.set('1', [{ a: '1', b: '1' }]);

const first = map.get('1');
if (first) {
  first.push({ a: '2', b: '2' });
}

map.forEach((row) => {
  console.log(row);
});
