const db = require('./server/config/db');
const bcrypt = require('bcryptjs');

console.log('🔍 Debugging Super Admin Login...\n');

// Check if super admin exists
const superAdmin = db.prepare("SELECT id, name, email, role, password FROM users WHERE email = 'superadmin@airwatch.com'").get();

if (!superAdmin) {
    console.log('❌ Super admin user not found in database!');
    console.log('   Email: superadmin@airwatch.com\n');
    process.exit(1);
}

console.log('✅ Super admin user found!');
console.log(`   ID: ${superAdmin.id}`);
console.log(`   Name: ${superAdmin.name}`);
console.log(`   Email: ${superAdmin.email}`);
console.log(`   Role: ${superAdmin.role}`);
console.log(`   Password Hash: ${superAdmin.password.substring(0, 20)}...\n`);

// Test password verification
const testPassword = 'superadmin123';
console.log(`Testing password: "${testPassword}"`);

bcrypt.compare(testPassword, superAdmin.password, (err, isMatch) => {
    if (err) {
        console.log('❌ Error during bcrypt compare:', err);
        process.exit(1);
    }
    
    if (isMatch) {
        console.log('✅ Password matches! Login should work.\n');
    } else {
        console.log('❌ Password does NOT match!\n');
        console.log('   This is why login is failing.');
        console.log('   The password in the database does not match "superadmin123".\n');
        
        // Try to hash a fresh password to show the issue
        const salt = bcrypt.genSaltSync(12);
        const freshHash = bcrypt.hashSync(testPassword, salt);
        console.log('   Stored hash: ' + superAdmin.password);
        console.log('   Fresh hash:  ' + freshHash);
    }
    
    process.exit(0);
});
