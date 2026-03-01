"""
Lumina Backend — SQLAlchemy Database Models
"""

import datetime
from sqlalchemy import String, Integer, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base
from models.enums import ProcessingStatus

class JobRecord(Base):
    """
    Persisted record of a job matching the app.state.jobs store.
    """
    __tablename__ = "jobs"

    job_id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    status: Mapped[str] = mapped_column(String, default=ProcessingStatus.PENDING, index=True)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    message: Mapped[str] = mapped_column(String, nullable=True)
    video_title: Mapped[str] = mapped_column(String, nullable=True)
    current_step: Mapped[str] = mapped_column(String, nullable=True)
    steps_completed: Mapped[int] = mapped_column(Integer, default=0)
    
    # Store the entire CourseModule Pydantic model dump as JSON
    course_data: Mapped[dict] = mapped_column(JSON, nullable=True)
    
    error: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.datetime.utcnow
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )
    
    def to_dict(self) -> dict:
        """Convert to the dictionary format expected by the frontend / state store."""
        return {
            "status": self.status,
            "progress": self.progress,
            "message": self.message,
            "video_title": self.video_title,
            "current_step": self.current_step,
            "steps_completed": self.steps_completed,
            "course": self.course_data,
            "error": self.error,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
