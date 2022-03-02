import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import pdfParse from 'pdf-parse';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readDirectory = promisify(fs.readdir);
/*
Script from Jon
It's a two step process: 1) Generate txt files from the pdfs. 2) Read the txt files and build json certificates out of hacky guesses about txt structure. 
https://s3.console.aws.amazon.com/s3/object/databacklog?region=us-east-1&prefix=orc_cert_pdfs.zip

* Modified to ES6 Imports and typescript, promisified, and some fix to how data is parsed, removed unused codes and comments
*/
const pdfFolder = path.resolve(__dirname, '../files/orc_cert_pdfs');

// pdfParser.on('pdfParser_dataReady', (pdfData) => {
//   console.log(JSON.stringify(pdfData));
// });

// pdfParser.loadPDF(
//   '/Users/jon/Documents/SYRF/sailing-data/assorted-and-skipped/orc_cert_pdfs/3.pdf',
// );
let failedPdfParse: string[] = [];

const readPdf = async (uri: string) => {
  const buffer = await readFile(uri);
  try {
    const data = await pdfParse(buffer);
    // The content
    // console.log('Content: ', data.text);
    // console.log(uri.split('.pdf')[0]);
    const paths = uri.split('/');
    const filename = paths[paths.length - 1];
    const p = uri.split(filename)[0];
    fs.writeFileSync(p + 'textFiles/' + filename + '.txt', data.text);
  } catch (err) {
    failedPdfParse.push(`${uri} - ${(err as any).message}`);
  }
};

const convertPdfToText = async () => {
  // files.length
  const files = await readDirectory(pdfFolder);
  for (let index = 0; index < 100; index++) {
    const file = files[index];

    if (file.endsWith('.pdf')) {
      await readPdf(`${pdfFolder}/${file}`);
    }
  }
  if (failedPdfParse.length > 0) {
    await writeFile(
      `${pdfFolder}/logs/failed_pdfs.txt`,
      JSON.stringify(failedPdfParse),
      'utf-8',
    );
  }
};
(async () => {
  await convertPdfToText();
  // step 2 todo
})();
