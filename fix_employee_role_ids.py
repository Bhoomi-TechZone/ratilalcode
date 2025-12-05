"""
Script to fix existing employee users that don't have proper role_ids set.
This will ensure all employee users have the correct role_ids for permission checking.
"""

import sys
import os

# Add the app directory to the path so we can import modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.database import get_database
from app.database.repositories.role_repository import RoleRepository

def fix_employee_role_ids():
    """Fix existing employee users to have proper role_ids"""
    try:
        db = get_database()
        role_repo = RoleRepository()
        
        print("Starting role_ids fix for existing employees...")
        
        # Get the employee role ID
        employee_role = role_repo.get_role_by_name("employee")
        if not employee_role:
            print("ERROR: Employee role not found in database!")
            return
        
        employee_role_id = employee_role["id"]
        print(f"Employee role ID: {employee_role_id}")
        
        # Find all users with role "employee" but missing or incorrect role_ids
        users_to_fix = list(db.users.find({
            "role": "employee",
            "$or": [
                {"role_ids": {"$exists": False}},  # Missing role_ids
                {"role_ids": []},  # Empty role_ids
                {"role_ids": {"$ne": [employee_role_id]}}  # Incorrect role_ids
            ]
        }))
        
        print(f"Found {len(users_to_fix)} employee users to fix...")
        
        fixed_count = 0
        for user in users_to_fix:
            user_id = user.get("user_id", "Unknown")
            username = user.get("username", "Unknown")
            current_role_ids = user.get("role_ids", [])
            
            print(f"Fixing user: {username} ({user_id}) - Current role_ids: {current_role_ids}")
            
            # Update the user with correct role_ids
            result = db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {
                    "role_ids": [employee_role_id],
                    "updated_at": "2024-12-03T00:00:00Z"  # Timestamp for tracking
                }}
            )
            
            if result.modified_count > 0:
                fixed_count += 1
                print(f"✓ Fixed user: {username}")
            else:
                print(f"✗ Failed to fix user: {username}")
        
        print(f"\nSummary:")
        print(f"- Total employee users found to fix: {len(users_to_fix)}")
        print(f"- Successfully fixed: {fixed_count}")
        print(f"- Failed: {len(users_to_fix) - fixed_count}")
        
        # Verify the fixes
        print("\nVerifying fixes...")
        remaining_broken = list(db.users.find({
            "role": "employee",
            "$or": [
                {"role_ids": {"$exists": False}},
                {"role_ids": []},
                {"role_ids": {"$ne": [employee_role_id]}}
            ]
        }))
        
        if remaining_broken:
            print(f"⚠️  Still {len(remaining_broken)} employee users with incorrect role_ids")
            for user in remaining_broken:
                print(f"  - {user.get('username', 'Unknown')} ({user.get('user_id', 'Unknown')})")
        else:
            print("✅ All employee users now have correct role_ids!")
            
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    fix_employee_role_ids()