# app/routers/tickets.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime
from app.database.schemas.ticket_schema import (
    TicketCreate, TicketUpdate, TicketModel, TicketFilter, StatusEnum, PriorityEnum, TicketResponse
)
from app.database.repositories.ticket_repository import TicketRepository
from app.dependencies import get_ticket_repo, support_required, get_current_user

ticket_router = APIRouter(prefix="/api/tickets", tags=["Support Tickets"])

@ticket_router.post("/", response_model=TicketModel, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    ticket_data: TicketCreate,
    repo: TicketRepository = Depends(get_ticket_repo),
    current_user: dict = Depends(get_current_user)
):
    """Create new support ticket (Any authenticated user)"""
    # Auto-set ticket_number using your sequence
    from app.database import get_next_sequence, get_database
    db = get_database()
    ticket_number = f"TICKET-{get_next_sequence(db, 'ticket_number'):06d}"
    
    ticket_data_dict = ticket_data.dict()
    ticket_data_dict["ticket_number"] = ticket_number
    
    # Set raised_by from current user
    user_id = current_user.get("user_id") or current_user.get("id") or str(current_user.get("_id"))
    ticket_data_dict["raised_by"]["user_id"] = user_id
    
    # Initialize empty arrays
    ticket_data_dict["resolution_log"] = []
    ticket_data_dict["status_history"] = [{
        "status": "open",
        "changed_by": "System",
        "timestamp": datetime.utcnow()
    }]
    
    ticket = repo.create_ticket(ticket_data_dict)
    return ticket

@ticket_router.get("/stats", response_model=dict)
async def ticket_stats(
    repo: TicketRepository = Depends(get_ticket_repo),
    current_user: dict = Depends(get_current_user)
):
    """Dashboard statistics for support team"""
    user_roles = current_user.get("token_data", {}).get("roles", [])
    has_support_access = "admin" in user_roles or "support" in user_roles
    
    if not has_support_access:
        raise HTTPException(status_code=403, detail="Only support team can view statistics")
    
    pipeline = [
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1}
        }}
    ]
    status_stats = list(repo.collection.aggregate(pipeline))
    status_dict = {item["_id"]: item["count"] for item in status_stats}
    
    high_priority = repo.collection.count_documents({
        "status": {"$in": ["open", "in_progress"]},
        "priority": "high"
    })
    
    return {
        "total_open": status_dict.get("open", 0),
        "total_in_progress": status_dict.get("in_progress", 0),
        "total_resolved": status_dict.get("resolved", 0),
        "total_closed": status_dict.get("closed", 0),
        "high_priority_open": high_priority
    }

@ticket_router.get("/{ticket_id}", response_model=TicketModel)
async def get_ticket(
    ticket_id: str,
    repo: TicketRepository = Depends(get_ticket_repo),
    current_user: dict = Depends(get_current_user)
):
    """Get single ticket details (accessible to ticket creator and support team)"""
    ticket = repo.get_ticket_by_id(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check access: user must be ticket creator, assigned vendor, or have support access
    user_id = current_user.get("user_id") or current_user.get("id") or str(current_user.get("_id"))
    user_roles = current_user.get("token_data", {}).get("roles", [])
    
    is_creator = ticket.get("raised_by", {}).get("user_id") == user_id
    is_assigned_vendor = ticket.get("assigned_to_vendor") == user_id
    has_support_access = "admin" in user_roles or "support" in user_roles
    
    if not (is_creator or is_assigned_vendor or has_support_access):
        raise HTTPException(status_code=403, detail="Not authorized to view this ticket")
    
    return ticket

@ticket_router.put("/{ticket_id}", response_model=TicketModel)
async def update_ticket(
    ticket_id: str,
    update_data: TicketUpdate,
    repo: TicketRepository = Depends(get_ticket_repo),
    current_user: dict = Depends(get_current_user)
):
    """Update ticket status, assignee, priority (Support/Admin only for most fields)"""
    ticket = repo.get_ticket_by_id(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    user_roles = current_user.get("token_data", {}).get("roles", [])
    has_support_access = "admin" in user_roles or "support" in user_roles
    
    if not has_support_access:
        raise HTTPException(status_code=403, detail="Only support team can update tickets")
    
    update_dict = {k: v for k, v in update_data.dict(exclude_unset=True).items() if v is not None}
    
    # Add status history if status is being changed
    if "status" in update_dict:
        user_name = current_user.get("full_name") or current_user.get("username") or "System"
        updated_ticket = repo.update_status(ticket_id, update_dict["status"], user_name)
        del update_dict["status"]
        if update_dict:  # If there are other fields to update
            updated_ticket = repo.update_ticket(ticket_id, update_dict)
    else:
        updated_ticket = repo.update_ticket(ticket_id, update_dict)
    
    return updated_ticket

@ticket_router.delete("/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ticket(
    ticket_id: str,
    repo: TicketRepository = Depends(get_ticket_repo),
    current_user: dict = Depends(support_required)
):
    """Delete ticket (irreversible)"""
    success = repo.delete_ticket(ticket_id)
    if not success:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return None

@ticket_router.get("/", response_model=dict)
async def list_tickets(
    status: Optional[List[StatusEnum]] = Query(None),
    priority: Optional[List[PriorityEnum]] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    repo: TicketRepository = Depends(get_ticket_repo),
    current_user: dict = Depends(get_current_user)
):
    """List tickets (Support sees all, customers/vendors see their own)"""
    skip = (page - 1) * limit
    user_id = current_user.get("user_id") or current_user.get("id") or str(current_user.get("_id"))
    user_roles = current_user.get("token_data", {}).get("roles", [])
    
    filters = {
        "status": status,
        "priority": priority,
    }
    
    # If not support/admin, filter to only user's tickets
    has_support_access = "admin" in user_roles or "support" in user_roles
    if not has_support_access:
        # Show tickets raised by user OR assigned to user (if vendor)
        tickets_raised = repo.list_tickets({**filters, "raised_by": user_id}, skip=skip, limit=limit)
        tickets_assigned = repo.list_tickets({**filters, "assigned_to_vendor": user_id}, skip=skip, limit=limit)
        
        # Combine and deduplicate
        all_tickets = {t["id"]: t for t in tickets_raised[0] + tickets_assigned[0]}
        tickets = list(all_tickets.values())
        total = len(tickets)
    else:
        tickets, total = repo.list_tickets(filters, skip=skip, limit=limit)
    
    return {
        "tickets": tickets,
        "total": total,
        "page": page,
        "limit": limit,
        "has_next": skip + limit < total
    }

@ticket_router.get("/my", response_model=dict)
async def my_tickets(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    repo: TicketRepository = Depends(get_ticket_repo),
    current_user: dict = Depends(get_current_user)  # ✅ Customers can see own tickets
):
    """List tickets raised by current user (Customer self-service)"""
    skip = (page - 1) * limit
    filters = {"raised_by.user_id": current_user["id"]}
    tickets, total = repo.list_tickets(filters, skip=skip, limit=limit)
    return {
        "tickets": tickets,
        "total": total,
        "page": page,
        "limit": limit,
        "has_next": skip + limit < total
    }

@ticket_router.post("/{ticket_id}/responses", response_model=TicketModel)
async def add_ticket_response(
    ticket_id: str,
    response: TicketResponse,
    repo: TicketRepository = Depends(get_ticket_repo),
    current_user: dict = Depends(get_current_user)
):
    """Add a response/comment to a ticket"""
    ticket = repo.get_ticket_by_id(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    user_id = current_user.get("user_id") or current_user.get("id") or str(current_user.get("_id"))
    user_roles = current_user.get("token_data", {}).get("roles", [])
    
    # Check if user can respond to this ticket
    is_creator = ticket.get("raised_by", {}).get("user_id") == user_id
    is_assigned_vendor = ticket.get("assigned_to_vendor") == user_id
    has_support_access = "admin" in user_roles or "support" in user_roles
    
    if not (is_creator or is_assigned_vendor or has_support_access):
        raise HTTPException(status_code=403, detail="Not authorized to respond to this ticket")
    
    response_data = {
        "author_id": user_id,
        "author_role": user_roles[0] if user_roles else "user",
        "message": response.message,
        "internal": response.internal if has_support_access else False  # Only support can mark as internal
    }
    
    updated_ticket = repo.add_response(ticket_id, response_data)
    return updated_ticket

@ticket_router.put("/{ticket_id}/status", response_model=TicketModel)
async def update_ticket_status(
    ticket_id: str,
    new_status: StatusEnum,
    repo: TicketRepository = Depends(get_ticket_repo),
    current_user: dict = Depends(get_current_user)
):
    """Update ticket status"""
    ticket = repo.get_ticket_by_id(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    user_roles = current_user.get("token_data", {}).get("roles", [])
    has_support_access = "admin" in user_roles or "support" in user_roles
    
    if not has_support_access:
        raise HTTPException(status_code=403, detail="Only support team can update ticket status")
    
    user_name = current_user.get("full_name") or current_user.get("username") or "System"
    updated_ticket = repo.update_status(ticket_id, new_status.value, user_name)
    
    return updated_ticket
