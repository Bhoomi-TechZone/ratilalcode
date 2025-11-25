from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime

class TaskStatusUpdate(BaseModel):
    status: str = Field(..., description="New status of the task", example="completed")
    approved_by: Optional[str] = Field(None, description="User ID who approved the task")
    remarks: Optional[str] = Field(None, description="Remarks or comments")

class TaskModel(BaseModel):
    id: Optional[str] = Field(None, description="Custom Task ID e.g. tsk-01")
    title: str = Field(..., description="Title of the task")
    assigned_to: str = Field(..., description="Readable user id e.g. USR-001")
    status: str = Field(default="pending", description="Current status of the task")
    linked_type: Optional[str] = Field(None, description="Type of linked object")
    linked_id: Optional[str] = Field(None, description="ID of linked object")
    site_name: Optional[str] = Field(None, description="Linked site name (joined)")
    created_by: Optional[str] = Field(None, description="Readable id of creator (USR-XXX)")
    created_at: Optional[datetime] = Field(None, description="Task creation timestamp")
    due_date: Optional[date] = Field(None, description="Due date for the task")
    approved_by: Optional[str] = Field(None, description="Readable user id of approver")
    approved_at: Optional[datetime] = Field(None, description="Approval time")
    remarks: Optional[str] = Field(None, description="Remarks or comments")

    class Config:
        orm_mode = True
