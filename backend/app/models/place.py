from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Index
from app.core.database import Base


class Place(Base):
    """
    A hospital, police station, post office or fuel station somewhere in Sri Lanka.

    Imported from OpenStreetMap in bulk rather than queried live. The public Overpass
    endpoint is rate-limited and takes seconds to answer, which is fine for browsing and
    unacceptable for the screen someone reads after a crash. The whole country is only a
    few thousand rows, so it lives here and every lookup is a local query.

    Refresh with: python -m app.scripts.import_places
    """

    __tablename__ = "places"

    id = Column(Integer, primary_key=True, index=True)

    # hospital | police | post_office | petrol | pharmacy | garage
    category = Column(String(30), nullable=False, index=True)
    name = Column(String(255), nullable=False)

    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    address = Column(String(255), nullable=True)
    phone = Column(String(60), nullable=True)

    # OpenStreetMap element id, so a re-import updates rather than duplicates
    osm_id = Column(String(40), nullable=True, index=True)
    osm_type = Column(String(10), nullable=True)

    imported_at = Column(DateTime, default=datetime.utcnow)


# Lookups always filter by category and then scan a small bounding box of coordinates,
# so index the three together rather than one at a time.
Index("ix_places_category_lat_lon", Place.category, Place.latitude, Place.longitude)
