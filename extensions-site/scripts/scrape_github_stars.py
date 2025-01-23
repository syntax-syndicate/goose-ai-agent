import csv
import json
import re
import requests
import time
from urllib.parse import urlparse

def extract_github_repo(url):
    """Extract the GitHub repository owner and name from a URL."""
    if 'github.com' not in url:
        return None
    
    # Clean the URL
    url = url.strip().rstrip('/')
    
    # Handle tree/blob paths and get base repository
    parts = url.replace('https://github.com/', '').split('/')
    if len(parts) >= 2:
        # The first two parts are owner/repo
        return f"{parts[0]}/{parts[1]}"
    return None

def get_github_stars(repo):
    """Get the number of GitHub stars for a repository."""
    if not repo:
        return None
    
    api_url = f"https://api.github.com/repos/{repo}"
    headers = {
        'Accept': 'application/vnd.github.v3+json',
    }
    
    try:
        print(f"Fetching stars for {repo}...")
        response = requests.get(api_url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            stars = data['stargazers_count']
            print(f"Found {stars} stars for {repo}")
            return stars
        else:
            print(f"Error {response.status_code} for {repo}: {response.text}")
    except Exception as e:
        print(f"Error fetching stars for {repo}: {e}")
    return None

def extract_links(text):
    """Extract all GitHub links from a text field."""
    if not text:
        return []
    
    # Split by common separators (numbers with dots, commas, newlines)
    parts = re.split(r'\d\.\s*|\n|,', text)
    links = []
    
    for part in parts:
        # Find GitHub URLs in the text
        matches = re.findall(r'https://github\.com/[^\s\'"]+', part)
        links.extend(matches)
    
    return [link.strip() for link in links if link.strip()]

def process_csv():
    results = []
    repo_stars_cache = {}  # Cache for repository star counts
    
    with open('input/goose_extensions_curated.csv', 'r', encoding='utf-8') as csvfile:
        print("Reading CSV file...")
        content = csvfile.readlines()
        
        # Skip the first few header rows and find where the actual data starts
        start_idx = 0
        for i, line in enumerate(content):
            if 'Extension,Info,Link,Tester' in line:
                start_idx = i
                break
        
        # Process the CSV starting from the actual header row
        reader = csv.DictReader(content[start_idx:])
        
        for row in reader:
            if not row.get('Link') or not row.get('Extension'):
                continue
                
            print(f"\nProcessing extension: {row['Extension']}")
            print(f"Link: {row['Link']}")
            
            # Get the first GitHub link from the Link field
            links = extract_links(row['Link'])
            if not links:
                print(f"No GitHub links found for {row['Extension']}")
                continue
            
            link = links[0]  # Use the first link for the extension
            repo = extract_github_repo(link)
            
            if repo:
                # Use cached star count if available
                if repo in repo_stars_cache:
                    stars = repo_stars_cache[repo]
                    print(f"Using cached star count for {repo}: {stars}")
                else:
                    stars = get_github_stars(repo)
                    if stars is not None:
                        repo_stars_cache[repo] = stars
                        time.sleep(1)  # Rate limiting
                
                if stars is not None:
                    result = {
                        "link": link,
                        "extension_name": row['Extension'],
                        "githubStars": stars
                    }
                    results.append(result)
                    print(f"Added result for {row['Extension']}: {stars} stars")
    
    return results

def main():
    print("Starting GitHub stars scraper...")
    
    try:
        results = process_csv()
        
        # Write results to JSON file
        with open('input/goose_github_stars.json', 'w') as jsonfile:
            json.dump(results, jsonfile, indent=2)
            print(f"\nWrote {len(results)} results to goose_github_stars.json")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()