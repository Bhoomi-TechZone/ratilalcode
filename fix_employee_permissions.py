import sys
import os
sys.path.insert(0, 'e:/Ratilal_CRM')

from app.database.repositories.role_repository import RoleRepository

def fix_employee_role_permissions():
    role_repo = RoleRepository()
    
    # Get the current employee role
    employee_role = role_repo.get_role_by_id("Ro-024")
    if not employee_role:
        print("Employee role not found!")
        return
    
    print(f"Current employee role permissions: {employee_role.get('permissions', [])}")
    
    # Set the correct permissions that match the permissions collection
    correct_permissions = [
        "dashboard:read",
        "attendance:access", 
        "leave:access",
        "tasks:access",
        "documents:access",
        "support:access",
        "profile:access"
    ]
    
    # Update the role
    updated_role = role_repo.update_role("Ro-024", {
        "permissions": correct_permissions,
        "updated_at": employee_role.get("updated_at")
    })
    
    if updated_role:
        print(f"✅ Employee role updated successfully!")
        print(f"New permissions: {correct_permissions}")
    else:
        print("❌ Failed to update employee role")

if __name__ == "__main__":
    fix_employee_role_permissions()