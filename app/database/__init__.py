import os
import logging
from pymongo import MongoClient, IndexModel, ASCENDING, DESCENDING
from pymongo.database import Database
from pymongo.errors import ServerSelectionTimeoutError, OperationFailure
from bson import ObjectId
from datetime import datetime
from typing import Dict, Any, Optional, List

# Set up logging
logger = logging.getLogger(__name__)

# MongoDB connection settings
MONGO_URI = os.getenv("DATABASE_URL", "mongodb+srv://errahulverma:NBscZYSOYG1P07qZ@vmax-cluster09.tqrpt4d.mongodb.net/")
DB_NAME = os.getenv("DB_NAME", "crm_test")
_client = None  # Global MongoDB client

# Current credentials for logging
CURRENT_USER = "amit24ve"
CURRENT_TIMESTAMP = "2025-06-05 12:42:20"

def get_database():
    """Get MongoDB database connection with connection pooling"""
    global _client
    
    if _client is None:
        try:
            logger.info(f"Connecting to MongoDB at {MONGO_URI}")
            _client = MongoClient(MONGO_URI)
            # Test connection
            _client.admin.command('ping')
            logger.info("MongoDB connection successful")
        except Exception as e:
            logger.error(f"MongoDB connection failed: {str(e)}", exc_info=True)
            raise
    return _client[DB_NAME]

# Initialize client once and setup global collections
client = MongoClient(MONGO_URI)
db: Database = client[DB_NAME]

# Collection references
def alerts_inactivity_collection():
    return db.alerts_inactivity

def alerts_anomaly_collection():
    return db.alerts_anomaly

def generators_collection():
    return db.generators

def generator_usage_collection():
    return db.generator_usage

def electricity_readings_collection():
    return db.electricity_readings

def maintenance_logs_collection():
    return db.maintenance_logs

def sites_collection():
    return db.sites 

def users_collection():
    return db.users

roles_collection = db.roles

permissions_collection = db.permissions
access_logs_collection = db.access_logs

def franchises_collection():
    return db.franchises

def orders_collection(): 
    return db.orders

# General activities collection for all system activities
activities_collection = db.activities
feedbacks_collection = db.feedbacks
logs_collection = db.comm_logs
transactions_collection = db.transactions
employees_collection = db.employees
notes_collection=db.notes
loyalty_collection=db.loyalty
complaints_collection=db.complaints
# attendance_collection = db.attendance
def attendance_collection():
    return db.attendance

# daily_reports_collection = db.daily_reports
def daily_reports_collection():
    return db.daily_reports

# leave_requests_collection = db.leave_requests
def leave_requests_collection():
    return db.leave_requests

# products_collection = db.products
def products_collection():
    return db.products

# stock_collection = db.stock
def stock_collection():
    return db.stock

# stock_logs_collection = db.stock_logs
def stock_logs_collection():
    return db.stock_logs

# payments_collection = db.payments
def payments_collection():
    return db.payments

# expenses_collection = db.expenses
def expenses_collection():
    return db.expenses

# tasks_collection = db.tasks
def tasks_collection():
    return db.tasks
# ticket_collection = db.tickets

def notes_collection():
    return db.notes

def customers_collection():
  return db.customers

def feedbacks_collection():
    return db.feedbacks

def transactions_collection():
    return db.transactions

def loyalty_collection():
    return db.loyalty

def complaints_collection():
    return db.complaints

def activity_logs_collection():
    return db.activity_logs


def find_user_by_id_or_user_id(identifier: str):
    """
    Find a user by either MongoDB _id (ObjectId) or business user_id.
    
    Args:
        identifier: Either ObjectId string or user_id string
        
    Returns:
        User document if found, None otherwise
    """
    try:
        collection = users_collection()
        
        # First try to find by ObjectId (_id)
        try:
            object_id = ObjectId(identifier)
            user = collection.find_one({"_id": object_id})
            if user:
                return user
        except:
            # identifier is not a valid ObjectId, continue to try user_id
            pass
        
        # If not found by ObjectId, try to find by user_id
        user = collection.find_one({"user_id": identifier})
        if user:
            return user
        
        # Also try the legacy id field for backward compatibility
        user = collection.find_one({"id": identifier})
        if user:
            return user
        
        # Not found by any method
        return None
        
    except Exception as e:
        logger.error(f"Error finding user by identifier {identifier}: {str(e)}")
        return None

#here is document collection
def document_collection():
    return db.documents

from pymongo.collection import Collection
from pymongo import ReturnDocument

def get_next_sequence(db, name):
    counter = db.counters.find_one_and_update(
        {"_id": name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    return counter["seq"]

def safe_create_index(collection, keys, **kwargs):
    """Safely create an index, handling existing indexes."""
    try:
        # Get existing indexes to check for conflicts
        existing_indexes = collection.list_indexes()
        index_names = [idx['name'] for idx in existing_indexes]
        
        # If index_name is not specified, use a custom one to avoid conflicts
        if 'name' not in kwargs:
            # Create a name based on the keys and options
            key_str = '_'.join(f"{k}_{v}" for k, v in keys)
            if 'sparse' in kwargs and kwargs['sparse']:
                key_str += '_sparse'
            if 'unique' in kwargs and kwargs['unique']:
                key_str += '_unique'
            kwargs['name'] = key_str
        
        # Check if an index with this name already exists
        if kwargs['name'] in index_names:
            logger.info(f"Index {kwargs['name']} already exists on {collection.name}")
            return True
            
        collection.create_index(keys, **kwargs)
        logger.info(f"Created index {kwargs.get('name', 'unnamed')} on {collection.name}")
        return True
    except OperationFailure as e:
        if "already exists" in str(e) or "same name" in str(e) or "IndexOptionsConflict" in str(e):
            logger.warning(f"Index on {collection.name} already exists with different options: {e}")
            return False
        else:
            logger.error(f"Failed to create index on {collection.name}: {e}")
            # Don't raise the exception, just log it to prevent startup failure
            return False

def initialize_db():
    """Initialize database connection and setup."""
    try:
        # Test connection
        client.server_info()
        logger.info(f"Connected to MongoDB: {MONGO_URI}")
        
        # Create indexes safely
        create_indexes()
        
        # Initialize default data
        initialize_default_data()
        
        logger.info(f"[{CURRENT_TIMESTAMP}] Database initialized successfully")
        return True
        
    except ServerSelectionTimeoutError:
        logger.error(f"Failed to connect to MongoDB: {MONGO_URI}")
        raise

def create_indexes():
    """Create necessary database indexes safely."""
    logger.info("Creating database indexes")
    
    # Core application indexes
    safe_create_index(users_collection(), [("username", ASCENDING)], unique=True)
    safe_create_index(users_collection(), [("email", ASCENDING)], unique=True)
    safe_create_index(roles_collection, [("name", ASCENDING)], unique=True)

def initialize_default_data():
    """Initialize default data in the database."""
    logger.info("Initializing default data")
    
    # Insert default roles if they don't exist
    default_roles = [
        {"name": "admin", "description": "System administrator with full access"},
        {"name": "sales", "description": "Sales team member"},
        {"name": "franchise", "description": "Franchise team member"},
        {"name": "support", "description": "Support team member"},
        {"name": "hr", "description": "HR team member"},
        {"name": "customer", "description": "Customer user"}
    ]
    
    for role in default_roles:
        # Check if role exists
        existing_role = roles_collection.find_one({"name": role["name"]})
        if not existing_role:
            role_id = str(ObjectId())
            role_doc = role.copy()
            role_doc["id"] = role_id
            role_doc["created_at"] = datetime.now()
            role_doc["created_by"] = "system"
            roles_collection.insert_one(role_doc)
            logger.info(f"Created role: {role['name']}")
        else:
            # Make sure existing role has id field
            if not existing_role.get("id"):
                roles_collection.update_one(
                    {"_id": existing_role["_id"]},
                    {"$set": {"id": str(existing_role["_id"])}}
                )
    
    # Assign admin role to specific users
    assign_admin_role("admin")
    assign_admin_role("superuser")
    assign_admin_role(CURRENT_USER)  # Current user from input

def assign_admin_role(username):
    """Assign admin role to the specified user."""
    # Get admin role ID
    admin_role = roles_collection.find_one({"name": "admin"})
    if not admin_role:
        logger.error("Admin role not found, this shouldn't happen")
        return False
    
    admin_role_id = admin_role.get("id") or str(admin_role["_id"])
    
    # Check if user exists
    users_coll = users_collection()  # Use function to get collection
    user = users_coll.find_one({"username": username})
    if not user:
        # Create user if not exists
        user_id = str(ObjectId())
        users_coll.insert_one({
            "id": user_id,
            "username": username,
            "email": f"{username}@example.com",  # Placeholder email
            "created_at": datetime.now(),
            "role_ids": [admin_role_id],
            "is_active": True
        })
        logger.info(f"Created user {username} with admin role")
        return True
    
    # Update existing user
    role_ids = user.get("role_ids", [])
    if admin_role_id not in role_ids:
        role_ids.append(admin_role_id)
        users_coll.update_one(
            {"_id": user["_id"]},
            {"$set": {"role_ids": role_ids}}
        )
        logger.info(f"Added admin role to user {username}")
        return True
    else:
        logger.info(f"User {username} already has admin role")
        return True

def close_db_connection():
    """Close database connection."""
    if client:
        client.close()
        logger.info("MongoDB connection closed")

# Helper functions for serialization
def serialize_id(document):
    if document and "_id" in document:
        document["id"] = str(document["_id"])
        del document["_id"]
    return document

def get_object_id(id_str):
    """Convert string ID to ObjectId."""
    try:
        return ObjectId(id_str)
    except:
        return None


# Initialize database on import
try:
    initialize_db()
except Exception as e:
    logger.error(f"Error initializing database: {e}")
    print(f"Database initialization error: {e}")
    # Don't re-raise to prevent startup failure
    print("Application will continue but some features may not work properly")

from pymongo.collection import Collection
from bson import ObjectId
from datetime import datetime

def generate_ticket_number(collection: Collection) -> str:
    count = collection.count_documents({})
    return f"TKT-{1000 + count + 1}"

def insert_ticket(collection: Collection, ticket_data: dict) -> str:
    ticket_data["ticket_number"] = generate_ticket_number(collection)
    ticket_data["created_at"] = datetime.now()
    ticket_data["status"] = "open"
    ticket_data["resolution_log"] = []
    ticket_data["closed_at"] = None
    ticket_data["feedback"] = None
    result = collection.insert_one(ticket_data)
    return str(result.inserted_id)

def update_ticket(collection: Collection, ticket_id: str, update_data: dict):
    if "status" in update_data and update_data["status"] == "closed":
        update_data["closed_at"] = datetime.now()
    result = collection.update_one(
        {"_id": ObjectId(ticket_id)},
        {"$set": update_data}
    )
    return result.modified_count

def get_tickets(collection: Collection, filter_query: dict = {}):
    return list(collection.find(filter_query))

def get_ticket_by_id(collection: Collection, ticket_id: str):
    return collection.find_one({"_id": ObjectId(ticket_id)})

# Import async database
try:
    from .async_db import async_db
    logger.info("Async database imported successfully")
except Exception as e:
    logger.error(f"Error importing async database: {e}")
    async_db = None

# Export list for easier imports
__all__ = [
    'get_database',
    'async_db'
]