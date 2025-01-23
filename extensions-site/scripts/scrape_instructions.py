import csv
import json
import requests
import re
from urllib.parse import urljoin
import os

def get_readme_content(url):
    if not url:
        return None
        
    # Handle multiple URLs in the cell
    urls = [u.strip() for u in url.split('\n') if u.strip() and u.strip().startswith('http')]
    if not urls:
        return None
        
    # Use the first URL that's a github URL
    github_urls = [u for u in urls if 'github.com' in u]
    if not github_urls:
        return None
        
    url = github_urls[0].strip()
    
    # Try both potential README locations
    readme_contents = []
    
    # Convert URLs to raw content URLs and try both paths
    if 'github.com' in url:
        # Remove /blob/ if present
        url = url.replace('/blob/', '/tree/')
        
        # First try: Direct README in the provided path
        base_url = url.replace('github.com', 'raw.githubusercontent.com')
        base_url = base_url.replace('/tree/', '/')
        readme_url1 = urljoin(base_url, 'README.md')
        
        # Second try: README in a subdirectory
        if not url.endswith('/'):
            url += '/'
        readme_url2 = urljoin(url, 'README.md')
        readme_url2 = readme_url2.replace('github.com', 'raw.githubusercontent.com')
        readme_url2 = readme_url2.replace('/tree/', '/')
        
        # Try both URLs with both main and master branches
        urls_to_try = [
            readme_url1,
            readme_url2,
            readme_url1.replace('/main/', '/master/'),
            readme_url2.replace('/main/', '/master/')
        ]
        
        for try_url in urls_to_try:
            try:
                response = requests.get(try_url)
                if response.status_code == 200:
                    return response.text
            except Exception as e:
                print(f"Error fetching {try_url}: {str(e)}")
                
    return None

def extract_install_command(content, info=""):
    if not content and not info:
        return ""
        
    # Look for docker-only installation
    docker_patterns = [
        r'docker\s+build\s+-t',
        r'docker\s+run\s+',
        r'docker-compose\s+up',
    ]
    
    for pattern in docker_patterns:
        if content and re.search(pattern, content, re.IGNORECASE | re.MULTILINE):
            return "Installation not compatible - Docker only"
        if info and re.search(pattern, info, re.IGNORECASE | re.MULTILINE):
            return "Installation not compatible - Docker only"
    
    # Look for installation commands that start with npx -y or uvx
    patterns = [
        r'(?:```(?:\w+)?\s*)?((?:npx -y |uvx ).+?)(?:\s*```|\s*\n|$)',
        r'(?:Installation:|Install:|To install:|Getting started:).*?\n.*?((?:npx -y |uvx ).+?)(?:\s*\n|$)',
        r'install:?\s*((?:npx -y |uvx ).+?)(?:\s*\n|$)',
        r'install\s*-\s*((?:npx -y |uvx ).+?)(?:\s*\n|$)',
        r'install:\s*[`"]?((?:npx -y |uvx ).+?)[`"]?(?:\s*[&]|$|\n)',
    ]
    
    # First try the info field
    if info:
        for pattern in patterns:
            matches = re.findall(pattern, info, re.IGNORECASE | re.MULTILINE)
            if matches:
                cmd = matches[0].strip().strip('`"')
                # Remove any trailing commands after &
                cmd = cmd.split('&')[0].strip()
                return cmd
    
    # Then try the README content
    if content:
        for pattern in patterns:
            matches = re.findall(pattern, content, re.IGNORECASE | re.MULTILINE)
            if matches:
                cmd = matches[0].strip().strip('`"')
                # Remove any trailing commands after &
                cmd = cmd.split('&')[0].strip()
                return cmd
    
    return ""

def extract_env_variables(content):
    if not content:
        return []
        
    env_vars = []
    
    # Patterns to find environment variables with descriptions
    patterns = [
        # Environment variables in configuration blocks with description
        r'(?:Set|Configure|Add|Export|Required|Environment|Env).*?(?:variables?|vars?|configuration).*?\n(?:[-*\s]*([A-Z][A-Z0-9_]+)[^\n]*(?:(?::|=|-)\s*([^\n]*))?)',
        # Export statements with comments
        r'(?:```(?:\w+)?\s*)?(?:export\s+)?([A-Z][A-Z0-9_]+)=.*?(?:#\s*([^\n]*))?',
        # Environment variables in JSON/YAML configs with descriptions
        r'env:\s*{\s*(?:["\'])?([A-Z][A-Z0-9_]+)(?:["\'])?:\s*(?:["\'])?([^"\'\n]*)',
        # Required environment variables
        r'Required.*?(?:variables?|env).*?[:`]\s*([A-Z][A-Z0-9_]+)(?:\s*[-:]\s*([^\n]*))?',
    ]
    
    # Additional pattern to detect if a variable is required
    required_patterns = [
        r'required',
        r'must be set',
        r'needs to be set',
        r'necessary',
        r'mandatory',
    ]
    
    found_vars = set()
    
    for pattern in patterns:
        matches = re.finditer(pattern, content, re.IGNORECASE | re.MULTILINE)
        for match in matches:
            var_name = match.group(1)
            if var_name and not var_name.startswith('PATH'):  # Exclude common system variables
                var_name = var_name.strip('`"\' ')
                if var_name.isupper() and '_' in var_name and var_name not in found_vars:
                    found_vars.add(var_name)
                    
                    # Get description if available
                    description = match.group(2) if len(match.groups()) > 1 and match.group(2) else ""
                    description = description.strip('`"\' ') if description else "No description available"
                    
                    # Check if variable is required
                    context = content[max(0, match.start() - 50):min(len(content), match.end() + 50)]
                    is_required = any(re.search(p, context, re.IGNORECASE) for p in required_patterns)
                    
                    env_vars.append({
                        "name": var_name,
                        "description": description,
                        "required": is_required
                    })
    
    return env_vars

def is_internal_repo(url):
    return 'block/goose' in url.lower() or 'squareup/mcp' in url.lower()

def clean_link(link):
    """Clean and validate GitHub repository link."""
    if not link:
        return None
    
    # Handle URLs in the text
    urls = re.findall(r'https?://(?:www\.)?github\.com/[^\s,)]+', link)
    if not urls:
        return None
    
    # Get the first GitHub URL
    url = urls[0].strip()
    
    # Remove any trailing fragments or query parameters
    url = url.split('#')[0].split('?')[0].rstrip('/')
    
    return url

def main():
    extensions = []
    processed_links = set()  # To avoid duplicates
    
    # Skip the first few rows that contain metadata
    skip_rows = 3
    
    # Read all lines from the CSV file
    with open('input/goose_extensions_curated.csv', 'r') as f:
        lines = f.readlines()
    
    # Skip metadata rows and empty lines
    data_lines = [line for line in lines[skip_rows:] if line.strip()]
    
    # Process each line
    for line in data_lines:
        # Split the line by comma, handling quoted fields
        fields = list(csv.reader([line]))[0]
        
        # Skip header row
        if fields[0] == 'Extension':
            continue
            
        # Get the link (third column)
        if len(fields) >= 3:
            link = clean_link(fields[2])
            if not link or link in processed_links:
                continue
                
            processed_links.add(link)
            print(f"Processing: {link}")
            
            # Get README content
            readme_content = get_readme_content(link)
            
            # Get detailed notes which might contain installation instructions (fifth column)
            info = fields[4] if len(fields) > 4 else ''
            
            extension_info = {
                "link": link,
                "is_internal": is_internal_repo(link),
                "instructions": readme_content if readme_content else "",
                "command": extract_install_command(readme_content, info),
                "environment_variables": extract_env_variables(readme_content)
            }
            
            extensions.append(extension_info)
    
    # Write the results to JSON file
    output_path = 'input/goose_installation_instructions.json'
    with open(output_path, 'w') as jsonfile:
        json.dump(extensions, jsonfile, indent=2)
    print(f"\nProcessed {len(extensions)} extensions. Results written to {output_path}")

if __name__ == "__main__":
    main()