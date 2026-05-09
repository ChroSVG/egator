const fs = require('fs');

try {
    const app = require('./index');
    
    const result = {
        status: 'success',
        message: 'Server module loaded successfully',
        routes: app._router ? 'Routes registered' : 'No routes'
    };
    
    fs.writeFileSync('server-test-result.txt', JSON.stringify(result, null, 2));
    console.log('✅ Server loaded! Check server-test-result.txt');
    
    // Give it time to connect to MongoDB then exit
    setTimeout(() => {
        process.exit(0);
    }, 2000);
    
} catch (error) {
    fs.writeFileSync('server-test-result.txt', JSON.stringify({
        status: 'error',
        message: error.message,
        stack: error.stack
    }, null, 2));
    console.log('❌ Error:', error.message);
    process.exit(1);
}
