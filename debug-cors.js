// Debug CORS issue with a simple fetch test
console.log('🔍 Starting CORS debug test...');

async function testCorsLogin() {
  const url = 'https://reviewpage-production.up.railway.app/api/auth/login';
  
  console.log(`📡 Testing URL: ${url}`);
  console.log(`🌐 Origin: ${window.location.origin}`);
  
  try {
    // First test OPTIONS request manually
    console.log('1. Testing OPTIONS preflight...');
    const optionsResponse = await fetch(url, {
      method: 'OPTIONS',
      headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    console.log('✅ OPTIONS response status:', optionsResponse.status);
    console.log('📋 OPTIONS headers:');
    for (let [key, value] of optionsResponse.headers.entries()) {
      console.log(`   ${key}: ${value}`);
    }
    
    // Now test the actual POST request
    console.log('2. Testing POST request...');
    const postResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        email: 'graydrone@naver.com',
        password: '7300gray'
      })
    });
    
    console.log('✅ POST response status:', postResponse.status);
    console.log('📋 POST headers:');
    for (let [key, value] of postResponse.headers.entries()) {
      console.log(`   ${key}: ${value}`);
    }
    
    const data = await postResponse.json();
    console.log('📝 Response data:', data);
    
    return data;
    
  } catch (error) {
    console.error('❌ CORS test failed:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Auto-run the test
testCorsLogin()
  .then(result => {
    console.log('🎉 CORS test successful!', result);
  })
  .catch(error => {
    console.error('💥 CORS test failed!', error);
  });