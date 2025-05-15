// Auth Module - Handles user authentication
const Auth = (() => {
  // Store authenticated user data
  let currentUser = null;

  // Check local storage for existing token on page load
  const initialize = () => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      try {
        currentUser = JSON.parse(userData);
        updateUI(true);
        return true;
      } catch (error) {
        console.error('Failed to parse user data:', error);
        logout();
        return false;
      }
    }

    return false;
  };

  // Register new user
  const register = async (username, password, fullName, email) => {
    try {
      console.log('Attempting to register user:', username);

      // Create the request data
      const userData = {
        username,
        password,
        fullName,
        email,
      };

      console.log('Registration data:', userData);

      // Send the request
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      let data;
      // Check if we got a valid JSON response
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // If not JSON, get the text response and log it
        const textResponse = await response.text();
        console.error('Received non-JSON response:', textResponse);
        throw new Error('Server returned a non-JSON response. Please try again later.');
      } else {
        // Parse the JSON response
        data = await response.json();
        console.log('Registration response:', data);
      }

      // Special case for 201 Created status
      if (response.status === 201) {
        console.log('Registration successful with status 201 Created');
        return {
          success: true,
          user: data,
        };
      }

      // Other 2xx status codes
      if (response.status >= 200 && response.status < 300) {
        console.log('Registration successful with status:', response.status);
        return {
          success: true,
          user: data,
        };
      }

      // Special case for username/email already exists (status 400)
      if (response.status === 400 && data.code) {
        // Check for specific error codes
        if (data.code === 'USER_001' || data.code === 'USER_002' || data.code === 'USER_003') {
          console.log('Registration failed due to constraint violation:', data.error);
          throw new Error(data.error || 'Username or email already exists');
        }
      }

      // Otherwise, handle as general error
      throw new Error(data.error || 'Registration failed');
    } catch (error) {
      console.error('Registration error:', error);
      console.log('Full error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  };

  // Login user
  const login = async (username, password) => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      // Check if we got a valid JSON response
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // If not JSON, get the text response and log it
        const textResponse = await response.text();
        console.error('Received non-JSON response:', textResponse);
        throw new Error('Server returned a non-JSON response. Please try again later.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      currentUser = data.user;

      updateUI(true);

      return {
        success: true,
        user: data.user,
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  };

  // Logout user
  const logout = async () => {
    try {
      // Call the logout API endpoint
      if (localStorage.getItem('token')) {
        await fetch('/api/sessions', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Clear local storage and reset UI
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      currentUser = null;
      updateUI(false);
    }
  };

  // Update UI based on authentication state
  const updateUI = isAuthenticated => {
    const authContainer = document.getElementById('auth-container');
    const dashboard = document.getElementById('dashboard');
    const userInfo = document.getElementById('user-info');
    const usernameDisplay = document.getElementById('username-display');

    if (isAuthenticated && currentUser) {
      authContainer.classList.add('hidden');
      dashboard.classList.remove('hidden');
      userInfo.classList.remove('hidden');
      usernameDisplay.textContent = currentUser.username;

      // Load accounts and transactions
      if (typeof Accounts !== 'undefined') Accounts.loadUserAccounts();
      if (typeof Transactions !== 'undefined') Transactions.loadRecentTransactions();
    } else {
      authContainer.classList.remove('hidden');
      dashboard.classList.add('hidden');
      userInfo.classList.add('hidden');
      usernameDisplay.textContent = '';
    }
  };

  // Get current user
  const getCurrentUser = () => currentUser;

  // Get authentication token
  const getToken = () => localStorage.getItem('token');

  // Check if user is authenticated
  const isAuthenticated = () => !!currentUser;

  // Return public methods
  return {
    initialize,
    register,
    login,
    logout,
    getCurrentUser,
    getToken,
    isAuthenticated,
  };
})();

// Setup event listeners for auth forms
document.addEventListener('DOMContentLoaded', function () {
  // Tab switching functionality
  const tabButtons = document.querySelectorAll('.tab-btn');
  const formContainers = document.querySelectorAll('.form-container');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');

      // Update active tab
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      // Show corresponding form
      formContainers.forEach(container => {
        container.classList.remove('active');
        if (container.id === `${tabName}-form`) {
          container.classList.add('active');
        }
      });

      // Clear any error messages
      document.getElementById('login-error').textContent = '';
      document.getElementById('register-error').textContent = '';
      document.getElementById('register-success').textContent = '';
    });
  });

  // Login form submission
  document.getElementById('login').addEventListener('submit', async function (event) {
    event.preventDefault();

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const errorElement = document.getElementById('login-error');

    errorElement.textContent = '';

    const result = await Auth.login(username, password);

    if (!result.success) {
      errorElement.textContent = result.error;
    }
  });

  // Register form submission
  document.getElementById('register').addEventListener('submit', async function (event) {
    event.preventDefault();

    const username = document.getElementById('register-username').value;
    const fullName = document.getElementById('register-fullname').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    const errorElement = document.getElementById('register-error');
    const successElement = document.getElementById('register-success');

    errorElement.textContent = '';
    successElement.textContent = '';

    // Validate password length
    if (password.length < 8) {
      errorElement.textContent = 'Password must be at least 8 characters long';
      return;
    }

    // Additional validation
    if (!username || !fullName || !email) {
      errorElement.textContent = 'All fields are required';
      return;
    }

    // Email validation
    if (!email.includes('@') || !email.includes('.')) {
      errorElement.textContent = 'Please enter a valid email address';
      return;
    }

    console.log('Form validation passed, attempting to register...');

    // Disable the submit button and show loading state
    const submitButton = this.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Creating account...';

    const result = await Auth.register(username, password, fullName, email);

    // Re-enable the button
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;

    if (result.success) {
      successElement.textContent = 'Registration successful! You can now login.';
      document.getElementById('register').reset();

      // Switch to login tab after successful registration
      setTimeout(() => {
        document.querySelector('[data-tab="login"]').click();
      }, 2000);
    } else {
      errorElement.textContent = result.error;
    }
  });

  // Logout button
  document.getElementById('logout-btn').addEventListener('click', function () {
    Auth.logout();
  });

  // Initialize authentication state
  Auth.initialize();
});
