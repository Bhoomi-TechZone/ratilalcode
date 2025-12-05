from fastapi import APIRouter, HTTPException, Depends, Query, Path, Body, status
from fastapi.responses import JSONResponse
from typing import List, Dict, Any, Optional
from datetime import datetime
from bson import ObjectId
import logging

# Import authentication and database dependencies
from app.dependencies import get_current_user
from app.database import get_database
from app.database.schemas.payroll_schema import (
    PayrollConfig,
    PayrollConfigCreate,
    PayrollConfigResponse,
    SalaryStructure,
    SalaryStructureCreate,
    SalaryStructureResponse,
    SalaryStructuresListResponse,
    PayrollCalculation,
    PayrollRecord
)

# Set up logger
logger = logging.getLogger(__name__)

# Create router
payroll_router = APIRouter(
    prefix="/api/payroll",
    tags=["Payroll Management"]
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

# Helper function to check admin permissions
def has_admin_permission(user_data: dict) -> bool:
    """Check if user has admin permissions"""
    if not user_data:
        return False
    
    # Extract roles from user data
    user_roles = []
    
    # Check role field (string)
    if 'role' in user_data and isinstance(user_data['role'], str):
        user_roles.append(user_data['role'].lower())
    
    # Check roles field (list)
    if 'roles' in user_data and isinstance(user_data['roles'], list):
        for role in user_data['roles']:
            if isinstance(role, str):
                user_roles.append(role.lower())
            elif isinstance(role, dict) and 'name' in role:
                user_roles.append(role['name'].lower())
    
    # Check for admin roles
    admin_roles = ['admin', 'administrator', 'superuser', 'root']
    return any(role in admin_roles for role in user_roles) or user_data.get('user_id') == '1'

# Helper function to check HR/payroll permissions
def has_payroll_permission(user_data: dict) -> bool:
    """Check if user has HR/payroll permissions"""
    if has_admin_permission(user_data):
        return True
    
    user_roles = []
    
    # Check role field (string)
    if 'role' in user_data and isinstance(user_data['role'], str):
        user_roles.append(user_data['role'].lower())
    
    # Check roles field (list)
    if 'roles' in user_data and isinstance(user_data['roles'], list):
        for role in user_data['roles']:
            if isinstance(role, str):
                user_roles.append(role.lower())
            elif isinstance(role, dict) and 'name' in role:
                user_roles.append(role['name'].lower())
    
    # Check for HR/payroll roles
    payroll_roles = ['hr', 'human_resources', 'human resource', 'humanresources', 'payroll']
    return any(role in payroll_roles for role in user_roles)

# ========================== PAYROLL CONFIG ENDPOINTS ==========================

@payroll_router.get("/config", response_model=PayrollConfigResponse)
async def get_payroll_config(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Get current payroll configuration (HR/Admin only)"""
    try:
        # Check permissions
        if not has_payroll_permission(current_user):
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions to access payroll configuration"
            )
        
        # Fetch config from database
        config_doc = await db.payroll_configs.find_one({})
        
        if not config_doc:
            # Return default config if none exists
            default_config = PayrollConfig()
            return PayrollConfigResponse(
                success=True,
                message="Default payroll configuration returned",
                data=default_config
            )
        
        # Convert ObjectId and return
        config_data = convert_objectid_to_str(config_doc)
        config_data['id'] = str(config_doc['_id'])
        
        return PayrollConfigResponse(
            success=True,
            message="Payroll configuration retrieved successfully",
            data=PayrollConfig(**config_data)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching payroll config: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@payroll_router.post("/config", response_model=PayrollConfigResponse)
async def update_payroll_config(
    config_data: PayrollConfigCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Update payroll configuration (Admin only)"""
    try:
        # Check admin permissions
        if not has_admin_permission(current_user):
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions to modify payroll configuration"
            )
        
        # Prepare update data
        update_data = config_data.dict()
        update_data['updated_at'] = datetime.now()
        update_data['updated_by'] = current_user.get('user_id', current_user.get('username'))
        
        # Update or create config
        result = await db.payroll_configs.find_one_and_update(
            {},  # Update the single config document
            {"$set": update_data},
            upsert=True,
            return_document=True
        )
        
        # Convert ObjectId and return
        config_data = convert_objectid_to_str(result)
        config_data['id'] = str(result['_id'])
        
        return PayrollConfigResponse(
            success=True,
            message="Payroll configuration updated successfully",
            data=PayrollConfig(**config_data)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating payroll config: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# ========================== SALARY STRUCTURE ENDPOINTS ==========================

@payroll_router.get("/structures", response_model=SalaryStructuresListResponse)
async def get_salary_structures(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Get all salary structures (HR/Admin only)"""
    try:
        # Check permissions
        if not has_payroll_permission(current_user):
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions to access salary structures"
            )
        
        # Fetch structures from database
        structures_cursor = db.salary_structures.find({"is_active": True})
        structures_list = await structures_cursor.to_list(None)
        
        # Convert ObjectIds
        structures_data = []
        for structure in structures_list:
            structure_data = convert_objectid_to_str(structure)
            structure_data['id'] = str(structure['_id'])
            structures_data.append(SalaryStructure(**structure_data))
        
        return SalaryStructuresListResponse(
            success=True,
            message=f"Retrieved {len(structures_data)} salary structures",
            data=structures_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching salary structures: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@payroll_router.post("/structures", response_model=SalaryStructureResponse)
async def create_salary_structure(
    structure_data: SalaryStructureCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Create new salary structure (Admin only)"""
    try:
        # Check admin permissions
        if not has_admin_permission(current_user):
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions to create salary structures"
            )
        
        # Check if position already exists
        existing_structure = await db.salary_structures.find_one({
            "position": structure_data.position,
            "is_active": True
        })
        
        if existing_structure:
            raise HTTPException(
                status_code=400,
                detail=f"Salary structure for position '{structure_data.position}' already exists"
            )
        
        # Prepare insert data
        insert_data = structure_data.dict()
        insert_data['created_at'] = datetime.now()
        insert_data['updated_at'] = datetime.now()
        insert_data['is_active'] = True
        
        # Insert new structure
        result = await db.salary_structures.insert_one(insert_data)
        
        # Fetch the created structure
        created_structure = await db.salary_structures.find_one({"_id": result.inserted_id})
        
        # Convert ObjectId and return
        structure_data = convert_objectid_to_str(created_structure)
        structure_data['id'] = str(created_structure['_id'])
        
        return SalaryStructureResponse(
            success=True,
            message="Salary structure created successfully",
            data=SalaryStructure(**structure_data)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating salary structure: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@payroll_router.put("/structures/{structure_id}", response_model=SalaryStructureResponse)
async def update_salary_structure(
    structure_id: str,
    structure_data: SalaryStructureCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Update salary structure (Admin only)"""
    try:
        # Check admin permissions
        if not has_admin_permission(current_user):
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions to update salary structures"
            )
        
        # Validate ObjectId
        try:
            structure_object_id = ObjectId(structure_id)
        except:
            raise HTTPException(status_code=400, detail="Invalid structure ID")
        
        # Check if structure exists
        existing_structure = await db.salary_structures.find_one({"_id": structure_object_id})
        if not existing_structure:
            raise HTTPException(status_code=404, detail="Salary structure not found")
        
        # Check if position name conflicts (excluding current structure)
        position_conflict = await db.salary_structures.find_one({
            "position": structure_data.position,
            "is_active": True,
            "_id": {"$ne": structure_object_id}
        })
        
        if position_conflict:
            raise HTTPException(
                status_code=400,
                detail=f"Another salary structure with position '{structure_data.position}' already exists"
            )
        
        # Prepare update data
        update_data = structure_data.dict()
        update_data['updated_at'] = datetime.now()
        
        # Update structure
        result = await db.salary_structures.find_one_and_update(
            {"_id": structure_object_id},
            {"$set": update_data},
            return_document=True
        )
        
        # Convert ObjectId and return
        structure_data = convert_objectid_to_str(result)
        structure_data['id'] = str(result['_id'])
        
        return SalaryStructureResponse(
            success=True,
            message="Salary structure updated successfully",
            data=SalaryStructure(**structure_data)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating salary structure: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@payroll_router.delete("/structures/{structure_id}")
async def delete_salary_structure(
    structure_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Delete salary structure (Admin only)"""
    try:
        # Check admin permissions
        if not has_admin_permission(current_user):
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions to delete salary structures"
            )
        
        # Validate ObjectId
        try:
            structure_object_id = ObjectId(structure_id)
        except:
            raise HTTPException(status_code=400, detail="Invalid structure ID")
        
        # Check if structure exists
        existing_structure = await db.salary_structures.find_one({"_id": structure_object_id})
        if not existing_structure:
            raise HTTPException(status_code=404, detail="Salary structure not found")
        
        # Soft delete (mark as inactive)
        await db.salary_structures.update_one(
            {"_id": structure_object_id},
            {
                "$set": {
                    "is_active": False,
                    "updated_at": datetime.now()
                }
            }
        )
        
        return JSONResponse(
            content={
                "success": True,
                "message": "Salary structure deleted successfully"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting salary structure: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# ========================== PAYROLL CALCULATION ENDPOINTS ==========================

@payroll_router.post("/calculate/{employee_id}")
async def calculate_employee_payroll(
    employee_id: str,
    period: str = Query(..., description="Payroll period (YYYY-MM)"),
    attendance_days: int = Query(..., description="Days attended"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Calculate payroll for specific employee (HR/Admin only)"""
    try:
        # Check permissions
        if not has_payroll_permission(current_user):
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions to calculate payroll"
            )
        
        # Get payroll config
        config_doc = await db.payroll_configs.find_one({})
        if not config_doc:
            raise HTTPException(status_code=404, detail="Payroll configuration not found")
        
        # Get employee data
        employee = await db.employees.find_one({"userid": employee_id})
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Get employee's salary structure or use basic salary
        salary_structure = await db.salary_structures.find_one({
            "position": employee.get("position"),
            "is_active": True
        })
        
        basic_salary = float(salary_structure["basic_salary"]) if salary_structure else float(employee.get("salary", 0))
        hra_rate = config_doc.get("hra_rate", 40) / 100
        allowance_rate = config_doc.get("allowance_rate", 20) / 100
        pf_rate = config_doc.get("pf_rate", 12) / 100
        professional_tax = config_doc.get("professional_tax", 200)
        tds_rate = config_doc.get("tds_rate", 10) / 100
        tds_threshold = config_doc.get("tds_threshold", 50000)
        working_days = config_doc.get("working_days", 26)
        
        # Calculate payroll
        daily_rate = basic_salary / working_days
        gross_pay = daily_rate * attendance_days
        hra = gross_pay * hra_rate
        allowances = gross_pay * allowance_rate
        total_earnings = gross_pay + hra + allowances
        
        pf = total_earnings * pf_rate
        tds = (total_earnings - tds_threshold) * tds_rate if total_earnings > tds_threshold else 0
        total_deductions = pf + professional_tax + tds
        net_pay = total_earnings - total_deductions
        
        # Create calculation object
        calculation = PayrollCalculation(
            employee_id=employee_id,
            period=period,
            gross_pay=round(gross_pay, 2),
            hra=round(hra, 2),
            allowances=round(allowances, 2),
            total_earnings=round(total_earnings, 2),
            pf=round(pf, 2),
            professional_tax=professional_tax,
            tds=round(tds, 2),
            total_deductions=round(total_deductions, 2),
            net_pay=round(net_pay, 2),
            config_snapshot=config_doc,
            attendance_days=attendance_days,
            working_days=working_days,
            calculated_at=datetime.now()
        )
        
        return JSONResponse(
            content={
                "success": True,
                "message": "Payroll calculated successfully",
                "data": calculation.dict()
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating payroll: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# ========================== PAYROLL REPORTS ENDPOINTS ==========================

@payroll_router.post("/reports/payslip")
async def generate_payslip_pdf(
    payslip_data: dict = Body(...),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Generate PDF payslip for employee (HR/Admin only)"""
    try:
        # Check permissions
        if not has_payroll_permission(current_user):
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions to generate payslips"
            )
        
        # For now, return a success response (you can integrate PDF generation later)
        # This would typically use libraries like reportlab or weasyprint
        return JSONResponse(
            content={
                "success": True,
                "message": "Payslip generated successfully",
                "data": {
                    "employee_id": payslip_data.get("employeeId"),
                    "period": payslip_data.get("period"),
                    "generated_at": payslip_data.get("generatedAt"),
                    "download_url": f"/api/payroll/download/payslip_{payslip_data.get('employeeId')}_{payslip_data.get('period')}.pdf"
                }
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating payslip: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@payroll_router.get("/reports/summary")
async def get_payroll_summary(
    period: str = Query(..., description="Payroll period (YYYY-MM)"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Get payroll summary for a period (HR/Admin only)"""
    try:
        # Check permissions
        if not has_payroll_permission(current_user):
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions to access payroll reports"
            )
        
        # Get all payroll records for the period
        records_cursor = db.payroll_records.find({"period": period})
        records_list = await records_cursor.to_list(None)
        
        if not records_list:
            return JSONResponse(
                content={
                    "success": True,
                    "message": "No payroll records found for this period",
                    "data": {
                        "period": period,
                        "total_employees": 0,
                        "total_gross_pay": 0,
                        "total_deductions": 0,
                        "total_net_pay": 0,
                        "records": []
                    }
                }
            )
        
        # Calculate summary
        total_employees = len(records_list)
        total_gross_pay = sum(record["calculation"]["total_earnings"] for record in records_list)
        total_deductions = sum(record["calculation"]["total_deductions"] for record in records_list)
        total_net_pay = sum(record["calculation"]["net_pay"] for record in records_list)
        
        # Convert ObjectIds
        records_data = convert_objectid_to_str(records_list)
        
        return JSONResponse(
            content={
                "success": True,
                "message": "Payroll summary retrieved successfully",
                "data": {
                    "period": period,
                    "total_employees": total_employees,
                    "total_gross_pay": round(total_gross_pay, 2),
                    "total_deductions": round(total_deductions, 2),
                    "total_net_pay": round(total_net_pay, 2),
                    "records": records_data
                }
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching payroll summary: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Export router
__all__ = ["payroll_router"]
