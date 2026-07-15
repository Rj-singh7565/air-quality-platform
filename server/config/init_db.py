import asyncio
import bcrypt
import sys
import os

# Adjust path to import from server
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.db import connect_db, get_db

async def init_database():
    try:
        print('[DB] Initializing database...')
        db = get_db()
        users_collection = db["users"]
        
        # Super Admin seeding
        existing_super_admin = await users_collection.find_one({"email": "superadmin@airwatch.com"})
        if not existing_super_admin:
            # hash password using bcrypt
            salt = bcrypt.gensalt(12)
            hashed_password = bcrypt.hashpw(b"superadmin123", salt).decode('utf-8')
            
            await users_collection.insert_one({
                "name": "Super Admin",
                "email": "superadmin@airwatch.com",
                "password": hashed_password,
                "role": "super_admin",
                "approval_status": "approved",
                "contribution_score": 0,
                "reports_count": 0,
                "verified_reports": 0,
                "badges": []
            })
            print('[DB] Default super admin created:')
            print('     Email: superadmin@airwatch.com')
            print('     Password: superadmin123')
            
        # Municipal Admin seeding
        existing_admin = await users_collection.find_one({"email": "admin@airwatch.com"})
        if not existing_admin:
            salt = bcrypt.gensalt(12)
            hashed_password = bcrypt.hashpw(b"admin123456", salt).decode('utf-8')
            
            await users_collection.insert_one({
                "name": "Municipal Admin",
                "email": "admin@airwatch.com",
                "password": hashed_password,
                "role": "municipal_admin",
                "approval_status": "approved",
                "contribution_score": 0,
                "reports_count": 0,
                "verified_reports": 0,
                "badges": []
            })
            print('[DB] Default municipal admin created:')
            print('     Email: admin@airwatch.com')
            print('     Password: admin123456')
        else:
            await users_collection.update_one(
                {"email": "admin@airwatch.com"},
                {"$set": {"role": "municipal_admin", "approval_status": "approved"}}
            )
            print('[DB] Municipal admin account updated')
            
        print('[DB] Database initialization complete!')
    except Exception as e:
        print(f"[DB] Database initialization error: {e}")
        raise e

async def main():
    await connect_db()
    await init_database()

if __name__ == "__main__":
    asyncio.run(main())
