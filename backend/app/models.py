"""SQLAlchemy ORM models."""

from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, JSON, Text
from sqlalchemy.dialects.mysql import MEDIUMTEXT
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    username      = Column(String(80),  nullable=False)
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
    ref_code         = Column(String(30), nullable=True)
    result           = Column(JSON, nullable=False)
    created_at       = Column(DateTime, default=datetime.utcnow)

    # Optional client/order linkage (added via startup migration for existing DBs)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    order_id  = Column(Integer, ForeignKey("orders.id"),  nullable=True)

    # Quote status: pending | confirmed | rejected
    status = Column(String(20), nullable=False, default="pending")

    # Audit trail
    created_by_id        = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by_id        = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at           = Column(DateTime, nullable=True, onupdate=datetime.utcnow)
    status_changed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status_changed_at    = Column(DateTime, nullable=True)
    status_remarks       = Column(Text, nullable=True)

    order              = relationship("Order", back_populates="calculations")
    created_by         = relationship("User", foreign_keys=[created_by_id])
    updated_by         = relationship("User", foreign_keys=[updated_by_id])
    # Client approval status (set by any user after sending quote email)
    client_status             = Column(String(20), nullable=True)
    client_status_changed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    client_status_changed_at  = Column(DateTime, nullable=True)

    status_changed_by  = relationship("User", foreign_keys=[status_changed_by_id])
    client_status_changed_by = relationship("User", foreign_keys=[client_status_changed_by_id])
    versions   = relationship("CalculationVersion", back_populates="calculation",
                              order_by="CalculationVersion.version_number",
                              cascade="all, delete-orphan")


class CompanySettings(Base):
    """Singleton row (id=1) storing the company's own profile details."""

    __tablename__ = "company_settings"

    id             = Column(Integer, primary_key=True, default=1)
    company_name   = Column(String(120), nullable=False, default="Chromaprint India")
    tagline        = Column(String(200), nullable=True)
    industry       = Column(String(120), nullable=True)
    address        = Column(String(300), nullable=True)
    location       = Column(String(120), nullable=True)
    state          = Column(String(100), nullable=True)
    country        = Column(String(100), nullable=True, default="India")
    email          = Column(String(200), nullable=True)
    phone          = Column(String(30),  nullable=True)
    website        = Column(String(200), nullable=True)
    gst_number     = Column(String(50),  nullable=True)
    cgst_pct       = Column(Float,       nullable=True, default=None)
    sgst_pct       = Column(Float,       nullable=True, default=None)
    logo           = Column(Text().with_variant(MEDIUMTEXT(), "mysql"), nullable=True)
    updated_at     = Column(DateTime,    nullable=True)

    # SMTP / email settings
    smtp_host      = Column(String(200), nullable=True)
    smtp_port      = Column(Integer,     nullable=True, default=587)
    smtp_user      = Column(String(200), nullable=True)
    smtp_password  = Column(String(500), nullable=True)
    smtp_use_tls   = Column(Boolean,     nullable=True, default=True)
    smtp_from_name = Column(String(120), nullable=True)


class EmailLog(Base):
    """Log of every invoice email send attempt."""

    __tablename__ = "email_logs"

    id          = Column(Integer, primary_key=True, index=True)
    calc_id     = Column(Integer, ForeignKey("calculations.id"), nullable=True)
    sent_by_id  = Column(Integer, ForeignKey("users.id"), nullable=True)
    to_email    = Column(String(200), nullable=False)
    client_name = Column(String(120), nullable=True)
    order_name  = Column(String(200), nullable=True)
    subject     = Column(String(500), nullable=True)
    status      = Column(String(20), nullable=False)  # 'sent' | 'failed'
    remarks     = Column(Text, nullable=True)
    sent_at     = Column(DateTime, default=datetime.utcnow)

    sent_by = relationship("User", foreign_keys=[sent_by_id])


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
    order_qty      = Column(Integer, nullable=True)
    ref_code       = Column(String(30), nullable=True)
    result         = Column(JSON, nullable=False)
    status               = Column(String(20), nullable=False, default="pending")
    created_by_id        = Column(Integer, ForeignKey("users.id"), nullable=True)
    status_changed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status_changed_at    = Column(DateTime, nullable=True)
    status_remarks       = Column(Text, nullable=True)
    client_status                  = Column(String(20), nullable=True)
    client_status_changed_by_id    = Column(Integer, ForeignKey("users.id"), nullable=True)
    client_status_changed_at       = Column(DateTime, nullable=True)
    created_at           = Column(DateTime, default=datetime.utcnow)

    calculation                = relationship("Calculation", back_populates="versions")
    created_by                 = relationship("User", foreign_keys=[created_by_id])
    status_changed_by          = relationship("User", foreign_keys=[status_changed_by_id])
    client_status_changed_by   = relationship("User", foreign_keys=[client_status_changed_by_id])


class Notification(Base):
    """In-app notification for orders that have no confirmed quotation."""

    __tablename__ = "notifications"

    id                = Column(Integer, primary_key=True, index=True)
    title             = Column(String(200), nullable=False)
    message           = Column(Text, nullable=False)
    client_id         = Column(Integer, ForeignKey("clients.id"), nullable=True)
    order_id          = Column(Integer, ForeignKey("orders.id"),  nullable=True)
    notification_type = Column(String(50), nullable=False, default="unconfirmed_quote")
    is_read           = Column(Boolean, nullable=False, default=False)
    read_by_id        = Column(Integer, ForeignKey("users.id"), nullable=True)
    read_at           = Column(DateTime, nullable=True)
    created_at        = Column(DateTime, default=datetime.utcnow)
    updated_at        = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    client   = relationship("Client")
    order    = relationship("Order")
    read_by  = relationship("User", foreign_keys=[read_by_id])
