# Goose Github Stars Scraper

Context: Model Context Protocol (MCP) is a protocol for creating "servers" with tools that can interact with LLMs.
We have a list of MCP extensions curated internally and externally that we want to scrape the github stars for.
Your job is to scrape the github stars for each extension and output the results in a file.

## Files

- `input/goose_extensions_curated.csv` - The source file containing the list of MCP extensions.
- `input/goose_github_stars.json` - The file to be created containing the github stars for each MCP extension.

## Instructions

1. Read the `input/goose_extensions_curated.csv` file and take note of the "Link" column.
2. For each link, find a way to scrape the github stars from the link and output the results in the `input/goose_github_stars.json` file.
3. The links will be github repositories.

4. IMPORTANT: Please do this one by one and make sure to add the number of Github stars found for each extension.

5. IMPORTANT: Please do not hallucinate the number of Github stars. Only put the number of Github stars if you see it in the link.
6. Make sure to output the same number of extensions as you read in the input/goose_extensions_curated.csv file.

## Output Format 

For example the first extension in the input/goose_extensions_curated.csv file is the Developer extension. Do this for each extension in the input/goose_extensions_curated.csv file even if they come from the same link.
```json
[
  {
    "link": "https://github.com/block/goose/tree/v1.0/crates/goose-mcp/src/developer",
    "extension_name": "Developer",
    "githubStars": 356
  },
  {
    "link": "https://github.com/block/goose/tree/v1.0/crates/goose-mcp/src/nondeveloper",
    "extension_name": "Non-developer",
    "githubStars": 356
  },
  ...
  {
    "link": "https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite",
    "extension_name": "SQLite",
    "githubStars": 7270
  }
]
```