#!/usr/bin/env python3
"""
Script to verify and fix employee permissions for task access.
This will ensure the employee role has the 'tasks:access' permission.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import db
from app.database.repositories.role_repository import RoleRepository
from app.database.repositories.user_repository import UserRepository

def fix_employee_task_permissions():
    print("Checking and fixing employee task permissions...")
    
    role_repo = RoleRepository()
    user_repo = UserRepository()
    
    # Find employee role
    employee_role = role_repo.get_role_by_name("employee")
    if not employee_role:
        print("❌ Employee role not found!")
        return False
        
    print(f"✅ Found employee role: {employee_role['name']} ({employee_role.get('id')})")
    
    # Check current permissions
    current_permissions = employee_role.get("permissions", [])
    print(f"📋 Current permissions: {current_permissions}")
    
    # Check if tasks:access is included
    if "tasks:access" in current_permissions:
        print("✅ Employee role already has 'tasks:access' permission")
    else:
        print("⚠️  Adding 'tasks:access' permission to employee role...")
        
        # Add the permission
        updated_permissions = list(set(current_permissions + ["tasks:access"]))
        
        # Update the role
        role_repo.update_role(employee_role["id"], {
            "permissions": updated_permissions
        })
        
        print(f"✅ Updated employee permissions: {updated_permissions}")
    
    # Check a specific employee user for debugging
    print("\n" + "="*50)
    print("Checking employee users...")
    
    # Find employees
    employee_users = user_repo.get_users_by_role("employee")
    print(f"Found {len(employee_users)} employee users")
    
    for user in employee_users[:3]:  # Check first 3 employees
        print(f"\n👤 User: {user.get('username')} ({user.get('full_name')})")
        print(f"   User ID: {user.get('user_id')}")
        print(f"   Role IDs: {user.get('role_ids', [])}")
        
        # Check if user has employee role
        if employee_role["id"] in user.get("role_ids", []):
            print(f"   ✅ User has employee role assigned")
        else:
            print(f"   ⚠️  User missing employee role - fixing...")
            current_roles = user.get("role_ids", [])
            if employee_role["id"] not in current_roles:
                updated_roles = current_roles + [employee_role["id"]]
                user_repo.update_user(user["user_id"], {
                    "role_ids": updated_roles
                })
                print(f"   ✅ Added employee role to user")
    
    print("\n🎉 Employee task permissions check completed!")
    return True

if __name__ == "__main__":
    try:
        success = fix_employee_task_permissions()
        if success:
            print("\n✅ All fixes applied successfully!")
            print("🔄 Please refresh your browser and try accessing Tasks & Workflow again.")
        else:
            print("\n❌ Some issues were found. Please check the output above.")
    except Exception as e:
        print(f"\n❌ Error occurred: {str(e)}")
        import traceback
        traceback.print_exc()