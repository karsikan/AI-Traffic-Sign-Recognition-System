from typing import List, Optional
from pydantic import BaseModel

class NearbyRequest(BaseModel):
    latitude: float
    longitude: float
    category: str  # hospital | police | petrol | garage

class NearbyServiceItem(BaseModel):
    name: str
    address: str
    distance_km: float
    rating: float
    maps_url: str

class NearbyData(BaseModel):
    category: str
    services: List[NearbyServiceItem]
