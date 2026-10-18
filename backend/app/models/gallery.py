"""FUTIA Our Pride: photos with a title and description, managed by the admin."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, LargeBinary
from app.core.database import Base


class GalleryItem(Base):
    __tablename__ = "gallery_items"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    content_type = Column(String, nullable=False)
    image_data = Column(LargeBinary, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
