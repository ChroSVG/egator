/**
 * Script untuk membuat admin user
 * Usage: node create-admin.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createAdmin() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/egator_test');
        console.log('✅ Connected to MongoDB');

        // Import Voter model
        const Voter = require('./models/voterModel');

        // Check if admin exists
        const existingAdmin = await Voter.findOne({ isAdmin: true });
        if (existingAdmin) {
            console.log('⚠️ Admin already exists:');
            console.log(`   Email: ${existingAdmin.email}`);
            console.log(`   Name: ${existingAdmin.fullName}`);
            await mongoose.disconnect();
            return;
        }

        // Create admin
        const hashedPassword = await bcrypt.hash('Admin@123456', 10);
        const admin = new Voter({
            fullName: 'Admin User',
            email: 'admin@example.com',
            password: hashedPassword,
            isAdmin: true
        });

        await admin.save();
        console.log('✅ Admin created successfully!');
        console.log('\n📋 Login credentials:');
        console.log(`   Email: admin@example.com`);
        console.log(`   Password: Admin@123456`);

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

createAdmin();
