// Transactions Module - Handles transaction functionality
const Transactions = (() => {
  // Store user transactions
  let transactions = [];

  // Load recent transactions from API
  const loadRecentTransactions = async () => {
    if (!Auth.isAuthenticated()) {
      return;
    }

    try {
      const transactionsList = document.getElementById('transactions-list');
      transactionsList.innerHTML = '<div class="loading">Loading transactions...</div>';

      // Get user accounts first
      const accounts = Accounts.getUserAccounts();
      if (!accounts || accounts.length === 0) {
        await Accounts.loadUserAccounts();
      }

      // Get updated accounts list
      const userAccounts = Accounts.getUserAccounts();
      if (!userAccounts || userAccounts.length === 0) {
        transactionsList.innerHTML =
          '<div class="loading">No accounts found. Create an account to see transactions.</div>';
        return [];
      }

      // Fetch transactions for all accounts
      const allTransactions = [];
      for (const account of userAccounts) {
        const response = await fetch(`/api/transactions/account/${account.account_number}`, {
          headers: {
            Authorization: `Bearer ${Auth.getToken()}`,
          },
        });

        if (response.ok) {
          const accountTransactions = await response.json();
          allTransactions.push(...accountTransactions);
        }
      }

      // Sort by date (newest first)
      transactions = allTransactions.sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at);
      });

      renderTransactions();
      return transactions;
    } catch (error) {
      console.error('Error loading transactions:', error);
      const transactionsList = document.getElementById('transactions-list');
      transactionsList.innerHTML = `<div class="error-message">Error loading transactions: ${error.message}</div>`;
      return [];
    }
  };

  // Render transactions to DOM
  const renderTransactions = () => {
    const transactionsList = document.getElementById('transactions-list');

    if (transactions.length === 0) {
      transactionsList.innerHTML = '<div class="loading">No transactions found.</div>';
      return;
    }

    transactionsList.innerHTML = '';

    // Get current user's accounts for determining incoming/outgoing
    const userAccounts = Accounts.getUserAccounts();
    const userAccountNumbers = userAccounts.map(acc => acc.account_number);

    // Display at most 10 recent transactions
    const recentTransactions = transactions.slice(0, 10);

    recentTransactions.forEach(transaction => {
      const isOutgoing = userAccountNumbers.includes(transaction.account_from);
      const transactionItem = document.createElement('div');
      transactionItem.className = 'transaction-item';

      const formattedDate = new Date(transaction.created_at).toLocaleString();
      const statusClass = `status-${transaction.status.toLowerCase()}`;

      transactionItem.innerHTML = `
                <div class="transaction-details">
                    <div class="transaction-date">${formattedDate}</div>
                    <div class="transaction-accounts">
                        ${isOutgoing ? 'To:' : 'From:'} 
                        ${isOutgoing ? transaction.account_to : transaction.account_from}
                    </div>
                    <div class="transaction-explanation">${transaction.explanation || 'No explanation provided'}</div>
                </div>
                <div class="transaction-info">
                    <div class="transaction-amount ${isOutgoing ? 'outgoing' : 'incoming'}">
                        ${isOutgoing ? '-' : '+'} 
                        ${Accounts.formatCurrency(transaction.amount, transaction.currency)}
                    </div>
                    <div class="transaction-status ${statusClass}">${transaction.status}</div>
                </div>
            `;

      transactionsList.appendChild(transactionItem);
    });
  };

  // Create new transaction
  const createTransaction = async (accountFrom, accountTo, amount, currency, explanation) => {
    if (!Auth.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Auth.getToken()}`,
        },
        body: JSON.stringify({
          accountFrom,
          accountTo,
          amount: parseFloat(amount),
          currency,
          explanation,
          senderName: Auth.getCurrentUser().full_name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create transaction');
      }

      // Reload accounts (to update balances) and transactions
      await Accounts.loadUserAccounts();
      await loadRecentTransactions();

      return { success: true, transaction: data };
    } catch (error) {
      console.error('Error creating transaction:', error);
      return { success: false, error: error.message };
    }
  };

  // Show transaction modal
  const showTransactionModal = (defaultAccount = null) => {
    const modal = document.getElementById('transaction-modal');
    modal.style.display = 'block';

    // Reset form
    const form = document.getElementById('transaction-form');
    form.reset();

    document.getElementById('transaction-error').textContent = '';
    document.getElementById('transaction-success').textContent = '';

    // If default account provided, select it in the dropdown
    if (defaultAccount) {
      const fromAccount = document.getElementById('from-account');

      // Ensure the dropdown has been populated
      if (fromAccount.options.length === 0) {
        const userAccounts = Accounts.getUserAccounts();
        userAccounts.forEach(account => {
          const option = document.createElement('option');
          option.value = account.account_number;
          option.textContent = `${account.account_number} (${Accounts.formatCurrency(account.balance, account.currency)})`;
          fromAccount.appendChild(option);
        });
      }

      // Set the selected account
      for (let i = 0; i < fromAccount.options.length; i++) {
        if (fromAccount.options[i].value === defaultAccount) {
          fromAccount.selectedIndex = i;
          break;
        }
      }
    }
  };

  // Hide transaction modal
  const hideTransactionModal = () => {
    const modal = document.getElementById('transaction-modal');
    modal.style.display = 'none';
  };

  // Get transactions
  const getTransactions = () => transactions;

  // Setup event listeners
  const setupEventListeners = () => {
    // Transaction form submission
    document.getElementById('transaction-form').addEventListener('submit', async function (event) {
      event.preventDefault();

      const fromAccount = document.getElementById('from-account').value;
      const toAccount = document.getElementById('to-account').value;
      const amount = document.getElementById('amount').value;
      const currency = document.getElementById('currency').value;
      const explanation = document.getElementById('explanation').value;

      const errorElement = document.getElementById('transaction-error');
      const successElement = document.getElementById('transaction-success');

      errorElement.textContent = '';
      successElement.textContent = '';

      if (!fromAccount || !toAccount || !amount || parseFloat(amount) <= 0) {
        errorElement.textContent = 'Please complete all fields with valid values';
        return;
      }

      if (fromAccount === toAccount) {
        errorElement.textContent = 'Cannot transfer to the same account';
        return;
      }

      const result = await createTransaction(fromAccount, toAccount, amount, currency, explanation);

      if (result.success) {
        successElement.textContent = 'Transaction created successfully!';
        setTimeout(hideTransactionModal, 2000);
      } else {
        errorElement.textContent = result.error;
      }
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
    loadRecentTransactions,
    createTransaction,
    showTransactionModal,
    hideTransactionModal,
    getTransactions,
  };
})();

// Initialize the transactions module
Transactions.initialize();
