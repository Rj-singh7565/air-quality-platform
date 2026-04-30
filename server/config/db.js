const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();

// ─── ROOT FIX: MongoDB Atlas DNS Resolution ───────────────────────────────
// Problem: Some ISP / local routers (e.g. 192.168.x.x) cannot resolve the
//   SRV records that mongodb+srv:// relies on, causing ECONNREFUSED.
// Fix 1 (app-level): Override Node.js DNS to use Google Public DNS.
// Fix 2 (fallback):  If SRV still fails, connect via standard mongodb://
//   using the resolved replica-set members directly.
// ──────────────────────────────────────────────────────────────────────────

// Force Google Public DNS for SRV resolution
dns.setServers(['8.8.8.8', '8.8.4.4']);

// Standard (non-SRV) connection string as fallback
// These are the actual Atlas replica-set members for this cluster
const FALLBACK_URI =
    'mongodb://rjsingh:apple12@' +
    'ac-vvzij7q-shard-00-00.ydd6agi.mongodb.net:27017,' +
    'ac-vvzij7q-shard-00-01.ydd6agi.mongodb.net:27017,' +
    'ac-vvzij7q-shard-00-02.ydd6agi.mongodb.net:27017/' +
    'airquality_db?ssl=true&replicaSet=atlas-5zgz43-shard-0&authSource=admin&retryWrites=true&w=majority';

const connectDB = async () => {
    const primaryURI = process.env.MONGODB_URI;

    // Attempt 1: Connect using the SRV URI from .env (with Google DNS)
    try {
        const conn = await mongoose.connect(primaryURI, {
            serverSelectionTimeoutMS: 10000, // fail fast if unreachable
        });
        console.log(`✅ MongoDB Connected (SRV): ${conn.connection.host}`);
        return conn;
    } catch (srvError) {
        console.warn(`⚠️  SRV connection failed: ${srvError.message}`);
        console.log('🔄 Attempting fallback with standard connection string...');
    }

    // Attempt 2: Fallback to standard mongodb:// with explicit hosts
    try {
        const conn = await mongoose.connect(FALLBACK_URI, {
            serverSelectionTimeoutMS: 15000,
        });
        console.log(`✅ MongoDB Connected (fallback): ${conn.connection.host}`);
        return conn;
    } catch (fallbackError) {
        console.error('❌ MongoDB connection error (both SRV and fallback failed)');
        console.error('   SRV URI tried:', primaryURI?.replace(/\/\/.*@/, '//<credentials>@'));
        console.error('   Fallback error:', fallbackError.message);
        console.error('\n💡 Troubleshooting tips:');
        console.error('   1. Check your internet connection');
        console.error('   2. Verify MongoDB Atlas credentials in .env');
        console.error('   3. Ensure your IP is whitelisted in Atlas Network Access');
        console.error('   4. Try changing your system DNS to 8.8.8.8 (Google DNS)\n');
        process.exit(1);
    }
};

module.exports = connectDB;
