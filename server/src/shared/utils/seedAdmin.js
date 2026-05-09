const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Voter = require('../models/voterModel');
require('dotenv').config();

/**
 * Admin Seeding Script
 * 
 * Creates an initial admin user if one doesn't exist.
 * Uses environment variables for admin credentials.
 * 
 * Usage: node utils/seedAdmin.js
 */

const seedAdmin = async () => {
    let session;
    
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URL);
        console.log('✅ Connected to MongoDB');

        // Get admin credentials from environment
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

        // Validate password strength
        if (adminPassword.length < 8) {
            console.error('❌ Admin password must be at least 8 characters');
            process.exit(1);
        }

        // Check if admin already exists
        const existingAdmin = await Voter.findOne({ email: adminEmail.toLowerCase() });
        
        if (existingAdmin) {
            if (existingAdmin.isAdmin) {
                console.log('ℹ️  Admin user already exists. Skipping seed.');
                console.log(`   Email: ${existingAdmin.email}`);
                await mongoose.connection.close();
                return;
            } else {
                // Update existing user to admin
                session = await mongoose.startSession();
                session.startTransaction();
                
                existingAdmin.isAdmin = true;
                await existingAdmin.save({ session });
                
                await session.commitTransaction();
                console.log('✅ Existing user updated to admin role');
                console.log(`   Email: ${existingAdmin.email}`);
            }
        } else {
            // Create new admin user
            session = await mongoose.startSession();
            session.startTransaction();

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(adminPassword, salt);

            const admin = new Voter({
                fullName: 'System Administrator',
                email: adminEmail.toLowerCase(),
                password: hashedPassword,
                isAdmin: true,
                votedElections: []
            });

            await admin.save({ session });

            await session.commitTransaction();
            console.log('✅ Admin user created successfully!');
            console.log(`   Email: ${admin.email}`);
        }

        // Display all admins
        const allAdmins = await Voter.find({ isAdmin: true }).select('email fullName createdAt');
        console.log('\n📋 Current Admin Users:');
        allAdmins.forEach((admin, index) => {
            console.log(`   ${index + 1}. ${admin.email} (${admin.fullName})`);
        });

        await mongoose.connection.close();
        console.log('\n✅ Seed completed successfully!');
        
    } catch (error) {
        if (session) await session.abortTransaction();
        console.error('❌ Seed failed:', error.message);
        await mongoose.connection.close();
        process.exit(1);
    }
};

// Run the seed
seedAdmin();
