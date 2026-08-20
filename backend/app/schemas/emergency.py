from typing import Optional
from pydantic import BaseModel

class EmergencyRequest(BaseModel):
    emergency_type: str
    latitude: float
    longitude: float
    description: Optional[str] = None

class EmergencyLocationItem(BaseModel):
    name: str
    distance_km: float
    maps_url: str

class EmergencyData(BaseModel):
    emergency_type: str
    nearest_hospital: Optional[EmergencyLocationItem] = None
    nearest_police: Optional[EmergencyLocationItem] = None
    nearest_petrol: Optional[EmergencyLocationItem] = None
    guidance: str
