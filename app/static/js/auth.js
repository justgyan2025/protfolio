// Check authentication state
auth.onAuthStateChanged(function(user) {
    if (user) {
        // User is signed in
        console.log("User is signed in:", user.email);
        
        // Update UI for logged in user
        document.getElementById('loginNav').classList.add('d-none');
        document.getElementById('logoutNav').classList.remove('d-none');
        
        // Hide auth required messages and show content
        document.querySelectorAll('.auth-required').forEach(el => {
            el.classList.add('d-none');
        });
        
        // Show content based on current page
        if (document.getElementById('dashboardContent')) {
            document.getElementById('dashboardContent').classList.remove('d-none');
        }
        if (document.getElementById('stocksContent')) {
            document.getElementById('stocksContent').classList.remove('d-none');
        }
        if (document.getElementById('mutualFundsContent')) {
            document.getElementById('mutualFundsContent').classList.remove('d-none');
        }
        
        // If on login page, redirect to home
        if (window.location.pathname === '/login') {
            window.location.href = '/';
        }
    } else {
        // User is signed out
        console.log("User is signed out");
        
        // Update UI for logged out user
        document.getElementById('loginNav').classList.remove('d-none');
        document.getElementById('logoutNav').classList.add('d-none');
        
        // Show auth required messages and hide content
        document.querySelectorAll('.auth-required').forEach(el => {
            el.classList.remove('d-none');
        });
        
        // Hide content based on current page
        if (document.getElementById('dashboardContent')) {
            document.getElementById('dashboardContent').classList.add('d-none');
        }
        if (document.getElementById('stocksContent')) {
            document.getElementById('stocksContent').classList.add('d-none');
        }
        if (document.getElementById('mutualFundsContent')) {
            document.getElementById('mutualFundsContent').classList.add('d-none');
        }
    }
});

// Handle logout
document.getElementById('logoutBtn').addEventListener('click', function(e) {
    e.preventDefault();
    auth.signOut().then(() => {
        // Sign-out successful
        window.location.href = '/';
    }).catch((error) => {
        // An error happened
        console.error("Logout error:", error);
    });
}); 