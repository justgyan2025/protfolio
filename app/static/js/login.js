// Login form submission
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorElement = document.getElementById('loginError');
    
    // Clear previous errors
    errorElement.textContent = '';
    errorElement.classList.add('d-none');
    
    // Sign in with email and password
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Signed in 
            const user = userCredential.user;
            console.log("Login successful for:", user.email);
            window.location.href = '/';
        })
        .catch((error) => {
            // Handle errors
            console.error("Login error:", error);
            const errorCode = error.code;
            let errorMessage = "An error occurred during login. Please try again.";
            
            if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {
                errorMessage = "Invalid email or password.";
            } else if (errorCode === 'auth/invalid-email') {
                errorMessage = "Invalid email format.";
            } else if (errorCode === 'auth/user-disabled') {
                errorMessage = "This account has been disabled.";
            } else if (errorCode === 'auth/too-many-requests') {
                errorMessage = "Too many unsuccessful login attempts. Please try again later.";
            }
            
            errorElement.textContent = errorMessage;
            errorElement.classList.remove('d-none');
        });
}); 