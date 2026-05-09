const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import Models
const Election = require('../models/electionModel');
const Candidate = require('../models/candidateModel');
const Voter = require('../models/voterModel');

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('✅ Connected to MongoDB for seeding...');

        // 1. Clear existing data (Optional - remove if you want to append)
        console.log('🧹 Cleaning existing data...');
        await Election.deleteMany({});
        await Candidate.deleteMany({});
        await Voter.deleteMany({ isAdmin: false }); // Keep manual admins if any
        await Voter.deleteMany({ email: 'admin@egator.com' }); // Remove our specific dummy admin to avoid conflict

        // 2. Load JSON data
        const electionsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../dummy_data/elections.json'), 'utf-8'));
        const candidatesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../dummy_data/candidates.json'), 'utf-8'));
        const votersData = JSON.parse(fs.readFileSync(path.join(__dirname, '../dummy_data/voters.json'), 'utf-8'));

        // 3. Insert Elections
        console.log('🗳️  Seeding Elections...');
        const createdElections = await Election.insertMany(electionsData);
        const mainElectionId = createdElections[0]._id;

        // 4. Insert Candidates and link to first Election
        console.log('👤 Seeding Candidates...');
        const candidatesWithLinks = candidatesData.map(cand => ({
            ...cand,
            elections: [mainElectionId]
        }));
        const createdCandidates = await Candidate.insertMany(candidatesWithLinks);

        // 5. Link candidates back to Election
        const candidateIds = createdCandidates.map(c => c._id);
        await Election.findByIdAndUpdate(mainElectionId, {
            $set: { candidates: candidateIds }
        });

        // 6. Insert Voters with hashed passwords
        console.log('👥 Seeding Voters (hashing passwords)...');
        const hashedVoters = await Promise.all(votersData.map(async (voter) => {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(voter.password, salt);
            return { ...voter, password: hashedPassword };
        }));
        await Voter.insertMany(hashedVoters);

        console.log(`
🚀 SEEDING COMPLETED SUCCESSFULLY!
----------------------------------
✅ ${createdElections.length} Elections created
✅ ${createdCandidates.length} Candidates created (linked to first election)
✅ ${hashedVoters.length} Voters created
        `);

        process.exit();
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seedData();
