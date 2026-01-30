
# Review Intelligence AI

A modern web application that scrapes Google Play and Apple App Store reviews and uses OpenAI (GPT-4o) to generate actionable business insights, identify pain points, and visualize sentiment trends.

## Features

-   **Multi-Store Support**: Analyze apps from both Google Play and Apple App Store (via RSS).
-   **AI-Powered Insights**: Identifies:
    -   Top Pain Points (with severity levels)
    -   Appreciated Features
    -   Strategic Business Advice
-   **Interactive Dashboard**:
    -   Sentiment timeline visualization
    -   Review statistics
-   **Data Export**: Download all scraped reviews as an Excel file.

## Tech Stack

-   **Frontend**: React (Vite), Tailwind CSS v4, Framer Motion, Recharts
-   **Backend**: FastAPI (Python), Pandas, OpenAI

## Prerequisites

-   **Node.js** (v18+)
-   **Python** (3.9+)
-   **OpenAI API Key**

## Quick Start

1.  **Clone the repository** (or download source).

2.  **Run the text-based setup (first time only)**:
    Ensure you have created the virtual environment and installed backend dependencies:
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r backend/requirements.txt
    ```
    
    And frontend dependencies:
    ```bash
    cd frontend
    npm install
    cd ..
    ```

3.  **Start the App**:
    ```bash
    ./start.sh
    ```
    This script will automatically start both the FastAPI backend (port 8000) and React frontend (port 5173).

4.  **Open in Browser**:
    Go to [http://localhost:5173](http://localhost:5173)

5.  **Analyze**:
    -   Enter your OpenAI API Key.
    -   Paste an App Store or Google Play URL.
    -   Click "Analyze Reviews".

## Project Structure

-   `/backend`: FastAPI server, scraper logic, and analysis engine.
-   `/frontend`: React application.
