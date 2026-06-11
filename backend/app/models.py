"""SQLAlchemy ORM models."""

from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, JSON
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    username      = Column(String(80),  nullable=False, unique=True)
    email         = Column(String(200), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    role          = Column(String(20),  nullable=False, default="user")   # "admin" | "user"
    is_active     = Column(Boolean,     nullable=False, default=True)
    created_at    = Column(DateTime, default=datetime.utcnow)


class Client(Base):
    __tablename__ = "clients"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(120), nullable=False, unique=True)
    location   = Column(String(200), nullable=True)
    industry   = Column(String(120), nullable=True)
    email      = Column(String(200), nullable=True)
    phone      = Column(String(30),  nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    orders = relationship("Order", back_populates="client", cascade="all, delete-orphan")


class Order(Base):
    __tablename__ = "orders"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(200), nullable=False)
    client_id  = Column(Integer, ForeignKey("clients.id"), nullable=False)
    order_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    client       = relationship("Client", back_populates="orders")
    calculations = relationship("Calculation", back_populates="order")


class Substrate(Base):
    __tablename__ = "substrates"

    id        = Column(Integer, primary_key=True, index=True)
    name      = Column(String(120), nullable=False, unique=True)
    price     = Column(Float, nullable=False)
    available = Column(Boolean, nullable=False, default=True)


class TeethData(Base):
    __tablename__ = "teeth_data"

    id         = Column(Integer, primary_key=True, index=True)
    teeth      = Column(Integer, nullable=False, unique=True)
    paper_size = Column(Integer, nullable=False)
    available  = Column(Boolean, nullable=False, default=True)


class Calculation(Base):
    """Optional history of saved calculations, optionally linked to a client/order."""

    __tablename__ = "calculations"

    id               = Column(Integer, primary_key=True, index=True)
    width            = Column(Float, nullable=False)
    height           = Column(Float, nullable=False)
    yield_pct        = Column('waste_pct', Float, nullable=False)
    substrate_name   = Column(String(120), nullable=True)
    substrate_price  = Column(Float, nullable=False)
    foil_cost        = Column(Float, nullable=False, default=0)
    custom_cost      = Column(Float, nullable=False, default=0)
    selected_teeth   = Column(Integer, nullable=True)
    exchange_rate    = Column(Float, nullable=False)
    order_qty        = Column(Integer, nullable=True)
    result           = Column(JSON, nullable=False)
    created_at       = Column(DateTime, default=datetime.utcnow)

    # Optional client/order linkage (added via startup migration for existing DBs)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    order_id  = Column(Integer, ForeignKey("orders.id"),  nullable=True)

    # Quote status: pending | confirmed | rejected
    status = Column(String(20), nullable=False, default="pending")

    # Audit trail
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at    = Column(DateTime, nullable=True, onupdate=datetime.utcnow)

    order      = relationship("Order", back_populates="calculations")
    created_by = relationship("User", foreign_keys=[created_by_id])
    updated_by = relationship("User", foreign_keys=[updated_by_id])
    versions   = relationship("CalculationVersion", back_populates="calculation",
                              order_by="CalculationVersion.version_number",
                              cascade="all, delete-orphan")


class CalculationVersion(Base):
    """An edited revision of a saved calculation."""

    __tablename__ = "calculation_versions"

    id             = Column(Integer, primary_key=True, index=True)
    calculation_id = Column(Integer, ForeignKey("calculations.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    width          = Column(Float, nullable=False)
    height         = Column(Float, nullable=False)
    yield_pct      = Column(Float, nullable=False)
    substrate_name = Column(String(120), nullable=True)
    substrate_price = Column(Float, nullable=False)
    foil_cost      = Column(Float, nullable=False, default=0)
    custom_cost    = Column(Float, nullable=False, default=0)
    selected_teeth = Column(Integer, nullable=True)
    exchange_rate  = Column(Float, nullable=False)
    result         = Column(JSON, nullable=False)
    status         = Column(String(20), nullable=False, default="pending")
    created_by_id  = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow)

    calculation = relationship("Calculation", back_populates="versions")
    created_by  = relationship("User", foreign_keys=[created_by_id])
