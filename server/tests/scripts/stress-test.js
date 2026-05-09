/**
 * Stress Test Script for Egator API
 * 
 * Script ini menguji batas maksimal server dengan request yang sangat banyak.
 * 
 * Usage: node stress-test.js
 */

const http = require('http');

// Konfigurasi
const CONFIG = {
    baseUrl: 'http://localhost:5000/api',
    duration: 30000,          // Test duration (ms)
    rampUpTime: 5000,         // Time to reach max concurrency (ms)
    maxConcurrent: 100,       // Maximum concurrent requests
    endpoint: '/elections',   // Endpoint to test
    useAuth: true             // Use authentication
};

// Statistics
const stats = {
    startTime: 0,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    responseTimes: [],
    errors: {},
    activeRequests: 0,
    peakActiveRequests: 0,
    authToken: null  // Will be populated after login
};

/**
 * Make HTTP request
 */
function makeRequest(useAuth = false) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const elapsed = Date.now() - stats.startTime;
        
        // Check if test duration exceeded
        if (elapsed > CONFIG.duration) {
            resolve(null);
            return;
        }
        
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: CONFIG.endpoint,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'StressTest/1.0'
            },
            timeout: 5000
        };

        // Add auth token if available and needed
        if (CONFIG.useAuth && stats.authToken) {
            options.headers['Authorization'] = `Bearer ${stats.authToken}`;
        }

        stats.activeRequests++;
        stats.peakActiveRequests = Math.max(stats.peakActiveRequests, stats.activeRequests);

        const req = http.request(options, (res) => {
            let body = '';
            
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                stats.activeRequests--;
                const responseTime = Date.now() - startTime;
                
                stats.totalRequests++;
                if (res.statusCode >= 200 && res.statusCode < 400) {
                    stats.successfulRequests++;
                    stats.responseTimes.push(responseTime);
                } else {
                    stats.failedRequests++;
                    const errorMsg = `HTTP ${res.statusCode}`;
                    stats.errors[errorMsg] = (stats.errors[errorMsg] || 0) + 1;
                }
                
                resolve({
                    statusCode: res.statusCode,
                    responseTime,
                    success: res.statusCode >= 200 && res.statusCode < 400
                });
            });
        });

        req.on('error', (error) => {
            stats.activeRequests--;
            stats.totalRequests++;
            stats.failedRequests++;
            const errorMsg = error.message;
            stats.errors[errorMsg] = (stats.errors[errorMsg] || 0) + 1;
            reject(error);
        });

        req.on('timeout', () => {
            req.destroy();
            stats.activeRequests--;
            stats.totalRequests++;
            stats.failedRequests++;
            stats.errors['Timeout'] = (stats.errors['Timeout'] || 0) + 1;
            reject(new Error('Timeout'));
        });

        req.end();
    });
}

/**
 * Login to get auth token
 */
async function login() {
    return new Promise((resolve, reject) => {
        const loginData = JSON.stringify({
            email: 'admin@example.com',
            password: 'Admin@123456'
        });
        
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/voters/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': loginData.length
            },
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const response = JSON.parse(body);
                    stats.authToken = response.token;
                    console.log('✅ Logged in successfully');
                    resolve(true);
                } else {
                    console.log(`⚠️ Login failed: ${res.statusCode}`);
                    resolve(false);
                }
            });
        });

        req.on('error', () => resolve(false));
        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });

        req.write(loginData);
        req.end();
    });
}

/**
 * Sleep helper
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
 * Print progress
 */
function printProgress() {
    const elapsed = Date.now() - stats.startTime;
    const remaining = Math.max(0, CONFIG.duration - elapsed);
    const progress = (elapsed / CONFIG.duration * 100).toFixed(1);
    const rps = stats.totalRequests / (elapsed / 1000);
    
    process.stdout.write(`\r📊 Progress: ${progress}% | Requests: ${stats.totalRequests} | Success: ${stats.successfulRequests} | Failed: ${stats.failedRequests} | Active: ${stats.activeRequests} | RPS: ${rps.toFixed(1)}   `);
}

/**
 * Run stress test
 */
async function runStressTest() {
    console.log('🔥 Starting Stress Test...');
    console.log('='.repeat(60));
    console.log(`Configuration:`);
    console.log(`   Base URL:           ${CONFIG.baseUrl}`);
    console.log(`   Endpoint:           ${CONFIG.endpoint}`);
    console.log(`   Duration:           ${CONFIG.duration / 1000}s`);
    console.log(`   Max Concurrent:     ${CONFIG.maxConcurrent}`);
    console.log(`   Ramp Up Time:       ${CONFIG.rampUpTime / 1000}s`);
    console.log('='.repeat(60));
    
    // Try to login first
    console.log('\n🔑 Attempting to login...');
    await login();
    
    stats.startTime = Date.now();
    
    // Start requests with ramp up
    const runRequests = async () => {
        let currentConcurrent = 0;
        const rampUpInterval = CONFIG.rampUpTime / CONFIG.maxConcurrent;
        
        const sendRequest = async () => {
            while (Date.now() - stats.startTime < CONFIG.duration) {
                try {
                    await makeRequest();
                } catch (error) {
                    // Error already recorded
                }
                
                if (Date.now() - stats.startTime < CONFIG.duration) {
                    await sleep(10 + Math.random() * 20); // Small delay between requests
                }
            }
        };
        
        // Ramp up
        for (let i = 0; i < CONFIG.maxConcurrent; i++) {
            sendRequest();
            currentConcurrent++;
            printProgress();
            await sleep(rampUpInterval);
        }
        
        // Keep running until duration exceeded
        await sleep(CONFIG.duration - (Date.now() - stats.startTime));
    };
    
    // Run stress test
    await runRequests();
    
    // Wait for active requests to complete
    await sleep(1000);
    
    const duration = Date.now() - stats.startTime;
    
    // Print final statistics
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 STRESS TEST RESULTS');
    console.log('='.repeat(60));
    
    console.log(`\n⏱️  Duration: ${(duration / 1000).toFixed(2)} seconds`);
    console.log(`\n📈 REQUEST STATISTICS:`);
    console.log(`   Total Requests:     ${stats.totalRequests}`);
    console.log(`   Successful:         ${stats.successfulRequests} (${(stats.successfulRequests / stats.totalRequests * 100).toFixed(2)}%)`);
    console.log(`   Failed:             ${stats.failedRequests} (${(stats.failedRequests / stats.totalRequests * 100).toFixed(2)}%)`);
    
    console.log(`\n⚡ RESPONSE TIME (ms):`);
    console.log(`   Min:                ${stats.responseTimes.length > 0 ? Math.min(...stats.responseTimes) : 'N/A'}`);
    console.log(`   Max:                ${stats.responseTimes.length > 0 ? Math.max(...stats.responseTimes) : 'N/A'}`);
    console.log(`   Average:            ${(stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length || 0).toFixed(2)}`);
    console.log(`   Median (p50):       ${percentile(stats.responseTimes, 50)}`);
    console.log(`   90th Percentile:    ${percentile(stats.responseTimes, 90)}`);
    console.log(`   95th Percentile:    ${percentile(stats.responseTimes, 95)}`);
    console.log(`   99th Percentile:    ${percentile(stats.responseTimes, 99)}`);
    
    console.log(`\n📊 THROUGHPUT:`);
    const rps = stats.totalRequests / (duration / 1000);
    console.log(`   Requests/Second:    ${rps.toFixed(2)}`);
    console.log(`   Peak Active:        ${stats.peakActiveRequests}`);
    
    if (Object.keys(stats.errors).length > 0) {
        console.log(`\n❌ ERRORS:`);
        Object.entries(stats.errors).forEach(([error, count]) => {
            console.log(`   ${error}: ${count}`);
        });
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Determine if test passed
    const successRate = stats.successfulRequests / stats.totalRequests * 100;
    const avgResponseTime = stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length || 0;
    
    console.log('\n📋 PERFORMANCE METRICS:');
    console.log(`   Success Rate:       ${successRate >= 99 ? '✅' : '⚠️'}  ${successRate.toFixed(2)}% (target: 99%)`);
    console.log(`   Avg Response:       ${avgResponseTime <= 100 ? '✅' : avgResponseTime <= 500 ? '⚠️' : '❌'}  ${avgResponseTime.toFixed(2)}ms (target: <100ms)`);
    console.log(`   P95 Response:       ${percentile(stats.responseTimes, 95) <= 500 ? '✅' : percentile(stats.responseTimes, 95) <= 1000 ? '⚠️' : '❌'}  ${percentile(stats.responseTimes, 95)}ms (target: <500ms)`);
    console.log(`   P99 Response:       ${percentile(stats.responseTimes, 99) <= 1000 ? '✅' : percentile(stats.responseTimes, 99) <= 2000 ? '⚠️' : '❌'}  ${percentile(stats.responseTimes, 99)}ms (target: <1000ms)`);
    
    return successRate >= 95 && avgResponseTime <= 500;
}

// Run the test
runStressTest()
    .then(success => {
        console.log(success ? '\n✅ Stress test PASSED' : '\n❌ Stress test FAILED');
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('\n❌ Stress test error:', error);
        process.exit(1);
    });
