from app.database.repositories.role_repository import RoleRepository
from app.database.repositories.user_repository import UserRepository
from app.database.repositories.permission_repository import PermissionRepository
from app.services.auth_service import AuthService

from datetime import datetime
import pymongo
from bson import ObjectId
from app.database import db


def init_roles():
    """Initialize default roles"""
    repo = RoleRepository()
    permissions_collection = db["permissions"]
    
    # Default roles with descriptions
    default_permissions = [
        {
            "code": "users:create",
            "name": "Create Users",
            "description": "Create new users in the system",
            "resource": "users"
        },
        {
            "code": "users:read",
            "name": "Read Users",
            "description": "View user information",
            "resource": "users"
        },
        {
            "code": "users:update",
            "name": "Update Users",
            "description": "Update user information",
            "resource": "users"
        },
        {
            "code": "users:delete",
            "name": "Delete Users",
            "description": "Delete users from the system",
            "resource": "users"
        },
        {
            "code": "roles:create",
            "name": "Create Roles",
            "description": "Create new roles in the system",
            "resource": "roles"
        },
        {
            "code": "roles:read",
            "name": "Read Roles",
            "description": "View role information",
            "resource": "roles"
        },
        {
            "code": "roles:update",
            "name": "Update Roles",
            "description": "Update role information",
            "resource": "roles"
        },
        {
            "code": "roles:delete",
            "name": "Delete Roles",
            "description": "Delete roles from the system",
            "resource": "roles"
        },
        {
            "code": "alerts:read",
            "name": "Read Alerts",
            "description": "View alert notifications",
            "resource": "alerts"
        }
    ]
    roles = [
        {
            "name": "admin",
            "description": "System administrator with full access to all features",
            "permissions": []  
        },
        {
            "name": "director",
            "description": "Director role with appropriate permissions",
            "permissions": []  
        },
        {
            "name": "sales",
            "description": "Sales team member with access to leads and sales data",
            "permissions": []
        },
        {
            "name": "franchise",
            "description": "Franchise team member with access to franchise management",
            "permissions": []
        },
        {
            "name": "support",
            "description": "Support team member with access to tickets and customer issues",
            "permissions": []
        },
        {
            "name": "hr",
            "description": "HR team member with access to staff and HR functions",
            "permissions": []
        },
        {
            "name": "user",
            "description": "Basic user with limited access",
            "permissions": []
        }
    ]
    
    # Create roles if they don't exist
    for role_data in roles:
        existing_role = repo.get_role_by_name(role_data["name"])
        if not existing_role:
            repo.create_role(role_data)
            print(f"Created role: {role_data['name']}")
        else:
            print(f"Role already exists: {role_data['name']}")
            
    for permission in default_permissions:
        existing_permission = permissions_collection.find_one({"code": permission["code"]})
        if not existing_permission:
            # Add id and timestamps
            permission["id"] = str(ObjectId())
            permission["created_at"] = datetime.now()
            permissions_collection.insert_one(permission)
            
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Default permissions initialized")


def init_permissions():
    permission_repo = PermissionRepository()
    role_repo = RoleRepository()
    
    permissions = [
        {
            "code": "dashboard:read",
            "resource": "dashboard",
            "actions": ["read"],
            "name": "Read Dashboard",
            "description": "Read access to dashboard"
        },
        {
            "code": "users:manage",
            "resource": "users",
            "actions": ["create", "read", "update", "delete"],
            "name": "Manage Users",
            "description": "Full CRUD operations for users"
        },
        {
            "code": "leads:manage",
            "resource": "leads",
            "actions": ["create", "read", "update", "delete", "assign"],
            "name": "Manage Leads",
            "description": "Full CRUD and assignment for leads"
        },
        {
            "code": "franchise:manage",
            "resource": "franchise",
            "actions": ["create", "read", "update", "delete", "approve"],
            "name": "Manage Franchise",
            "description": "CRUD and approve franchises"
        },
        {
            "code": "customers:manage",
            "resource": "customers",
            "actions": ["create", "read", "update", "delete"],
            "name": "Manage Customers",
            "description": "CRUD operations for customers"
        },
        {
            "code": "tickets:manage",
            "resource": "tickets",
            "actions": ["create", "read", "update", "delete", "assign", "resolve"],
            "name": "Manage Tickets",
            "description": "CRUD, assign, and resolve support tickets"
        },
        {
            "code": "hierarchy:manage",
            "resource": "hierarchy",
            "actions": ["create", "read", "update", "delete", "manage"],
            "name": "Manage User Hierarchy",
            "description": "CRUD and manage user hierarchy"
        },
        {
            "code": "generator_management:manage",
            "resource": "generator_management",
            "actions": ["read", "create", "update", "delete"],
            "name": "Manage Generator",
            "description": "CRUD for generator management"
        },
        {
            "code": "alerts:read",
            "resource": "alerts",
            "actions": ["read"],
            "name": "Read Alerts",
            "description": "View system alerts"
        },
        {
            "code": "site_management:manage",
            "resource": "site_management",
            "actions": ["read", "create", "update", "delete"],
            "name": "Manage Sites",
            "description": "CRUD for site management"
        },
        {
            "code": "company_management:manage",
            "resource": "company_management",
            "actions": ["read", "create", "update", "delete"],
            "name": "Manage Companies",
            "description": "CRUD for company management"
        },
        {
            "code": "global_reports:view",
            "resource": "global_reports",
            "actions": ["read"],
            "name": "View Global Reports",
            "description": "View reporting across all companies"
        }
    ]
    
    created_permission_ids = {}
    for perm_data in permissions:
        existing_permission = permission_repo.get_permission_by_code(perm_data["code"])
        if not existing_permission:
            permission = permission_repo.create_permission(perm_data)
            if permission:
                created_permission_ids[perm_data["resource"]] = permission["id"]
                print(f"Created permission for: {perm_data['resource']}")
        else:
            created_permission_ids[perm_data["resource"]] = existing_permission["id"]
            print(f"Permission already exists for: {perm_data['resource']}")
    
    role_permissions = {
        "sales": ["dashboard", "leads", "customers"],
        "franchise": ["dashboard", "franchise"],
        "support": ["dashboard", "tickets", "customers"],
        "hr": ["dashboard", "users"],
        "user": ["dashboard"],
        "director": [
            "dashboard", "generator_management", "site_management", "alerts",
            "leads", "customers", "franchise", "users", "roles", "inventory",
            "admin", "marketing", "accounts", "tickets", "hr", "documents", "tasks"],
        "super_admin": ["dashboard", "generator_management", "site_management", "alerts",
            "leads", "customers", "franchise", "users", "roles", "inventory",
            "admin", "marketing", "accounts", "tickets", "hr", "documents", "tasks",
            "global_reports", "company_management"]
    }
    
    for role_name, resources in role_permissions.items():
        role = role_repo.get_role_by_name(role_name)
        if role:
            # Update: Directly use resources list (strings) as the role permissions array
            role_repo.update_role(role["id"], {"permissions": resources})
            print(f"Updated permissions for role: {role_name}")


def create_admin_user():
    """Create admin user if it doesn't exist"""
    user_repo = UserRepository()
    auth_service = AuthService()
    
    admin_username = "admin"
    admin_email = "admin@bharatcrm.com"
    admin_password = "Admin@123"  # In production, use a secure password and store in secrets
    
    existing_admin = user_repo.get_user_by_username(admin_username)
    if not existing_admin:
        try:
            auth_service.register_user(
                username=admin_username,
                email=admin_email,
                password=admin_password,
                full_name="System Administrator",
                role_names=["admin"]
            )
            print(f"Created admin user: {admin_username}")
        except Exception as e:
            print(f"Error creating admin: {e}")
    else:
        print("Admin user already exists")


def init_user_hierarchy_collection():
    """Initialize user hierarchy collection with indexes"""
    print("Setting up user hierarchy collection...")
    user_hierarchy_collection = db["user_hierarchy"]
    
    user_hierarchy_collection.create_index("user_id", unique=True)
    user_hierarchy_collection.create_index("reporting_user_id")
    user_hierarchy_collection.create_index("level")
    
    print("User hierarchy collection setup complete!")


def init_gmail_tokens_collection():
    """Initialize the Gmail tokens collection"""
    print("Setting up Gmail tokens collection...")
    gmail_tokens_collection = db["gmail_tokens"]
    
    gmail_tokens_collection.create_index("user_id", unique=True)
    gmail_tokens_collection.create_index("email")
    
    print("Gmail tokens collection setup complete!")


def initialize_db():
    """Run all initialization scripts"""
    print("Initializing database...")
    init_roles()
    init_permissions()
    create_admin_user()
    init_user_hierarchy_collection()
    init_gmail_tokens_collection()
    print("Database initialization complete!")


if __name__ == "__main__":
    initialize_db()
