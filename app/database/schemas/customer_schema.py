# from pydantic import BaseModel, Field, EmailStr
# from typing import List, Optional
# from datetime import datetime

# class FeedbackModel(BaseModel):
#     feedback_id: Optional[str] = None
#     user_id: str
#     content: str
#     created_at: Optional[datetime] = None
#     type: str = "feedback"


# class CommunicationLogModel(BaseModel):
#     log_id: Optional[str] = None
#     channel: str  # e.g., call, email, whatsapp
#     metadata: Optional[dict] = None
#     content: Optional[str] = None
#     timestamp: datetime = Field(default_factory=datetime.now)

# class TransactionModel(BaseModel):
#     transaction_id: Optional[str] = None
#     customer_id: str
#     amount: float
#     details: Optional[str] = None
#     timestamp: datetime = Field(default_factory=datetime.now)

# class CustomerProfileModel(BaseModel):
#     id: Optional[str] = None
#     name: str
#     email: EmailStr
#     phone: str
#     address: Optional[str]
#     created_at: datetime = Field(default_factory=datetime.now)


from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime

class FeedbackModel(BaseModel):
    id: Optional[str] = None
    customer_id: Optional[str] = None
    user_id: Optional[str] = None
    content: Optional[str] = None
    comment: Optional[str] = None  # Frontend uses comment instead of content
    rating: Optional[int] = None
    date: Optional[datetime] = Field(default_factory=datetime.now)
    type: str = "feedback"

class CommunicationLogModel(BaseModel):
    id: Optional[str] = None
    customer_id: Optional[str] = None
    channel: str  # e.g., call, email, whatsapp
    direction: Optional[str] = None  # inbound or outbound
    agent_id: Optional[str] = None
    by: Optional[str] = None  # Frontend uses "by" instead of agent_id
    metadata: Optional[Dict[str, Any]] = None
    content: Optional[str] = None
    message: Optional[str] = None  # Frontend uses message instead of content
    time: Optional[datetime] = Field(default_factory=datetime.now)

class TransactionModel(BaseModel):
    id: Optional[str] = None
    customer_id: Optional[str] = None
    amount: float
    payment_method: Optional[str] = None
    mode: Optional[str] = None  # Frontend uses mode instead of payment_method
    status: Optional[str] = "completed"
    details: Optional[str] = None
    remark: Optional[str] = None  # Frontend uses remark instead of details
    timestamp: Optional[datetime] = Field(default_factory=datetime.now)
    date: Optional[datetime] = None  # Frontend uses date instead of timestamp
    reference_id: Optional[str] = None
    order_id: Optional[str] = None  # Frontend uses order_id for reference

class NoteModel(BaseModel):
    id: Optional[str] = None
    customer_id: Optional[str] = None
    user_id: str
    author: Optional[str] = None  # Frontend uses author instead of user_id
    content: str
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None
    type: Optional[str] = "general"  # general, follow-up, etc.

class LoyaltyModel(BaseModel):
    id: Optional[str] = None
    customer_id: Optional[str] = None
    points: int
    action: Optional[str] = None  # earn, redeem, expire
    change: Optional[str] = None  # Frontend uses change to display +/- points
    reason: Optional[str] = None
    date: Optional[datetime] = Field(default_factory=datetime.now)
    expiry_date: Optional[datetime] = None
    
class ComplaintModel(BaseModel):
    id: Optional[str] = None
    customer_id: Optional[str] = None
    subject: str
    description: str
    status: Optional[str] = "open"  # open, in-progress, resolved, closed
    date: Optional[datetime] = None  # Frontend uses date
    priority: Optional[str] = "medium"  # low, medium, high
    assigned_to: Optional[str] = None
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
    resolved_at: Optional[datetime] = None
    resolution: Optional[str] = None

class ActivityLogModel(BaseModel):
    id: Optional[str] = None
    customer_id: Optional[str] = None
    action: str
    description: str
    details: Optional[str] = None  # Frontend uses details
    performed_by: Optional[str] = None
    user: Optional[str] = None  # Frontend uses user
    timestamp: Optional[datetime] = Field(default_factory=datetime.now)
    time: Optional[datetime] = None  # Frontend uses time
    metadata: Optional[Dict[str, Any]] = None

class CustomerProfileModel(BaseModel):
    id: Optional[str] = None
    name: str
    email: EmailStr
    password: Optional[str] = None
    phone: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    profile_picture: Optional[str] = None
    avatar_url: Optional[str] = None  # Frontend uses avatar_url
    company: Optional[str] = None
    job_title: Optional[str] = None
    birthday: Optional[datetime] = None
    date_of_birth: Optional[datetime] = None  # Frontend uses date_of_birth
    anniversary: Optional[datetime] = None
    age: Optional[int] = None  # Frontend uses age
    full_name: Optional[str] = None  # Frontend uses full_name as an alternative
    preferences: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    created_at: datetime = Field(default_factory=datetime.now)
    joined_on: Optional[datetime] = None  # Frontend uses joined_on
    updated_at: Optional[datetime] = None
    status: Optional[str] = "active"
    customer_type: Optional[str] = "regular"  # regular, vip, premium
    orders_count: Optional[int] = 0  # Frontend uses orders_count
    source: Optional[str] = None  # how the customer was acquired
    lifetime_value: Optional[float] = 0.0
    feedbacks: Optional[List[FeedbackModel]] = []
    communication_logs: Optional[List[CommunicationLogModel]] = []
    transactions: Optional[List[TransactionModel]] = []
    notes: Optional[List[NoteModel]] = []
    complaints: Optional[List[ComplaintModel]] = []
    activity_logs: Optional[List[ActivityLogModel]] = []