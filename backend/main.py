
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List
import uuid
import os
import shutil
import pandas as pd
from datetime import datetime

from .scraper import AppScraper
from .analyzer import ReviewAnalyzer

app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, lock this down
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Temporary directory for excel files
TEMP_DIR = "backend/temp"
os.makedirs(TEMP_DIR, exist_ok=True)

class AnalyzeRequest(BaseModel):
    google_url: Optional[str] = None
    apple_url: Optional[str] = None
    openai_key: str

class AnalyzeResponse(BaseModel):
    app_name: str
    stats: dict
    analysis: dict
    download_token: str
    reviews: List[dict] # Added this field

scraper = AppScraper()
analyzer = ReviewAnalyzer()

def cleanup_temp_file(path: str):
    """Delete temp file after delay"""
    # In a real app, use a cron job or simpler deletion strategy
    # For now, we won't delete immediately to allow user to download
    pass 

@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_app(request: AnalyzeRequest):
    if not request.google_url and not request.apple_url:
        raise HTTPException(status_code=400, detail="Please provide at least one URL.")
    
    if not request.openai_key:
        raise HTTPException(status_code=400, detail="OpenAI API Key is required.")

    all_reviews = []
    app_name = "Unknown App"
    
    # Scrape Google Play
    if request.google_url:
        try:
            reviews, name = scraper.scrape(request.google_url)
            all_reviews.extend(reviews)
            if name: app_name = name
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Google scrape error: {str(e)}")

    # Scrape App Store
    if request.apple_url:
        try:
            reviews, name = scraper.scrape(request.apple_url)
            all_reviews.extend(reviews)
            if name and app_name == "Unknown App": app_name = name
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Apple scrape error: {str(e)}")

    if not all_reviews:
        raise HTTPException(status_code=400, detail="No reviews found.")

    # Sort by date descending
    all_reviews.sort(key=lambda x: x['at'] or '', reverse=True)

    # Calculate Stats (returns dict with enriched_reviews containing sentiment)
    stats = analyzer.calculate_stats(all_reviews)
    enriched_reviews = stats.pop('enriched_reviews', all_reviews)

    # AI Analysis
    analysis = analyzer.analyze_reviews(all_reviews, request.openai_key)

    # Save to Excel
    token = str(uuid.uuid4())
    filename = f"{token}.xlsx"
    filepath = os.path.join(TEMP_DIR, filename)
    
    # Use enriched reviews for Excel (includes 'sentiment' column)
    df = pd.DataFrame(enriched_reviews)
    
    # Fix timezone error for Excel
    for col in df.select_dtypes(include=['datetime64[ns, UTC]', 'datetime64[ns]']).columns:
        df[col] = df[col].dt.tz_localize(None)

    # Ensure 'at' column is handled if it's object type (strings)
    if 'at' in df.columns:
         df['at'] = pd.to_datetime(df['at'], errors='coerce').dt.tz_localize(None)

    df.to_excel(filepath, index=False)

    return AnalyzeResponse(
        app_name=app_name,
        stats=stats,
        analysis=analysis,
        download_token=token,
        reviews=enriched_reviews[:2000] # Limit to avoid massive payloads, but 2k is plenty for UI
    )

@app.get("/api/download/{token}")
async def download_reviews(token: str):
    filepath = os.path.join(TEMP_DIR, f"{token}.xlsx")
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found or expired.")
    
    return FileResponse(
        path=filepath, 
        filename="reviews_export.xlsx", 
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
