from app.database.repositories.role_repository import RoleRepository
from app.database.repositories.user_repository import UserRepository
from app.database.repositories.permission_repository import PermissionRepository
from app.services.auth_service import AuthService

from datetime import datetime
from bson import ObjectId
from pymongo import ReturnDocument
from app.database import db

def get_next_role_id(db):
    """Get next incremental role ID like Ro-001."""
    next_seq = db.counters.find_one_and_update(
        {"_id": "role_id"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )["seq"]
    return f"Ro-{str(next_seq).zfill(3)}"

def init_roles():
    """Initialize default roles with custom incremental IDs like Ro-017."""
    repo = RoleRepository()
    permissions_collection = db["permissions"]

    roles = [
        {"name": "admin", "description": "System administrator with full access to all features", "permissions": []},
        {"name": "user", "description": "Basic user with limited access", "permissions": []}
    ]

    # Create roles with incremental Ro-001 ids
    for role_data in roles:
        existing_role = repo.get_role_by_name(role_data["name"])
        if not existing_role:
            new_id = get_next_role_id(db)  # <-- Use sequence generator here!
            role_data["id"] = new_id
            repo.create_role(role_data)
            print(f"Created role: {role_data['name']} with ID {new_id}")
        else:
            print(f"Role already exists: {role_data['name']}")

    # Bootstrapping base permissions for minimal CRUD/user/role
    default_permissions = [
        {"code": "users:create", "name": "Create Users", "description": "Create new users in the system", "resource": "users"},
        {"code": "users:read", "name": "Read Users", "description": "View user information", "resource": "users"},
        {"code": "users:update", "name": "Update Users", "description": "Update user information", "resource": "users"},
        {"code": "users:delete", "name": "Delete Users", "description": "Delete users from the system", "resource": "users"},
        {"code": "roles:create", "name": "Create Roles", "description": "Create new roles in the system", "resource": "roles"},
        {"code": "roles:read", "name": "Read Roles", "description": "View role information", "resource": "roles"},
        {"code": "roles:update", "name": "Update Roles", "description": "Update role information", "resource": "roles"},
        {"code": "roles:delete", "name": "Delete Roles", "description": "Delete roles from the system", "resource": "roles"},
    ]
    for permission in default_permissions:
        existing_permission = permissions_collection.find_one({"code": permission["code"]})
        if not existing_permission:
            permission["id"] = str(ObjectId())
            permission["created_at"] = datetime.now()
            permissions_collection.insert_one(permission)

    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Basic permissions initialized")

def init_permissions():
    permission_repo = PermissionRepository()
    permissions = [
        # Dashboard
        {"code": "dashboard:read", "resource": "dashboard", "actions": ["read"], "name": "Read Dashboard", "description": "Read access to dashboard"},
        # Users
        {"code": "users:manage", "resource": "users", "actions": ["manage", "create", "read", "update", "delete"], "name": "Manage Users", "description": "Full CRUD for users"},
        {"code": "users:create", "resource": "users", "actions": ["create"], "name": "Create Users", "description": "Create users"},
        {"code": "users:read", "resource": "users", "actions": ["read"], "name": "Read Users", "description": "View users"},
        {"code": "users:update", "resource": "users", "actions": ["update"], "name": "Update Users", "description": "Update user"},
        {"code": "users:delete", "resource": "users", "actions": ["delete"], "name": "Delete Users", "description": "Delete users"},
        # Roles
        {"code": "roles:manage", "resource": "roles", "actions": ["manage", "create", "read", "update", "delete"], "name": "Manage Roles", "description": "Full CRUD for roles"},
        {"code": "roles:create", "resource": "roles", "actions": ["create"], "name": "Create Role", "description": "Create role"},
        {"code": "roles:read", "resource": "roles", "actions": ["read"], "name": "Read Roles", "description": "View roles"},
        {"code": "roles:update", "resource": "roles", "actions": ["update"], "name": "Update Role", "description": "Update role"},
        {"code": "roles:delete", "resource": "roles", "actions": ["delete"], "name": "Delete Role", "description": "Delete role"},
        # Attendance
        {"code": "attendance:manage", "resource": "attendance", "actions": ["manage", "create", "read", "update", "delete"], "name": "Manage Attendance", "description": "Full attendance management"},
        {"code": "attendance:create", "resource": "attendance", "actions": ["create"], "name": "Create Attendance", "description": "Create attendance entry"},
        {"code": "attendance:read", "resource": "attendance", "actions": ["read"], "name": "Read Attendance", "description": "View attendance"},
        {"code": "attendance:update", "resource": "attendance", "actions": ["update"], "name": "Update Attendance", "description": "Update attendance"},
        {"code": "attendance:delete", "resource": "attendance", "actions": ["delete"], "name": "Delete Attendance", "description": "Delete attendance"},
        # Customers
        {"code": "customers:manage", "resource": "customers", "actions": ["manage", "create", "read", "update", "delete"], "name": "Manage Customers", "description": "Full CRUD for customers"},
        {"code": "customers:create", "resource": "customers", "actions": ["create"], "name": "Create Customers", "description": "Create customers"},
        {"code": "customers:read", "resource": "customers", "actions": ["read"], "name": "Read Customers", "description": "View customers"},
        {"code": "customers:update", "resource": "customers", "actions": ["update"], "name": "Update Customers", "description": "Update customer"},
        {"code": "customers:delete", "resource": "customers", "actions": ["delete"], "name": "Delete Customers", "description": "Delete customers"},
        # HR & Staff
        {"code": "hr:manage", "resource": "hr", "actions": ["manage", "create", "read", "update", "delete"], "name": "Manage HR", "description": "Full HR management"},
        {"code": "hr:create", "resource": "hr", "actions": ["create"], "name": "Create HR Record", "description": "Create HR record"},
        {"code": "hr:read", "resource": "hr", "actions": ["read"], "name": "Read HR Record", "description": "View HR records"},
        {"code": "hr:update", "resource": "hr", "actions": ["update"], "name": "Update HR Record", "description": "Update HR"},
        {"code": "hr:delete", "resource": "hr", "actions": ["delete"], "name": "Delete HR Record", "description": "Delete HR"},
        # Generator Management
        {"code": "generator_management:manage", "resource": "generator_management", "actions": ["manage", "create", "read", "update", "delete"], "name": "Manage Generators", "description": "Full CRUD for generators"},
        {"code": "generator_management:create", "resource": "generator_management", "actions": ["create"], "name": "Create Generator", "description": "Create generator"},
        {"code": "generator_management:read", "resource": "generator_management", "actions": ["read"], "name": "Read Generator", "description": "View generators"},
        {"code": "generator_management:update", "resource": "generator_management", "actions": ["update"], "name": "Update Generator", "description": "Update generator"},
        {"code": "generator_management:delete", "resource": "generator_management", "actions": ["delete"], "name": "Delete Generator", "description": "Delete generator"},
        # Site Management
        {"code": "site_management:manage", "resource": "site_management", "actions": ["manage", "create", "read", "update", "delete"], "name": "Manage Sites", "description": "Full CRUD for sites"},
        {"code": "site_management:create", "resource": "site_management", "actions": ["create"], "name": "Create Site", "description": "Create site"},
        {"code": "site_management:read", "resource": "site_management", "actions": ["read"], "name": "Read Sites", "description": "View sites"},
        {"code": "site_management:update", "resource": "site_management", "actions": ["update"], "name": "Update Site", "description": "Update site"},
        {"code": "site_management:delete", "resource": "site_management", "actions": ["delete"], "name": "Delete Site", "description": "Delete site"},
        # Inventory
        {"code": "inventory:manage", "resource": "inventory", "actions": ["manage", "create", "read", "update", "delete"], "name": "Manage Inventory", "description": "Full CRUD for inventory"},
        {"code": "inventory:create", "resource": "inventory", "actions": ["create"], "name": "Create Inventory", "description": "Create inventory"},
        {"code": "inventory:read", "resource": "inventory", "actions": ["read"], "name": "Read Inventory", "description": "View inventory"},
        {"code": "inventory:update", "resource": "inventory", "actions": ["update"], "name": "Update Inventory", "description": "Update inventory"},
        {"code": "inventory:delete", "resource": "inventory", "actions": ["delete"], "name": "Delete Inventory", "description": "Delete inventory"},
        # Tasks & Workflow
        {"code": "tasks:manage", "resource": "tasks", "actions": ["manage", "create", "read", "update", "delete"], "name": "Manage Tasks", "description": "Full CRUD for tasks"},
        {"code": "tasks:create", "resource": "tasks", "actions": ["create"], "name": "Create Task", "description": "Create task"},
        {"code": "tasks:read", "resource": "tasks", "actions": ["read"], "name": "Read Tasks", "description": "View tasks"},
        {"code": "tasks:update", "resource": "tasks", "actions": ["update"], "name": "Update Task", "description": "Update task"},
        {"code": "tasks:delete", "resource": "tasks", "actions": ["delete"], "name": "Delete Task", "description": "Delete task"},
        # Alerts & Notifications
        {"code": "alerts:manage", "resource": "alerts", "actions": ["manage", "create", "read", "update", "delete"], "name": "Manage Alerts", "description": "Full CRUD for alerts"},
        {"code": "alerts:create", "resource": "alerts", "actions": ["create"], "name": "Create Alert", "description": "Create alert"},
        {"code": "alerts:read", "resource": "alerts", "actions": ["read"], "name": "Read Alerts", "description": "View alerts"},
        {"code": "alerts:update", "resource": "alerts", "actions": ["update"], "name": "Update Alert", "description": "Update alert"},
        {"code": "alerts:delete", "resource": "alerts", "actions": ["delete"], "name": "Delete Alert", "description": "Delete alert"},
        # Reports (view only)
        {"code": "global_reports:view", "resource": "reports", "actions": ["view"], "name": "View Global Reports", "description": "View all reports"},
        # Admin (manage only)
        {"code": "admin:manage", "resource": "admin", "actions": ["manage"], "name": "Manage Admin Settings", "description": "Full access to admin/system settings"},
    ]

    for perm_data in permissions:
        existing_permission = permission_repo.get_permission_by_code(perm_data["code"])
        if not existing_permission:
            permission_repo.create_permission(perm_data)
            print(f"Created permission for: {perm_data['resource']} ({perm_data['code']})")
        else:
            print(f"Permission already exists for: {perm_data['resource']} ({perm_data['code']})")

    role_permissions = {
        "hr": [
            "dashboard:read", "users:create", "users:read", "users:update", "users:delete",
            "roles:create", "roles:read", "roles:update", "roles:delete",
            "hr:manage", "hr:create", "hr:read", "hr:update", "hr:delete"
        ],
        "user": [
            "dashboard:read", "attendance:read", "attendance:create", "attendance:update",
            "tasks:manage", "tasks:read", "tasks:create", "tasks:update", "tasks:delete"
        ],
        "admin": [
            "dashboard:read", "generator_management:manage", "site_management:manage", "alerts:read",
            "customers:manage", "users:manage", "roles:create", "roles:read", "roles:update", "roles:delete",
            "inventory:manage", "admin:manage", "hr:manage", "tasks:manage", "attendance:manage", "attendance:read"
        ]
    }

    # Ensure admin role always has attendance permissions in DB
    for role_name, permissions_list in role_permissions.items():
        role = RoleRepository().get_role_by_name(role_name)
        if role:
            RoleRepository().update_role(role["id"], {"permissions": permissions_list})
            print(f"Updated permissions for role: {role_name}")

def create_admin_user():
    """Create admin user if it doesn't exist"""
    user_repo = UserRepository()
    auth_service = AuthService()
    admin_username = "rahul"
    admin_email = "admin@ratilalcrm.com"
    admin_password = "Admin@123"
    existing_admin = user_repo.get_user_by_username(admin_username)
    if not existing_admin:
        try:
            # Lookup the admin role id
            admin_role = RoleRepository().get_role_by_name("admin")
            admin_role_id = admin_role["id"] if admin_role else None
            if not admin_role_id:
                print("Admin role does not exist -- cannot create admin user.")
                return
            auth_service.register_user(
                username=admin_username,
                email=admin_email,
                password=admin_password,
                full_name="System Administrator",
                role_ids=[admin_role_id] 
            )
            print(f"Created admin user: {admin_username}")
        except Exception as e:
            print(f"Error creating admin: {e}")
    else:
        print("Admin user already exists")

def init_user_hierarchy_collection():
    print("Setting up user hierarchy collection...")
    user_hierarchy_collection = db["user_hierarchy"]
    user_hierarchy_collection.create_index("user_id", unique=True)
    user_hierarchy_collection.create_index("reporting_user_id")
    user_hierarchy_collection.create_index("level")
    print("User hierarchy collection setup complete!")

def init_gmail_tokens_collection():
    print("Setting up Gmail tokens collection...")
    gmail_tokens_collection = db["gmail_tokens"]
    gmail_tokens_collection.create_index("user_id", unique=True)
    gmail_tokens_collection.create_index("email")
    print("Gmail tokens collection setup complete!")

def initialize_db():
    print("Initializing database...")
    init_roles()
    init_permissions()
    create_admin_user()
    init_user_hierarchy_collection()
    init_gmail_tokens_collection()
    print("Database initialization complete!")

if __name__ == "__main__":
    initialize_db()
