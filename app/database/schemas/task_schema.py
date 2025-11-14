# from pydantic import BaseModel, Field
# from typing import Optional, Literal
# from datetime import date, datetime


# class TaskStatusUpdate(BaseModel):
#     status: str= Field(..., description="New status of the task", example="completed")
#     approved_by: Optional[str] = None
#     remarks: Optional[str] = None

# class TaskModel(BaseModel):
#     title: str
#     assigned_to: str
#     due_date: date
#     status: str = Field(default="pending")
#     linked_type: Optional[str] = None  # e.g., "lead", "franchise"
#     linked_id: Optional[str] = None
#     created_by: Optional[str] = None
#     approved_by: Optional[str] = None
#     created_at: Optional[datetime] = None
#     approved_at: Optional[date] = None
#     remarks: Optional[str] = None



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
    assigned_to: str = Field(..., description="ID of the user assigned to this task (app user ID, e.g. USR-102)")
    due_date: date = Field(..., description="Due date of the task")
    status: str = Field(default="pending", description="Current status of the task")
    linked_type: Optional[str] = Field(None, description="Type of linked object (if any), e.g. 'maintenance'")
    linked_id: Optional[str] = Field(None, description="ID of linked object (if any)")
    created_by: Optional[str] = Field(None, description="ID of the user who created the task")
    approved_by: Optional[str] = Field(None, description="ID of the user who approved the task")
    created_at: Optional[datetime] = Field(None, description="Timestamp when task was created (ISO format)")
    approved_at: Optional[datetime] = Field(None, description="Timestamp when task was approved (ISO format)")
    remarks: Optional[str] = Field(None, description="Remarks or comments")

    class Config:
        orm_mode = True
