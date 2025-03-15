// Main application script
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the application
    console.log('JMB Pank Application Initialized');
    
    // Check for authentication status
    const isLoggedIn = Auth.initialize();
    
    if (isLoggedIn) {
        console.log('User authenticated, loading dashboard');
        // Load user accounts and transactions
        Accounts.loadUserAccounts().then(() => {
            // After accounts are loaded, load transactions
            Transactions.loadRecentTransactions();
        });
    } else {
        console.log('User not authenticated, showing login form');
    }
    
    // Global error handler
    window.addEventListener('error', function(event) {
        console.error('Global error:', event.error);
    });
});