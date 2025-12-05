from fastapi import APIRouter, HTTPException, Depends, Query, Path, Body, File, UploadFile, Form, status
from fastapi.responses import JSONResponse
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from bson import ObjectId
import logging
import os
import hashlib
import secrets

# Import authentication and database dependencies
from app.dependencies import get_current_user
from app.database import get_database
from app.database.schemas.hr_staff_schema import EmployeeModel
from app.database.repositories.role_repository import RoleRepository
from app.models.employee import EmployeeCreate, EmployeeUpdate, EmployeeResponse

# Set up logger
logger = logging.getLogger(__name__)

# Create router
staff_router = APIRouter(
    prefix="/api/staff",
    tags=["Staff Management"]
)

# Helper function to convert MongoDB ObjectId to string
def convert_objectid_to_str(data):
    """Convert MongoDB document to JSON-serializable dictionary."""
    if isinstance(data, dict):
        for key in list(data.keys()):
            if isinstance(data[key], ObjectId):
                data[key] = str(data[key])
            elif isinstance(data[key], (dict, list)):
                data[key] = convert_objectid_to_str(data[key])
    elif isinstance(data, list):
        for i, item in enumerate(data):
            data[i] = convert_objectid_to_str(item)
    return data

# Helper function to check HR/Admin permissions
def has_hr_admin_permission(user_data: dict) -> bool:
    """Check if user has HR or admin permissions"""
    if not user_data:
        return False
    
    # Extract roles from user data
    user_roles = []
    
    # Check role field (string)
    if user_data.get('role'):
        user_roles.append(str(user_data['role']).lower())
    
    # Check roles array
    if user_data.get('roles') and isinstance(user_data['roles'], list):
        user_roles.extend([str(r).lower() for r in user_data['roles']])
    
    # Check role_names array
    if user_data.get('role_names') and isinstance(user_data['role_names'], list):
        user_roles.extend([str(r).lower() for r in user_data['role_names']])
    
    # Define authorized roles
    authorized_roles = ['admin', 'administrator', 'hr', 'hr_admin', 'hr_manager', 'human_resources']
    
    # Check if any role matches authorized roles
    return any(role in authorized_roles for role in user_roles)

# Helper function to get user ID from user data
def get_user_id(user_data: dict) -> str:
    """Extract user ID from user data"""
    return user_data.get('user_id') or user_data.get('id') or str(user_data.get('_id', ''))

# Helper function to generate unique IDs
def generate_unique_id(db, collection_name: str, field_name: str, prefix: str) -> str:
    """Generate unique ID with prefix"""
    counter = 1
    while True:
        new_id = f"{prefix}-{counter:06d}"
        existing = db[collection_name].find_one({field_name: new_id})
        if not existing:
            return new_id
        counter += 1

# Helper function to hash password
def hash_password(password: str) -> str:
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

# Helper function to save uploaded file
async def save_uploaded_file(file: UploadFile, employee_id: str) -> dict:
    """Save uploaded file and return file info"""
    try:
        # Create directory if it doesn't exist
        upload_dir = "employee_document"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate safe filename
        original_filename = file.filename
        file_extension = os.path.splitext(original_filename)[1]
        safe_filename = f"{employee_id}_{original_filename}"
        file_path = os.path.join(upload_dir, safe_filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        return {
            "name": original_filename,
            "filename": safe_filename,
            "path": file_path,
            "url": f"/employee_document/{safe_filename}",
            "size": len(content),
            "uploaded": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
    except Exception as e:
        logger.error(f"Error saving file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving file: {str(e)}"
        )

# =================== EMPLOYEE CRUD OPERATIONS ===================

@staff_router.post("/employees", status_code=201)
async def create_employee(
    # Employee basic info
    name: str = Form(..., description="Employee full name"),
    email: str = Form(..., description="Employee email address"),
    phone: str = Form(..., description="Employee phone number"),
    position: str = Form(..., description="Employee position/designation"),
    date_of_joining: str = Form(..., description="Date of joining (YYYY-MM-DD)"),
    
    # Optional employee details
    salary: Optional[str] = Form(None, description="Employee salary"),
    location: Optional[str] = Form(None, description="Employee work location"),
    shift: Optional[str] = Form("9am - 6pm", description="Work shift timings"),
    gender: Optional[str] = Form(None, description="Employee gender"),
    department: Optional[str] = Form(None, description="Employee department"),
    address: Optional[str] = Form(None, description="Employee address"),
    city: Optional[str] = Form(None, description="Employee city"),
    pincode: Optional[str] = Form(None, description="Employee pincode"),
    
    # Role and hierarchy
    role: Optional[str] = Form("employee", description="Employee role"),
    reports_to: Optional[str] = Form(None, description="Manager user ID"),
    
    # Document uploads
    aadhar_card: Optional[UploadFile] = File(None, description="Aadhar card document"),
    pan_card: Optional[UploadFile] = File(None, description="PAN card document"),
    bank_documents: Optional[UploadFile] = File(None, description="Bank documents"),
    address_proof: Optional[UploadFile] = File(None, description="Address proof document"),
    resume: Optional[UploadFile] = File(None, description="Resume/CV document"),
    photo: Optional[UploadFile] = File(None, description="Employee photo"),
    
    # Authentication
    current_user: dict = Depends(get_current_user)
):
    """Create new employee with document uploads (HR/Admin only)"""
    try:
        # Check HR/Admin permissions
        if not has_hr_admin_permission(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions. HR or Admin access required."
            )
        
        # Get database reference
        db = get_database()
        
        # Convert role name to role_id
        role_repo = RoleRepository()
        employee_role = role_repo.get_role_by_name(role or "employee")
        if not employee_role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Role '{role or 'employee'}' does not exist"
            )
        role_id = employee_role["id"]
        
        # Check if email already exists
        existing_user = db.users.find_one({"email": email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Employee with this email already exists"
            )
        
        # Check if phone already exists
        existing_phone = db.users.find_one({"phone": phone})
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Employee with this phone number already exists"
            )
            
        # Check if user already has an employee record
        existing_employee_for_user = db.employees.find_one({"email": email})
        if existing_employee_for_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Employee record already exists for email {email}"
            )
        
        # Generate unique IDs
        user_id = generate_unique_id(db, "users", "user_id", "USR")
        emp_id = generate_unique_id(db, "employees", "emp_id", "EMP")
        
        # Create username from email
        username = email.split('@')[0]
        
        # Get creator info
        created_by = get_user_id(current_user)
        creator_name = current_user.get('name') or current_user.get('full_name') or 'HR'
        
        # Current timestamp
        now = datetime.now()
        
        # Process document uploads
        documents = []
        document_files = {
            "aadhar_card": aadhar_card,
            "pan_card": pan_card,
            "bank_documents": bank_documents,
            "address_proof": address_proof,
            "resume": resume,
            "photo": photo
        }
        
        for doc_type, file in document_files.items():
            if file and file.filename:
                try:
                    file_info = await save_uploaded_file(file, user_id)
                    document_record = {
                        "type": doc_type,
                        "name": file_info["name"],
                        "filename": file_info["filename"],
                        "url": file_info["url"],
                        "path": file_info["path"],
                        "size": file_info["size"],
                        "uploaded": file_info["uploaded"],
                        "uploaded_by": creator_name,
                        "status": "pending"
                    }
                    documents.append(document_record)
                    
                    # Also save to employee_documents collection for tracking
                    db.employee_documents.insert_one({
                        "employee_id": user_id,
                        "document_name": file_info["name"],
                        "document_type": doc_type,
                        "file_path": file_info["path"],
                        "file_size": file_info["size"],
                        "uploaded_by": created_by,
                        "uploaded_by_name": creator_name,
                        "uploaded_at": now,
                        "status": "pending"
                    })
                    
                except Exception as e:
                    logger.warning(f"Error uploading {doc_type}: {str(e)}")
                    # Continue with employee creation even if some documents fail
        
        # Prepare user record for users collection
        user_record = {
            "user_id": user_id,
            "username": username,
            "email": email,
            "full_name": name,
            "phone": phone,
            "role": role,
            "roles": [role] if role else [],
            "role_names": [role] if role else [],
            "role_ids": [role_id],  # This is the key fix - using role ID instead of role name
            "department": department,
            "reports_to": reports_to,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
            "created_by": created_by,
            "profile": {
                "address": address,
                "city": city,
                "pincode": pincode,
                "gender": gender
            }
        }
        
        # Prepare employee record for employees collection
        employee_record = {
            "emp_id": emp_id,
            "employee_id": emp_id,
            "user_id": user_id,
            "name": name,
            "email": email,
            "phone": phone,
            "position": position,
            "salary": float(salary) if salary and salary.replace('.', '').isdigit() else 0.0,
            "location": location,
            "date_of_joining": date_of_joining,
            "shift": shift,
            "gender": gender,
            "department": department,
            "address": address,
            "city": city,
            "pincode": pincode,
            "documents": documents,
            "created_at": now,
            "updated_at": now,
            "created_by": created_by,
            "is_active": True
        }
        
        # Insert user record
        user_result = db.users.insert_one(user_record)
        
        # Insert employee record
        emp_result = db.employees.insert_one(employee_record)
        
        # Prepare response
        response_data = {
            "user_id": user_id,
            "employee_id": emp_id,
            "name": name,
            "email": email,
            "phone": phone,
            "position": position,
            "department": department,
            "documents_uploaded": len(documents),
            "documents": documents
        }
        
        logger.info(f"Employee created successfully by {creator_name}: {user_id} ({email})")
        
        return {
            "success": True,
            "message": "Employee created successfully",
            "data": response_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating employee: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@staff_router.get("/employees", status_code=200)
async def get_all_employees(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Records per page"),
    search: Optional[str] = Query(None, description="Search by name, email, or employee ID"),
    department: Optional[str] = Query(None, description="Filter by department"),
    role: Optional[str] = Query(None, description="Filter by role"),
    active_only: Optional[bool] = Query(True, description="Show only active employees"),
    current_user: dict = Depends(get_current_user)
):
    """Get all employees with filtering and pagination (HR/Admin only)"""
    try:
        # Check HR/Admin permissions
        if not has_hr_admin_permission(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions. HR or Admin access required."
            )
        
        # Get database reference
        db = get_database()
        
        # Build aggregation pipeline to join users and employees collections
        # Only include users who have corresponding employee records
        pipeline = [
            {
                "$lookup": {
                    "from": "employees",
                    "localField": "user_id",
                    "foreignField": "user_id",
                    "as": "employee_info"
                }
            },
            {
                "$match": {
                    "employee_info": {"$ne": []}  # Only include users with employee records
                }
            },
            {
                "$unwind": {
                    "path": "$employee_info",
                    "preserveNullAndEmptyArrays": False  # Don't preserve null/empty arrays
                }
            }
        ]
        
        # Build match criteria
        match_criteria = {}
        
        # Active filter
        if active_only:
            match_criteria["is_active"] = True
        
        # Department filter
        if department:
            match_criteria["department"] = department
        
        # Role filter
        if role:
            match_criteria["$or"] = [
                {"role": role},
                {"roles": role}
            ]
        
        # Search filter
        if search:
            search_regex = {"$regex": search, "$options": "i"}
            match_criteria["$or"] = [
                {"full_name": search_regex},
                {"email": search_regex},
                {"user_id": search_regex},
                {"employee_info.emp_id": search_regex}
            ]
        
        # Add match stage if we have criteria
        if match_criteria:
            pipeline.append({"$match": match_criteria})
        
        # Add pagination
        pipeline.extend([
            {"$sort": {"created_at": -1}},
            {"$skip": (page - 1) * limit},
            {"$limit": limit}
        ])
        
        # Execute aggregation
        employees = list(db.users.aggregate(pipeline))
        
        # Get total count for pagination
        count_pipeline = [stage for stage in pipeline if "$skip" not in stage and "$limit" not in stage]
        count_pipeline.append({"$count": "total"})
        count_result = list(db.users.aggregate(count_pipeline))
        total_records = count_result[0]["total"] if count_result else 0
        
        # Format response
        formatted_employees = []
        for emp in employees:
            employee_info = emp.get("employee_info", {})
            formatted_employee = {
                "user_id": emp.get("user_id"),
                "employee_id": employee_info.get("emp_id") or employee_info.get("employee_id"),
                "name": emp.get("full_name") or emp.get("username"),
                "email": emp.get("email"),
                "phone": emp.get("phone"),
                "position": employee_info.get("position"),
                "department": emp.get("department"),
                "role": emp.get("role"),
                "salary": employee_info.get("salary"),
                "date_of_joining": employee_info.get("date_of_joining"),
                "location": employee_info.get("location"),
                "shift": employee_info.get("shift"),
                "is_active": emp.get("is_active", True),
                "created_at": emp.get("created_at"),
                "documents_count": len(employee_info.get("documents", []))
            }
            formatted_employees.append(formatted_employee)
        
        # Calculate pagination
        total_pages = (total_records + limit - 1) // limit
        
        return {
            "success": True,
            "data": convert_objectid_to_str(formatted_employees),
            "pagination": {
                "current_page": page,
                "total_pages": total_pages,
                "total_records": total_records,
                "records_per_page": limit
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting employees: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@staff_router.get("/employees/{employee_id}", status_code=200)
async def get_employee_by_id(
    employee_id: str = Path(..., description="Employee ID or User ID"),
    current_user: dict = Depends(get_current_user)
):
    """Get employee details by ID (HR/Admin only)"""
    try:
        # Check HR/Admin permissions
        if not has_hr_admin_permission(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions. HR or Admin access required."
            )
        
        # Get database reference
        db = get_database()
        
        # Try to find user by user_id or employee_id
        user_record = db.users.find_one({
            "$or": [
                {"user_id": employee_id},
                {"_id": ObjectId(employee_id) if ObjectId.is_valid(employee_id) else None}
            ]
        })
        
        if not user_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found"
            )
        
        # Get employee details
        employee_record = db.employees.find_one({"user_id": user_record.get("user_id")})
        
        # Get employee documents
        documents = list(db.employee_documents.find({"employee_id": user_record.get("user_id")}))
        
        # Format response
        response_data = {
            "user_id": user_record.get("user_id"),
            "employee_id": employee_record.get("emp_id") if employee_record else None,
            "name": user_record.get("full_name") or user_record.get("username"),
            "email": user_record.get("email"),
            "phone": user_record.get("phone"),
            "position": employee_record.get("position") if employee_record else None,
            "department": user_record.get("department"),
            "role": user_record.get("role"),
            "roles": user_record.get("roles", []),
            "salary": employee_record.get("salary") if employee_record else None,
            "date_of_joining": employee_record.get("date_of_joining") if employee_record else None,
            "location": employee_record.get("location") if employee_record else None,
            "shift": employee_record.get("shift") if employee_record else None,
            "gender": employee_record.get("gender") if employee_record else None,
            "address": employee_record.get("address") if employee_record else None,
            "city": employee_record.get("city") if employee_record else None,
            "pincode": employee_record.get("pincode") if employee_record else None,
            "reports_to": user_record.get("reports_to"),
            "is_active": user_record.get("is_active", True),
            "created_at": user_record.get("created_at"),
            "updated_at": user_record.get("updated_at"),
            "documents": convert_objectid_to_str(documents)
        }
        
        return {
            "success": True,
            "data": convert_objectid_to_str(response_data)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting employee: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@staff_router.put("/employees/{employee_id}", status_code=200)
async def update_employee(
    employee_id: str = Path(..., description="Employee ID or User ID"),
    
    # Employee basic info
    name: Optional[str] = Form(None, description="Employee full name"),
    email: Optional[str] = Form(None, description="Employee email address"),
    phone: Optional[str] = Form(None, description="Employee phone number"),
    position: Optional[str] = Form(None, description="Employee position/designation"),
    
    # Optional employee details
    salary: Optional[str] = Form(None, description="Employee salary"),
    location: Optional[str] = Form(None, description="Employee work location"),
    shift: Optional[str] = Form(None, description="Work shift timings"),
    gender: Optional[str] = Form(None, description="Employee gender"),
    department: Optional[str] = Form(None, description="Employee department"),
    address: Optional[str] = Form(None, description="Employee address"),
    city: Optional[str] = Form(None, description="Employee city"),
    pincode: Optional[str] = Form(None, description="Employee pincode"),
    
    # Role and hierarchy
    role: Optional[str] = Form(None, description="Employee role"),
    reports_to: Optional[str] = Form(None, description="Manager user ID"),
    is_active: Optional[bool] = Form(None, description="Employee active status"),
    
    # Document uploads (optional for updates)
    aadhar_card: Optional[UploadFile] = File(None, description="Aadhar card document"),
    pan_card: Optional[UploadFile] = File(None, description="PAN card document"),
    bank_documents: Optional[UploadFile] = File(None, description="Bank documents"),
    address_proof: Optional[UploadFile] = File(None, description="Address proof document"),
    resume: Optional[UploadFile] = File(None, description="Resume/CV document"),
    photo: Optional[UploadFile] = File(None, description="Employee photo"),
    
    # Authentication
    current_user: dict = Depends(get_current_user)
):
    """Update employee information with optional document uploads (HR/Admin only)"""
    try:
        # Check HR/Admin permissions
        if not has_hr_admin_permission(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions. HR or Admin access required."
            )
        
        # Get database reference
        db = get_database()
        
        # Find existing user
        user_record = db.users.find_one({
            "$or": [
                {"user_id": employee_id},
                {"_id": ObjectId(employee_id) if ObjectId.is_valid(employee_id) else None}
            ]
        })
        
        if not user_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found"
            )
        
        user_id = user_record.get("user_id")
        
        # Check for email conflicts (if email is being updated)
        if email and email != user_record.get("email"):
            existing_email = db.users.find_one({"email": email, "user_id": {"$ne": user_id}})
            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Another employee with this email already exists"
                )
        
        # Check for phone conflicts (if phone is being updated)
        if phone and phone != user_record.get("phone"):
            existing_phone = db.users.find_one({"phone": phone, "user_id": {"$ne": user_id}})
            if existing_phone:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Another employee with this phone number already exists"
                )
        
        # Get updater info
        updated_by = get_user_id(current_user)
        updater_name = current_user.get('name') or current_user.get('full_name') or 'HR'
        now = datetime.now()
        
        # Process document uploads if provided
        new_documents = []
        document_files = {
            "aadhar_card": aadhar_card,
            "pan_card": pan_card,
            "bank_documents": bank_documents,
            "address_proof": address_proof,
            "resume": resume,
            "photo": photo
        }
        
        for doc_type, file in document_files.items():
            if file and file.filename:
                try:
                    file_info = await save_uploaded_file(file, user_id)
                    document_record = {
                        "type": doc_type,
                        "name": file_info["name"],
                        "filename": file_info["filename"],
                        "url": file_info["url"],
                        "path": file_info["path"],
                        "size": file_info["size"],
                        "uploaded": file_info["uploaded"],
                        "uploaded_by": updater_name,
                        "status": "pending"
                    }
                    new_documents.append(document_record)
                    
                    # Also save to employee_documents collection
                    db.employee_documents.insert_one({
                        "employee_id": user_id,
                        "document_name": file_info["name"],
                        "document_type": doc_type,
                        "file_path": file_info["path"],
                        "file_size": file_info["size"],
                        "uploaded_by": updated_by,
                        "uploaded_by_name": updater_name,
                        "uploaded_at": now,
                        "status": "pending"
                    })
                    
                except Exception as e:
                    logger.warning(f"Error uploading {doc_type}: {str(e)}")
                    # Continue with update even if some documents fail
        
        # Prepare user update data
        user_update_data = {"updated_at": now, "updated_by": updated_by}
        
        if name:
            user_update_data["full_name"] = name
        if email:
            user_update_data["email"] = email
        if phone:
            user_update_data["phone"] = phone
        if department:
            user_update_data["department"] = department
        if role:
            # Convert role name to role_id
            role_repo = RoleRepository()
            employee_role = role_repo.get_role_by_name(role)
            if not employee_role:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Role '{role}' does not exist"
                )
            role_id = employee_role["id"]
            
            user_update_data["role"] = role
            user_update_data["roles"] = [role]
            user_update_data["role_names"] = [role]
            user_update_data["role_ids"] = [role_id]
        if reports_to is not None:
            user_update_data["reports_to"] = reports_to
        if is_active is not None:
            user_update_data["is_active"] = is_active
        
        # Update profile data
        profile_updates = {}
        if address:
            profile_updates["address"] = address
        if city:
            profile_updates["city"] = city
        if pincode:
            profile_updates["pincode"] = pincode
        if gender:
            profile_updates["gender"] = gender
        
        if profile_updates:
            user_update_data["profile"] = {**user_record.get("profile", {}), **profile_updates}
        
        # Prepare employee update data
        employee_update_data = {"updated_at": now, "updated_by": updated_by}
        
        if name:
            employee_update_data["name"] = name
        if email:
            employee_update_data["email"] = email
        if phone:
            employee_update_data["phone"] = phone
        if position:
            employee_update_data["position"] = position
        if salary:
            try:
                employee_update_data["salary"] = float(salary)
            except ValueError:
                employee_update_data["salary"] = 0.0
        if location:
            employee_update_data["location"] = location
        if shift:
            employee_update_data["shift"] = shift
        if gender:
            employee_update_data["gender"] = gender
        if department:
            employee_update_data["department"] = department
        if address:
            employee_update_data["address"] = address
        if city:
            employee_update_data["city"] = city
        if pincode:
            employee_update_data["pincode"] = pincode
        if is_active is not None:
            employee_update_data["is_active"] = is_active
        
        # Add new documents to existing ones if any
        if new_documents:
            existing_employee = db.employees.find_one({"user_id": user_id})
            if existing_employee:
                existing_docs = existing_employee.get("documents", [])
                employee_update_data["documents"] = existing_docs + new_documents
            else:
                employee_update_data["documents"] = new_documents
        
        # Update user record
        if user_update_data:
            db.users.update_one(
                {"user_id": user_id},
                {"$set": user_update_data}
            )
        
        # Update or create employee record
        employee_exists = db.employees.find_one({"user_id": user_id})
        if employee_exists:
            if employee_update_data:
                db.employees.update_one(
                    {"user_id": user_id},
                    {"$set": employee_update_data}
                )
        else:
            # Create new employee record if it doesn't exist
            emp_id = generate_unique_id(db, "employees", "emp_id", "EMP")
            new_employee_record = {
                "emp_id": emp_id,
                "employee_id": emp_id,
                "user_id": user_id,
                "created_at": now,
                **employee_update_data
            }
            db.employees.insert_one(new_employee_record)
        
        # Get updated records for response
        updated_user = db.users.find_one({"user_id": user_id})
        updated_employee = db.employees.find_one({"user_id": user_id})
        
        # Format response
        response_data = {
            "user_id": user_id,
            "employee_id": updated_employee.get("emp_id") if updated_employee else None,
            "name": updated_user.get("full_name"),
            "email": updated_user.get("email"),
            "phone": updated_user.get("phone"),
            "position": updated_employee.get("position") if updated_employee else None,
            "department": updated_user.get("department"),
            "new_documents_uploaded": len(new_documents),
            "updated_fields": list(user_update_data.keys()) + list(employee_update_data.keys())
        }
        
        logger.info(f"Employee updated successfully by {updater_name}: {user_id}")
        
        return {
            "success": True,
            "message": "Employee updated successfully",
            "data": response_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating employee: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@staff_router.delete("/employees/{employee_id}", status_code=200)
async def delete_employee(
    employee_id: str = Path(..., description="Employee ID or User ID"),
    permanent: Optional[bool] = Query(False, description="Permanently delete (true) or deactivate (false)"),
    current_user: dict = Depends(get_current_user)
):
    """Delete or deactivate employee (HR/Admin only)"""
    try:
        # Check HR/Admin permissions
        if not has_hr_admin_permission(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions. HR or Admin access required."
            )
        
        # Get database reference
        db = get_database()
        
        # Find existing user
        user_record = db.users.find_one({
            "$or": [
                {"user_id": employee_id},
                {"_id": ObjectId(employee_id) if ObjectId.is_valid(employee_id) else None}
            ]
        })
        
        if not user_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found"
            )
        
        user_id = user_record.get("user_id")
        employee_name = user_record.get("full_name") or user_record.get("username")
        
        # Get deleter info
        deleted_by = get_user_id(current_user)
        deleter_name = current_user.get('name') or current_user.get('full_name') or 'HR'
        now = datetime.now()
        
        if permanent:
            # Permanently delete records
            
            # Delete from users collection
            db.users.delete_one({"user_id": user_id})
            
            # Delete from employees collection
            db.employees.delete_one({"user_id": user_id})
            
            # Delete employee documents records
            db.employee_documents.delete_many({"employee_id": user_id})
            
            # Delete attendance records
            db.attendance.delete_many({"employee_id": user_id})
            
            # Delete leave requests
            if "leave_requests" in db.list_collection_names():
                db.leave_requests.delete_many({"employee_id": user_id})
            
            # Remove physical document files
            try:
                employee_record = db.employees.find_one({"user_id": user_id})
                if employee_record and employee_record.get("documents"):
                    for doc in employee_record["documents"]:
                        file_path = doc.get("path")
                        if file_path and os.path.exists(file_path):
                            os.remove(file_path)
                            logger.info(f"Deleted file: {file_path}")
            except Exception as e:
                logger.warning(f"Error deleting physical files: {str(e)}")
            
            message = f"Employee {employee_name} permanently deleted"
            logger.warning(f"Employee permanently deleted by {deleter_name}: {user_id} ({employee_name})")
            
        else:
            # Soft delete - just deactivate
            update_data = {
                "is_active": False,
                "deactivated_at": now,
                "deactivated_by": deleted_by,
                "updated_at": now
            }
            
            # Update user record
            db.users.update_one(
                {"user_id": user_id},
                {"$set": update_data}
            )
            
            # Update employee record if exists
            db.employees.update_one(
                {"user_id": user_id},
                {"$set": update_data}
            )
            
            message = f"Employee {employee_name} deactivated"
            logger.info(f"Employee deactivated by {deleter_name}: {user_id} ({employee_name})")
        
        return {
            "success": True,
            "message": message,
            "employee_id": user_id,
            "employee_name": employee_name,
            "action": "permanently_deleted" if permanent else "deactivated"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting employee: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

# =================== EMPLOYEE DOCUMENT MANAGEMENT ===================

@staff_router.post("/employees/{employee_id}/documents", status_code=201)
async def add_employee_documents(
    employee_id: str = Path(..., description="Employee ID or User ID"),
    
    # Document uploads
    aadhar_card: Optional[UploadFile] = File(None, description="Aadhar card document"),
    pan_card: Optional[UploadFile] = File(None, description="PAN card document"),
    bank_documents: Optional[UploadFile] = File(None, description="Bank documents"),
    address_proof: Optional[UploadFile] = File(None, description="Address proof document"),
    resume: Optional[UploadFile] = File(None, description="Resume/CV document"),
    photo: Optional[UploadFile] = File(None, description="Employee photo"),
    other_document: Optional[UploadFile] = File(None, description="Other document"),
    
    # Document metadata
    document_type: Optional[str] = Form(None, description="Type of other document"),
    document_description: Optional[str] = Form(None, description="Description of document"),
    
    # Authentication
    current_user: dict = Depends(get_current_user)
):
    """Add documents to existing employee (HR/Admin only)"""
    try:
        # Check HR/Admin permissions
        if not has_hr_admin_permission(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions. HR or Admin access required."
            )
        
        # Get database reference
        db = get_database()
        
        # Find existing user
        user_record = db.users.find_one({
            "$or": [
                {"user_id": employee_id},
                {"_id": ObjectId(employee_id) if ObjectId.is_valid(employee_id) else None}
            ]
        })
        
        if not user_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found"
            )
        
        user_id = user_record.get("user_id")
        
        # Get uploader info
        uploaded_by = get_user_id(current_user)
        uploader_name = current_user.get('name') or current_user.get('full_name') or 'HR'
        now = datetime.now()
        
        # Process document uploads
        new_documents = []
        document_files = {
            "aadhar_card": aadhar_card,
            "pan_card": pan_card,
            "bank_documents": bank_documents,
            "address_proof": address_proof,
            "resume": resume,
            "photo": photo,
            (document_type or "other"): other_document
        }
        
        uploaded_count = 0
        for doc_type, file in document_files.items():
            if file and file.filename:
                try:
                    file_info = await save_uploaded_file(file, user_id)
                    document_record = {
                        "type": doc_type,
                        "name": file_info["name"],
                        "filename": file_info["filename"],
                        "url": file_info["url"],
                        "path": file_info["path"],
                        "size": file_info["size"],
                        "uploaded": file_info["uploaded"],
                        "uploaded_by": uploader_name,
                        "status": "pending",
                        "description": document_description if doc_type == (document_type or "other") else ""
                    }
                    new_documents.append(document_record)
                    
                    # Also save to employee_documents collection
                    db.employee_documents.insert_one({
                        "employee_id": user_id,
                        "document_name": file_info["name"],
                        "document_type": doc_type,
                        "file_path": file_info["path"],
                        "file_size": file_info["size"],
                        "uploaded_by": uploaded_by,
                        "uploaded_by_name": uploader_name,
                        "uploaded_at": now,
                        "status": "pending",
                        "description": document_description if doc_type == (document_type or "other") else ""
                    })
                    
                    uploaded_count += 1
                    
                except Exception as e:
                    logger.warning(f"Error uploading {doc_type}: {str(e)}")
                    # Continue with other uploads even if one fails
        
        if uploaded_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No documents were uploaded"
            )
        
        # Add documents to employee record
        existing_employee = db.employees.find_one({"user_id": user_id})
        if existing_employee:
            existing_docs = existing_employee.get("documents", [])
            updated_docs = existing_docs + new_documents
            
            db.employees.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "documents": updated_docs,
                        "updated_at": now,
                        "updated_by": uploaded_by
                    }
                }
            )
        
        logger.info(f"Documents added to employee {user_id} by {uploader_name}: {uploaded_count} files")
        
        return {
            "success": True,
            "message": f"{uploaded_count} documents uploaded successfully",
            "employee_id": user_id,
            "documents_uploaded": uploaded_count,
            "documents": new_documents
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding employee documents: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@staff_router.get("/employees/{employee_id}/documents", status_code=200)
async def get_employee_documents(
    employee_id: str = Path(..., description="Employee ID or User ID"),
    current_user: dict = Depends(get_current_user)
):
    """Get all documents for an employee (HR/Admin only)"""
    try:
        # Check HR/Admin permissions
        if not has_hr_admin_permission(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions. HR or Admin access required."
            )
        
        # Get database reference
        db = get_database()
        
        # Find existing user
        user_record = db.users.find_one({
            "$or": [
                {"user_id": employee_id},
                {"_id": ObjectId(employee_id) if ObjectId.is_valid(employee_id) else None}
            ]
        })
        
        if not user_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found"
            )
        
        user_id = user_record.get("user_id")
        
        # Get documents from both collections
        employee_docs = []
        
        # Get from employee record
        employee_record = db.employees.find_one({"user_id": user_id})
        if employee_record and employee_record.get("documents"):
            employee_docs.extend(employee_record["documents"])
        
        # Get from employee_documents collection
        document_records = list(db.employee_documents.find({"employee_id": user_id}))
        
        return {
            "success": True,
            "employee_id": user_id,
            "employee_name": user_record.get("full_name") or user_record.get("username"),
            "documents_in_profile": convert_objectid_to_str(employee_docs),
            "documents_in_collection": convert_objectid_to_str(document_records),
            "total_documents": len(employee_docs) + len(document_records)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting employee documents: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

# =================== STAFF STATISTICS AND REPORTING ===================

@staff_router.get("/stats", status_code=200)
async def get_staff_statistics(
    current_user: dict = Depends(get_current_user)
):
    """Get staff statistics (HR/Admin only)"""
    try:
        # Check HR/Admin permissions
        if not has_hr_admin_permission(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions. HR or Admin access required."
            )
        
        # Get database reference
        db = get_database()
        
        # Get total employees
        total_employees = db.users.count_documents({})
        
        # Get active employees
        active_employees = db.users.count_documents({"is_active": True})
        
        # Get employees by department
        department_pipeline = [
            {"$match": {"department": {"$exists": True, "$ne": None, "$ne": ""}}},
            {"$group": {"_id": "$department", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        departments = list(db.users.aggregate(department_pipeline))
        
        # Get employees by role
        role_pipeline = [
            {"$match": {"role": {"$exists": True, "$ne": None, "$ne": ""}}},
            {"$group": {"_id": "$role", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        roles = list(db.users.aggregate(role_pipeline))
        
        # Get recent joinings (last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_joinings = db.users.count_documents({
            "created_at": {"$gte": thirty_days_ago}
        })
        
        # Get pending documents for review
        pending_docs = db.employee_documents.count_documents({
            "status": "pending"
        })
        
        return {
            "success": True,
            "statistics": {
                "total_employees": total_employees,
                "active_employees": active_employees,
                "inactive_employees": total_employees - active_employees,
                "recent_joinings_30_days": recent_joinings,
                "pending_document_reviews": pending_docs,
                "departments": departments,
                "roles": roles
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting staff statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

# Export the router
def get_router():
    return staff_router
