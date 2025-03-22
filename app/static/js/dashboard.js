// Dashboard data loading
auth.onAuthStateChanged(function(user) {
    if (user) {
        // Load dashboard data when user is authenticated
        loadPortfolioSummary(user.uid);
    }
});

// Load portfolio summary
function loadPortfolioSummary(userId) {
    const summaryElement = document.getElementById('portfolioSummary');
    if (!summaryElement) return;
    
    summaryElement.innerHTML = 'Loading portfolio data...';
    
    // Initialize counters and values
    let totalStocksValue = 0;
    let totalFundsValue = 0;
    let stocksCount = 0;
    let fundsCount = 0;
    
    // Get stocks data
    db.collection('users').doc(userId).collection('stocks')
        .get()
        .then((stocksSnapshot) => {
            stocksCount = stocksSnapshot.size;
            
            // Calculate total stocks value
            stocksSnapshot.forEach((doc) => {
                const stockData = doc.data();
                const currentPrice = stockData.currentPrice || stockData.purchasePrice;
                const totalValue = currentPrice * stockData.quantity;
                totalStocksValue += totalValue;
            });
            
            // Now get mutual funds data
            return db.collection('users').doc(userId).collection('mutualFunds').get();
        })
        .then((fundsSnapshot) => {
            fundsCount = fundsSnapshot.size;
            
            // Calculate total mutual funds value
            fundsSnapshot.forEach((doc) => {
                const fundData = doc.data();
                const currentNAV = fundData.currentNAV || fundData.purchaseNAV;
                const totalValue = currentNAV * fundData.units;
                totalFundsValue += totalValue;
            });
            
            // Update the portfolio summary
            const totalPortfolioValue = totalStocksValue + totalFundsValue;
            
            let summaryHTML = `
                <div class="row">
                    <div class="col-md-4 mb-3">
                        <h6>Stocks</h6>
                        <p class="mb-0">${stocksCount} stocks | $${totalStocksValue.toFixed(2)}</p>
                    </div>
                    <div class="col-md-4 mb-3">
                        <h6>Mutual Funds</h6>
                        <p class="mb-0">${fundsCount} funds | $${totalFundsValue.toFixed(2)}</p>
                    </div>
                    <div class="col-md-4 mb-3">
                        <h6>Total Portfolio Value</h6>
                        <p class="mb-0 fw-bold">$${totalPortfolioValue.toFixed(2)}</p>
                    </div>
                </div>
            `;
            
            summaryElement.innerHTML = summaryHTML;
        })
        .catch((error) => {
            console.error("Error loading portfolio data:", error);
            summaryElement.innerHTML = `<div class="alert alert-danger">Error loading portfolio data.</div>`;
        });
} 