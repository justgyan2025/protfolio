from flask import Blueprint, render_template, redirect, url_for, jsonify, request, current_app
import yfinance as yf
import requests

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

@main_bp.route('/api/stock/search', methods=['GET'])
def search_stock():
    query = request.args.get('query', '')
    exchange = request.args.get('exchange', 'NSE')  # Default to NSE
    
    if not query:
        return jsonify({'error': 'Query parameter is required'}), 400
    
    try:
        # Format symbol based on exchange (NSE or BSE)
        if exchange.upper() == 'NSE':
            ticker_symbol = f"{query.upper()}.NS"
        elif exchange.upper() == 'BSE':
            ticker_symbol = f"{query.upper()}.BO"
        else:
            ticker_symbol = query.upper()
        
        # Get the stock information
        ticker = yf.Ticker(ticker_symbol)
        info = ticker.info
        
        # Check if we got valid info back
        if not info or len(info) == 0:
            return jsonify({'error': f'No data found for symbol {ticker_symbol}'}), 404
        
        # If no company name found, try to get it from the 'longName' field
        company_name = info.get('shortName', info.get('longName', 'Unknown'))
        current_price = info.get('currentPrice', info.get('regularMarketPrice', 0))
        
        return jsonify({
            'symbol': query.upper(),
            'companyName': company_name,
            'currentPrice': current_price,
            'exchange': exchange
        })
    except Exception as e:
        print(f"Error in search_stock: {str(e)}")  # Log the error
        return jsonify({'error': f'Server error: {str(e)}'}), 500

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