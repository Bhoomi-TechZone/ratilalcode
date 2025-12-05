# app/database/schemas/invoice_schema.py
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
from bson import ObjectId

class InvoiceStatusEnum(str, Enum):
    draft = "draft"
    sent = "sent"
    partial = "partial"
    paid = "paid"
    overdue = "overdue"
    cancelled = "cancelled"

class InvoiceItem(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    quantity: float = Field(..., ge=0.01)
    unit_price: float = Field(..., ge=0)
    tax_rate: float = Field(0.0, ge=0, le=100)
    
    @validator('unit_price')
    def validate_unit_price(cls, v):
        if v < 0:
            raise ValueError('Unit price cannot be negative')
        return v
    
    @property
    def total(self) -> float:
        return self.quantity * self.unit_price * (1 + self.tax_rate / 100)

class InvoiceFilter(BaseModel):
    customer_id: Optional[str] = None
    status: Optional[List[InvoiceStatusEnum]] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    overdue: Optional[bool] = None
    page: int = 1
    limit: int = 20

class InvoiceBase(BaseModel):
    customer_id: str
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    invoice_number: str = Field(..., pattern=r"^INV-\d{6}$")
    items: List[InvoiceItem] = Field(..., min_items=1, max_items=100)
    subtotal: float = Field(..., ge=0)
    tax_amount: float = Field(0.0, ge=0)
    total_amount: float = Field(..., ge=0)
    due_date: datetime
    notes: Optional[str] = None
    status: InvoiceStatusEnum = InvoiceStatusEnum.draft

class InvoiceCreate(BaseModel):
    customer_id: str
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    items: List[InvoiceItem] = Field(..., min_items=1, max_items=100)
    subtotal: float = Field(..., ge=0)
    tax_amount: float = Field(0.0, ge=0)
    total_amount: float = Field(..., ge=0)
    due_date: datetime
    notes: Optional[str] = None
    status: InvoiceStatusEnum = InvoiceStatusEnum.draft

class InvoiceUpdate(BaseModel):
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    items: Optional[List[InvoiceItem]] = None
    subtotal: Optional[float] = None
    tax_amount: Optional[float] = None
    total_amount: Optional[float] = None
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    status: Optional[InvoiceStatusEnum] = None
    paid_at: Optional[datetime] = None

class InvoiceStats(BaseModel):
    total_invoices: int
    draft: int
    sent: int
    paid: int
    overdue: int
    unpaid_amount: float
    avg_invoice_value: float

class InvoiceListResponse(BaseModel):
    invoices: List[Dict[str, Any]]
    total: int
    page: int
    limit: int
    has_next: bool

class InvoiceModel(InvoiceBase):
    id: str
    created_at: datetime
    updated_at: datetime
    paid_at: Optional[datetime] = None
    linked_tickets: List[str] = Field(default_factory=list)  # ✅ TICKET INTEGRATION
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    
    class Config:
        from_attributes = True
        populate_by_name = True
