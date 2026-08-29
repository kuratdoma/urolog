from pydantic import BaseModel, Field
from enum import Enum


class HealthStatus(str, Enum):
    OK = "ok"
    ERROR = "error"


class ServicesStatus(BaseModel):
    database: str = Field(..., description="Status of the database connection")
    redis: str = Field(..., description="Status of the Redis caching service")


class HealthResponse(BaseModel):
    status: HealthStatus = Field(..., description="Overall status of the application")
    mode: str = Field(
        ..., description="Application environment mode (e.g., development, production)"
    )
    system: str = Field(..., description="Name of the system")
    version: str = Field(..., description="System version")
    services: ServicesStatus = Field(..., description="Status of individual services")
