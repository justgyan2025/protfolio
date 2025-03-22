// Mutual Funds data loading
auth.onAuthStateChanged(function(user) {
    if (user) {
        // Load mutual funds data when user is authenticated
        loadMutualFundsData(user.uid);
        
        // Set up event listeners
        setupAddFundForm(user.uid);
        setupFundSearch();
    }
});

// Load mutual funds data
function loadMutualFundsData(userId) {
    const fundsList = document.getElementById('fundsList');
    if (!fundsList) return;
    
    fundsList.innerHTML = '<tr><td colspan="8" class="text-center">Loading mutual funds...</td></tr>';
    
    db.collection('users').doc(userId).collection('mutualFunds')
        .get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                fundsList.innerHTML = '<tr><td colspan="8" class="text-center">No mutual funds found. Add your first mutual fund investment.</td></tr>';
                return;
            }
            
            let fundsHTML = '';
            
            querySnapshot.forEach((doc) => {
                const fund = doc.data();
                const fundId = doc.id;
                const currentNAV = fund.currentNAV || fund.purchaseNAV;
                const totalValue = currentNAV * fund.units;
                const profitLoss = totalValue - (fund.purchaseNAV * fund.units);
                const profitLossClass = profitLoss >= 0 ? 'profit' : 'loss';
                const profitLossPercentage = ((currentNAV - fund.purchaseNAV) / fund.purchaseNAV * 100).toFixed(2);
                
                fundsHTML += `
                    <tr data-fund-id="${fundId}">
                        <td>${fund.schemeCode || 'N/A'}</td>
                        <td>${fund.fundName}</td>
                        <td>${fund.units.toFixed(3)}</td>
                        <td>₹${fund.purchaseNAV.toFixed(2)}</td>
                        <td>₹${currentNAV.toFixed(2)}</td>
                        <td>₹${totalValue.toFixed(2)}</td>
                        <td class="${profitLossClass}">
                            ₹${Math.abs(profitLoss).toFixed(2)} (${profitLoss >= 0 ? '+' : '-'}${Math.abs(profitLossPercentage)}%)
                        </td>
                        <td>
                            <button class="btn btn-sm btn-danger delete-fund" data-fund-id="${fundId}">Delete</button>
                            ${fund.schemeCode ? `
                            <button class="btn btn-sm btn-secondary refresh-nav" data-fund-id="${fundId}" data-scheme-code="${fund.schemeCode}">
                                <i class="bi bi-arrow-clockwise"></i>
                            </button>` : ''}
                        </td>
                    </tr>
                `;
            });
            
            fundsList.innerHTML = fundsHTML;
            
            // Add event listeners for delete and refresh buttons
            document.querySelectorAll('.delete-fund').forEach(button => {
                button.addEventListener('click', function() {
                    const fundId = this.getAttribute('data-fund-id');
                    deleteFund(userId, fundId);
                });
            });
            
            document.querySelectorAll('.refresh-nav').forEach(button => {
                button.addEventListener('click', function() {
                    const fundId = this.getAttribute('data-fund-id');
                    const schemeCode = this.getAttribute('data-scheme-code');
                    refreshFundNAV(userId, fundId, schemeCode);
                });
            });
        })
        .catch((error) => {
            console.error("Error loading mutual funds data:", error);
            fundsList.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error loading mutual funds data.</td></tr>';
        });
}

// Setup mutual fund search functionality
function setupFundSearch() {
    const searchBtn = document.getElementById('searchFundBtn');
    const refreshNAVBtn = document.getElementById('refreshNAVBtn');
    const schemeCodeInput = document.getElementById('schemeCode');
    const fundNameInput = document.getElementById('fundName');
    const fundTypeInput = document.getElementById('fundType');
    const currentNAVInput = document.getElementById('currentNAV');
    const navDateText = document.getElementById('navDate');
    const fundInfoAlert = document.getElementById('fundInfoAlert');
    
    if (!searchBtn || !schemeCodeInput || !fundNameInput || !currentNAVInput) return;
    
    // Search button click handler
    searchBtn.addEventListener('click', function() {
        searchFund();
    });
    
    // Scheme code input enter key handler
    schemeCodeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchFund();
        }
    });
    
    // Refresh NAV button click handler
    if (refreshNAVBtn) {
        refreshNAVBtn.addEventListener('click', function() {
            searchFund();
        });
    }
    
    // Function to search for mutual fund information
    function searchFund() {
        const schemeCode = schemeCodeInput.value.trim();
        
        if (!schemeCode) {
            showFundInfoAlert('Please enter a scheme code', 'danger');
            return;
        }
        
        // Show loading state
        searchBtn.disabled = true;
        searchBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Searching...';
        showFundInfoAlert('Searching for mutual fund information...', 'info');
        
        // Call the API to get mutual fund information
        fetch(`/api/mutual-fund/search?scheme_code=${encodeURIComponent(schemeCode)}`)
            .then(response => response.json())
            .then(data => {
                // Reset button state
                searchBtn.disabled = false;
                searchBtn.textContent = 'Search';
                
                if (data.error) {
                    showFundInfoAlert(`Error: ${data.error}`, 'danger');
                    return;
                }
                
                // Fill in the fund name, type, and current NAV
                fundNameInput.value = data.schemeName;
                fundTypeInput.value = data.fundType + (data.fundCategory ? ` - ${data.fundCategory}` : '');
                currentNAVInput.value = data.currentNAV;
                navDateText.textContent = `NAV as of ${data.date}`;
                
                // Show success message
                showFundInfoAlert(`Successfully found ${data.schemeName} with current NAV ₹${data.currentNAV}`, 'success');
            })
            .catch(error => {
                searchBtn.disabled = false;
                searchBtn.textContent = 'Search';
                console.error('Error searching for mutual fund:', error);
                showFundInfoAlert('Error searching for mutual fund. Please check the scheme code and try again.', 'danger');
            });
    }
    
    // Helper function to show alert messages
    function showFundInfoAlert(message, type) {
        fundInfoAlert.textContent = message;
        fundInfoAlert.className = `alert alert-${type}`;
        fundInfoAlert.classList.remove('d-none');
        
        // Hide alert after 5 seconds for success messages
        if (type === 'success') {
            setTimeout(() => {
                fundInfoAlert.classList.add('d-none');
            }, 5000);
        }
    }
}

// Refresh fund NAV
function refreshFundNAV(userId, fundId, schemeCode) {
    // Call the API to get updated NAV
    fetch(`/api/mutual-fund/search?scheme_code=${encodeURIComponent(schemeCode)}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Error refreshing NAV:', data.error);
                alert('Error refreshing NAV. Please try again.');
                return;
            }
            
            // Update the NAV in Firestore
            db.collection('users').doc(userId).collection('mutualFunds').doc(fundId).update({
                currentNAV: data.currentNAV,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                navDate: data.date
            })
            .then(() => {
                // Reload mutual funds data
                loadMutualFundsData(userId);
            })
            .catch((error) => {
                console.error("Error updating NAV:", error);
                alert('Error updating NAV. Please try again.');
            });
        })
        .catch(error => {
            console.error('Error refreshing NAV:', error);
            alert('Error refreshing NAV. Please try again.');
        });
}

// Setup add mutual fund form
function setupAddFundForm(userId) {
    const addFundForm = document.getElementById('addFundForm');
    if (!addFundForm) return;
    
    addFundForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const schemeCode = document.getElementById('schemeCode').value.trim();
        const fundName = document.getElementById('fundName').value;
        const fundType = document.getElementById('fundType').value;
        const units = parseFloat(document.getElementById('units').value);
        const purchaseNAV = parseFloat(document.getElementById('purchaseNAV').value);
        const currentNAV = parseFloat(document.getElementById('currentNAV').value || purchaseNAV);
        const navDate = document.getElementById('navDate').textContent.replace('NAV as of ', '');
        const errorElement = document.getElementById('addFundError');
        
        // Clear previous errors
        errorElement.textContent = '';
        errorElement.classList.add('d-none');
        
        // Validate inputs
        if (!fundName || isNaN(units) || isNaN(purchaseNAV)) {
            errorElement.textContent = 'Please fill all fields with valid values.';
            errorElement.classList.remove('d-none');
            return;
        }
        
        // Add mutual fund to Firestore
        db.collection('users').doc(userId).collection('mutualFunds').add({
            schemeCode: schemeCode,
            fundName: fundName,
            fundType: fundType,
            units: units,
            purchaseNAV: purchaseNAV,
            currentNAV: currentNAV,
            navDate: navDate,
            addedDate: firebase.firestore.FieldValue.serverTimestamp(),
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            // Close modal and reset form
            const modal = bootstrap.Modal.getInstance(document.getElementById('addFundModal'));
            modal.hide();
            addFundForm.reset();
            document.getElementById('navDate').textContent = '';
            
            // Reload mutual funds data
            loadMutualFundsData(userId);
        })
        .catch((error) => {
            console.error("Error adding mutual fund:", error);
            errorElement.textContent = 'Error adding mutual fund. Please try again.';
            errorElement.classList.remove('d-none');
        });
    });
}

// Delete mutual fund
function deleteFund(userId, fundId) {
    if (confirm('Are you sure you want to delete this mutual fund?')) {
        db.collection('users').doc(userId).collection('mutualFunds').doc(fundId).delete()
            .then(() => {
                // Reload mutual funds data
                loadMutualFundsData(userId);
            })
            .catch((error) => {
                console.error("Error deleting mutual fund:", error);
                alert('Error deleting mutual fund. Please try again.');
            });
    }
} 