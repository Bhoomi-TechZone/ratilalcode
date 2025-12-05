from fastapi import APIRouter, HTTPException, Query, Depends
from bson import ObjectId
from typing import Optional, List, Dict
from datetime import datetime, timedelta
from pymongo.collection import Collection
from app.database.schemas.stock_schema import ProductModel, StockModel, StockLogModel
from app.database import products_collection, stock_collection, stock_logs_collection, customers_collection
from app.dependencies import get_current_user
from pydantic import BaseModel

# Add vendor products collection for catalog management
def vendor_products_collection():
    from app.database.async_db import db
    return db["vendor_products"]

class VendorProductModel(BaseModel):
    """Model for vendor product catalog entries"""
    inventory_product_id: str  # Reference to inventory product
    vendor_id: Optional[str] = None
    is_active: bool = True
    custom_price: Optional[float] = None  # Override price if different from inventory
    min_order_qty: int = 1
    max_order_qty: Optional[int] = None
    description_override: Optional[str] = None
    date_added: Optional[datetime] = None

stock_router = APIRouter(prefix="/api/stock", tags=["Inventory"], dependencies=[Depends(get_current_user)])


def obj_id_to_str(doc):
    doc["id"] = str(doc.pop("_id"))
    return doc


def generate_sku(name: str, products_collection):
    prefix = ''.join([c for c in name if c.isalnum()]).upper()[:2]
    regex = f"^{prefix}-\\d+$"
    last = products_collection.find_one({"sku": {"$regex": regex}}, sort=[("sku", -1)])
    if last and "sku" in last:
        try:
            last_num = int(last["sku"].split("-")[1])
            new_num = last_num + 1
        except Exception:
            new_num = 1
    else:
        new_num = 1
    return f"{prefix}-{new_num:03d}"


async def update_stock_logic(
    stock: StockModel,
    type: str,
    remarks: Optional[str],
    stock_collection,
    products_collection,
    stock_logs_collection,
    customers_collection
):
    query = {"product_id": stock.product_id, "location": stock.location}
    existing = stock_collection.find_one(query)
    change_qty = stock.quantity if type == "in" else -stock.quantity
    now = datetime.now()

    if existing:
        before_qty = existing["quantity"]
        new_qty = before_qty + change_qty
        if new_qty < 0:
            raise HTTPException(status_code=400, detail="Insufficient stock")
        stock_collection.update_one(query, {"$set": {"quantity": new_qty, "date": now}})
        stock_id = existing["_id"]
        after_qty = new_qty
    else:
        before_qty = 0
        if change_qty < 0:
            raise HTTPException(status_code=400, detail="Insufficient stock")
        result = stock_collection.insert_one({
            "product_id": stock.product_id,
            "location": stock.location,
            "quantity": change_qty,
            "date": now
        })
        stock_id = result.inserted_id
        after_qty = change_qty

    product = (
        products_collection.find_one({"_id": ObjectId(stock.product_id)})
        if ObjectId.is_valid(stock.product_id) else None
    )
    product_name = product["name"] if product else "Unknown"

    customer_id = getattr(stock, "customer_id", None)
    customer_name = None
    customer_city = None
    if customer_id:
        customer = None
        if ObjectId.is_valid(str(customer_id)):
            customer = customers_collection.find_one({"_id": ObjectId(customer_id)})
        else:
            customer = customers_collection.find_one({"id": customer_id})
        if customer:
            customer_name = customer.get("name")
            customer_city = customer.get("city") or ""

    stock_log = StockLogModel(
        product_id=stock.product_id,
        product_name=product_name,
        location=stock.location,
        type=type,
        quantity=stock.quantity,
        before_quantity=before_qty,
        after_quantity=after_qty,
        by=stock.by if stock.by else "system",
        status=type,
        remarks=remarks,
        date=now,
        customer_id=customer_id,
        customer_name=customer_name,
        customer_city=customer_city
    )
    stock_logs_collection.insert_one(stock_log.dict(exclude_unset=True))
    return True


@stock_router.post("/products", response_model=ProductModel)
async def add_product(
    product: ProductModel,
    products_collection=Depends(products_collection),
    stock_collection=Depends(stock_collection),
    stock_logs_collection=Depends(stock_logs_collection),
    customers_collection=Depends(customers_collection)
):
    now = datetime.now()
    prod = product.dict(exclude_unset=True, by_alias=True)
    if not prod.get("sku"):
        prod["sku"] = generate_sku(prod["name"], products_collection)
    prod["date"] = now
    result = products_collection.insert_one(prod)
    prod_id = str(result.inserted_id)
    prod["product_id"] = prod_id

    # Initial warehouse stock
    warehouse_qty = prod.get("warehouse_qty", 0)
    if warehouse_qty and warehouse_qty > 0:
        await update_stock_logic(
            stock=StockModel(
                product_id=prod_id,
                location="Warehouse",
                quantity=warehouse_qty,
                by="system",
            ),
            type="in",
            remarks="Initial stock-in on product creation",
            stock_collection=stock_collection,
            products_collection=products_collection,
            stock_logs_collection=stock_logs_collection,
            customers_collection=customers_collection
        )

    # Initial depot stock
    depot_qty: Dict[str, int] = prod.get("depot_qty", {}) or {}
    for depot, qty in depot_qty.items():
        if qty and qty > 0:
            await update_stock_logic(
                stock=StockModel(
                    product_id=prod_id,
                    location=depot,
                    quantity=qty,
                    by="system",
                ),
                type="in",
                remarks="Initial stock-in on product creation",
                stock_collection=stock_collection,
                products_collection=products_collection,
                stock_logs_collection=stock_logs_collection,
                customers_collection=customers_collection
            )

    # Fetch updated stock per location
    stocks = list(stock_collection.find({"product_id": prod_id}))
    warehouse_qty = 0
    depot_qty = {}
    for s in stocks:
        loc = s["location"]
        qty = s["quantity"]
        if loc.lower() == "warehouse":
            warehouse_qty += qty
        else:
            depot_qty[loc] = qty

    prod["warehouse_qty"] = warehouse_qty
    prod["depot_qty"] = depot_qty
    prod["date"] = prod["date"].isoformat()
    return prod


@stock_router.patch("/update", response_model=StockModel)
async def update_stock(
    stock: StockModel,
    type: str = Query(..., description="in or out"),
    remarks: Optional[str] = None,
    stock_collection=Depends(stock_collection),
    products_collection=Depends(products_collection),
    stock_logs_collection=Depends(stock_logs_collection),
    customers_collection=Depends(customers_collection)
):
    await update_stock_logic(
        stock,
        type,
        remarks,
        stock_collection,
        products_collection,
        stock_logs_collection,
        customers_collection
    )

    query = {"product_id": stock.product_id, "location": stock.location}

    curr = stock_collection.find_one(query)
    curr = obj_id_to_str(curr)

    curr["stock_id"] = str(curr["_id"])
    product = products_collection.find_one({"_id": ObjectId(stock.product_id)}) if ObjectId.is_valid(stock.product_id) else None
    curr["product_name"] = product["name"] if product else "Unknown"
    curr["type"] = type
    curr["by"] = stock.by if stock.by else "system"

    # Calculate warehouse and depot qtys
    stocks = list(stock_collection.find({"product_id": stock.product_id}))
    warehouse_qty = 0
    depot_qty = {}
    for s in stocks:
        loc = s["location"]
        qty = s["quantity"]
        if loc.lower() == "warehouse":
            warehouse_qty += qty
        else:
            depot_qty[loc] = qty

    curr["warehouse_qty"] = warehouse_qty
    curr["depot_qty"] = depot_qty
    curr["date"] = datetime.now()

    return curr


@stock_router.get("/location/{product_id}/{location}", response_model=StockModel)
async def view_stock(
    product_id: str, 
    location: str, 
    stock_collection=Depends(stock_collection)
):
    stock = stock_collection.find_one({"product_id": product_id, "location": location})
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    stock = obj_id_to_str(stock)
    stock["stock_id"] = stock["id"]
    return stock


@stock_router.get("/alerts", response_model=dict)
async def stock_alerts(
    location: str = None,
    threshold: int = 10,
    stock_collection=Depends(stock_collection),
    products_collection=Depends(products_collection)
):
    def enrich_alert(s, loc, threshold):
        if ObjectId.is_valid(s["product_id"]):
            prod = products_collection.find_one({"_id": ObjectId(s["product_id"])})
        else:
            prod = None
        prod_threshold = prod.get("low_stock_threshold", threshold) if prod else threshold
        if s["quantity"] <= prod_threshold:
            return {
                "product_id": s["product_id"],
                "product_name": prod["name"] if prod else "Unknown",
                "quantity": s["quantity"],
                "location": loc,
                "date": s.get("date"),
                "threshold": prod_threshold
            }
        return None


    alerts = {}
    if location:
        low_stocks = []
        for s in stock_collection.find({"location": location}):
            alert = enrich_alert(s, location, threshold)
            if alert:
                low_stocks.append(alert)
        alerts[location] = low_stocks
        return {"low_stock_alerts": alerts}
    else:
        all_locations = stock_collection.distinct("location")
        for loc in all_locations:
            low_stocks = []
            for s in stock_collection.find({"location": loc}):
                alert = enrich_alert(s, loc, threshold)
                if alert:
                    low_stocks.append(alert)
            alerts[loc] = low_stocks
        return {"low_stock_alerts": alerts}


@stock_router.get("/logs")
async def get_stock_logs(
    product_id: Optional[str] = None, 
    location: Optional[str] = None, 
    stock_logs_collection=Depends(stock_logs_collection)
):
    query = {}
    if product_id:
        query["product_id"] = product_id
    if location:
        query["location"] = location
    logs = [obj_id_to_str(log) for log in stock_logs_collection.find(query)]
    for log in logs:
        if isinstance(log.get("date"), datetime):
            log["date"] = log["date"].isoformat()
    return {"logs": logs}


@stock_router.get("/products", response_model=List[ProductModel])
async def get_products(
    products_collection=Depends(products_collection),
    stock_collection=Depends(stock_collection)
):
    products = []
    for prod in products_collection.find():
        prod_id = str(prod.get("_id", prod.get("product_id")))
        low_stock_threshold = prod.get("low_stock_threshold", 10)
        stocks = list(stock_collection.find({"product_id": prod_id}))
        warehouse_qty = 0
        depot_qty = {}
        for s in stocks:
            loc = s["location"]
            qty = s["quantity"]
            if loc.lower() == "warehouse":
                warehouse_qty += qty
            else:
                depot_qty[loc] = qty
        prod_out = {
            "product_id": prod_id,
            "name": prod.get("name"),
            "sku": prod.get("sku"),
            "warehouse_qty": warehouse_qty,
            "depot_qty": depot_qty,
            "low_stock_threshold": low_stock_threshold,
            "category": prod.get("category"),
            "description": prod.get("description"),
            "price": prod.get("price", 0), 
            "date": prod.get("date").isoformat() if prod.get("date") else None
        }
        products.append(prod_out)
    return products

@stock_router.get("/total-products")
async def get_total_present_products(
    period: str = Query("current", description="current or prev"),
    stock_collection: Collection = Depends(stock_collection),
):
    """
    Returns product totals for 'current' (default) or 'prev' 7-day period.
    To support frontend trends, backend must allow period selection!
    """
    now = datetime.now()
    if period == "current":
        start = now - timedelta(days=7)
        end = now
    elif period == "prev":
        end = now - timedelta(days=7)
        start = end - timedelta(days=7)
    else:
        # fallback, use full history
        start = None
        end = None

    # Only filter by date if start/end are set
    match_stage = {"quantity": {"$gt": 0}}
    if start and end:
        match_stage["date"] = {"$gte": start, "$lt": end}

    # Use this in both queries
    product_ids = stock_collection.distinct("product_id", match_stage)
    total_present_products = len(product_ids)

    pipeline = [
        {"$match": match_stage},
        {"$group": {"_id": None, "total_quantity": {"$sum": "$quantity"}}},
    ]
    result = list(stock_collection.aggregate(pipeline))
    total_quantity = result[0]["total_quantity"] if result else 0

    return {
        "total_present_products": total_present_products,
        "total_quantity": total_quantity,
        "period": period,
        "start": start.isoformat() if start else None,
        "end": end.isoformat() if end else None,
    }

@stock_router.get("/products-trend")
async def inventory_trend(
    period_days: int = 7,
    stock_logs_collection=Depends(stock_logs_collection)
):
    now = datetime.now()
    end_current = now
    end_prev = now - timedelta(days=period_days)

    # For current period: up to now
    product_qty = {}
    for log in stock_logs_collection.find({"date": {"$lte": end_current}}):
        pid = log["product_id"]
        qty = log.get("quantity", 0)
        product_qty[pid] = product_qty.get(pid, 0) + qty
    current_count = sum(1 for qty in product_qty.values() if qty > 0)

    # For previous period: up to end_prev
    product_qty_prev = {}
    for log in stock_logs_collection.find({"date": {"$lte": end_prev}}):
        pid = log["product_id"]
        qty = log.get("quantity", 0)
        product_qty_prev[pid] = product_qty_prev.get(pid, 0) + qty
    prev_count = sum(1 for qty in product_qty_prev.values() if qty > 0)

    return {
        "total_present_products": current_count,
        "period": "current",
        "previous_total_present_products": prev_count,
        "previous_period_end": end_prev.isoformat(),
    }


@stock_router.put("/products/{product_id}", response_model=ProductModel)
async def update_product(
    product_id: str,
    product: ProductModel,
    products_collection=Depends(products_collection),
    stock_collection=Depends(stock_collection)
):
    """Update an existing product"""
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product ID")
    
    # Check if product exists
    existing_product = products_collection.find_one({"_id": ObjectId(product_id)})
    if not existing_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Prepare update data
    update_data = product.dict(exclude_unset=True, exclude={"product_id"})
    if "date" in update_data:
        del update_data["date"]  # Don't update creation date
    
    update_data["updated_date"] = datetime.now()
    
    # Update product
    result = products_collection.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Fetch updated product with stock info
    updated_product = products_collection.find_one({"_id": ObjectId(product_id)})
    stocks = list(stock_collection.find({"product_id": product_id}))
    
    warehouse_qty = 0
    depot_qty = {}
    for s in stocks:
        loc = s["location"]
        qty = s["quantity"]
        if loc.lower() == "warehouse":
            warehouse_qty += qty
        else:
            depot_qty[loc] = qty
    
    updated_product["product_id"] = str(updated_product.pop("_id"))
    updated_product["warehouse_qty"] = warehouse_qty
    updated_product["depot_qty"] = depot_qty
    
    if "date" in updated_product and isinstance(updated_product["date"], datetime):
        updated_product["date"] = updated_product["date"].isoformat()
    if "updated_date" in updated_product and isinstance(updated_product["updated_date"], datetime):
        updated_product["updated_date"] = updated_product["updated_date"].isoformat()
    
    return updated_product


@stock_router.delete("/products/{product_id}")
async def delete_product(
    product_id: str,
    products_collection=Depends(products_collection),
    stock_collection=Depends(stock_collection),
    stock_logs_collection=Depends(stock_logs_collection)
):
    """Delete a product and all its associated stock records"""
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product ID")
    
    # Check if product exists
    existing_product = products_collection.find_one({"_id": ObjectId(product_id)})
    if not existing_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product_name = existing_product.get("name", "Unknown")
    
    # Delete all stock records for this product
    stock_collection.delete_many({"product_id": product_id})
    
    # Delete all stock logs for this product
    stock_logs_collection.delete_many({"product_id": product_id})
    
    # Delete the product
    result = products_collection.delete_one({"_id": ObjectId(product_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {
        "message": f"Product '{product_name}' and all associated records deleted successfully",
        "deleted_product_id": product_id
    }


# === VENDOR PRODUCT CATALOG MANAGEMENT ===

@stock_router.get("/vendor-products", response_model=List[dict])
async def get_vendor_product_catalog(
    current_user=Depends(get_current_user),
    vendor_products_collection=Depends(vendor_products_collection),
    products_collection=Depends(products_collection),
    stock_collection=Depends(stock_collection)
):
    """Get vendor's product catalog (products available for customer purchase)"""
    try:
        vendor_id = current_user.get("user_id", "default_vendor")
        
        # Get vendor's catalog entries
        catalog_entries = list(vendor_products_collection.find({
            "vendor_id": vendor_id,
            "is_active": True
        }))
        
        result = []
        for entry in catalog_entries:
            # Get the corresponding inventory product
            product_id = entry["inventory_product_id"]
            if not ObjectId.is_valid(product_id):
                continue
                
            inventory_product = products_collection.find_one({"_id": ObjectId(product_id)})
            if not inventory_product:
                continue
            
            # Get current stock
            stocks = list(stock_collection.find({"product_id": product_id}))
            warehouse_qty = sum(s["quantity"] for s in stocks if s["location"].lower() == "warehouse")
            
            # Build catalog product
            catalog_product = obj_id_to_str(inventory_product)
            catalog_product.update({
                "catalog_id": str(entry["_id"]),
                "warehouse_qty": warehouse_qty,
                "custom_price": entry.get("custom_price"),
                "min_order_qty": entry.get("min_order_qty", 1),
                "max_order_qty": entry.get("max_order_qty"),
                "description_override": entry.get("description_override"),
                "date_added_to_catalog": entry.get("date_added"),
                "is_available": warehouse_qty > 0
            })
            
            # Use custom price if set, otherwise use inventory price
            if entry.get("custom_price"):
                catalog_product["price"] = entry["custom_price"]
            
            result.append(catalog_product)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching catalog: {str(e)}")


@stock_router.post("/vendor-products")
async def add_product_to_catalog(
    inventory_product_id: str,
    vendor_product: VendorProductModel,
    current_user=Depends(get_current_user),
    vendor_products_collection=Depends(vendor_products_collection),
    products_collection=Depends(products_collection)
):
    """Add an inventory product to vendor's catalog"""
    try:
        vendor_id = current_user.get("user_id", "default_vendor")
        
        # Validate inventory product exists
        if not ObjectId.is_valid(inventory_product_id):
            raise HTTPException(status_code=400, detail="Invalid inventory product ID")
            
        inventory_product = products_collection.find_one({"_id": ObjectId(inventory_product_id)})
        if not inventory_product:
            raise HTTPException(status_code=404, detail="Inventory product not found")
        
        # Check if already in catalog
        existing = vendor_products_collection.find_one({
            "vendor_id": vendor_id,
            "inventory_product_id": inventory_product_id,
            "is_active": True
        })
        
        if existing:
            raise HTTPException(status_code=400, detail="Product already in catalog")
        
        # Create catalog entry
        catalog_entry = {
            "inventory_product_id": inventory_product_id,
            "vendor_id": vendor_id,
            "is_active": True,
            "custom_price": vendor_product.custom_price,
            "min_order_qty": vendor_product.min_order_qty,
            "max_order_qty": vendor_product.max_order_qty,
            "description_override": vendor_product.description_override,
            "date_added": datetime.now()
        }
        
        result = vendor_products_collection.insert_one(catalog_entry)
        catalog_entry["id"] = str(result.inserted_id)
        
        return {
            "message": f"Product '{inventory_product['name']}' added to catalog",
            "catalog_id": str(result.inserted_id)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding to catalog: {str(e)}")


@stock_router.put("/vendor-products/{catalog_id}")
async def update_catalog_product(
    catalog_id: str,
    vendor_product: VendorProductModel,
    current_user=Depends(get_current_user),
    vendor_products_collection=Depends(vendor_products_collection)
):
    """Update a product in vendor's catalog"""
    try:
        vendor_id = current_user.get("user_id", "default_vendor")
        
        if not ObjectId.is_valid(catalog_id):
            raise HTTPException(status_code=400, detail="Invalid catalog ID")
        
        # Update catalog entry
        update_data = vendor_product.dict(exclude_unset=True, exclude={"inventory_product_id"})
        update_data["updated_date"] = datetime.now()
        
        result = vendor_products_collection.update_one(
            {
                "_id": ObjectId(catalog_id),
                "vendor_id": vendor_id
            },
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Catalog entry not found")
        
        return {"message": "Catalog product updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating catalog: {str(e)}")


@stock_router.delete("/vendor-products/{catalog_id}")
async def remove_from_catalog(
    catalog_id: str,
    current_user=Depends(get_current_user),
    vendor_products_collection=Depends(vendor_products_collection)
):
    """Remove a product from vendor's catalog"""
    try:
        vendor_id = current_user.get("user_id", "default_vendor")
        
        if not ObjectId.is_valid(catalog_id):
            raise HTTPException(status_code=400, detail="Invalid catalog ID")
        
        # Soft delete (set is_active to False)
        result = vendor_products_collection.update_one(
            {
                "_id": ObjectId(catalog_id),
                "vendor_id": vendor_id
            },
            {
                "$set": {
                    "is_active": False,
                    "removed_date": datetime.now()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Catalog entry not found")
        
        return {"message": "Product removed from catalog"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error removing from catalog: {str(e)}")


@stock_router.get("/inventory-products", response_model=List[dict])
async def get_inventory_products(
    current_user=Depends(get_current_user),
    products_collection=Depends(products_collection),
    stock_collection=Depends(stock_collection),
    vendor_products_collection=Depends(vendor_products_collection),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100)
):
    """Get inventory products (for adding to catalog)"""
    try:
        vendor_id = current_user.get("user_id", "default_vendor")
        
        # Build query
        query = {}
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"sku": {"$regex": search, "$options": "i"}},
                {"category": {"$regex": search, "$options": "i"}}
            ]
        
        # Get products with pagination
        skip = (page - 1) * limit
        products = list(products_collection.find(query).skip(skip).limit(limit))
        
        # Get products already in catalog
        catalog_product_ids = set()
        catalog_entries = vendor_products_collection.find({
            "vendor_id": vendor_id,
            "is_active": True
        })
        for entry in catalog_entries:
            catalog_product_ids.add(entry["inventory_product_id"])
        
        # Format results
        result = []
        for product in products:
            product_id = str(product["_id"])
            
            # Get stock info
            stocks = list(stock_collection.find({"product_id": product_id}))
            warehouse_qty = sum(s["quantity"] for s in stocks if s["location"].lower() == "warehouse")
            
            formatted_product = obj_id_to_str(product)
            formatted_product.update({
                "warehouse_qty": warehouse_qty,
                "is_in_catalog": product_id in catalog_product_ids,
                "available_for_catalog": warehouse_qty > 0 and product_id not in catalog_product_ids
            })
            
            if "date" in formatted_product and isinstance(formatted_product["date"], datetime):
                formatted_product["date"] = formatted_product["date"].isoformat()
            
            result.append(formatted_product)
        
        # Get total count
        total = products_collection.count_documents(query)
        
        return {
            "products": result,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit,
                "has_prev": page > 1,
                "has_next": page * limit < total
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching inventory: {str(e)}")