const axios = require('axios');

// List of possible Central Bank URLs to test
const possibleUrls = [
  'https://keskpank.henno.ee/api',
  'https://keskpank.henno.tech/api',
  'http://keskpank.henno.tech/api',
  'http://pank.henno.tech/api',
  'https://pank.henno.tech/api',
  'https://keskpank.henno.com/api',
  'http://keskpank.henno.com/api'
];

async function testUrl(url) {
  try {
    console.log(`Testing URL: ${url}`);
    const response = await axios.get(`${url}/banks`, {
      timeout: 5000 // 5 second timeout
    });
    console.log(`SUCCESS! Status: ${response.status}`);
    console.log(`Response data:`, response.data);
    return true;
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.log(`Status: ${error.response.status}`);
      console.log(`Headers:`, error.response.headers);
      console.log(`Data:`, error.response.data);
      
      // If we get a 401 Unauthorized, that means the URL itself is valid but we need an API key
      if (error.response.status === 401) {
        console.log(`URL FOUND! (${url}) - 401 Unauthorized means the URL is valid but requires an API key`);
        return true;
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.log(`No response received:`, error.message);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log(`Error:`, error.message);
    }
    return false;
  }
}

async function testAllUrls() {
  console.log('Testing all possible Central Bank URLs...');
  console.log('----------------------------------------');
  
  for (const url of possibleUrls) {
    const result = await testUrl(url);
    if (result) {
      console.log(`✅ URL ${url} is valid!`);
    } else {
      console.log(`❌ URL ${url} is not working.`);
    }
    console.log('----------------------------------------');
  }
}

// Run the tests
testAllUrls();
