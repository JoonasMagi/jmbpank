// Accounts Module - Handles account-related functionality
const Accounts = (() => {
  // Store user accounts
  let userAccounts = [];

  // Load user accounts from API
  const loadUserAccounts = async () => {
    if (!Auth.isAuthenticated()) {
      return;
    }

    try {
      const accountsList = document.getElementById('accounts-list');
      accountsList.innerHTML = '<div class="loading">Loading accounts...</div>';

      const response = await fetch('/api/accounts/user', {
        headers: {
          Authorization: `Bearer ${Auth.getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load accounts');
      }

      const data = await response.json();
      userAccounts = data;

      renderAccounts();
      return data;
    } catch (error) {
      console.error('Error loading accounts:', error);
      const accountsList = document.getElementById('accounts-list');
      accountsList.innerHTML = `<div class="error-message">Error loading accounts: ${error.message}</div>`;
      return [];
    }
  };

  // Render accounts to the DOM
  const renderAccounts = () => {
    const accountsList = document.getElementById('accounts-list');

    if (userAccounts.length === 0) {
      accountsList.innerHTML =
        '<div class="loading">No accounts found. Create a new account to get started.</div>';
      return;
    }

    accountsList.innerHTML = '';

    userAccounts.forEach(account => {
      const accountCard = document.createElement('div');
      accountCard.className = 'account-card';
      accountCard.innerHTML = `
                <h3>${account.account_type === 'checking' ? 'Checking Account' : 'Savings Account'}</h3>
                <div class="account-number">${account.account_number}</div>
                <div class="balance">${formatCurrency(account.balance, account.currency)}</div>
                <div class="account-actions">
                    <button class="btn primary" data-account="${account.account_number}" onclick="Transactions.showTransactionModal('${account.account_number}')">
                        <i class="fas fa-paper-plane"></i> Send Money
                    </button>
                    <button class="btn secondary" data-account="${account.account_number}" onclick="Accounts.showAccountDetails('${account.account_number}')">
                        <i class="fas fa-info-circle"></i> Details
                    </button>
                </div>
            `;

      accountsList.appendChild(accountCard);
    });

    // Update transaction form dropdown
    updateTransactionFormAccounts();
  };

  // Update transaction form accounts dropdown
  const updateTransactionFormAccounts = () => {
    const fromAccount = document.getElementById('from-account');
    if (!fromAccount) return;

    fromAccount.innerHTML = '';

    userAccounts.forEach(account => {
      const option = document.createElement('option');
      option.value = account.account_number;
      option.textContent = `${account.account_number} (${formatCurrency(account.balance, account.currency)})`;
      fromAccount.appendChild(option);
    });
  };

  // Show account details
  const showAccountDetails = accountNumber => {
    const account = userAccounts.find(acc => acc.account_number === accountNumber);

    if (!account) {
      console.error('Account not found:', accountNumber);
      return;
    }

    alert(`Account Details:\n
Account Number: ${account.account_number}
Type: ${account.account_type === 'checking' ? 'Checking Account' : 'Savings Account'}
Balance: ${formatCurrency(account.balance, account.currency)}
Owner: ${account.owner_name}
Created: ${new Date(account.created_at).toLocaleDateString()}`);

    // In a real app, you would show this in a modal or dedicated page
  };

  // Create a new account
  const createAccount = async (accountType, currency) => {
    if (!Auth.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Auth.getToken()}`,
        },
        body: JSON.stringify({
          accountType,
          currency,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      // Reload accounts to include the new one
      await loadUserAccounts();

      return { success: true, account: data };
    } catch (error) {
      console.error('Error creating account:', error);
      return { success: false, error: error.message };
    }
  };

  // Show create account modal
  const showCreateAccountModal = () => {
    const modal = document.getElementById('create-account-modal');
    modal.style.display = 'block';

    // Reset form
    document.getElementById('create-account-form').reset();
    document.getElementById('create-account-error').textContent = '';
    document.getElementById('create-account-success').textContent = '';
  };

  // Hide create account modal
  const hideCreateAccountModal = () => {
    const modal = document.getElementById('create-account-modal');
    modal.style.display = 'none';
  };

  // Get user accounts
  const getUserAccounts = () => userAccounts;

  // Format currency helper
  const formatCurrency = (amount, currency = 'EUR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  // Setup event listeners
  const setupEventListeners = () => {
    // Create account button
    document.getElementById('create-account-btn').addEventListener('click', showCreateAccountModal);

    // Close modal buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
      closeBtn.addEventListener('click', function () {
        const modal = this.closest('.modal');
        modal.style.display = 'none';
      });
    });

    // Create account form submission
    document
      .getElementById('create-account-form')
      .addEventListener('submit', async function (event) {
        event.preventDefault();

        const accountType = document.getElementById('account-type').value;
        const currency = document.getElementById('account-currency').value;

        const errorElement = document.getElementById('create-account-error');
        const successElement = document.getElementById('create-account-success');

        errorElement.textContent = '';
        successElement.textContent = '';

        const result = await createAccount(accountType, currency);

        if (result.success) {
          successElement.textContent = 'Account created successfully!';
          setTimeout(hideCreateAccountModal, 2000);
        } else {
          errorElement.textContent = result.error;
        }
      });

    // Close modals when clicking outside
    window.addEventListener('click', function (event) {
      document.querySelectorAll('.modal').forEach(modal => {
        if (event.target === modal) {
          modal.style.display = 'none';
        }
      });
    });
  };

  // Initialize module
  const initialize = () => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupEventListeners);
    } else {
      setupEventListeners();
    }
  };

  // Return public methods
  return {
    initialize,
    loadUserAccounts,
    createAccount,
    showAccountDetails,
    showCreateAccountModal,
    hideCreateAccountModal,
    getUserAccounts,
    formatCurrency,
  };
})();

// Initialize the accounts module
Accounts.initialize();
