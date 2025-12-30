from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Date, text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    updated_at = Column(DateTime, server_default=text('CURRENT_TIMESTAMP'), onupdate=text('CURRENT_TIMESTAMP'))
    
    # Relationship to Membership
    membership = relationship("Membership", back_populates="user", uselist=False)

class Membership(Base):
    __tablename__ = "memberships"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    is_vip = Column(Boolean, default=False, nullable=False)
    monthly_detections = Column(Integer, default=0, nullable=False)  # Current month's detection count
    last_reset_date = Column(Date, server_default=text('(CURRENT_DATE)'))  # Last time the count was reset
    created_at = Column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    updated_at = Column(DateTime, server_default=text('CURRENT_TIMESTAMP'), onupdate=text('CURRENT_TIMESTAMP'))
    
    # Relationship to User
    user = relationship("User", back_populates="membership")
