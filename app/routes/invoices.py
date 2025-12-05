# app/routers/invoices.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime, date
from app.database.schemas.invoice_schema import (
    InvoiceCreate, InvoiceUpdate, InvoiceModel, InvoiceFilter, InvoiceStatusEnum
)
from app.database.repositories.invoice_repoistory import InvoiceRepository
from app.dependencies import get_invoice_repo, accounts_required, get_current_user
from app.database import customers_collection

invoice_router = APIRouter(prefix="/api/invoices", tags=["Invoices & Billing"])

@invoice_router.get("/stats", response_model=dict)
async def invoice_stats(
    repo: InvoiceRepository = Depends(get_invoice_repo),
    current_user: dict = Depends(accounts_required)
):
    """Billing dashboard statistics"""
    try:
        # Get status counts
        pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
        status_results = list(repo.collection.aggregate(pipeline))
        status_stats = {result["_id"]: result["count"] for result in status_results}
        
        # Get overdue count
        overdue_count = repo.collection.count_documents({
            "status": {"$in": ["sent", "partial"]},
            "due_date": {"$lt": datetime.utcnow()}
        })
        
        # Get total paid amount
        paid_pipeline = [
            {"$match": {"status": "paid"}},
            {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
        ]
        paid_results = list(repo.collection.aggregate(paid_pipeline))
        total_paid = paid_results[0]["total"] if paid_results else 0
        
        return {
            "total_draft": status_stats.get("draft", 0),
            "total_overdue": overdue_count,
            "total_unpaid": status_stats.get("sent", 0) + status_stats.get("partial", 0),
            "total_paid": total_paid
        }
    except Exception as e:
        # Return empty stats if there's an error or no invoices exist
        return {
            "total_draft": 0,
            "total_overdue": 0,
            "total_unpaid": 0,
            "total_paid": 0
        }

@invoice_router.get("/statistics", response_model=dict)
async def invoice_statistics(
    period: Optional[str] = Query("monthly", description="monthly or yearly"),
    repo: InvoiceRepository = Depends(get_invoice_repo),
    current_user: dict = Depends(get_current_user)
):
    """Invoice statistics for dashboard"""
    try:
        # Get current month and previous month revenue
        current_date = datetime.now()
        current_month_start = current_date.replace(day=1)
        
        if current_date.month == 1:
            prev_month = current_date.replace(year=current_date.year - 1, month=12, day=1)
        else:
            prev_month = current_date.replace(month=current_date.month - 1, day=1)
        
        # Get next month first day to calculate current month end
        if current_date.month == 12:
            next_month = current_date.replace(year=current_date.year + 1, month=1, day=1)
        else:
            next_month = current_date.replace(month=current_date.month + 1, day=1)
        
        # Calculate current month revenue
        current_month_pipeline = [
            {
                "$match": {
                    "status": "paid",
                    "paid_at": {
                        "$gte": current_month_start,
                        "$lt": next_month
                    }
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total": {"$sum": "$total_amount"}
                }
            }
        ]
        
        current_month_result = list(repo.collection.aggregate(current_month_pipeline))
        current_month_revenue = current_month_result[0]["total"] if current_month_result else 0
        
        # Calculate previous month revenue  
        prev_month_pipeline = [
            {
                "$match": {
                    "status": "paid",
                    "paid_at": {
                        "$gte": prev_month,
                        "$lt": current_month_start
                    }
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total": {"$sum": "$total_amount"}
                }
            }
        ]
        
        prev_month_result = list(repo.collection.aggregate(prev_month_pipeline))
        prev_month_revenue = prev_month_result[0]["total"] if prev_month_result else 0
        
        # Get daily revenue trend for current month
        daily_pipeline = [
            {
                "$match": {
                    "status": "paid",
                    "paid_at": {
                        "$gte": current_month_start,
                        "$lt": next_month
                    }
                }
            },
            {
                "$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$paid_at"}},
                    "amount": {"$sum": "$total_amount"},
                    "orders_count": {"$sum": 1}
                }
            },
            {
                "$sort": {"_id": 1}
            }
        ]
        
        daily_result = list(repo.collection.aggregate(daily_pipeline))
        daily_trend = [{"date": item["_id"], "amount": item["amount"], "orders_count": item["orders_count"]} for item in daily_result]
        
        return {
            "success": True,
            "current_month_revenue": current_month_revenue,
            "previous_month_revenue": prev_month_revenue,
            "period": period,
            "daily_trend": daily_trend
        }
        
    except Exception as e:
        return {
            "success": True,
            "current_month_revenue": 0,
            "previous_month_revenue": 0,
            "period": period,
            "daily_trend": []
        }

@invoice_router.post("/", response_model=InvoiceModel, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    invoice_data: InvoiceCreate,
    repo: InvoiceRepository = Depends(get_invoice_repo),
    current_user: dict = Depends(accounts_required)
):
    """Create new invoice (Accounts team only)"""
    # Auto-generate invoice_number
    from app.database import get_next_sequence, get_database
    db = get_database()
    invoice_number = f"INV-{get_next_sequence(db, 'invoice_number'):06d}"
    
    invoice_dict = invoice_data.dict()
    invoice_dict["invoice_number"] = invoice_number
    
    # If customer_id is provided, try to fetch customer details
    if invoice_dict.get("customer_id") and invoice_dict["customer_id"] != "dummy-customer-id":
        try:
            from bson import ObjectId
            customer = customers_collection().find_one({"_id": ObjectId(invoice_dict["customer_id"])})
            if customer:
                invoice_dict["customer_name"] = customer.get("name", invoice_dict.get("customer_name"))
                invoice_dict["customer_email"] = customer.get("email", invoice_dict.get("customer_email"))
                invoice_dict["customer_phone"] = customer.get("phone", invoice_dict.get("customer_phone"))
                invoice_dict["customer_address"] = customer.get("address", invoice_dict.get("customer_address"))
        except Exception as e:
            # If customer lookup fails, use the provided data
            pass
    
    invoice = repo.create_invoice(invoice_dict)
    return invoice

@invoice_router.get("/{invoice_id}", response_model=InvoiceModel)
async def get_invoice(
    invoice_id: str,
    repo: InvoiceRepository = Depends(get_invoice_repo),
    current_user: dict = Depends(accounts_required)
):
    """Get single invoice details"""
    invoice = repo.get_invoice(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@invoice_router.put("/{invoice_id}", response_model=InvoiceModel)
async def update_invoice(
    invoice_id: str,
    update_data: InvoiceUpdate,
    repo: InvoiceRepository = Depends(get_invoice_repo),
    current_user: dict = Depends(accounts_required)
):
    """Update invoice status, notes, items"""
    invoice = repo.get_invoice(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    update_dict = {k: v for k, v in update_data.dict(exclude_unset=True).items() if v is not None}
    updated_invoice = repo.update_invoice(invoice_id, update_dict)
    return updated_invoice

@invoice_router.post("/{invoice_id}/mark-paid", status_code=status.HTTP_200_OK)
async def mark_invoice_paid(
    invoice_id: str,
    paid_at: Optional[datetime] = None,
    repo: InvoiceRepository = Depends(get_invoice_repo),
    current_user: dict = Depends(accounts_required)
):
    """Mark invoice as paid"""
    success = repo.mark_paid(invoice_id, paid_at)
    if not success:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"message": "Invoice marked as paid"}

@invoice_router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(
    invoice_id: str,
    repo: InvoiceRepository = Depends(get_invoice_repo),
    current_user: dict = Depends(accounts_required)
):
    """Delete invoice (irreversible)"""
    success = repo.delete_invoice(invoice_id)
    if not success:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return None

@invoice_router.get("/", response_model=dict)
async def list_invoices(
    customer_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    overdue: Optional[bool] = Query(False),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    repo: InvoiceRepository = Depends(get_invoice_repo),
    current_user: dict = Depends(accounts_required)
):
    """List invoices with filters (Accounts dashboard)"""
    skip = (page - 1) * limit
    filters = {
        "customer_id": customer_id,
        "status": [status] if status and status.strip() else None,
    }
    if overdue:
        from datetime import datetime, timedelta
        overdue_date = datetime.utcnow() - timedelta(days=30)
        filters["due_date"] = {"$lt": overdue_date}
        filters["status"] = {"$in": ["sent", "partial"]}
    
    invoices, total = repo.list_invoices(filters, skip=skip, limit=limit)
    return {
        "invoices": invoices,
        "total": total,
        "page": page,
        "limit": limit,
        "has_next": skip + limit < total
    }
