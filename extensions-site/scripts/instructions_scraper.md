
# Goose Instructions Scraper

Please follow the instructions below to scrape the installation commands for each MCP extension.
Context: Model Context Protocol (MCP) is a protocol for creating "servers" with tools that can interact with LLMs.
We have a list of MCP extensions curated internally and externally that we want to scrape the installation commands for.
Your job is to scrape the installation commands for each extension and output the results in a file.

## Files

- `input/goose_extensions_curated.csv` - The source file containing the list of MCP extensions.
- `input/goose_installation_instructions.json` - The file to be created containing the installation instructions for each MCP extension.

Please leverage the `scrape_instructions.py` script to scrape the installation instructions.

## Instructions

1. Read the `input/goose_extensions_curated.csv` file and take note of the "Link" column.
2. For each link, scrape the installation instructions from the link and output the results in the `input/goose_installation_instructions.json` file.
3. The links will be github repositories. 
   - If the repo link is in block/goose or squareup/mcp (https://github.com/block/goose/tree/v1.0/crates/goose-mcp/src/developer), then please mark the "is_internal" field as true.
   - If the repo link is not in block/goose, then please mark the "is_internal" field as false.
   - IMPORTANT: Try to scrape the instructions from the README.md file. Eg, add the README.md to the url ({url}/README.md) and scrape the instructions from there.
   - If the README.md file is not found, just put the instructions as "".
   - The command should be the command to install the extension and should start with npx -y or uvx. Eg, uvx mcp-codesearch or npx -y @modelcontextprotocol/server-github. If the command is not found, just put the instructions as "". If there is only docker for installation, just say the installation is not compatible. 
   - IMPORTANT:Please try to find the environment variables for the extension. Please mark the environment variables as required if they are required for the extension to work. If not found, environment_variables should be an empty array.
4. The file should be in the following format:

## IMPORTANT:
Please remember to try two links for each extension: if the link https://github.com/squareup/mcp/blob/main/mcp-codesearch is provided, please try as well https://github.com/squareup/mcp/tree/main/mcp-codesearch/README.md for each link. That way, we can get the instructions from the README.md file.

DO THIS ONE BY ONE AND MAKE SURE TO ADD AS MUCH INFORMATION AS POSSIBLE FOUND FOR EACH EXTENSION.

Write to `input/goose_installation_instructions.json` in the following format:
```json
[
  {
  "link": "https://github.com/squareup/mcp/tree/main/mcp-codesearch",
  "is_internal": true,
  "instructions": "The installation instructions for the extension.",
  "command": "The installation command for the extension.",
  "environment_variables": [
    {
      "name": "VAR1",
      "description": "The description of the environment variable",
      "required": true
    },
    {
      "name": "VAR2",
      "description": "The description of the environment variable",
      "required": false
    }
    ]
  },
  ...
]
```