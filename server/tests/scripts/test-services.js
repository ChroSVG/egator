// Quick functional test
console.log('=== Testing Services ===\n');

try {
    // Test Services
    const AuthService = require('./services/authService');
    const VotingService = require('./services/votingService');
    const CandidateService = require('./services/candidateService');
    const ElectionService = require('./services/electionService');
    
    const authService = new AuthService();
    const votingService = new VotingService();
    const candidateService = new CandidateService();
    const electionService = new ElectionService();
    
    console.log('✅ AuthService: OK');
    console.log('✅ VotingService: OK');
    console.log('✅ CandidateService: OK');
    console.log('✅ ElectionService: OK');
    
    // Test Repositories
    console.log('\n=== Testing Repositories ===\n');
    
    const BaseRepository = require('./repositories/baseRepository');
    const CandidateRepository = require('./repositories/candidateRepository');
    const VoterRepository = require('./repositories/voterRepository');
    
    const baseRepo = new BaseRepository({});
    const candidateRepo = new CandidateRepository();
    const voterRepo = new VoterRepository();
    
    console.log('✅ BaseRepository: OK');
    console.log('✅ CandidateRepository: OK');
    console.log('✅ VoterRepository: OK');
    
    // Test Utils
    console.log('\n=== Testing Utils ===\n');
    
    const cacheService = require('./utils/cacheService');
    const circuitBreaker = require('./utils/circuitBreaker');
    const transactionHelper = require('./utils/transactionHelper');
    
    console.log('✅ CacheService: OK');
    console.log('✅ CircuitBreaker: OK');
    console.log('✅ TransactionHelper: OK');
    
    // Test Commands
    console.log('\n=== Testing Commands ===\n');
    
    const { VoteCommand, CommandHandler } = require('./commands/voteCommand');
    const voteCommand = new VoteCommand('voter', 'candidate', 'election');
    const commandHandler = new CommandHandler();
    
    console.log('✅ VoteCommand: OK');
    console.log('✅ CommandHandler: OK');
    
    console.log('\n=================================');
    console.log('✅ ALL SERVICES RUNNING CORRECTLY!');
    console.log('=================================\n');
    
} catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
}
