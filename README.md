# Investment Tracker

A Flask-based web application for tracking your stock and mutual fund investments.

## Features

- Track stock investments from NSE and BSE markets
- Track mutual fund investments with real-time NAV updates
- Real-time stock data fetching using yfinance
- Mutual fund data fetching using mfapi.in API
- Client-side Firebase authentication
- Firebase Firestore database for storing investment data
- Responsive design using Bootstrap
- Environment-based configuration for Firebase

## Tech Stack

- **Backend**: Flask
- **Frontend**: HTML, CSS, JavaScript
- **Database**: Firebase Firestore
- **Authentication**: Firebase Authentication
- **Stock Data**: yfinance API
- **Mutual Fund Data**: mfapi.in API

## Prerequisites

- Python 3.6 or higher
- Firebase account with Firestore and Authentication enabled

## Installation

1. Clone the repository:
```
git clone <repository-url>
cd investment-tracker
```

2. Install dependencies:
```
pip install -r requirements.txt
```

3. Configure Firebase:
   - Rename `.env.example` to `.env` (or just edit the existing `.env` file)
   - Update the Firebase configuration in the `.env` file with your own Firebase project credentials:
   ```
   FIREBASE_API_KEY=your-api-key
   FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   FIREBASE_APP_ID=your-app-id
   ```
   - Enable Email/Password authentication in your Firebase project

## Running the Application

Start the Flask development server:
```
python run.py
```

The application will be available at `http://localhost:5000`

## Usage

1. Login with your Firebase credentials
2. Add stocks from NSE, BSE, or other markets
3. Add mutual fund investments using scheme codes
4. View and track your investment portfolio
5. Refresh stock prices and mutual fund NAVs to get the latest data

## API Endpoints

- `/api/stock/search`: Get stock information using yfinance
  - Parameters:
    - `query`: Stock symbol
    - `exchange`: Exchange (NSE, BSE, or OTHER)
- `/api/mutual-fund/search`: Get mutual fund information using mfapi.in
  - Parameters:
    - `scheme_code`: The mutual fund scheme code

## Data Sources

- Stock data is fetched from Yahoo Finance (yfinance)
- Mutual fund data is fetched from mfapi.in (https://www.mfapi.in/)

## Screenshots

(Add screenshots here)

## License

This project is licensed under the MIT License - see the LICENSE file for details. 