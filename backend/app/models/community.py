"""Announcements, open student forum, private support inbox, anonymous suggestions."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Announcement(Base):
    __tablename__ = "announcements"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    # NULL means "everyone". A number means only that department sees it (posted by a class rep).
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    author_name = Column(String, nullable=True)


class ForumPost(Base):
    __tablename__ = "forum_posts"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    student = relationship("Student")


class SupportMessage(Base):
    """One message in a private thread between a student and the admins."""
    __tablename__ = "support_messages"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    sender_role = Column(String, nullable=False)  # "student" or "admin"
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    student = relationship("Student")


class Suggestion(Base):
    """Anonymous by design: no link to any student is stored."""
    __tablename__ = "suggestions"
    id = Column(Integer, primary_key=True, index=True)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
