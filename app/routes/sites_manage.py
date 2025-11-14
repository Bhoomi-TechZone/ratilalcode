from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime
from bson import ObjectId
from app.database import sites_collection as sites_collection_dep
from app.database.schemas.sites_schema import SiteModel, SiteCreateModel
from app.dependencies import get_current_user

site_router = APIRouter(prefix="/api/sites", tags=["SiteManagement"], dependencies=[Depends(get_current_user)])


def obj_id_to_str(doc):
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    if "generator_ids" not in doc:
        doc["generator_ids"] = []
    if "assigned_employee_id" not in doc:
        doc["assigned_employee_id"] = None
    if "status" not in doc:
        doc["status"] = "Inactive"
    doc["last_updated"] = doc.pop("lastUpdated", None)
    doc["site_id"] = doc["id"]                 # Ensure site_id is present for frontend convenience
    doc["site_name"] = doc.get("site_name")    # Include site_name explicitly
    return doc


def find_site_by_employee(employee_id, sites_collection, exclude_site=None):
    query = {"assigned_employee_id": employee_id}
    if exclude_site:
        query["_id"] = {"$ne": ObjectId(exclude_site)}
    return sites_collection.find_one(query)


@site_router.post("/", response_model=SiteModel)
async def add_site(site: SiteCreateModel, sites_collection=Depends(sites_collection_dep)):
    doc = site.dict(exclude_unset=True)
    if "generator_ids" not in doc:
        doc["generator_ids"] = []
    if "assigned_employee_id" not in doc:
        doc["assigned_employee_id"] = None
    if "status" not in doc:
        doc["status"] = "Inactive"

    if doc["assigned_employee_id"]:
        assigned = find_site_by_employee(doc["assigned_employee_id"], sites_collection)
        if assigned:
            raise HTTPException(status_code=400, detail="Employee already assigned to another site")

    doc["lastUpdated"] = datetime.utcnow().isoformat()
    result = sites_collection.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return obj_id_to_str(doc)


@site_router.get("/", response_model=List[SiteModel])
async def list_sites(sites_collection=Depends(sites_collection_dep)):
    sites = [obj_id_to_str(site) for site in sites_collection.find()]
    return sites


@site_router.get("/{site_id}", response_model=SiteModel)
async def get_site(site_id: str, sites_collection=Depends(sites_collection_dep)):
    if not ObjectId.is_valid(site_id):
        raise HTTPException(status_code=400, detail="Invalid site ID")
    doc = sites_collection.find_one({"_id": ObjectId(site_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Site not found")
    return obj_id_to_str(doc)


@site_router.put("/{site_id}", response_model=SiteModel)
async def update_site(site_id: str, site: SiteCreateModel, sites_collection=Depends(sites_collection_dep)):
    if not ObjectId.is_valid(site_id):
        raise HTTPException(status_code=400, detail="Invalid site ID")
    old = sites_collection.find_one({"_id": ObjectId(site_id)})
    if not old:
        raise HTTPException(status_code=404, detail="Site not found")

    new_data = site.dict(exclude_unset=True)
    new_data["lastUpdated"] = datetime.utcnow().isoformat()

    # Preserve fields if not present in update payload
    if "generator_ids" not in new_data:
        new_data["generator_ids"] = old.get("generator_ids", [])
    if "assigned_employee_id" not in new_data:
        new_data["assigned_employee_id"] = old.get("assigned_employee_id", None)
    if "status" not in new_data:
        new_data["status"] = old.get("status", "Inactive")

    emp_id = new_data.get("assigned_employee_id")
    if emp_id:
        assigned = find_site_by_employee(emp_id, sites_collection, exclude_site=site_id)
        if assigned:
            raise HTTPException(status_code=400, detail="Employee already assigned to another site")

    sites_collection.update_one({"_id": ObjectId(site_id)}, {"$set": new_data})
    updated = sites_collection.find_one({"_id": ObjectId(site_id)})
    return obj_id_to_str(updated)


@site_router.delete("/{site_id}")
async def delete_site(site_id: str, sites_collection=Depends(sites_collection_dep)):
    if not ObjectId.is_valid(site_id):
        raise HTTPException(status_code=400, detail="Invalid site ID")
    res = sites_collection.delete_one({"_id": ObjectId(site_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Site not found")
    return {"detail": "Deleted successfully"}
