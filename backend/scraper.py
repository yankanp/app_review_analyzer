
import time
import re
import requests
import pandas as pd
from typing import List, Dict, Tuple, Optional
from google_play_scraper import app, reviews_all

class AppScraper:
    def __init__(self):
        pass

    def parse_app_link(self, url: str) -> Tuple[str, str, str, str]:
        """
        Parse app store URL to extract necessary information
        Returns: (store_type, app_id, app_name, country)
        """
        # Google Play pattern
        gplay_pattern = r'play\.google\.com/store/apps/details\?id=([^&]+)'
        
        # App Store pattern
        appstore_pattern = r'apps\.apple\.com/([^/]+)/app/([^/]+)/id(\d+)'
        
        gplay_match = re.search(gplay_pattern, url)
        if gplay_match:
            country = 'us'
            gl_match = re.search(r'[?&]gl=([^&]+)', url)
            if gl_match:
                country = gl_match.group(1)
            return ('google_play', gplay_match.group(1), '', country)
        
        appstore_match = re.search(appstore_pattern, url)
        if appstore_match:
            return ('app_store', appstore_match.group(3), appstore_match.group(2), appstore_match.group(1))
        
        raise ValueError("Invalid app store URL. Please provide a valid Google Play or App Store link.")

    def scrape_google_play(self, app_id: str, country: str = 'us') -> List[Dict]:
        """Scrape all reviews from Google Play Store"""
        print(f"Scraping Google Play: {app_id} ({country})")
        try:
            # We fetch all reviews, but we might want to limit for the web app to avoid timeouts
            # However, user requested "download as excel", implying they want "all" or "many".
            # reviews_all handles pagination automatically
            all_reviews = reviews_all(
                app_id,
                sleep_milliseconds=0, 
                lang='en',
                country=country
            )
            # Normalize to common format
            normalized = []
            for r in all_reviews:
                normalized.append({
                    'source': 'google_play',
                    'review_id': r['reviewId'],
                    'user_name': r['userName'],
                    'content': r['content'],
                    'score': r['score'],
                    'thumbs_up': r['thumbsUpCount'],
                    'at': r['at'].isoformat() if hasattr(r['at'], 'isoformat') else str(r['at']),
                    'reply': r['replyContent'],
                    'replied_at': r['repliedAt'].isoformat() if hasattr(r['repliedAt'], 'isoformat') else str(r['repliedAt']) if r['repliedAt'] else None,
                    'app_version': r['reviewCreatedVersion']
                })
            return normalized
        except Exception as e:
            print(f"Error scraping Google Play: {e}")
            return []

    def scrape_app_store(self, app_id: str, country: str = 'us') -> List[Dict]:
        """Scrape reviews from Apple App Store using RSS Feed"""
        print(f"Scraping App Store (RSS): {app_id} ({country})")
        all_reviews = []
        try:
            # Apple allows up to 10 pages of 50 reviews
            for page in range(1, 11):
                url = f"https://itunes.apple.com/{country}/rss/customerreviews/page={page}/id={app_id}/sortBy=mostRecent/json"
                response = requests.get(url)
                if response.status_code != 200:
                    break
                
                data = response.json()
                if 'feed' not in data or 'entry' not in data['feed']:
                    break
                
                entries = data['feed']['entry']
                if not isinstance(entries, list):
                    entries = [entries]
                
                for entry in entries:
                    if 'content' in entry:
                        content = entry.get('content', {}).get('label', '')
                        title = entry.get('title', {}).get('label', '')
                        if isinstance(entry.get('title'), dict):
                            title = entry.get('title', {}).get('label', '')
                        else:
                            title = str(entry.get('title', ''))

                        review = {
                            'source': 'app_store',
                            'review_id': entry.get('id', {}).get('label', ''),
                            'user_name': entry.get('author', {}).get('name', {}).get('label', ''),
                            'content': f"{title}\n{content}",
                            'score': int(entry.get('im:rating', {}).get('label', 0)),
                            'thumbs_up': int(entry.get('im:voteSum', {}).get('label', 0)),
                            'at': entry.get('updated', {}).get('label', ''),
                            'reply': None,
                            'replied_at': None,
                            'app_version': entry.get('im:version', {}).get('label', '')
                        }
                        all_reviews.append(review)
                
                # Respect rate limiting
                time.sleep(0.5)
                
            return all_reviews
        except Exception as e:
            print(f"Error scraping App Store RSS: {e}")
            return []

    def scrape(self, url: str) -> Tuple[List[Dict], str]:
        """Main entry point. Returns (reviews_list, app_name)"""
        store_type, app_id, app_name_slug, country = self.parse_app_link(url)
        
        if store_type == 'google_play':
            reviews = self.scrape_google_play(app_id, country)
            # Try to get app title separately or just use ID for now
            app_name = app_id 
            try:
                details = app(app_id, country=country)
                app_name = details['title']
            except:
                pass
        else:
            reviews = self.scrape_app_store(app_id, country)
            app_name = app_name_slug # Rough guess, ideally we'd fetch details too

        return reviews, app_name
