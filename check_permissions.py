import sys
import os
sys.path.insert(0, 'e:/Ratilal_CRM')

from app.database.repositories.permission_repository import PermissionRepository

def check_permissions():
    permission_repo = PermissionRepository()
    permissions = permission_repo.get_all_permissions()
    
    print(f"Found {len(permissions)} permissions:")
    for perm in permissions:
        print(f"  - Code: '{perm.get('code')}', Name: '{perm.get('name')}', Description: '{perm.get('description')}'")

if __name__ == "__main__":
    check_permissions()