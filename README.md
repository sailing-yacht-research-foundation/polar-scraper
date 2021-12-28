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

- TODO!

### Build Mode

1. Build the image with `docker build -t polar-scraper:1.0 .`
2. Run `docker run --env-file ./.env -it polar-scraper:1.0 sh`
3. Run `npm run scrape:[organization]`. Replace [organization] with wanted org target.

## TODOs

- Scrape ORR 2020 and earlier?
