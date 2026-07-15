import os
import sys
import dns.resolver
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# Force Google Public DNS for SRV resolution
try:
    dns.resolver.default_resolver = dns.resolver.Resolver(configure=False)
    dns.resolver.default_resolver.nameservers = ['8.8.8.8', '8.8.4.4']
except Exception as e:
    print(f"Warning: Failed to set custom DNS servers: {e}")

FALLBACK_URI = (
    "mongodb://rjsingh:apple12@"
    "ac-vvzij7q-shard-00-00.ydd6agi.mongodb.net:27017,"
    "ac-vvzij7q-shard-00-01.ydd6agi.mongodb.net:27017,"
    "ac-vvzij7q-shard-00-02.ydd6agi.mongodb.net:27017/"
    "airquality_db?ssl=true&replicaSet=atlas-5zgz43-shard-0&authSource=admin&retryWrites=true&w=majority"
)

db_client = None
db = None

async def connect_db():
    global db_client, db
    primary_uri = os.getenv("MONGODB_URI")
    
    # Attempt 1: Connect using SRV from env
    try:
        print("[DB] Connecting to MongoDB (SRV)...")
        db_client = AsyncIOMotorClient(primary_uri, serverSelectionTimeoutMS=10000)
        # Force connection verification
        await db_client.admin.command('ping')
        db = db_client.get_default_database()
        print("[DB] MongoDB Connected (SRV)")
        return db
    except Exception as srv_err:
        print(f"[DB] SRV connection failed: {srv_err}")
        print("[DB] Attempting fallback with standard connection string...")
        
    # Attempt 2: Fallback
    try:
        db_client = AsyncIOMotorClient(FALLBACK_URI, serverSelectionTimeoutMS=15000)
        await db_client.admin.command('ping')
        db = db_client.get_default_database()
        print("[DB] MongoDB Connected (fallback)")
        return db
    except Exception as fallback_err:
        print("[DB] MongoDB connection error (both SRV and fallback failed)")
        print(f"   Fallback error: {fallback_err}")
        sys.exit(1)

def get_db():
    global db
    if db is None:
        raise Exception("Database not connected. Call connect_db() first.")
    return db
