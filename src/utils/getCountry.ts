import fs from 'fs';
import path from 'path';

var countryMap = new Map<string, string>();

function loadCountries() {
  const countryList: {
    name: string;
    a3: string;
    fifa: string;
  }[] = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, '../assets/json/countryCode.json'),
      'utf-8',
    ),
  );
  countryList.forEach(({ fifa: code, name, a3: alternativeCode }) => {
    if (code.includes(',')) {
      countryMap.set(alternativeCode, name);
    } else {
      countryMap.set(code, name);
    }
  });
}

loadCountries();

export default function getCountry(code: string) {
  return countryMap.get(code);
}

/*
After testing, it seems sailingNumber is not using the alpha-3 codes country for their sail number
Failed list:
4001 FRECCIA DEL  KSA-400 undefined
149701 TWISTED POR-032 undefined
18R001 HARFANG SPIRIT POR-8300 undefined
SU2602 BLUE BAYOU SUI 2602 undefined
Quick google shows SUI, POR, KSA to be valid country code by FIFA codes, hence using another country JSON that has fifa code instead
Except England:
042002 Drumlyn of the Seas GBR7773 undefined
042101 IMPULSE GBR2277L undefined
Which in FIFA, represented by "fifa": "ENG, NIR, SCO, WAL"
*/