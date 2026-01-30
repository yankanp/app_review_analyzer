
import openai
import json
import pandas as pd
from typing import List, Dict
from textblob import TextBlob

class ReviewAnalyzer:
    def __init__(self):
        pass

    def analyze_reviews(self, reviews: List[Dict], api_key: str) -> Dict:
        """
        Analyze reviews using OpenAI API.
        Returns a dictionary with structured insights.
        """
        if not reviews:
            return {"error": "No reviews to analyze"}

        client = openai.OpenAI(api_key=api_key)

        # Prepare context
        # We can't send all reviews if there are thousands. 
        # Strategy: detailed analysis on recent 100 negative + 100 positive reviews 
        # But we don't know sentiment yet. So let's take most recent 200 reviews.
        
        recent_reviews = reviews[:200]
        # Get oldest 200 reviews for comparison (if enough data)
        past_reviews = reviews[-200:] if len(reviews) > 400 else []
        
        # Remove score from prompt to ensure text-only analysis
        recent_text = "\n".join([f"- {r['content'][:200]}..." for r in recent_reviews])
        past_text = "\n".join([f"- {r['content'][:200]}..." for r in past_reviews]) if past_reviews else "Not enough historical data."

        prompt = f"""
        You are an expert product analyst. Analyze the following app reviews and provide a structured JSON response.
        
        **STRICT ANALYSIS RULES:**
        1. **Ignore Star Ratings**: Base your analysis 100% on the text content.
        2. **True Sentiment**: Look past superficial praise.
        3. **Exact Matching**: `search_keywords` MUST be actual phrases found in the reviews.
        4. **Categorization**: Classify issues strictly (Bug vs UX vs Pricing).
        5. **Trend Analysis**: Compare PAST vs RECENT reviews to find fixed issues.

        RECENT REVIEWS (Newest):
        {recent_text}
        
        PAST REVIEWS (Oldest):
        {past_text}

        Your Task:
        1. Identify top 5 "Pain Points" (Current issues in RECENT reviews). For each, provide:
           - title
           - description
           - severity (High/Medium/Low)
           - type (Bug/UX/Pricing/Feature/Content)
           - search_keywords: A list of 3-5 specific short phrases or words that ACTUALLY APPEAR in the reviews.
        
        2. Identify 3 "Resolved Issues" (Major problems in PAST that are gone/rare in RECENT). For each:
           - title
           - description
           - search_keywords: Words that appeared in the old complaints.
        
        3. Provide formatted "Business Advice".
        4. Analyze sentiment trend.

        Format your response as valid JSON:
        {{
            "pain_points": [ ... ],
            "resolved_issues": [
                {{"title": "...", "description": "...", "search_keywords": [...]}},
                ...
            ],
            "business_advice": "...",
            "sentiment_trend": "..."
        }}
        """

        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a helpful product analytics assistant. Always output valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            return json.loads(content)
        
        except Exception as e:
            return {"error": str(e)}

    def calculate_stats(self, reviews: List[Dict]) -> Dict:
        """Calculate deterministic stats (counts, timeline, versions) locally"""
        df = pd.DataFrame(reviews)
        
        if len(df) == 0:
            return {}

        # Convert 'at' to datetime
        df['at'] = pd.to_datetime(df['at'], errors='coerce')
        
        # 1. Basic Stats
        total_reviews = len(df)
        avg_score = round(df['score'].mean(), 2) if total_reviews > 0 else 0
        
        # 2. Sentiment (TextBlob based)
        def get_sentiment(text):
            if not text: return 'neutral'
            polarity = TextBlob(str(text)).sentiment.polarity
            if polarity > 0.1: return 'positive'
            if polarity < -0.1: return 'negative'
            return 'neutral'
            
        df['sentiment'] = df['content'].apply(get_sentiment)
        sentiment_counts = df['sentiment'].value_counts().to_dict()
        
        # 3. Timeline distribution
        df_time = df.dropna(subset=['at']).copy()
        timeline = []
        if len(df_time) > 0:
            df_time['period'] = df_time['at'].dt.to_period('M').astype(str)
            timeline_df = df_time.groupby(['period', 'sentiment']).size().unstack(fill_value=0).reset_index()
            
            # Ensure columns exist and are native ints
            for col in ['positive', 'negative', 'neutral']:
                if col not in timeline_df.columns:
                    timeline_df[col] = 0
                else:
                    timeline_df[col] = timeline_df[col].astype(int)
            
            # Sort and Convert
            timeline_df = timeline_df.sort_values('period')
            timeline = timeline_df.to_dict(orient='records')

        # 4. Version Analysis (Count of NEGATIVE/ISSUES per Version, Ordered by Release Date)
        version_stats = []
        if 'app_version' in df.columns:
            # Filter for reviews with version
            df_v = df[df['app_version'].notna()].copy()
            
            if len(df_v) > 0:
                # 1. Determine version order by "First Seen" date in the reviews
                # This acts as a proxy for release order
                version_dates = df_v.groupby('app_version')['at'].min().reset_index(name='first_seen')
                
                # 2. Count negative reviews (Issues) based on Sentiment
                negative_df = df_v[df_v['sentiment'] == 'negative']
                if len(negative_df) > 0:
                    issue_counts = negative_df.groupby('app_version').size().reset_index(name='issue_count')
                else:
                    issue_counts = pd.DataFrame(columns=['app_version', 'issue_count'])
                
                # 3. Merge to get counts for all versions
                stats = pd.merge(version_dates, issue_counts, on='app_version', how='left')
                stats['issue_count'] = stats['issue_count'].fillna(0).astype(int)
                
                # 4. Sort by date (Oldest -> Newest)
                stats = stats.sort_values('first_seen', ascending=True)
                
                # 5. Keep recent versions (last 20) to avoid clutter
                if len(stats) > 20:
                    stats = stats.tail(20)
                
                # Convert to dict and ensure native types
                version_stats = stats[['app_version', 'issue_count']].to_dict(orient='records')
        
        # Sanitize sentiment_counts to native ints
        sentiment_counts = {k: int(v) for k, v in df['sentiment'].value_counts().items()}
        
        # Sanitize enriched_reviews (convert Timestamp to string or ensure clean serialization)
        # Using json.loads(df.to_json()) is a robust way to ensure simple types, but slower.
        # Let's keep to_dict but be aware of timestamps. Pydantic usually handles Timestamps.
        # But we must convert NaNs to None manually if needed or rely on 'records' doing it.
        # 'orient=records' usually handles it well.

        return {
            "total_reviews": int(total_reviews),
            "average_score": float(avg_score),
            "timeline": timeline,
            "sentiment_counts": sentiment_counts,
            "version_stats": version_stats,
            "enriched_reviews": json.loads(df.to_json(orient='records', date_format='iso')) # Safer serialization
        }
