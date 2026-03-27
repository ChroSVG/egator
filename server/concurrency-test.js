/**
 * Concurrency Test - Vote Race Condition
 * 
 * Test apakah ada race condition saat multiple voters vote concurrently
 * untuk candidate yang sama.
 * 
 * Usage: node concurrency-test.js
 */

const http = require('http');

const CONFIG = {
    baseUrl: 'http://localhost:5000/api',
    concurrentVoters: 10,      // 10 voters vote bersamaan
    targetCandidate: null,     // Will be set after setup
    targetElection: null       // Will be set after setup
};

const stats = {
    successfulVotes: 0,
    failedVotes: 0,
    doubleVoteDetected: false,
    voteCountMismatch: false,
    errors: []
};

/**
 * Make HTTP request
 */
function makeRequest(method, path, data, token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path,
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Idempotency-Key': `${Date.now()}-${Math.random()}`
            },
            timeout: 10000
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    body: body ? JSON.parse(body) : null
                });
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout'));
        });

        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

/**
 * Setup test data
 */
async function setupTestData() {
    console.log('📦 Setting up test data...');
    
    // 1. Create admin and login
    const adminRes = await makeRequest('POST', '/api/voters/login', {
        email: 'admin@example.com',
        password: 'Admin@123456'
    });
    
    if (adminRes.statusCode !== 200) {
        throw new Error('Failed to login as admin. Run: node create-admin.js first');
    }
    
    const adminToken = adminRes.body.token;
    console.log('✅ Admin logged in');
    
    // 2. Create election
    const electionRes = await makeRequest('POST', '/api/elections', {
        title: `Concurrency Test ${Date.now()}`,
        description: 'Test for race conditions'
    }, adminToken);
    
    if (electionRes.statusCode !== 201) {
        throw new Error('Failed to create election');
    }
    
    CONFIG.targetElection = electionRes.body.data._id;
    console.log('✅ Election created:', CONFIG.targetElection);
    
    // 3. Create candidate
    const candidateData = {
        fullName: 'Test Candidate',
        motto: 'Vote me!',
        election: CONFIG.targetElection
    };
    
    // Need to upload image - using multipart would be complex, so let's use a simpler approach
    // For this test, we'll use an existing candidate or skip image upload
    console.log('⚠️ Note: Creating candidate requires image upload');
    console.log('   Please create a candidate manually for election:', CONFIG.targetElection);
    console.log('   Or use the admin panel to add a candidate');
    
    // Get candidates for this election
    const candidatesRes = await makeRequest('GET', `/api/elections/${CONFIG.targetElection}/candidates`, null, adminToken);
    
    if (candidatesRes.body.data && candidatesRes.body.data.length > 0) {
        CONFIG.targetCandidate = candidatesRes.body.data[0]._id;
        console.log('✅ Using existing candidate:', CONFIG.targetCandidate);
    } else {
        console.log('❌ No candidates found. Please create one first.');
        process.exit(1);
    }
    
    return adminToken;
}

/**
 * Create test voters and vote concurrently
 */
async function runConcurrencyTest() {
    console.log('\n🏃 Running concurrency test...\n');
    
    const voters = [];
    const tokens = [];
    
    // 1. Create voters
    for (let i = 0; i < CONFIG.concurrentVoters; i++) {
        const email = `test_voter_${Date.now()}_${i}@example.com`;
        
        const registerRes = await makeRequest('POST', '/api/voters/register', {
            fullName: `Test Voter ${i}`,
            email,
            password: 'Password@123',
            password2: 'Password@123'
        });
        
        if (registerRes.statusCode === 201) {
            voters.push({ email, token: registerRes.body.token });
        }
    }
    
    console.log(`✅ Created ${voters.length} voters`);
    
    // 2. Get initial candidate vote count
    const candidateRes = await makeRequest('GET', `/api/candidates/${CONFIG.targetCandidate}`, null, voters[0].token);
    const initialVoteCount = candidateRes.body.data.voteCount;
    console.log(`📊 Initial vote count: ${initialVoteCount}`);
    
    // 3. Vote concurrently - ALL AT ONCE!
    console.log(`\n🔥 Voting with ${voters.length} concurrent voters...\n`);
    
    const votePromises = voters.map(async (voter, index) => {
        try {
            const result = await makeRequest(
                'PATCH',
                `/api/candidates/${CONFIG.targetCandidate}/vote`,
                { selectedElectionId: CONFIG.targetElection },
                voter.token
            );
            
            if (result.statusCode === 200) {
                stats.successfulVotes++;
                console.log(`✅ Voter ${index + 1}: Vote successful`);
            } else if (result.statusCode === 409) {
                stats.failedVotes++;
                console.log(`⚠️  Voter ${index + 1}: Already voted (expected)`);
            } else {
                stats.failedVotes++;
                console.log(`❌ Voter ${index + 1}: ${result.statusCode} - ${result.body?.message || 'Unknown error'}`);
                stats.errors.push(`Voter ${index + 1}: ${result.statusCode}`);
            }
        } catch (error) {
            stats.failedVotes++;
            console.log(`❌ Voter ${index + 1}: Error - ${error.message}`);
            stats.errors.push(`Voter ${index + 1}: ${error.message}`);
        }
    });
    
    // Wait for all votes to complete
    await Promise.all(votePromises);
    
    // 4. Verify final vote count
    const finalCandidateRes = await makeRequest('GET', `/api/candidates/${CONFIG.targetCandidate}`, null, voters[0].token);
    const finalVoteCount = finalCandidateRes.body.data.voteCount;
    
    console.log(`\n📊 Final vote count: ${finalVoteCount}`);
    console.log(`📊 Expected increase: ${stats.successfulVotes}`);
    console.log(`📊 Actual increase: ${finalVoteCount - initialVoteCount}`);
    
    // 5. Check for race conditions
    if (finalVoteCount - initialVoteCount !== stats.successfulVotes) {
        stats.voteCountMismatch = true;
        console.log('\n❌ RACE CONDITION DETECTED!');
        console.log(`   Vote count mismatch: expected +${stats.successfulVotes}, got +${finalVoteCount - initialVoteCount}`);
    } else {
        console.log('\n✅ No race condition detected in vote counting');
    }
    
    return { initialVoteCount, finalVoteCount };
}

/**
 * Print results
 */
function printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CONCURRENCY TEST RESULTS');
    console.log('='.repeat(60));
    
    console.log(`\n📈 VOTE STATISTICS:`);
    console.log(`   Concurrent Voters:    ${CONFIG.concurrentVoters}`);
    console.log(`   Successful Votes:     ${stats.successfulVotes}`);
    console.log(`   Failed Votes:         ${stats.failedVotes}`);
    
    if (stats.voteCountMismatch) {
        console.log(`\n❌ CRITICAL: Vote count mismatch detected!`);
    } else {
        console.log(`\n✅ Vote count is consistent`);
    }
    
    if (stats.errors.length > 0) {
        console.log(`\n⚠️  ERRORS:`);
        stats.errors.forEach(err => console.log(`   - ${err}`));
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Test passes if no race conditions
    return !stats.voteCountMismatch && stats.successfulVotes > 0;
}

/**
 * Main
 */
async function main() {
    console.log('🧪 CONCURRENCY TEST - Race Condition Detection');
    console.log('='.repeat(60));
    
    try {
        await setupTestData();
        await runConcurrencyTest();
        const passed = printResults();
        
        console.log(passed ? '\n✅ CONCURRENCY TEST PASSED' : '\n❌ CONCURRENCY TEST FAILED');
        process.exit(passed ? 0 : 1);
        
    } catch (error) {
        console.error('\n❌ Test error:', error.message);
        process.exit(1);
    }
}

main();
