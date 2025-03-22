from flask import Blueprint, render_template, redirect, url_for, jsonify, request, current_app
import yfinance as yf
import requests
import re
import time

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    firebase_config = current_app.config['FIREBASE_CONFIG']
    return render_template('index.html', firebase_config=firebase_config)

@main_bp.route('/login')
def login():
    firebase_config = current_app.config['FIREBASE_CONFIG']
    return render_template('login.html', firebase_config=firebase_config)

@main_bp.route('/stocks')
def stocks():
    firebase_config = current_app.config['FIREBASE_CONFIG']
    return render_template('stocks.html', firebase_config=firebase_config)

@main_bp.route('/mutual-funds')
def mutual_funds():
    firebase_config = current_app.config['FIREBASE_CONFIG']
    return render_template('mutual_funds.html', firebase_config=firebase_config)

def fetch_nse_data(symbol):
    """Fallback function to fetch stock data from NSE India website"""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1"
        }

        print(f"Trying to fetch data from NSE for {symbol}")
        
        # First, try to get company details
        url = f"https://www.nseindia.com/get-quotes/equity?symbol={symbol}"
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code != 200:
            return None
            
        # Extract company name using regex (simplified)
        company_name_match = re.search(r'<title>(.*?)\s*-\s*NSE', response.text)
        company_name = company_name_match.group(1).strip() if company_name_match else symbol
            
        # Try to get price data via NSE API
        time.sleep(1)  # Add a small delay to avoid rate limiting
        quote_url = f"https://www.nseindia.com/api/quote-equity?symbol={symbol}"
        price_response = requests.get(quote_url, headers=headers, timeout=10)
            
        if price_response.status_code == 200:
            price_data = price_response.json()
            current_price = price_data.get('lastPrice', 0)
            return {
                'symbol': symbol,
                'companyName': company_name,
                'currentPrice': float(str(current_price).replace(',', ''))
            }
        else:
            # Fallback to regex for price extraction if API fails
            price_match = re.search(r'data-price="([0-9,.]+)"', response.text)
            price = price_match.group(1) if price_match else "0"
            
            return {
                'symbol': symbol,
                'companyName': company_name,
                'currentPrice': float(str(price).replace(',', ''))
            }
    except Exception as e:
        print(f"Error in NSE fallback: {str(e)}")
        return None

@main_bp.route('/api/stock/search', methods=['GET'])
def search_stock():
    query = request.args.get('query', '')
    exchange = request.args.get('exchange', 'NSE')  # Default to NSE
    
    if not query:
        return jsonify({'error': 'Query parameter is required'}), 400
    
    try:
        # First, try a more direct approach like the example
        symbol = query.upper()
        
        # Add suffix based on exchange
        if exchange.upper() == 'NSE':
            ticker_symbol = f"{symbol}.NS"
        elif exchange.upper() == 'BSE':
            ticker_symbol = f"{symbol}.BO"
        else:
            ticker_symbol = symbol
            
        print(f"Attempting to fetch data for ticker: {ticker_symbol}")
        
        try:
            # Simple direct approach first
            stock = yf.Ticker(ticker_symbol)
            info = stock.info
            
            # Check if we got valid price data
            if info and ('regularMarketPrice' in info or 'currentPrice' in info):
                company_name = info.get('longName', info.get('shortName', 'Unknown'))
                current_price = info.get('regularMarketPrice', info.get('currentPrice', 0))
                
                return jsonify({
                    'symbol': symbol,
                    'companyName': company_name,
                    'currentPrice': current_price,
                    'exchange': exchange,
                    'source': 'Yahoo Finance'
                })
        except Exception as e:
            print(f"Yahoo Finance direct approach failed: {str(e)}")
            # Continue to fallback approaches
        
        # If Yahoo Finance failed, try our fallback for Indian stocks
        if exchange.upper() in ['NSE', 'BSE']:
            # First, try with a static data approach for common Indian stocks
            common_stocks = {
                'TCS': {'name': 'Tata Consultancy Services Ltd.', 'price': 3800.50},
                'INFY': {'name': 'Infosys Ltd.', 'price': 1680.75},
                'RELIANCE': {'name': 'Reliance Industries Ltd.', 'price': 2850.25},
                'HDFCBANK': {'name': 'HDFC Bank Ltd.', 'price': 1695.30},
                'ICICIBANK': {'name': 'ICICI Bank Ltd.', 'price': 1245.60},
                'WIPRO': {'name': 'Wipro Ltd.', 'price': 480.15},
                'HCLTECH': {'name': 'HCL Technologies Ltd.', 'price': 1520.45},
                'ADANIENT': {'name': 'Adani Enterprises Ltd.', 'price': 2980.30},
                'BAJFINANCE': {'name': 'Bajaj Finance Ltd.', 'price': 7250.80},
                'TATAMOTORS': {'name': 'Tata Motors Ltd.', 'price': 860.25},
            }
            
            # If we have static data for this symbol, use it
            if symbol in common_stocks:
                print(f"Using static data for {symbol}")
                return jsonify({
                    'symbol': symbol,
                    'companyName': common_stocks[symbol]['name'],
                    'currentPrice': common_stocks[symbol]['price'],
                    'exchange': exchange,
                    'source': 'Static Data'
                })
                
            # Otherwise try the NSE fallback
            print(f"Trying NSE fallback for {symbol}")
            nse_data = fetch_nse_data(symbol)
            if nse_data:
                print(f"NSE fallback successful: {nse_data}")
                return jsonify({
                    'symbol': nse_data['symbol'],
                    'companyName': nse_data['companyName'],
                    'currentPrice': nse_data['currentPrice'],
                    'exchange': exchange,
                    'source': 'NSE Fallback'
                })
        
        # If we reach here, all methods failed
        print(f"All methods failed for {ticker_symbol}")
        
        # Return a placeholder response rather than an error to avoid the JSON parsing error
        return jsonify({
            'symbol': symbol,
            'companyName': f"{symbol} - Company Name Unavailable",
            'currentPrice': 0,
            'exchange': exchange,
            'source': 'Placeholder',
            'warning': 'Unable to fetch real data, showing placeholder'
        })
    except Exception as e:
        print(f"Error in search_stock: {str(e)}")  # Log the error
        
        # Even in the case of an exception, return a valid JSON response
        return jsonify({
            'symbol': query.upper(),
            'companyName': f"{query.upper()} - Data Unavailable",
            'currentPrice': 0,
            'exchange': exchange,
            'source': 'Error Fallback',
            'warning': 'An error occurred while fetching data'
        })

@main_bp.route('/api/mutual-fund/search', methods=['GET'])
def search_mutual_fund():
    scheme_code = request.args.get('scheme_code', '')
    
    if not scheme_code:
        return jsonify({'error': 'Scheme code parameter is required'}), 400
    
    try:
        # Call mfapi.in API to fetch mutual fund data
        response = requests.get(f'https://api.mfapi.in/mf/{scheme_code}')
        
        # Check if the response was successful
        if response.status_code != 200:
            return jsonify({'error': f'API returned status code {response.status_code}'}), response.status_code
        
        # Try to parse JSON response
        try:
            data = response.json()
        except ValueError as e:
            print(f"JSON parsing error: {str(e)}, Response content: {response.text[:100]}")  # Log the error
            return jsonify({'error': 'Invalid JSON response from external API'}), 500
        
        if 'error' in data:
            return jsonify({'error': data['error']}), 404
        
        # Extract scheme name and current NAV
        scheme_name = data.get('meta', {}).get('scheme_name', 'Unknown')
        nav_data = data.get('data', [])
        
        # The first entry in the data array has the most recent NAV
        current_nav = float(nav_data[0].get('nav', 0)) if nav_data else 0
        date = nav_data[0].get('date', '') if nav_data else ''
        
        fund_type = data.get('meta', {}).get('fund_type', 'Unknown')
        fund_category = data.get('meta', {}).get('scheme_category', '')
        
        return jsonify({
            'schemeCode': scheme_code,
            'schemeName': scheme_name,
            'currentNAV': current_nav,
            'date': date,
            'fundType': fund_type,
            'fundCategory': fund_category
        })
    except requests.exceptions.RequestException as e:
        print(f"Request error in search_mutual_fund: {str(e)}")  # Log the error
        return jsonify({'error': f'Failed to connect to external API: {str(e)}'}), 500
    except Exception as e:
        print(f"Error in search_mutual_fund: {str(e)}")  # Log the error
        return jsonify({'error': f'Server error: {str(e)}'}), 500 