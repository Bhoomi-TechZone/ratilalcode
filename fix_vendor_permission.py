#!/usr/bin/env python3
"""
Direct script to add vendor:access permission to admin role
Run this script to fix the vendor permission issue
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.database.repositories.role_repository import RoleRepository
from app.database.repositories.permission_repository import PermissionRepository
import logging

logging.basicConfig(level=logging.INFO)

def fix_vendor_permission():
    """Add vendor:access permission to admin role"""
    try:
        # Initialize repositories
        permission_repo = PermissionRepository()
        role_repo = RoleRepository()
        
        # 1. Ensure vendor:access permission exists
        vendor_permission = permission_repo.get_permission_by_code("vendor:access")
        if not vendor_permission:
            print("Creating vendor:access permission...")
            permission_data = {
                "code": "vendor:access",
                "resource": "vendor",
                "actions": ["access"],
                "name": "Access Add Products (Vendor)",
                "description": "Access to Add Products (Vendor)"
            }
            permission_repo.create_permission(permission_data)
            print("✅ Created vendor:access permission")
        else:
            print("✅ vendor:access permission already exists")
        
        # 2. Get admin role
        admin_role = role_repo.get_role_by_name("admin")
        if not admin_role:
            print("❌ Admin role not found!")
            return False
            
        print(f"Found admin role: {admin_role['name']}")
        
        # 3. Get current permissions
        current_permissions = admin_role.get("permissions", [])
        print(f"Current admin permissions: {len(current_permissions)}")
        print("Current permissions:", current_permissions)
        
        # 4. Add vendor:access if not present
        if "vendor:access" not in current_permissions:
            print("Adding vendor:access to admin role...")
            current_permissions.append("vendor:access")
            
            # Update the role
            role_repo.update_role(admin_role["id"], {"permissions": current_permissions})
            print("✅ Successfully added vendor:access to admin role")
            
            # Verify the update
            updated_role = role_repo.get_role_by_name("admin")
            if "vendor:access" in updated_role.get("permissions", []):
                print("✅ Verification successful: vendor:access is now in admin permissions")
                return True
            else:
                print("❌ Verification failed: vendor:access not found in updated permissions")
                return False
        else:
            print("✅ vendor:access already in admin role permissions")
            return True
            
    except Exception as e:
        print(f"❌ Error fixing vendor permission: {e}")
        return False

if __name__ == "__main__":
    print("🔧 Fixing vendor permission for admin role...")
    success = fix_vendor_permission()
    
    if success:
        print("\n✅ SUCCESS! Vendor permission fixed.")
        print("📝 Next steps:")
        print("1. Refresh your frontend application")
        print("2. Logout and login again")
        print("3. Check if Vendors tab appears in sidebar")
    else:
        print("\n❌ FAILED! Could not fix vendor permission.")
        print("Please check the database connection and role configuration.")