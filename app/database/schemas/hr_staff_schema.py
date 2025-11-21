from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date

class GeneralInfoModel(BaseModel):
    joiningDate: str
    accessRole: str
    department: str
    shift: str
    flexibility: str
    manager: str
    employment: str

class ContactInfoModel(BaseModel):
    contractType: str
    period: str

class SalaryInfoModel(BaseModel):
    ctc: Optional[str] = ""
    variable: Optional[str] = ""
    bonus: Optional[str] = ""
    lastIncrement: Optional[str] = ""
    nextIncrement: Optional[str] = ""

class DailyReportModel(BaseModel):
    report_id: Optional[str] = None
    employee_id: str
    date: Optional[str] = None  # YYYY-MM-DD
    content: str
    status:str = Field(default="pending")
    timestamp: Optional[datetime] = Field(default_factory=datetime.now)
class DailyReportUpdateModel(BaseModel):
    content: str

class DocumentModel(BaseModel):
    name: str
    uploaded: str
    url: str

class AssetModel(BaseModel):
    name: str
    type: str
    issued: str
    status: str

class LeaveRequestModel(BaseModel):
    # leave_id: Optional[str] = Field(default=None, description="Unique identifier for the leave request")
    employee_id: str
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD
    reason: Optional[str] = None
    status: Optional[str] = Field(default="pending")
    timestamp: Optional[datetime] = Field(default_factory=datetime.now)
    message: Optional[str] = None  # Additional message or notes regarding the leave request

    class Config:
        orm_mode = True
                
class LeaveRequestUpdateModel(BaseModel):
    employee_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    reason: Optional[str] = None
    status: Optional[str] = None
    timestamp: Optional[datetime] = None
    message: Optional[str] = None

    class Config:
        orm_mode = True

class AttendanceModel(BaseModel):
    attendance_id: Optional[str] = Field(None, description="Unique ID for the attendance record")
    employee_id: str = Field(..., description="Employee/User ID for whom attendance is marked")
    attendance_date: date = Field(..., description="Date of attendance in YYYY-MM-DD format")
    checkin_time: Optional[datetime] = Field(None, description="Check-in timestamp (ISO format)")
    checkout_time: Optional[datetime] = Field(None, description="Check-out timestamp (ISO format)")
    status: str = Field(..., description="Attendance status - present/absent/leave/late")
    checkin_lat: Optional[float] = Field(None, description="Latitude for check-in location")
    checkin_long: Optional[float] = Field(None, description="Longitude for check-in location")
    checkin_location: Optional[str] = Field(None, description="Human-readable location/address for check-in")
    checkout_lat: Optional[float] = Field(None, description="Latitude for check-out location")
    checkout_long: Optional[float] = Field(None, description="Longitude for check-out location")
    checkout_location: Optional[str] = Field(None, description="Human-readable location/address for check-out")
    created_by: Optional[str] = Field(None, description="Who created/modified this record (employee/HR/admin)")
    notes: Optional[str] = Field(None, description="Notes or manual override reasons")
    is_manual: Optional[bool] = Field(False, description="True if this entry is a manual HR/admin override")
    last_modified: Optional[datetime] = Field(None, description="Record last modified timestamp")
    overtime_minutes: Optional[int] = Field(None, description="Overtime minutes worked (computed)")
    late_minutes: Optional[int] = Field(None, description="Minutes late (computed by backend/report)")

    class Config:
        orm_mode = True

class AttendanceReportModel(BaseModel):
    employee_id: str
    employee_name: str
    total_days: int
    present_days: int
    absent_days: int
    late_days: int
    total_working_minutes: int
    overtime_minutes: int
    late_minutes: int

class AttendanceAlertModel(BaseModel):
    employee_id: str
    employee_name: str
    alert_type: str  # "inactivity" / "overtime" / "absent" / "late"
    alert_date: date
    alert_message: str
    resolved: bool = False

class EmployeeModel(BaseModel):
    employee_id: Optional[str] = None
    name: str
    email: str
    phone: str
    position: str
    salary: Optional[float] = None  # Optional, since salaryInfo is now nested
    location: Optional[str] = None
    date_of_joining: Optional[str] = None
    shift: Optional[str] = None  # New field for shift
    gender: Optional[str] = None  # New field
    # New fields matching your UI/JSON
    lastActive: Optional[str] = None
    initials: Optional[str] = None
    tabs: Optional[List[str]] = None

    generalInfo: Optional[GeneralInfoModel] = None
    contactInfo: Optional[ContactInfoModel] = None
    salaryInfo: Optional[SalaryInfoModel] = None
    documents: Optional[List[DocumentModel]] = []
    assets: Optional[List[AssetModel]] = []
    leaves: Optional[List[LeaveRequestModel]] = []
    attendance: Optional[List[AttendanceModel]] = []

    class Config:
        orm_mode = True 
