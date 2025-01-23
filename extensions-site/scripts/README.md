# Goose Extension Converter to server.json

This script converts the Goose Extension Converter to the server.json file.

## Instructions

1. Download the [Goose Extension Curation](https://docs.google.com/spreadsheets/d/11lKmnI4k_eCqwgZqnbPVcyAY-LkbYl4A4V3aeHEUi10/edit?gid=0#gid=0) google sheet into a csv file under `input/goose_extensions_curated.csv`.

2. Open Goose and set the directory to `goose/extensions-site/scripts`.

3. Run the `instructions_scraper.md` script.

4. Run the `instructions_github_stars.md` script.

5. Run the `instructions.md` script.

6. Validate the `output/servers.json` contents.

7. Copy the `servers.json` file in the `extensions-site/public` directory.

