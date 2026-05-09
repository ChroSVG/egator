/**
 * Script to create initial admin user
 * Usage: node tests/scripts/create-admin.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const config = require('../../config');
const Voter = require('../../models/voterModel');

async function createAdmin() {
    try {
        console.log('⏳ Connecting to MongoDB...');
        await mongoose.connect(config.db.url);
        console.log('✅ Connected to MongoDB');

        // Check if admin already exists
        const adminEmail = config.admin.email || 'admin@example.com';
        const existingAdmin = await Voter.findOne({ email: adminEmail });
        
        if (existingAdmin) {
            console.log('⚠️ Admin already exists:');
            console.log(`   Email: ${existingAdmin.email}`);
            console.log(`   Name: ${existingAdmin.fullName}`);
            
            if (!existingAdmin.isAdmin) {
                console.log('   Updating user to admin status...');
                existingAdmin.isAdmin = true;
                await existingAdmin.save();
                console.log('✅ User updated to admin.');
            }
            
            await mongoose.disconnect();
            return;
        }

        // Create admin
        const adminPassword = config.admin.password || 'Admin@123456';
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        
        const admin = new Voter({
            fullName: 'Admin User',
            email: adminEmail.toLowerCase(),
            password: hashedPassword,
            isAdmin: true
        });

        await admin.save();
        console.log('✅ Admin created successfully!');
        console.log('\n📋 Login credentials:');
        console.log(`   Email: ${adminEmail}`);
        console.log(`   Password: ${adminPassword}`);

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        process.exit(1);
    }
}

createAdmin();
