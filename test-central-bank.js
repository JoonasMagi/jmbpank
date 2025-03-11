const axios = require('axios');

// Central Bank URL (confirmed correct)
const CENTRAL_BANK_URL = 'https://henno.cfd/central-bank';

async function testCentralBank() {
  try {
    console.log('Testing connection to Central Bank...');
    console.log(`URL: ${CENTRAL_BANK_URL}`);
    
    // Try to get banks list (this will likely return 401 without API key, which is expected)
    try {
      const response = await axios.get(`${CENTRAL_BANK_URL}/banks`, {
        timeout: 5000 // 5 second timeout
      });
      console.log(`SUCCESS! Status: ${response.status}`);
      console.log(`Response data:`, response.data);
    } catch (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        console.log(`Status: ${error.response.status}`);
        
        // If we get a 401 Unauthorized, that means the URL itself is valid but we need an API key
        if (error.response.status === 401) {
          console.log('✅ URL is valid! 401 Unauthorized means the URL is correct but requires an API key');
        } else {
          console.log('❌ Unexpected status code:', error.response.status);
        }
      } else if (error.request) {
        console.log('❌ No response received:', error.message);
      } else {
        console.log('❌ Error:', error.message);
      }
    }
    
    // Try to access the docs or homepage if available
    console.log('\nAttempting to access documentation or homepage...');
    try {
      const response = await axios.get(CENTRAL_BANK_URL, {
        timeout: 5000
      });
      console.log(`✅ Homepage is accessible! Status: ${response.status}`);
    } catch (error) {
      console.log('❌ Could not access homepage:', error.message);
    }

    console.log('\n----------------------------------------');
    console.log('Central Bank URL verification complete');
    console.log('----------------------------------------');
    console.log('To use this URL in your application:');
    console.log('1. Update your .env file with:');
    console.log(`   CENTRAL_BANK_URL=${CENTRAL_BANK_URL}`);
    console.log('   TEST_MODE=false');
    console.log('2. Register your bank at the Central Bank to get an API key');
    console.log('3. Add the API key to your .env file:');
    console.log('   API_KEY=your_api_key_here');
    console.log('4. Restart your application');
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

// Run the test
testCentralBank();