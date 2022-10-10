# polar-scraper

A scraper that pulls down polars and certificates from different sources and saves them in a common format

---

- [polar-scraper](#polar-scraper)
  - [Installation](#installation)
    - [Development Mode](#development-mode)
    - [Build Mode](#development-mode)
    - [Terraform Command](#terraform-command)
  - [Scripts](#scripts)
  - [Deployed Service](#deployed-service)

## Installation

Run `npm install` to install dependencies

### Development Mode

- Run `npm run scrape:dev [organization]`. Replace [organization] with wanted org target (use the same values as in enum.ts).

### Build Mode

1. Build the image with `docker build -t polar-scraper:1.0 .`
2. Run `docker run --env-file ./.env -it polar-scraper:1.0 sh`
3. Run `npm run scrape [organization]`. Replace [organization] with wanted org target (use the same values as in enum.ts).

### Terraform Command

Run terraform deployments with this command:

- `docker-compose -f deployment/dev/docker-compose.yml --env-file deployment/dev/.env run --rm terraform [apply/fmt/destroy/plan]`

## Scripts

Most of the scripts here is used as a one-time-script to parse the jsons and pdfs from the scraped older certificates.

- `scripts/setupES.ts` - This script will create a new index on elasticsearch provided in the environment configurations. Index will be created with the correct data types.
- `scripts/parseOrcPdf.ts` - Script to loop through `files/orc_cert_pdfs` folder and parse the pdf inside to get the polar values we wanted, and store them in a json file to be saved/excluded later.
- `scripts/oldOrc/fixFiles.ts` - Script to fix some of the json sources that has invalid jsons. Different folder might have different issue. Uncomment the folder to be fixed.
- `scripts/oldOrc/parse******Folder.ts` - Scripts to read the folder specified in the `files` folder.
- `scripts/oldOrc/saveValidCertsToEs.ts` - The actual script that will index the found/parsed certs to the Elastic Search.

## Deployed Service

The `Polar Scraper` is deployed as a `Scheduled Task` in an ECS Cluster (AWS), `Scraper Runner`, alongside the other scrapers. It's scheduled to run every 00:30 UTC and store newer certificates found from the cert websites.
