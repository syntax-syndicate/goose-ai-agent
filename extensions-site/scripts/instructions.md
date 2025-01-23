
# Goose Extension Converter to server.json

You are an expert at reading and consolidating csv and json files. 
Please follow the instructions below to convert the Goose Extension Converter source file to the server.json file.

## Files

- `input/goose_extensions_curated.csv` - The source file to be converted.
- `input/goose_installation_instructions.json` - The curated installation instructions for each MCP extension.
- `input/goose_github_stars.json` - The curated github stars for each MCP extension.
- `output/servers.json` - The final output file to be created.

## Instructions

1. Read the input files and take note of the fields and contents. Each row represents a single MCP extension.
2. For each MCP extension, convert the following JSON to the server.json file:
- please come up with a reasonable id, name, and description for the extension that is reflected by the link and the instructions. Use underscore _ instead of - dash to separate words in the id field.
- The command should be the installation command for the extension.
- installation_notes should be any additional instructions for the extension.
- is_extension should be true if the extension is in the block/goose repo, false otherwise. (hint: developer, nondeveloper, memory, jetbrains, and google_drive are extensions)
- endorsed: Only put true if the extension runs without error and is recommended by the Goose team according to input/goose_extensions_curated.csv. 
- githubStars should be the github stars for the extension.
- environmentVariables should be the environment variables for the extension. Please do not hallucinate environment variables. Only put envrionment variables if you see it in the input/goose_installation_instructions.json file. If you don't see any, please leave it empty.

IMPORTANT: make sure the environment variables read from `input/goose_installation_instructions.json` do not go missing.
Only include endorsed extensions in the output/servers.json file.

## Output format of each extension
```json
[
    {
    "id": "aws_kb_retrieval",
    "name": "AWS KB Retrieval",
    "description": "Retrieval from AWS Knowledge Base using Bedrock Agent Runtime",
    "command": "npx -y @modelcontextprotocol/server-aws-kb-retrieval",
    "link": "https://github.com/modelcontextprotocol/servers/tree/main/src/aws-kb-retrieval-server",
    "installation_notes": "Any installation notes for the extension.",
    "is_extension": false,
    "endorsed": true,
    "githubStars": 120,
    "environmentVariables": [
      {
        "name": "AWS_ACCESS_KEY_ID",
        "description": "AWS access key ID",
        "required": true
      }
    ]
  },
  ...
]
```
