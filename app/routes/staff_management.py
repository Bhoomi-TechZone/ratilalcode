from fastapi import FastAPI, HTTPException, Depends, Path, UploadFile, File, Form, APIRouter, Body
import os
from bson import Binary, ObjectId
from typing import List, Optional
from app.database.schemas.hr_staff_schema import (
    EmployeeModel, AttendanceModel, DailyReportModel, LeaveRequestModel,
    LeaveRequestUpdateModel, DailyReportUpdateModel)
from app.database import employees_collection, attendance_collection, daily_reports_collection, leave_requests_collection
from datetime import datetime


staff_router = APIRouter(prefix="/api/staff", tags=["Staff"])

def clean_bytes(obj):
    if isinstance(obj, dict):
        return {k: clean_bytes(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_bytes(v) for v in obj]
    elif isinstance(obj, (bytes, Binary)):
        return None
    return obj


def obj_id_to_str(doc, id_field="id"):
    doc = dict(doc)
    if "_id" in doc:
        doc[id_field] = str(doc.pop("_id"))
    return clean_bytes(doc)


def mongo_attendance_to_model(doc):
    # Map _id → attendance_id, user_id → employee_id
    return {
        "attendance_id": str(doc.get("_id")),
        "employee_id": doc.get("user_id", ""),   
        "date": doc.get("date"),
        "status": doc.get("status"),
        "geo_lat": doc.get("geo_lat"),
        "geo_long": doc.get("geo_long"),
        "location": doc.get("location"),
        "timestamp": doc.get("checkin_time", datetime.now()),  # Use checkin_time or now
        "time": doc.get("check_in"),
    }


def get_initials(name):
    if not name:
        return ""
    return "".join([n[0] for n in name.split()][:2]).upper()


def get_next_sequence(db, name):
    counters = db["counters"]
    ret = counters.find_one_and_update(
        {"_id": name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True
    )
    return ret["seq"]


def get_last_active(attendance):
    present_dates = [
        a.get("date")
        for a in attendance
        if a.get("status", "").lower() == "present"
    ]
    if not present_dates:
        return "No recent activity"
    try:
        last = max(present_dates)
        last_date = datetime.strptime(last, "%Y-%m-%d")
        days_ago = (datetime.now() - last_date).days
        return f"{days_ago} days ago" if days_ago > 0 else "Today"
    except Exception:
        return "Unknown"


# --- Employee CRUD ---
@staff_router.post("/", response_model=EmployeeModel)
async def create_employee(
    name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    position: str = Form(...),
    salary: float = Form(...),
    location: Optional[str] = Form(...),
    date_of_joining: str = Form(...),
    shift: str = Form(...),
    gender: Optional[str] = Form(...),
    documents: Optional[List[UploadFile]] = File(...)
):
    if not email or not phone:
        raise HTTPException(status_code=400, detail="Email and phone are required to create employee.")
    existing = employees_collection.find_one({
        "$or": [
            {"email": email},
            {"phone": phone}
        ]
    })
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Employee with this email or phone already exists."
        )
    upload_dir = "employee_document"
    os.makedirs(upload_dir, exist_ok=True)
    saved_files = []
    for file in documents or []:
        file_path = os.path.join(upload_dir, file.filename)
        with open(file_path, "wb") as f:
            f.write(await file.read())
        saved_files.append({
            "name": file.filename,
            "uploaded": datetime.now().strftime("%Y-%m-%d"),
            "url": f"/employee_document/{file.filename}"
        })
    db = employees_collection.database
    seq_num = get_next_sequence(db, "employeeid")
    emp_id = f"EMP-{seq_num:06d}"
    emp = {
        "employee_id": emp_id,
        "name": name,
        "email": email,
        "phone": phone,
        "position": position,
        "salary": salary,
        "location": location,
        "date_of_joining": date_of_joining,
        "shift": shift,
        "gender": gender,
        "documents": saved_files
    }
    result = employees_collection.insert_one(emp)
    emp["id"] = str(result.inserted_id)
    return EmployeeModel(**emp)


@staff_router.get("/", response_model=List[EmployeeModel])
async def list_employees():
    employees = [obj_id_to_str(e) for e in employees_collection.find()]
    return employees


# --- Attendance APIs ---
@staff_router.post("/attendance", response_model=AttendanceModel)
async def mark_attendance(
    attendance: AttendanceModel,
    attendance_collection=Depends(attendance_collection)
):
    att = attendance.dict(exclude_unset=True)
    # For compatibility, also set user_id for Mongo
    if "employee_id" in att:
        att["user_id"] = att["employee_id"]
    result = attendance_collection.insert_one(att)
    att["attendance_id"] = str(result.inserted_id)
    return att


@staff_router.get("/attendance", response_model=List[AttendanceModel])
async def list_attendance(attendance_collection=Depends(attendance_collection)):
    attendance = [mongo_attendance_to_model(a) for a in attendance_collection.find()]
    return attendance


@staff_router.get("/{employee_id}/attendance", response_model=List[AttendanceModel])
async def get_employee_attendance(employee_id: str, attendance_collection=Depends(attendance_collection)):
    # Match Mongo user_id with FastAPI employee_id
    attendance = [mongo_attendance_to_model(a) for a in attendance_collection.find({"user_id": employee_id})]
    return attendance


# --- Reports APIs ---
@staff_router.post("/reports", response_model=DailyReportModel)
async def submit_daily_report(report: DailyReportModel, daily_reports_collection=Depends(daily_reports_collection)):
    rep = report.dict(exclude_unset=True)
    result = daily_reports_collection.insert_one(rep)
    rep["report_id"] = str(result.inserted_id)
    return rep


@staff_router.get("/reports", response_model=List[DailyReportModel])
async def list_reports(daily_reports_collection=Depends(daily_reports_collection)):
    reports = []
    for r in daily_reports_collection.find():
        report = {
            "report_id": str(r.get("_id", "")),
            "employee_id": r.get("employee_id") or r.get("user_id") or "",
            "date": (
                r.get("date")
                or (r.get("report_date").strftime("%Y-%m-%d") if r.get("report_date") else "")
            ),
            "content": r.get("content") or r.get("remarks") or "",
            "timestamp": r.get("timestamp") if r.get("timestamp") else None
        }
        reports.append(report)
    return reports


@staff_router.get("/{employee_id}/reports", response_model=List[DailyReportModel])
async def get_employee_reports(employee_id: str, daily_reports_collection=Depends(daily_reports_collection)):
    reports = []
    for r in daily_reports_collection.find({"employee_id": employee_id}):
        report = {
            "report_id": str(r.get("_id", "")),
            "employee_id": r.get("employee_id") or r.get("user_id") or "",
            "date": (
                r.get("date")
                or (r.get("report_date").strftime("%Y-%m-%d") if r.get("report_date") else "")
            ),
            "content": r.get("content") or r.get("remarks") or "",
            "timestamp": r.get("timestamp") if r.get("timestamp") else None
        }
        reports.append(report)
    return reports


@staff_router.patch("/reports/{report_id}", response_model=DailyReportModel)
async def update_report_content(
    report_id: str = Path(..., description="Report ID"),
    update: DailyReportUpdateModel = ...,
    daily_reports_collection=Depends(daily_reports_collection)
):
    try:
        oid = ObjectId(report_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid report_id")
    result = daily_reports_collection.update_one(
        {"_id": oid},
        {"$set": {"content": update.content}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    updated = daily_reports_collection.find_one({"_id": oid})
    if not updated:
        raise HTTPException(status_code=404, detail="Report not found")
    return DailyReportModel(
        report_id=str(updated.get("_id", "")),
        employee_id=updated.get("employee_id") or updated.get("user_id") or "",
        date=updated.get("date") or (
            updated.get("report_date").strftime("%Y-%m-%d") if updated.get("report_date") else ""
        ),
        content=updated.get("content") or updated.get("remarks") or "",
        timestamp=updated.get("timestamp") if updated.get("timestamp") else None
    )

# --- Leave Request APIs ---

def clean_mongo_document(doc, id_field="leave_id"):
    if not doc:
        return None
    doc = dict(doc)
    # Remove all _id and make it string
    if "_id" in doc:
        doc[id_field] = str(doc.pop("_id"))
    # Remove any bytes/Binary fields if present
    for k, v in doc.items():
        if isinstance(v, (bytes, Binary)):
            doc[k] = None
    return doc


@staff_router.post("/leave-requests", response_model=LeaveRequestModel)
async def request_leave(
    leave: LeaveRequestModel,
    leave_requests_collection=Depends(leave_requests_collection)
):
    lreq = leave.dict(exclude_unset=True)
    result = leave_requests_collection.insert_one(lreq)
    mongo_doc = leave_requests_collection.find_one({"_id": result.inserted_id})
    clean_doc = clean_mongo_document(mongo_doc, id_field="leave_id")
    return LeaveRequestModel(**clean_doc)


@staff_router.get("/leave-requests", response_model=List[LeaveRequestModel])
async def list_leave_requests(leave_requests_collection=Depends(leave_requests_collection)):
    leaves = []
    for l in leave_requests_collection.find():
        clean_doc = clean_mongo_document(l, id_field="leave_id")
        try:
            leaves.append(LeaveRequestModel(**clean_doc))
        except Exception as e:
            print("Invalid leave record skipped:", clean_doc, e)
    return leaves


@staff_router.get("/{employee_id}/leave-requests", response_model=List[LeaveRequestModel])
async def get_employee_leaves(employee_id: str, leave_requests_collection=Depends(leave_requests_collection)):
    leaves = [obj_id_to_str(l, id_field="leave_id") for l in leave_requests_collection.find({"employee_id": employee_id})]
    return leaves


@staff_router.patch("/leave-requests/{employee_id}", response_model=LeaveRequestModel)
async def update_leave_request(
    employee_id: str,
    leave: LeaveRequestUpdateModel,
    leave_requests_collection=Depends(leave_requests_collection)
):
    update_data = leave.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")
    result = leave_requests_collection.update_one({"employee_id": employee_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Leave request not found")
    updated_leave = leave_requests_collection.find_one({"employee_id": employee_id})
    return obj_id_to_str(updated_leave, id_field="leave_id")


def safe_model_cast(model, data):
    if isinstance(data, model):
        return data
    if isinstance(data, dict):
        try:
            return model.model_validate(data)  # Pydantic v2
        except Exception:
            # fallback for v1
            return model(**{k: v for k, v in data.items() if k in model.model_fields})
    raise ValueError("Cannot cast to model")


@staff_router.get("/{employee_id}/history")
async def get_employee_history(
    employee_id: str,
    attendance_collection=Depends(attendance_collection),
    leave_requests_collection=Depends(leave_requests_collection)
):
    profile = employees_collection.find_one({"employee_id": employee_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Employee not found")
    profile = obj_id_to_str(profile)

    attendance_raw = [mongo_attendance_to_model(a) for a in attendance_collection.find({"user_id": employee_id})]
    leaves_raw = [obj_id_to_str(l, id_field="leave_id") for l in leave_requests_collection.find({"employee_id": employee_id})]
    documents = profile.get("documents", [])
    assets = profile.get("assets", [])

    result = {
        "employee_id": profile.get("employee_id"),
        "name": profile.get("name"),
        "email": profile.get("email"),
        "phone": profile.get("phone"),
        "position": profile.get("position"),
        "salary": profile.get("salary"),
        "location": profile.get("location"),
        "date_of_joining": profile.get("date_of_joining"),
        "shift": profile.get("shift"),
        "gender": profile.get("gender"),
        "documents": documents,
        "assets": assets,
        "leaves": leaves_raw,
        "attendance": attendance_raw
    }
    return result    


@staff_router.patch("/{employee_id}", response_model=EmployeeModel)
async def update_employee_general(
    employee_id: str,
    data: dict = Body(...),  # Accepts arbitrary fields to update
):
    existing = employees_collection.find_one({"employee_id": employee_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Employee not found")
    data.pop("employee_id", None)
    data.pop("id", None)
    result = employees_collection.update_one(
        {"employee_id": employee_id},
        {"$set": data}
    )
    updated = employees_collection.find_one({"employee_id": employee_id})
    if not updated:
        raise HTTPException(status_code=404, detail="Employee not found after update")
    updated["id"] = str(updated.pop("_id"))
    return EmployeeModel(**updated)
