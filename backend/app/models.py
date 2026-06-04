"""SQLAlchemy ORM models."""

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, JSON
from sqlalchemy.orm import relationship

from .database import Base


class Client(Base):
    __tablename__ = "clients"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(120), nullable=False, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    orders = relationship("Order", back_populates="client", cascade="all, delete-orphan")


class Order(Base):
    __tablename__ = "orders"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(200), nullable=False)
    client_id  = Column(Integer, ForeignKey("clients.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    client       = relationship("Client", back_populates="orders")
    calculations = relationship("Calculation", back_populates="order")


class Substrate(Base):
    __tablename__ = "substrates"

    id    = Column(Integer, primary_key=True, index=True)
    name  = Column(String(120), nullable=False, unique=True)
    price = Column(Float, nullable=False)


class TeethData(Base):
    __tablename__ = "teeth_data"

    id         = Column(Integer, primary_key=True, index=True)
    teeth      = Column(Integer, nullable=False, unique=True)
    paper_size = Column(Integer, nullable=False)


class Calculation(Base):
    """Optional history of saved calculations, optionally linked to a client/order."""

    __tablename__ = "calculations"

    id               = Column(Integer, primary_key=True, index=True)
    width            = Column(Float, nullable=False)
    height           = Column(Float, nullable=False)
    waste_pct        = Column(Float, nullable=False)
    substrate_name   = Column(String(120), nullable=True)
    substrate_price  = Column(Float, nullable=False)
    foil_cost        = Column(Float, nullable=False, default=0)
    exchange_rate    = Column(Float, nullable=False)
    result           = Column(JSON, nullable=False)
    created_at       = Column(DateTime, default=datetime.utcnow)

    # Optional client/order linkage (added via startup migration for existing DBs)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    order_id  = Column(Integer, ForeignKey("orders.id"),  nullable=True)

    order = relationship("Order", back_populates="calculations")
