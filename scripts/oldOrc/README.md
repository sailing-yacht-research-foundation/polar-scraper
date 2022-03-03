# Parsing Old ORC PDF Files

These are scripts that are used to parse the old ORC certificates into our Elastic Search. For future references only.

---

- [old-orc-scripts](#old-orc-scripts)
  - [Steps](#steps)
  - [Known Problems](#known-problems)
  - [References](#references)

## Steps

1. Download the files from s3: https://s3.console.aws.amazon.com/s3/object/databacklog?region=us-east-1&prefix=orc-polar-unifier.zip
2. Extract everything, and delete the `certs_from_orc_pdfs.json` in the root folder. It has invalid dates.
3. Download the original pdfs from s3: https://s3.console.aws.amazon.com/s3/object/databacklog?region=us-east-1&prefix=orc_cert_pdfs.zip (Large File Warning)
4. Extract everything into project folder: `./files/orc_cert_pdfs`.
5. Run `ts-node scripts/parseOrcPdf.ts`. This should parse all those pdfs extracted into text files, and then converted into json at `./files/certs_from_orc_pdfs.json`
6. Go into folder `./files` and remove duplicate files, leave only `2020_polars.json`, `All2021.json`, `ALLORG2019.json`, and `NED2015.json`.
7. Run `ts-node scripts/oldOrc/fixFiles.ts` to fix all the broken files, uncomment each code part necessary before running this. Also see known problems No.1 below to manually fix several stuff.
8. Move the `NED2015.json` to the `./files/jeiterPolars/FixedFiles` folder and rename into `2015NED.json` (for country value purpose)
9. All broken files are now fixed and should be in their desired locations. Run `ts-node scripts/oldOrc/index.ts`, this will parse all the files we care, while excluding the duplicates.
10. After the script finishes, there should be some files generated which can be used for next step, and for debugging as well (duplicates, invalid, etc)
11. Run `ts-node scripts/oldOrc/saveValidCertsToEs.ts`. This should save all the valid and non-duplicate certs into ElasticSearch.

## Known Problems

1. After fixing the `All2021.json` files, open the fixed file, and search for `H\x8f` and remove the `x8f` to make the json valid.
   Also open the fixed `ALLORG2019.json` and find `THAT\S AMORE` and replace the escape with `'`.
2. ORCPolars folder inside jeiterFolders are not run yet, cause they don't have the issue date (year) which are used to check for duplicates.
   Will be done after all parsed certs inserted into ES, cause we will compare with the polars value instead. Since the file count are not that large,
   should be okay to query it directly to ES each file/record. Unable to change the existing dupe check on the scripts because we are using issue year
   as map key and not storing each polars in them
3. Running the `saveValidCertsToEs.ts` might take some time, and require several restart because sometime you might get 429 Too Many requests.
   It's fine to re-run them since it will log done certificates into a file, and continue from where it succeeds last time.

## References

Included in the `./files/oldOrc/references` are the original js script by Jon to parse the pdfs into json.
