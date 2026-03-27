/**
 * Migration Script: Fix Candidate Election References
 * 
 * This script migrates existing candidate data from 'election' (singular) 
 * to 'elections' (array) field.
 * 
 * Usage: node migrations/fix-candidate-election-field.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function migrateCandidateElectionField() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/egator');
        console.log('✅ Connected to MongoDB');

        const Candidate = require('../models/candidateModel');
        const Election = require('../models/electionModel');

        // Get all candidates
        const candidates = await Candidate.find({});
        console.log(`📊 Found ${candidates.length} candidates`);

        let updated = 0;
        let skipped = 0;
        let errors = 0;

        for (const candidate of candidates) {
            try {
                // Check if candidate already has elections array
                if (candidate.elections && candidate.elections.length > 0) {
                    console.log(`⏭️  Candidate ${candidate._id} already has elections array`);
                    skipped++;
                    continue;
                }

                // If candidate has old 'election' field (shouldn't exist in new schema but check anyway)
                // In the new schema, we only have 'elections' array
                
                // For candidates without elections array, we need to check if they should be linked
                // to any election via the Election.candidates array
                
                const election = await Election.findOne({ candidates: candidate._id });
                
                if (election) {
                    // Add this election to the candidate's elections array
                    candidate.elections.push(election._id);
                    await candidate.save();
                    console.log(`✅ Updated candidate ${candidate._id} - added election ${election._id}`);
                    updated++;
                } else {
                    console.log(`⚠️  Candidate ${candidate._id} (${candidate.fullName}) not linked to any election`);
                    skipped++;
                }

            } catch (error) {
                console.error(`❌ Error updating candidate ${candidate._id}: ${error.message}`);
                errors++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 MIGRATION SUMMARY');
        console.log('='.repeat(60));
        console.log(`   Total Candidates:  ${candidates.length}`);
        console.log(`   Updated:           ${updated}`);
        console.log(`   Skipped:           ${skipped}`);
        console.log(`   Errors:            ${errors}`);
        console.log('='.repeat(60));

        // Fix Election.candidates references if needed
        console.log('\n🔍 Checking Election.candidates references...');
        
        const elections = await Election.find({});
        let electionUpdated = 0;

        for (const election of elections) {
            // Ensure all candidates in this election have this election in their elections array
            for (const candidateId of election.candidates) {
                const candidate = await Candidate.findById(candidateId);
                if (candidate) {
                    if (!candidate.elections.includes(election._id)) {
                        candidate.elections.push(election._id);
                        await candidate.save();
                        console.log(`✅ Added election ${election._id} to candidate ${candidateId}`);
                        electionUpdated++;
                    }
                }
            }
        }

        console.log(`\n✅ Election reference fixes: ${electionUpdated}`);

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
        console.log('\n✅ Migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run migration
migrateCandidateElectionField();
