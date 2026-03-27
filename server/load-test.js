/**
 * Load Testing Script for Egator API
 * 
 * Script ini menguji performa API dengan banyak request simultan.
 * 
 * Usage: node load-test.js
 */

const http = require('http');

// Konfigurasi
const CONFIG = {
    baseUrl: 'http://localhost:5000/api',
    concurrentUsers: 50,        // Jumlah user simultan
    requestsPerUser: 10,        // Request per user
    thinkTime: 100,             // Delay antar request (ms)
    timeout: 30000              // Timeout per request (ms)
};

// Statistics
const stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalResponseTime: 0,
    minResponseTime: Infinity,
    maxResponseTime: 0,
    responseTimes: [],
    errors: {}
};

/**
 * Make HTTP request
 */
function makeRequest(endpoint, method = 'GET', data = null, token = null) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const url = new URL(endpoint, CONFIG.baseUrl);
        const options = {
            hostname: url.hostname,
            port: url.port || 5000,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'LoadTest/1.0'
            },
            timeout: CONFIG.timeout
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        if (data) {
            const postData = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = http.request(options, (res) => {
            let body = '';
            
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                const responseTime = Date.now() - startTime;
                resolve({
                    statusCode: res.statusCode,
                    responseTime,
                    body: body ? JSON.parse(body) : null
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

/**
 * Simulate single user behavior
 */
async function simulateUser(userId) {
    const results = [];
    
    console.log(`👤 User ${userId} starting...`);
    
    for (let i = 0; i < CONFIG.requestsPerUser; i++) {
        try {
            // Test different endpoints
            const endpoint = getRandomEndpoint();
            const result = await makeRequest(endpoint.path, endpoint.method, endpoint.data);
            
            results.push({
                success: true,
                endpoint: endpoint.path,
                statusCode: result.statusCode,
                responseTime: result.responseTime
            });
            
            // Think time between requests
            if (i < CONFIG.requestsPerUser - 1) {
                await sleep(CONFIG.thinkTime + Math.random() * 100);
            }
        } catch (error) {
            results.push({
                success: false,
                error: error.message
            });
        }
    }
    
    console.log(`✅ User ${userId} completed: ${results.filter(r => r.success).length}/${results.length} successful`);
    return results;
}

/**
 * Get random endpoint to test
 */
function getRandomEndpoint() {
    const endpoints = [
        { path: '/elections', method: 'GET' },
        { path: '/candidates', method: 'GET' },
        { path: '/voters/register', method: 'POST', data: {
            fullName: `Test User ${Date.now()}`,
            email: `test${Date.now()}@example.com`,
            password: 'Password@123',
            password2: 'Password@123'
        }},
    ];
    
    return endpoints[Math.floor(Math.random() * endpoints.length)];
}

/**
 * Sleep helper
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Record statistics
 */
function recordStats(results) {
    results.forEach(result => {
        stats.totalRequests++;
        
        if (result.success) {
            stats.successfulRequests++;
            stats.totalResponseTime += result.responseTime;
            stats.minResponseTime = Math.min(stats.minResponseTime, result.responseTime);
            stats.maxResponseTime = Math.max(stats.maxResponseTime, result.responseTime);
            stats.responseTimes.push(result.responseTime);
        } else {
            stats.failedRequests++;
            const errorMsg = result.error || 'Unknown error';
            stats.errors[errorMsg] = (stats.errors[errorMsg] || 0) + 1;
        }
    });
}

/**
 * Calculate percentile
 */
function percentile(arr, p) {
    if (arr.length === 0) return 0;
    arr.sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * arr.length) - 1;
    return arr[Math.max(0, index)];
}

/**
 * Print statistics
 */
function printStats(duration) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 LOAD TEST RESULTS');
    console.log('='.repeat(60));
    
    console.log(`\n⏱️  Duration: ${(duration / 1000).toFixed(2)} seconds`);
    console.log(`\n📈 REQUEST STATISTICS:`);
    console.log(`   Total Requests:     ${stats.totalRequests}`);
    console.log(`   Successful:         ${stats.successfulRequests} (${(stats.successfulRequests / stats.totalRequests * 100).toFixed(2)}%)`);
    console.log(`   Failed:             ${stats.failedRequests} (${(stats.failedRequests / stats.totalRequests * 100).toFixed(2)}%)`);
    
    console.log(`\n⚡ RESPONSE TIME (ms):`);
    console.log(`   Min:                ${stats.minResponseTime === Infinity ? 'N/A' : stats.minResponseTime}`);
    console.log(`   Max:                ${stats.maxResponseTime}`);
    console.log(`   Average:            ${(stats.totalResponseTime / stats.successfulRequests || 0).toFixed(2)}`);
    console.log(`   Median (p50):       ${percentile(stats.responseTimes, 50)}`);
    console.log(`   90th Percentile:    ${percentile(stats.responseTimes, 90)}`);
    console.log(`   95th Percentile:    ${percentile(stats.responseTimes, 95)}`);
    console.log(`   99th Percentile:    ${percentile(stats.responseTimes, 99)}`);
    
    console.log(`\n📊 THROUGHPUT:`);
    const rps = stats.totalRequests / (duration / 1000);
    console.log(`   Requests/Second:    ${rps.toFixed(2)}`);
    
    if (Object.keys(stats.errors).length > 0) {
        console.log(`\n❌ ERRORS:`);
        Object.entries(stats.errors).forEach(([error, count]) => {
            console.log(`   ${error}: ${count}`);
        });
    }
    
    console.log('\n' + '='.repeat(60));
}

/**
 * Run load test
 */
async function runLoadTest() {
    console.log('🚀 Starting Load Test...');
    console.log('='.repeat(60));
    console.log(`Configuration:`);
    console.log(`   Base URL:           ${CONFIG.baseUrl}`);
    console.log(`   Concurrent Users:   ${CONFIG.concurrentUsers}`);
    console.log(`   Requests per User:  ${CONFIG.requestsPerUser}`);
    console.log(`   Think Time:         ${CONFIG.thinkTime}ms`);
    console.log(`   Timeout:            ${CONFIG.timeout}ms`);
    console.log('='.repeat(60));
    
    const startTime = Date.now();
    
    // Run concurrent users
    const userPromises = [];
    for (let i = 0; i < CONFIG.concurrentUsers; i++) {
        userPromises.push(simulateUser(i + 1));
    }
    
    // Wait for all users to complete
    const results = await Promise.all(userPromises);
    
    const duration = Date.now() - startTime;
    
    // Aggregate results
    results.flat().forEach(result => recordStats([result]));
    
    // Print statistics
    printStats(duration);
    
    // Return success/failure
    const successRate = stats.successfulRequests / stats.totalRequests * 100;
    return successRate >= 95;
}

// Run the test
runLoadTest()
    .then(success => {
        console.log(success ? '\n✅ Load test PASSED' : '\n❌ Load test FAILED');
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('\n❌ Load test error:', error);
        process.exit(1);
    });
