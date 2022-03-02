/*
Script from Jon
It's a two step process: 1) Generate txt files from the pdfs. 2) Read the txt files and build json certificates out of hacky guesses about txt structure. 
https://s3.console.aws.amazon.com/s3/object/databacklog?region=us-east-1&prefix=orc_cert_pdfs.zip

* Modified to ES6 Imports and typescript, promisified, and some fix to how data is parsed, removed unused codes and comments
*/

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import pdfParse from 'pdf-parse';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readDirectory = promisify(fs.readdir);
const METERS_PER_FOOT = 0.3048;
const years = [
  '2005',
  '2006',
  '2007',
  '2008',
  '2009',
  '2010',
  '2011',
  '2012',
  '2013',
  '2014',
  '2015',
  '2016',
  '2017',
  '2018',
  '2019',
  '2020',
  '2021',
];
const pdfFolder = path.resolve(__dirname, '../files/orc_cert_pdfs');

let failedPdfParse: string[] = [];

const readPdf = async (uri: string) => {
  const buffer = await readFile(uri);
  try {
    const data = await pdfParse(buffer);
    const paths = uri.split('/');
    const filename = paths[paths.length - 1];
    const p = uri.split(filename)[0];
    fs.writeFileSync(p + 'textFiles/' + filename + '.txt', data.text);
  } catch (err) {
    failedPdfParse.push(`${uri} - ${(err as any).message}`);
  }
};

const convertPdfToText = async () => {
  const files = await readDirectory(pdfFolder);
  for (let index = 0; index < files.length; index++) {
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

const parseOrcTexts = async () => {
  let numPolars = 0;
  let measurers: string[] = [];
  let classnames: string[] = [];
  let designers: string[] = [];
  let builders: string[] = [];
  const certWithInvalidDates = [];
  const certWithInvalidExpiry = [];
  const files = await readDirectory(`${pdfFolder}/textFiles`);

  const certs = [];
  for (let index = 0; index < files.length; index++) {
    const file = files[index];

    if (file.endsWith('.txt')) {
      const data = await readFile(`${pdfFolder}/textFiles/${file}`, 'utf-8');
      const lines = data.split('\n');
      let className = '';
      let builderName = '';
      let designerName = '';
      let displacement: number | undefined = undefined;
      let loa: number | undefined = undefined;
      let mb: number | undefined = undefined;
      let draft: number | undefined = undefined;
      let cdl: number | undefined = undefined;
      let limitPositiveStability = '';
      let stabilityIndex = '';
      let lengthOverall: number | undefined = undefined;
      let maximumBeam: number | undefined = undefined;
      let gph = '';
      let measurer = '';
      let measurementDate = '';
      let vppVersion = '';
      let boatName = '';
      let sailNumber = '';
      let series = '';
      let age = '';
      let ageAllowance = '';

      let dynamicAllowance = '';
      let imsl = '';
      let rl = '';
      let vcgd = '';
      let vcgm = '';
      let sink = '';
      let ws = '';
      let lsm = '';
      // var timeOnDistanceOffshore = ''
      // var timeOnDistanceInshore = ''
      // var timeOnTimeOffshore = ''
      // var timeOnTimeInshore = ''
      let certNumber = '';
      let orcRef = '';
      let issuedDate = '';
      let validUntil = '';

      let hasPolars = false;
      for (let lineCount = 0; lineCount < lines.length; lineCount++) {
        let line = lines[lineCount];

        if (line.startsWith('Dynamic Allowance')) {
          dynamicAllowance = line.split('Dynamic Allowance')[1];
        }

        if (line.startsWith('Issued On')) {
          const date = line.split('Issued On')[1].split('/');
          if (date.length !== 3) {
            console.log(`File ${file} has invalid date issue: ${line}`);
          } else {
            let yearString = date[2];
            if (yearString.length > 4) {
              // The year is postfixed with something like Issued On03/02/2020 - VPP 2020 1.01
              yearString = yearString.split(' ')[0];
            }
            const dateValue = new Date(
              `${yearString}-${date[1].padStart(2, '0')}-${date[0].padStart(
                2,
                '0',
              )}T00:00:00Z`,
            );
            issuedDate = dateValue.toUTCString();
            if (issuedDate === 'Invalid Date') {
              certWithInvalidDates.push(`${file} - ${line}`);
            }
          }
        }

        if (line.startsWith('Valid until')) {
          const date = line.split('Valid until')[1].split('/');
          if (date.length !== 3) {
            console.log(`File ${file} has invalid expire date: ${line}`);
          } else {
            let yearString = date[2];
            if (yearString.length > 4) {
              yearString = yearString.split(' ')[0];
            }
            const dateValue = new Date(
              `${yearString}-${date[1].padStart(2, '0')}-${date[0].padStart(
                2,
                '0',
              )}T00:00:00Z`,
            );
            validUntil = dateValue.toUTCString();
            if (issuedDate === 'Invalid Date') {
              certWithInvalidExpiry.push(`${file} - ${line}`);
            }
          }
        }

        if (line.startsWith('IMSL')) {
          imsl = line.split('IMSL')[1];
        }

        if (line.startsWith('VCGD')) {
          vcgd = line.split('VCGD')[1];
        }

        if (line.startsWith('VCGM')) {
          vcgm = line.split('VCGM')[1];
        }

        if (line.startsWith('Sink')) {
          sink = line.split('Sink')[1];
        }

        if (line.startsWith('WS')) {
          ws = line.split('WS')[1];
        }

        if (line.startsWith('RL')) {
          rl = line.split('RL')[1];
        }

        if (line.startsWith('LSM')) {
          lsm = line.split('LSM')[1];
        }

        if (line.startsWith('Number')) {
          certNumber = line.split('Number')[1];
        }

        if (line.startsWith('ORC Ref')) {
          orcRef = line.split('ORC Ref')[1];
        }

        if (line.startsWith('Name')) {
          boatName = line.split('Name')[1];
        }

        if (line.startsWith('Sail Nr')) {
          sailNumber = line.split('Sail Nr')[1];
        }

        if (line.startsWith('Series')) {
          series = line.split('Series')[1];
        }

        if (line.startsWith('Age Allowance')) {
          ageAllowance = line.split('Age Allowance')[1];
        } else if (line.startsWith('Age')) {
          age = line.split('Age')[1];
        }

        if (
          line.startsWith('Class') &&
          !line.includes('Division Length') &&
          !line.startsWith('Class Rule') &&
          !line.startsWith('Class Input') &&
          !line.startsWith('Class-')
        ) {
          className = formatClassName(line.split('Class')[1]);
          if (className !== '' && !classnames.includes(className)) {
            classnames.push(className);
          }
        }

        if (
          line.startsWith('Builder') &&
          !line.startsWith("Builder's displacement") &&
          !line.startsWith("Builder's")
        ) {
          // console.log(className)
          builderName = line.split('Builder')[1].toLocaleLowerCase().trim();
          if (builderName !== '' && !builders.includes(builderName)) {
            builders.push(builderName);
          }
          // lineCount++
          // boatType = lines[lineCount].toLocaleLowerCase()
        }

        if (line.startsWith('Designer')) {
          //  console.log(className)
          designerName = line.split('Designer')[1].toLocaleLowerCase().trim();
          if (designerName !== '' && !designers.includes(designerName)) {
            designers.push(designerName);
          }
        }

        if (line.startsWith('VPP Ver.')) {
          vppVersion = formatVersion(
            line.split('VPP Ver.')[1].toLocaleLowerCase(),
          );
        }

        if (line.startsWith('Wind Velocity')) {
          hasPolars = true;
        }

        if (line.startsWith('MB')) {
          mb = formatMB(line.split('MB')[1]);
        }

        if (
          line.startsWith('Displacement') &&
          !line.startsWith('Displacement ') &&
          !line.startsWith('Displacement,') &&
          !line.startsWith('Displacement-')
        ) {
          displacement = formatDisplacement(line.split('Displacement')[1]);
        }

        if (line.startsWith('LOA')) {
          loa = formatLOA(line.split('LOA')[1]);
        }

        if (
          line.startsWith('Draft') &&
          !line.includes('wacht') &&
          !line.includes('/') &&
          !line.includes('Code')
        ) {
          draft = formatMeters(line.split('Draft')[1]);
        }

        if (line.startsWith('CDL =')) {
          cdl = parseFloat(line.split('CDL =')[1]);
        }

        if (line.startsWith('GPH')) {
          gph = lines[lineCount - 1];
        }
        if (line.startsWith('Limit Positive Stab.:')) {
          limitPositiveStability = line.split('Limit Positive Stab.:')[1];
        }

        if (line.startsWith('Stability Index:')) {
          stabilityIndex = line.split('Stability Index:')[1];
        }

        if (line.startsWith('Length Overall')) {
          lengthOverall = formatMeters(line.split('Length Overall')[1]);
        }

        if (line.startsWith('Maximum Beam')) {
          maximumBeam = formatMeters(line.split('Maximum Beam')[1]);
        }
        if (line.startsWith('Measurement by')) {
          measurer = line
            .split('Measurement by')[1]
            .split('-')[0]
            .toLowerCase()
            .replace('.', '')
            .trim();
          if (measurer !== '' && !measurers.includes(measurer)) {
            measurers.push(measurer);
          }

          measurementDate = line.split('Measurement by')[1].split('-')[1];
        }
      }
      let timeAllowancesTemp = [];
      let polarsTemp = [];
      if (hasPolars) {
        numPolars++;
        // console.log(file)
        // for(var lineCount = 0; lineCount < lines.length; lineCount++){
        //     var line = lines[lineCount]
        //     console.log(line)
        // }
        for (let lineCount = 0; lineCount < lines.length; lineCount++) {
          let line = lines[lineCount];

          if (line.startsWith('Wind Velocity')) {
            timeAllowancesTemp.push(line);
            for (let counter = 0; counter < 10; counter++) {
              lineCount++;
              line = lines[lineCount];
              timeAllowancesTemp.push(line);
            }
            lineCount += 5;
            for (let counter = 0; counter < 13; counter++) {
              line = lines[lineCount];
              polarsTemp.push(line);
              lineCount++;
            }
          }
        }
      }

      let timeAllowances: {
        windSpeeds: number[];
        beatVMGs: number[];
        timeAllowances: { twa: number; speeds: number[] }[];
        runVMGs: number[];
      } = {
        windSpeeds: [],
        beatVMGs: [],
        timeAllowances: [],
        runVMGs: [],
      };

      for (
        let polarIndex = 0;
        polarIndex < timeAllowancesTemp.length;
        polarIndex++
      ) {
        let line: string = timeAllowancesTemp[polarIndex];
        if (polarIndex === 0) {
          let windSpeeds: number[] = [];
          let speeds = line.split('Wind Velocity')[1].split(' kt');
          speeds.forEach((speed) => {
            let s = parseInt(speed);
            if (!isNaN(s)) {
              windSpeeds.push(s);
            }
          });
          timeAllowances.windSpeeds = windSpeeds;
        } else if (polarIndex === 1) {
          let beatVMGString = line.split('Beat VMG')[1];
          let beatVMGs = [];
          let currentVMG = '';
          let numDecimals = 0;
          let startCounting = false;
          for (let i = 0; i < beatVMGString.length; i++) {
            if (beatVMGString.charAt(i) === ',') {
              currentVMG = currentVMG + '.';
            } else {
              currentVMG = currentVMG + beatVMGString.charAt(i);
            }

            if (startCounting) {
              numDecimals++;
            }
            if (numDecimals == 1) {
              startCounting = false;
              numDecimals = 0;
              beatVMGs.push(parseFloat(currentVMG));
              currentVMG = '';
            }

            if (
              beatVMGString.charAt(i) === '.' ||
              beatVMGString.charAt(i) === ','
            ) {
              startCounting = true;
            }
          }
          timeAllowances.beatVMGs = beatVMGs;
        } else if (polarIndex > 1 && polarIndex < 10) {
          let polarString = line.split('°')[1];
          let twa = parseFloat(line.split('°')[0]);
          let speeds: number[] = [];
          let currentSpeed = '';
          let numDecimals = 0;
          let startCounting = false;
          for (let i = 0; i < polarString.length; i++) {
            if (polarString.charAt(i) === ',') {
              currentSpeed = currentSpeed + '.';
            } else {
              currentSpeed = currentSpeed + polarString.charAt(i);
            }

            if (startCounting) {
              numDecimals++;
            }
            if (numDecimals == 1) {
              startCounting = false;
              numDecimals = 0;
              speeds.push(parseFloat(currentSpeed));
              currentSpeed = '';
            }

            if (
              polarString.charAt(i) === '.' ||
              polarString.charAt(i) === ','
            ) {
              startCounting = true;
            }
          }
          timeAllowances.timeAllowances.push({ twa: twa, speeds: speeds });
        } else if (polarIndex == 10) {
          let runVMGString = line.split('Run VMG')[1];
          let runVMGs = [];
          let currentVMG = '';
          let numDecimals = 0;
          let startCounting = false;
          for (let i = 0; i < runVMGString.length; i++) {
            if (runVMGString.charAt(i) === ',') {
              currentVMG = currentVMG + '.';
            } else {
              currentVMG = currentVMG + runVMGString.charAt(i);
            }

            if (startCounting) {
              numDecimals++;
            }
            if (numDecimals == 1) {
              startCounting = false;
              numDecimals = 0;
              runVMGs.push(parseFloat(currentVMG));
              currentVMG = '';
            }

            if (
              runVMGString.charAt(i) === '.' ||
              runVMGString.charAt(i) === ','
            ) {
              startCounting = true;
            }
            timeAllowances.runVMGs = runVMGs;
          }
        }
      }

      let polars: {
        windSpeeds: number[];
        beatAngles: number[];
        beatVMGs: number[];
        polars: { twa: number; speeds: number[] }[];
        runVMGs: number[];
        gybeAngles: number[];
      } = {
        windSpeeds: [],
        beatAngles: [],
        beatVMGs: [],
        polars: [],
        runVMGs: [],
        gybeAngles: [],
      };
      for (let polarIndex = 0; polarIndex < polarsTemp.length; polarIndex++) {
        let line = polarsTemp[polarIndex];
        if (polarIndex == 0) {
          let windSpeeds: number[] = [];
          let speeds = line.split('Wind Velocity')[1].split(' kt');
          speeds.forEach((speed) => {
            let s = parseInt(speed);
            if (!isNaN(s)) {
              windSpeeds.push(s);
            }
          });
          polars.windSpeeds = windSpeeds;
        } else if (polarIndex === 1) {
          let beatAngles: string[] = line.split('Beat Angles')[1].split('°');
          let beatAnglesDegrees: number[] = [];
          beatAngles.forEach((a) => {
            let s = parseFloat(a.replace(',', '.'));

            if (!isNaN(s)) {
              beatAnglesDegrees.push(s);
            }
          });
          polars.beatAngles = beatAnglesDegrees;
        } else if (polarIndex === 2) {
          let beatVMGString = line.split('Beat VMG')[1];
          let beatVMGs = [];
          let currentVMG = '';
          let numDecimals = 0;
          let startCounting = false;
          for (let i = 0; i < beatVMGString.length; i++) {
            if (beatVMGString.charAt(i) === ',') {
              currentVMG = currentVMG + '.';
            } else {
              currentVMG = currentVMG + beatVMGString.charAt(i);
            }

            if (startCounting) {
              numDecimals++;
            }
            if (numDecimals == 2) {
              startCounting = false;
              numDecimals = 0;
              beatVMGs.push(parseFloat(currentVMG));
              currentVMG = '';
            }

            if (
              beatVMGString.charAt(i) === '.' ||
              beatVMGString.charAt(i) === ','
            ) {
              startCounting = true;
            }
          }
          polars.beatVMGs = beatVMGs;
        } else if (polarIndex > 2 && polarIndex < 11) {
          let polarString = line.split('°')[1];
          let twa = parseFloat(line.split('°')[0]);
          let speeds: number[] = [];
          let currentSpeed: string = '';
          let numDecimals = 0;
          let startCounting = false;
          for (let i = 0; i < polarString.length; i++) {
            if (polarString.charAt(i) === ',') {
              currentSpeed = currentSpeed + '.';
            } else {
              currentSpeed = currentSpeed + polarString.charAt(i);
            }

            if (startCounting) {
              numDecimals++;
            }
            if (numDecimals == 2) {
              startCounting = false;
              numDecimals = 0;
              speeds.push(parseFloat(currentSpeed));
              currentSpeed = '';
            }

            if (
              polarString.charAt(i) === '.' ||
              polarString.charAt(i) === ','
            ) {
              startCounting = true;
            }
          }

          polars.polars.push({ twa: twa, speeds: speeds });
        } else if (polarIndex == 11) {
          let runVMGString = line.split('Run VMG')[1];
          let runVMGs = [];
          let currentVMG = '';
          let numDecimals = 0;
          let startCounting = false;
          for (let i = 0; i < runVMGString.length; i++) {
            if (runVMGString.charAt(i) === ',') {
              currentVMG = currentVMG + '.';
            } else {
              currentVMG = currentVMG + runVMGString.charAt(i);
            }
            if (startCounting) {
              numDecimals++;
            }
            if (numDecimals == 2) {
              startCounting = false;
              numDecimals = 0;
              runVMGs.push(parseFloat(currentVMG));
              currentVMG = '';
            }

            if (
              runVMGString.charAt(i) === '.' ||
              runVMGString.charAt(i) === ','
            ) {
              startCounting = true;
            }
            polars.runVMGs = runVMGs;
          }
        } else if (polarIndex == 12) {
          let gybeAngles: string[] = line.split('Gybe Angles')[1].split('°');
          let gybeAnglesDegrees: number[] = [];
          gybeAngles.forEach((a) => {
            let s = parseFloat(a.replace(',', '.'));
            if (!isNaN(s)) {
              gybeAnglesDegrees.push(s);
            }
          });
          polars.gybeAngles = gybeAnglesDegrees;
        }
      }

      certs.push({
        name: file,
        displacementKg: displacement,
        loaM: loa,
        mbM: mb,
        draftM: draft,
        cdl,
        lps: limitPositiveStability,
        si: stabilityIndex,
        loM: lengthOverall,
        maxBM: maximumBeam,
        gph,
        measurementDate,
        measurer,
        hasPolars,
        polars,
        timeAllowances,
        vppVersion,
        sailNumber,
        boatName,
        series,
        ageAllowance,
        age,
        dynamicAllowance,
        imsl,
        rl,
        vcgd,
        vcgm,
        sink,
        ws,
        lsm,
        certNumber,
        orcRef,
        issuedDate,
        validUntil,
        className,
        designerName,
        builderName,
      });
    }
  }
  await writeFile(
    `${pdfFolder}/result/certs_from_orc_pdfs.json`,
    JSON.stringify(certs),
  );
  await writeFile(
    `${pdfFolder}/result/invalid_cert_date.json`,
    JSON.stringify(certWithInvalidDates),
  );
  await writeFile(
    `${pdfFolder}/result/invalid_expiry_date.json`,
    JSON.stringify(certWithInvalidExpiry),
  );
};

(async () => {
  // await convertPdfToText();
  // step 2 todo
  await parseOrcTexts();
})();

function formatClassName(className: string) {
  return className
    .replace('-', '')
    .replace('.', '')
    .toLowerCase()
    .trim()
    .replace(' od', ' one design')
    .replace(/ /g, '');
}

function formatDisplacement(displacement: string) {
  return parseFloat(
    displacement.replace('kg', '').replace('.', '').replace(',', ''),
  );
}

function formatLOA(loa: string) {
  if (loa.includes('ft')) {
    return (
      parseFloat(loa.replace('ft', '').replace(',', '.')) * METERS_PER_FOOT
    );
  } else {
    return parseFloat(loa.replace('m', '').replace(',', '.'));
  }
}

function formatVersion(version: string) {
  let newVersion = version;
  years.forEach((year) => {
    newVersion = newVersion.replace(year, '');
  });

  return newVersion.trim();
}

function formatMB(mb: string) {
  if (mb.includes('ft')) {
    return parseFloat(mb.replace('ft', '').replace(',', '.')) * METERS_PER_FOOT;
  } else {
    return parseFloat(mb.replace('m', '').replace(',', '.'));
  }
}

function formatMeters(value: string) {
  if (value.includes('ft')) {
    return (
      parseFloat(value.replace('ft', '').replace(',', '.')) * METERS_PER_FOOT
    );
  } else {
    return parseFloat(value.replace('m', '').replace(',', '.'));
  }
}
