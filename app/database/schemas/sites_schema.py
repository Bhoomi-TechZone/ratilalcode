from pydantic import BaseModel, Field
from typing import Optional, List


class SiteCreateModel(BaseModel):
    site_name: str = Field(..., example="Vendest")
    site_location: str = Field(..., example="Noida")
    status: str = Field(..., example="Active")  # Allowed values: "Active", "Inactive"
    generator_ids: Optional[List[str]] = Field(default_factory=list, example=["GEN-001", "GEN-002"])
    assigned_employee_id: Optional[str] = Field(
        None, example="60e8ccc02b90186a12a0fd1a"
    )  # Employee assignment


class SiteModel(SiteCreateModel):
    id: str = Field(..., description="MongoDB ObjectId as string")
    last_updated: Optional[str] = Field(
        None, alias="lastUpdated"
    )  # ISO datetime string, e.g. "2023-11-10T22:00:00Z"

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True  # Allow both field name and alias when parsing/serializing
        extra = "ignore"
