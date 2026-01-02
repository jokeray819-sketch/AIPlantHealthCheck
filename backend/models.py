from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Date, Text, text
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
    
    # Relationships
    membership = relationship("Membership", back_populates="user", uselist=False)
    diagnosis_histories = relationship("DiagnosisHistory", back_populates="user", cascade="all, delete-orphan")
    my_plants = relationship("MyPlant", back_populates="user", cascade="all, delete-orphan")
    reminders = relationship("Reminder", back_populates="user", cascade="all, delete-orphan")

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

class DiagnosisHistory(Base):
    __tablename__ = "diagnosis_histories"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plant_name = Column(String(100), nullable=False)
    scientific_name = Column(String(100))
    status = Column(String(50), nullable=False)
    problem_judgment = Column(Text)
    severity = Column(String(20))
    severity_value = Column(Integer)
    handling_suggestions = Column(Text)  # JSON string
    need_product = Column(Boolean, default=False)
    plant_introduction = Column(Text)
    image_url = Column(String(500))  # Store image path or URL
    created_at = Column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    
    # Relationship
    user = relationship("User", back_populates="diagnosis_histories")

class MyPlant(Base):
    __tablename__ = "my_plants"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plant_name = Column(String(100), nullable=False)
    scientific_name = Column(String(100))
    nickname = Column(String(100))  # User-given nickname
    status = Column(String(50))
    last_diagnosis_id = Column(Integer, ForeignKey("diagnosis_histories.id"))  # Reference to last diagnosis
    image_url = Column(String(500))
    notes = Column(Text)  # User notes
    watering_frequency = Column(Integer)  # Days between watering
    last_watered = Column(Date)
    next_watering_date = Column(Date)
    created_at = Column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    updated_at = Column(DateTime, server_default=text('CURRENT_TIMESTAMP'), onupdate=text('CURRENT_TIMESTAMP'))
    
    # Relationship
    user = relationship("User", back_populates="my_plants")

class Reminder(Base):
    __tablename__ = "reminders"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plant_id = Column(Integer, ForeignKey("my_plants.id"))  # Optional: link to a specific plant
    reminder_type = Column(String(20), nullable=False)  # 'watering', 're_examination'
    title = Column(String(200), nullable=False)
    message = Column(Text)
    scheduled_date = Column(DateTime, nullable=False)
    is_completed = Column(Boolean, default=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    
    # Relationship
    user = relationship("User", back_populates="reminders")
