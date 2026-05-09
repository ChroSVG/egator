const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Voter = require('../../features/auth/auth.model');
require('dotenv').config();

/**
 * Admin Seeding Script
 * 
 * Creates an initial admin user if one doesn't exist.
 */

const seedAdmin = async () => {
    let session;
    
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('✅ Connected to MongoDB');

        const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

        if (adminPassword.length < 8) {
            console.error('❌ Admin password must be at least 8 characters');
            process.exit(1);
        }

        const existingAdmin = await Voter.findOne({ email: adminEmail.toLowerCase() });
        
        if (existingAdmin) {
            if (existingAdmin.isAdmin) {
                console.log('ℹ️  Admin user already exists. Skipping seed.');
                await mongoose.connection.close();
                return;
            } else {
                session = await mongoose.startSession();
                session.startTransaction();
                
                existingAdmin.isAdmin = true;
                await existingAdmin.save({ session });
                
                await session.commitTransaction();
                console.log('✅ Existing user updated to admin role');
            }
        } else {
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
        }

        await mongoose.connection.close();
        console.log('\n✅ Seed completed successfully!');
        
    } catch (error) {
        if (session) await session.abortTransaction();
        console.error('❌ Seed failed:', error.message);
        await mongoose.connection.close();
        process.exit(1);
    }
};

seedAdmin();
