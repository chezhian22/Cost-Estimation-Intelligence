"""SQLAlchemy ORM models."""

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String, JSON

from .database import Base


class Substrate(Base):
    __tablename__ = "substrates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False, unique=True)
    price = Column(Float, nullable=False)


class TeethData(Base):
    __tablename__ = "teeth_data"

    id = Column(Integer, primary_key=True, index=True)
    teeth = Column(Integer, nullable=False, unique=True)
    paper_size = Column(Integer, nullable=False)


class Calculation(Base):
    """Optional history of saved calculations."""

    __tablename__ = "calculations"

    id = Column(Integer, primary_key=True, index=True)
    width = Column(Float, nullable=False)
    height = Column(Float, nullable=False)
    waste_pct = Column(Float, nullable=False)
    substrate_name = Column(String(120), nullable=True)
    substrate_price = Column(Float, nullable=False)
    foil_cost = Column(Float, nullable=False, default=0)
    exchange_rate = Column(Float, nullable=False)
    result = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
