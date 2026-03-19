const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

// Connect to in-memory MongoDB before tests
beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    
    await mongoose.connect(uri);
});

// Clear database between tests
afterEach(async () => {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

// Close connection after tests
afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
});

// Helper function to create test voter
global.createTestVoter = async (overrides = {}) => {
    const Voter = require('../models/voterModel');
    
    const voterData = {
        fullName: 'Test User',
        email: `test${Date.now()}@example.com`,
        password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', // hashed 'password123'
        isAdmin: false,
        ...overrides
    };
    
    const voter = new Voter(voterData);
    await voter.save();
    return voter;
};

// Helper function to create test admin
global.createTestAdmin = async (overrides = {}) => {
    return global.createTestVoter({
        isAdmin: true,
        email: `admin${Date.now()}@example.com`,
        ...overrides
    });
};

// Helper function to create test election
global.createTestElection = async (overrides = {}) => {
    const Election = require('../models/electionModel');
    
    const electionData = {
        title: 'Test Election',
        description: 'Test Description',
        thumbnail: 'https://example.com/image.jpg',
        ...overrides
    };
    
    const election = new Election(electionData);
    await election.save();
    return election;
};

// Helper function to create test candidate
global.createTestCandidate = async (election, overrides = {}) => {
    const Candidate = require('../models/candidateModel');
    
    const candidateData = {
        fullName: 'Test Candidate',
        motto: 'Vote for me!',
        image: 'https://example.com/candidate.jpg',
        election: election._id,
        ...overrides
    };
    
    const candidate = new Candidate(candidateData);
    await candidate.save();
    return candidate;
};

// Helper function to generate auth token
global.generateAuthToken = (user) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
        { user: { id: user._id, isAdmin: user.isAdmin } },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1d' }
    );
};
