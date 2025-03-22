// Stocks data loading
auth.onAuthStateChanged(function(user) {
    if (user) {
        // Load stocks data when user is authenticated
        loadStocksData(user.uid);
        
        // Set up event listeners
        setupAddStockForm(user.uid);
        setupStockSearch();
    }
});

// Load stocks data
function loadStocksData(userId) {
    const stocksList = document.getElementById('stocksList');
    if (!stocksList) return;
    
    stocksList.innerHTML = '<tr><td colspan="9" class="text-center">Loading stocks...</td></tr>';
    
    db.collection('users').doc(userId).collection('stocks')
        .get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                stocksList.innerHTML = '<tr><td colspan="9" class="text-center">No stocks found. Add your first stock investment.</td></tr>';
                return;
            }
            
            let stocksHTML = '';
            
            querySnapshot.forEach((doc) => {
                const stock = doc.data();
                const stockId = doc.id;
                const currentPrice = stock.currentPrice || stock.purchasePrice;
                const totalValue = currentPrice * stock.quantity;
                const profitLoss = totalValue - (stock.purchasePrice * stock.quantity);
                const profitLossClass = profitLoss >= 0 ? 'profit' : 'loss';
                const profitLossPercentage = ((currentPrice - stock.purchasePrice) / stock.purchasePrice * 100).toFixed(2);
                
                stocksHTML += `
                    <tr data-stock-id="${stockId}">
                        <td>${stock.symbol}</td>
                        <td>${stock.companyName}</td>
                        <td>${stock.exchange || 'N/A'}</td>
                        <td>${stock.quantity}</td>
                        <td>₹${stock.purchasePrice.toFixed(2)}</td>
                        <td>₹${currentPrice.toFixed(2)}</td>
                        <td>₹${totalValue.toFixed(2)}</td>
                        <td class="${profitLossClass}">
                            ₹${Math.abs(profitLoss).toFixed(2)} (${profitLoss >= 0 ? '+' : '-'}${Math.abs(profitLossPercentage)}%)
                        </td>
                        <td>
                            <button class="btn btn-sm btn-danger delete-stock" data-stock-id="${stockId}">Delete</button>
                            <button class="btn btn-sm btn-secondary refresh-price" data-stock-id="${stockId}" data-stock-symbol="${stock.symbol}" data-stock-exchange="${stock.exchange || 'NSE'}">
                                <i class="bi bi-arrow-clockwise"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            stocksList.innerHTML = stocksHTML;
            
            // Add event listeners for delete and refresh buttons
            document.querySelectorAll('.delete-stock').forEach(button => {
                button.addEventListener('click', function() {
                    const stockId = this.getAttribute('data-stock-id');
                    deleteStock(userId, stockId);
                });
            });
            
            document.querySelectorAll('.refresh-price').forEach(button => {
                button.addEventListener('click', function() {
                    const stockId = this.getAttribute('data-stock-id');
                    const symbol = this.getAttribute('data-stock-symbol');
                    const exchange = this.getAttribute('data-stock-exchange');
                    refreshStockPrice(userId, stockId, symbol, exchange);
                });
            });
        })
        .catch((error) => {
            console.error("Error loading stocks data:", error);
            stocksList.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Error loading stocks data.</td></tr>';
        });
}

// Setup stock search functionality
function setupStockSearch() {
    const searchBtn = document.getElementById('searchStockBtn');
    const refreshPriceBtn = document.getElementById('refreshPriceBtn');
    const symbolInput = document.getElementById('symbol');
    const exchangeSelect = document.getElementById('stockExchange');
    const companyNameInput = document.getElementById('companyName');
    const currentPriceInput = document.getElementById('currentPrice');
    const stockInfoAlert = document.getElementById('stockInfoAlert');
    
    if (!searchBtn || !symbolInput || !companyNameInput || !currentPriceInput) return;
    
    // Search button click handler
    searchBtn.addEventListener('click', function() {
        searchStock();
    });
    
    // Symbol input enter key handler
    symbolInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchStock();
        }
    });
    
    // Refresh price button click handler
    if (refreshPriceBtn) {
        refreshPriceBtn.addEventListener('click', function() {
            searchStock();
        });
    }
    
    // Function to search for stock information
    function searchStock() {
        const symbol = symbolInput.value.trim();
        const exchange = exchangeSelect.value;
        
        if (!symbol) {
            showStockInfoAlert('Please enter a stock symbol', 'danger');
            return;
        }
        
        // Show loading state
        searchBtn.disabled = true;
        searchBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Searching...';
        showStockInfoAlert('Searching for stock information...', 'info');
        
        // Hide additional stock info section
        const additionalStockInfo = document.getElementById('additionalStockInfo');
        if (additionalStockInfo) {
            additionalStockInfo.classList.add('d-none');
        }
        
        // Call the API to get stock information using the new endpoint
        fetch(`/api/get_stock_info?symbol=${encodeURIComponent(symbol)}&exchange=${exchange}`)
            .then(response => {
                if (!response.ok) {
                    if (response.status === 500) {
                        throw new Error('Server error. Please try again later.');
                    } else if (response.status === 404) {
                        throw new Error(`Stock symbol ${symbol} not found on ${exchange}.`);
                    } else {
                        throw new Error(`Server responded with status: ${response.status}`);
                    }
                }
                
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Server returned non-JSON response');
                }
                
                return response.json();
            })
            .then(data => {
                // Reset button state
                searchBtn.disabled = false;
                searchBtn.textContent = 'Search';
                
                if (data.error) {
                    showStockInfoAlert(`Error: ${data.error}`, 'danger');
                    return;
                }
                
                // Fill in the company name and current price
                companyNameInput.value = data.name;
                currentPriceInput.value = data.currentPrice;
                
                // Show additional stock information if available
                let infoMessage = `Successfully found ${data.name} (${data.symbol}) with current price ₹${data.currentPrice}`;
                
                // Update the additional stock info section
                if (additionalStockInfo && (data.dayHigh || data.dayLow || data.previousClose)) {
                    // Show the section
                    additionalStockInfo.classList.remove('d-none');
                    
                    // Update values
                    const dayHighEl = document.getElementById('dayHigh');
                    const dayLowEl = document.getElementById('dayLow');
                    const previousCloseEl = document.getElementById('previousClose');
                    
                    if (dayHighEl) dayHighEl.textContent = data.dayHigh ? `₹${data.dayHigh.toFixed(2)}` : '-';
                    if (dayLowEl) dayLowEl.textContent = data.dayLow ? `₹${data.dayLow.toFixed(2)}` : '-';
                    if (previousCloseEl) previousCloseEl.textContent = data.previousClose ? `₹${data.previousClose.toFixed(2)}` : '-';
                    
                    // Add summary to message
                    if (data.dayHigh && data.dayLow && data.previousClose) {
                        infoMessage += `<br>Day Range: ₹${data.dayLow.toFixed(2)} - ₹${data.dayHigh.toFixed(2)} | Previous Close: ₹${data.previousClose.toFixed(2)}`;
                    }
                }
                
                // Show success message
                showStockInfoAlert(infoMessage, 'success');
            })
            .catch(error => {
                searchBtn.disabled = false;
                searchBtn.textContent = 'Search';
                console.error('Error searching for stock:', error);
                showStockInfoAlert(`Error: ${error.message}`, 'danger');
            });
    }
    
    // Helper function to show alert messages
    function showStockInfoAlert(message, type) {
        stockInfoAlert.textContent = '';
        stockInfoAlert.innerHTML = message;
        stockInfoAlert.className = `alert alert-${type}`;
        stockInfoAlert.classList.remove('d-none');
        
        // Hide alert after 5 seconds for success messages
        if (type === 'success') {
            setTimeout(() => {
                stockInfoAlert.classList.add('d-none');
            }, 7000);
        }
    }
}

// Refresh stock price
function refreshStockPrice(userId, stockId, symbol, exchange) {
    // Call the API to get updated stock price using the new endpoint
    fetch(`/api/get_stock_info?symbol=${encodeURIComponent(symbol)}&exchange=${exchange}`)
        .then(response => {
            if (!response.ok) {
                if (response.status === 500) {
                    throw new Error('Server error. Please try again later.');
                } else if (response.status === 404) {
                    throw new Error(`Stock symbol ${symbol} not found on ${exchange}.`);
                } else {
                    throw new Error(`Server responded with status: ${response.status}`);
                }
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server returned non-JSON response');
            }
            
            return response.json();
        })
        .then(data => {
            if (data.error) {
                console.error('Error refreshing stock price:', data.error);
                alert(`Error refreshing stock price: ${data.error}`);
                return;
            }
            
            // Update the stock price in Firestore
            db.collection('users').doc(userId).collection('stocks').doc(stockId).update({
                currentPrice: data.currentPrice,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                // Reload stocks data
                loadStocksData(userId);
            })
            .catch((error) => {
                console.error("Error updating stock price:", error);
                alert('Error updating stock price in database. Please try again.');
            });
        })
        .catch(error => {
            console.error('Error refreshing stock price:', error);
            alert(`Error refreshing stock price: ${error.message}`);
        });
}

// Setup add stock form
function setupAddStockForm(userId) {
    const addStockForm = document.getElementById('addStockForm');
    if (!addStockForm) return;
    
    addStockForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const symbol = document.getElementById('symbol').value.toUpperCase();
        const exchange = document.getElementById('stockExchange').value;
        const companyName = document.getElementById('companyName').value;
        const quantity = parseFloat(document.getElementById('quantity').value);
        const purchasePrice = parseFloat(document.getElementById('purchasePrice').value);
        const currentPrice = parseFloat(document.getElementById('currentPrice').value || purchasePrice);
        const errorElement = document.getElementById('addStockError');
        
        // Clear previous errors
        errorElement.textContent = '';
        errorElement.classList.add('d-none');
        
        // Validate inputs
        if (!symbol || !companyName || isNaN(quantity) || isNaN(purchasePrice)) {
            errorElement.textContent = 'Please fill all fields with valid values.';
            errorElement.classList.remove('d-none');
            return;
        }
        
        // Add stock to Firestore
        db.collection('users').doc(userId).collection('stocks').add({
            symbol: symbol,
            exchange: exchange,
            companyName: companyName,
            quantity: quantity,
            purchasePrice: purchasePrice,
            currentPrice: currentPrice,
            addedDate: firebase.firestore.FieldValue.serverTimestamp(),
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            // Close modal and reset form
            const modal = bootstrap.Modal.getInstance(document.getElementById('addStockModal'));
            modal.hide();
            addStockForm.reset();
            
            // Reload stocks data
            loadStocksData(userId);
        })
        .catch((error) => {
            console.error("Error adding stock:", error);
            errorElement.textContent = 'Error adding stock. Please try again.';
            errorElement.classList.remove('d-none');
        });
    });
}

// Delete stock
function deleteStock(userId, stockId) {
    if (confirm('Are you sure you want to delete this stock?')) {
        db.collection('users').doc(userId).collection('stocks').doc(stockId).delete()
            .then(() => {
                // Reload stocks data
                loadStocksData(userId);
            })
            .catch((error) => {
                console.error("Error deleting stock:", error);
                alert('Error deleting stock. Please try again.');
            });
    }
} 