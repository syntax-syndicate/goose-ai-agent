import csv
import json
import requests
from urllib.parse import urlparse

def get_repo_info(url):
    """Extract owner and repo from GitHub URL and get stars."""
    # Extract owner/repo from URL
    if not url or 'github.com' not in url:
        return None
    
    path = urlparse(url).path.strip('/')
    parts = path.split('/')
    
    # Handle tree/blob paths
    if len(parts) >= 2:
        owner = parts[0]
        repo = parts[1]
        
        # Make GitHub API request
        api_url = f"https://api.github.com/repos/{owner}/{repo}"
        try:
            response = requests.get(api_url)
            if response.status_code == 200:
                return response.json().get('stargazers_count')
        except Exception as e:
            print(f"Error fetching stars for {owner}/{repo}: {str(e)}")
    
    return None

def main():
    results = []
    row_number = 0
    
    with open('input/goose_extensions_curated.csv', 'r') as csvfile:
        reader = csv.DictReader(csvfile)
        next(reader)  # Skip the first empty row
        
        for row in reader:
            row_number += 1
            if not row.get('Link'):
                continue
                
            extension_name = row.get('Extension', '')
            link = row.get('Link', '').strip()
            
            # Handle multiple links (take the first GitHub link)
            if '\n' in link:
                links = [l.strip() for l in link.split('\n')]
                github_links = [l for l in links if 'github.com' in l]
                link = github_links[0] if github_links else links[0]
            
            # Clean up the link
            link = link.split('1.')[0].strip()  # Remove numbered lists
            link = link.strip('2.')  # Remove numbered lists
            
            # Get GitHub stars
            stars = get_repo_info(link)
            
            result = {
                "row": row_number,
                "link": link,
                "extension_name": extension_name,
                "githubStars": stars
            }
            
            print(f"Processing {extension_name}: {stars} stars")
            results.append(result)
    
    # Write results to JSON file
    with open('input/goose_github_stars.json', 'w') as jsonfile:
        json.dump(results, jsonfile, indent=2)
        print(f"\nProcessed {len(results)} extensions")

if __name__ == "__main__":
    main()