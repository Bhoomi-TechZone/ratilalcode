from fastapi import FastAPI, Query
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from app.routes.auth import auth_router
from app.routes.roles import roles_router
from app.routes.admin import admin_router
import logging,os
from app.routes.permission import permission_router
from typing import List
import logging
    
from app.routes.customer import customer_router
from app.routes.staff_management import staff_router
from app.routes.stock_management import stock_router
from app.routes.task import task_router
from app.routes.admin import admin_router
from app.routes.users import users_router
from app.routes.alerts import alerts_router
from app.routes.generators_utility import generators_router
from app.routes.sites_manage import site_router
from app.routes.employees_new import employees_router as yelop  
from app.routes.hrstaffroute import hr_staff_router    
from app.routes.access_check import access_router  

from dotenv import load_dotenv
load_dotenv()  


# Create the FastAPI app
app = FastAPI(
    title="Ratilal&Sons API",
    description="API for Ratilal & Sons CRM System",
    version="1.0.0"
)

# CORS configuration
origins = [
    # 1. Primary Live Frontend URL
    "https://ratilalandsons.onrender.com",
    "https://ratilalandsonscrm.onrender.com",

    # 2. Other FrontendLocal URLs for development and testing
    "http://localhost:4000",
    "http://127.0.0.1:4000",
    "http://localhost:3000",
    "http://localhost:8000",
    "https://ratilalandsonscrm.onrender.com",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:8004",
    "http://127.0.0.1:3005",
    "*"  # For development only - remove in production
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
)

# Include ONLY the auth router for now
app.include_router(auth_router)
app.include_router(roles_router)
app.include_router(admin_router)
app.include_router(permission_router)
# app.include_router(franchise_router)
app.include_router(customer_router)
app.include_router(staff_router)
app.include_router(stock_router)
# app.include_router(payment_router)
app.include_router(task_router)
app.include_router(admin_router)
app.include_router(users_router)
app.include_router(yelop)
app.include_router(hr_staff_router) 
app.include_router(access_router, prefix="/api") 
app.include_router(alerts_router)
app.include_router(generators_router)
app.include_router(site_router)
# Initialize logging
logging.info("Roles router initialized and registered")
logging.info("HR Staff router initialized and registered")

@app.on_event("startup")
async def startup_event():
    from app.background.alerts_jobs import start_alert_scheduler
    start_alert_scheduler()

# Debug HR Staff router routes
for route in hr_staff_router.routes:
    logging.info(f"HR Staff route registered: {route.path} [{', '.join(route.methods)}]")
os.makedirs("employee_document", exist_ok=True)

app.mount("/css", StaticFiles(directory="app/static/css"), name="css")
app.mount("/js", StaticFiles(directory="app/static/js"), name="js")
app.mount("/static", StaticFiles(directory="app/static"), name="static")
# app.mount("/uploaded_pdfs", StaticFiles(directory="uploaded_pdfs"), name="uploaded_pdfs")
# app.mount("/employee_document", StaticFiles(directory="employee_document"), name="employee_document")
# app.mount(
#     "/kyc_document",
#     StaticFiles(directory="static/kyc_document"),
#     name="kyc_document"
# )
# Root endpoint

@app.get("/")
async def root():
    return {
        "message": "Ratilal&Sons CRM API",
        "version": "1.0.0",
        "status": "running",
        "timestamp": "2025-05-29 11:49:41",
        "user": "Ratilal"
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": "2025-05-29 11:49:41"
    }
    
@app.get("/index")
async def index():
    """Index endpoint for testing"""
    return FileResponse("app/static/index.html")

# Debug endpoint to check registered routes
@app.get("/debug/routes")
async def list_routes():
    """List all registered routes (admin or dev use only)"""
    routes = []
    for route in app.routes:
        if hasattr(route, "methods") and hasattr(route, "path"):
            routes.append({
                "path": route.path,
                "methods": list(route.methods),
                "name": route.name if hasattr(route, "name") else None,
            })
    return {"routes": routes}
