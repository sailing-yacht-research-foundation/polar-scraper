# polar-scraper

A scraper that pulls down polars and certificates from different sources and saves them in a common format

---

- [polar-scraper](#polar-scraper)
  - [Installation](#installation)
    - [Development Mode](#development-mode)
    - [Build Mode](#development-mode)
  - [TODOs](#todos)

## Installation

Run `npm install` to install dependencies

### Development Mode

- Run `npm run scrape:dev [organization]`. Replace [organization] with wanted org target (use the same values as in enum.ts).

### Build Mode

1. Build the image with `docker build -t polar-scraper:1.0 .`
2. Run `docker run --env-file ./.env -it polar-scraper:1.0 sh`
3. Run `npm run scrape [organization]`. Replace [organization] with wanted org target (use the same values as in enum.ts).

## TODOs

- Scrape ORR Full 2020 and earlier? -> No polar data in the 2020 versions
