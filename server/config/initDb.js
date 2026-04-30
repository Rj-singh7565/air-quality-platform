const bcrypt = require('bcryptjs');
const User = require('../models/User');

const initDatabase = async () => {
    try {
        console.log('🔧 Initializing database...');

        // Seed default super admin account
        const existingSuperAdmin = await User.findOne({ email: 'superadmin@airwatch.com' });

        if (!existingSuperAdmin) {
            const salt = await bcrypt.genSalt(12);
            const hashedPassword = await bcrypt.hash('superadmin123', salt);

            await User.create({
                name: 'Super Admin',
                email: 'superadmin@airwatch.com',
                password: hashedPassword,
                role: 'super_admin',
                approval_status: 'approved'
            });

            console.log('✅ Default super admin created:');
            console.log('   📧 Email: superadmin@airwatch.com');
            console.log('   🔑 Password: superadmin123');
        }

        // Also keep legacy municipal admin
        const existingAdmin = await User.findOne({ email: 'admin@airwatch.com' });

        if (!existingAdmin) {
            const salt = await bcrypt.genSalt(12);
            const hashedPassword = await bcrypt.hash('admin123456', salt);

            await User.create({
                name: 'Municipal Admin',
                email: 'admin@airwatch.com',
                password: hashedPassword,
                role: 'municipal_admin',
                approval_status: 'approved'
            });

            console.log('✅ Default municipal admin created:');
            console.log('   📧 Email: admin@airwatch.com');
            console.log('   🔑 Password: admin123456');
        } else {
            await User.updateOne(
                { email: 'admin@airwatch.com' },
                { $set: { role: 'municipal_admin', approval_status: 'approved' } }
            );
            console.log('✅ Municipal admin account updated');
        }

        console.log('🎉 Database initialization complete!');
    } catch (error) {
        console.error('❌ Database initialization error:', error.message);
        throw error;
    }
};

// Run if called directly
if (require.main === module) {
    const connectDB = require('./db');
    connectDB().then(() => {
        initDatabase().then(() => process.exit(0));
    });
}

module.exports = initDatabase;
