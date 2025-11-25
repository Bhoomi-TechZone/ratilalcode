from fastapi import APIRouter, HTTPException, Depends, status, Query
from app.database.schemas.task_schema import TaskModel, TaskStatusUpdate
from app.database import tasks_collection, employees_collection, sites_collection
from datetime import datetime, date
from typing import List, Optional
from app.services.hierarchy_helper import HierarchyHelper
from app.dependencies import get_current_user, admin_required
import logging
from bson import ObjectId

logger = logging.getLogger(__name__)
task_router = APIRouter(prefix="/api/tasks", tags=["Tasks"])

def ensure_datetime(d):
    if isinstance(d, date) and not isinstance(d, datetime):
        return datetime.combine(d, datetime.min.time())
    return d

def ensure_datetime_recursive(obj):
    if isinstance(obj, dict):
        return {k: ensure_datetime_recursive(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [ensure_datetime_recursive(item) for item in obj]
    else:
        return ensure_datetime(obj)

def generate_task_id(tasks_coll):
    last_task = tasks_coll.find_one(
        {"id": {"$regex": "^tsk-\\d+$"}},
        sort=[("created_at", -1)]
    )
    if last_task and "id" in last_task:
        try:
            last_num = int(last_task["id"].split("-")[1])
            new_num = last_num + 1
        except Exception:
            new_num = 1
    else:
        new_num = 1
    return f"tsk-{new_num:02d}"

def get_employee_name(user_code):
    emp = employees_collection.find_one({"user_id": user_code})
    if emp:
        return emp.get("full_name") or emp.get("name") or emp.get("username") or emp.get("email") or str(user_code)
    return str(user_code)

# ---- Helper receives sites_coll (collection object)
def get_site_name(linked_id, sites_coll):
    if linked_id and ObjectId.is_valid(str(linked_id)):  # ensure string for ObjectId
        site = sites_coll.find_one({"_id": ObjectId(str(linked_id))})
        if site:
            return site.get("site_name") or site.get("name") or "Unnamed Site"
    return None

def format_task_out(task, sites_coll):
    out = dict(task)
    out["site_name"] = get_site_name(task.get("linked_id"), sites_coll)
    if isinstance(out.get("due_date"), datetime):
        out["due_date"] = out["due_date"].date()
    if out.get("approved_at") and isinstance(out["approved_at"], datetime):
        out["approved_at"] = out["approved_at"].date()
    return out

# -- ADMIN ROUTES: Only admins --

@task_router.post("/", response_model=TaskModel, status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(get_current_user), Depends(admin_required)])
async def create_task(
    task: TaskModel,
    tasks_coll=Depends(tasks_collection),
    sites_coll=Depends(sites_collection)
):
    """
    Create a new task and assign it to an employee. Only admins can use this endpoint.
    """
    user_id = task.created_by or None  # Trust object if using admin route
    assigned_to_code = task.assigned_to
    emp_name = get_employee_name(assigned_to_code)
    if not emp_name:
        raise HTTPException(status_code=400, detail="Cannot find assigned employee name")

    task_dict = task.dict(exclude_unset=True)
    task_dict = ensure_datetime_recursive(task_dict)
    task_dict["assigned_to_name"] = emp_name
    task_dict["created_at"] = datetime.utcnow()
    task_dict["id"] = generate_task_id(tasks_coll)
    tasks_coll.insert_one(task_dict)
    return format_task_out(task_dict, sites_coll)

@task_router.put("/{task_id}", response_model=TaskModel, dependencies=[Depends(get_current_user), Depends(admin_required)])
async def update_task(
    task_id: str,
    update: TaskModel,
    tasks_coll=Depends(tasks_collection),
    sites_coll=Depends(sites_collection)
):
    """
    Update an existing task's details. Access restricted to admins.
    """
    task = tasks_coll.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_dict = update.dict(exclude_unset=True)
    update_dict = ensure_datetime_recursive(update_dict)
    tasks_coll.update_one({"id": task_id}, {"$set": update_dict})
    updated_task = tasks_coll.find_one({"id": task_id})
    return format_task_out(updated_task, sites_coll)

@task_router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(get_current_user), Depends(admin_required)])
async def delete_task(task_id: str, tasks_coll=Depends(tasks_collection)):
    """
    Delete a task by its ID. Only for admin users.
    """
    res = tasks_coll.delete_one({"id": task_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return None

@task_router.get("/", response_model=List[TaskModel], dependencies=[Depends(get_current_user), Depends(admin_required)])
async def list_tasks_admin(
    assigned_to: Optional[str] = None, 
    status: Optional[str] = None, 
    tasks_coll=Depends(tasks_collection),
    sites_coll=Depends(sites_collection)
):
    """
    List all tasks, optionally filtering by assignee or status. Admin access required.
    """
    query = {}
    if status:
        query["status"] = status
    if assigned_to:
        query["assigned_to"] = assigned_to
    tasks = list(tasks_coll.find(query))
    return [format_task_out(t, sites_coll) for t in tasks]

# -- PUBLIC ROUTES: Any authenticated user --

@task_router.get("/assign/{task_id}", response_model=TaskModel, dependencies=[Depends(get_current_user)])
async def get_task(task_id: str, tasks_coll=Depends(tasks_collection), sites_coll=Depends(sites_collection)):
    """
    Get details for a single task by its ID. All logged-in users may access if permitted.
    """
    t = tasks_coll.find_one({"id": task_id})
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    return format_task_out(t, sites_coll)

@task_router.get("/assigned", response_model=List[TaskModel], dependencies=[Depends(get_current_user)])
async def get_assigned_tasks(userId: str = Query(...), tasks_coll=Depends(tasks_collection), sites_coll=Depends(sites_collection)):
    """
    Get all tasks assigned to a given user ID.
    """
    tasks = list(tasks_coll.find({"assigned_to": userId}))
    return [format_task_out(t, sites_coll) for t in tasks]

@task_router.patch("/{task_id}", response_model=dict, dependencies=[Depends(get_current_user)])
async def update_task_status(
    task_id: str,
    update: TaskStatusUpdate, 
    current_user: dict = Depends(get_current_user), 
    tasks_coll=Depends(tasks_collection), 
    sites_coll=Depends(sites_collection)
):
    """
    Update the status of a task (pending, approved, etc.). Access checks apply.
    """
    task = tasks_coll.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    user_id = current_user.get("user_id")
    is_admin = await HierarchyHelper.is_user_admin(user_id)
    task_assignee_code = task.get("assigned_to")
    task_creator = task.get("created_by")
    if not is_admin:
        can_update = (
            user_id == task_assignee_code or 
            user_id == task_creator or
            (task_assignee_code and await HierarchyHelper.can_access_resource(user_id, task_assignee_code))
        )
        if not can_update:
            raise HTTPException(
                status_code=403,
                detail="Access denied: You don't have permission to update this task"
            )
    update_dict = update.dict(exclude_unset=True)
    if update_dict.get("status") == "approved":
        update_dict["approved_at"] = datetime.utcnow()
        update_dict["approved_by"] = user_id
    result = tasks_coll.update_one({"id": task_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found or not updated")
    return {"message": "Status updated"}

@task_router.get("/mytasks", response_model=List[TaskModel], dependencies=[Depends(get_current_user)])
async def get_my_tasks(
    current_user: dict = Depends(get_current_user),
    tasks_coll=Depends(tasks_collection),
    sites_coll=Depends(sites_collection)
):
    """
    Retrieve all tasks assigned to the current user.
    """
    user_id = current_user.get("user_id")
    query = {"assigned_to": user_id}
    tasks = list(tasks_coll.find(query))
    result = [format_task_out(t, sites_coll) for t in tasks]
    print("mytasks response:", result)   # <-- ADD THIS LINE
    return result

