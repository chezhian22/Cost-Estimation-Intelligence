"""Database CRUD helpers."""

from typing import List, Optional

from sqlalchemy.orm import Session

from . import models, schemas
from .auth import hash_password, verify_password


# ── Users ─────────────────────────────────────────────────────────────────────
def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()


def get_user_by_username(db: Session, username: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.username == username).first()


def get_user(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()


def list_users(db: Session) -> List[models.User]:
    return db.query(models.User).order_by(models.User.created_at).all()


def create_user(db: Session, data: schemas.UserCreate) -> models.User:
    obj = models.User(
        username=data.username.strip(),
        email=data.email.strip().lower(),
        password_hash=hash_password(data.password),
        role=data.role,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_user(db: Session, user_id: int, data: schemas.UserUpdate) -> Optional[models.User]:
    obj = db.query(models.User).filter(models.User.id == user_id).first()
    if not obj:
        return None
    if data.username  is not None: obj.username      = data.username.strip()
    if data.email     is not None: obj.email         = data.email.strip().lower()
    if data.password  is not None: obj.password_hash = hash_password(data.password)
    if data.role      is not None: obj.role          = data.role
    if data.is_active is not None: obj.is_active     = data.is_active
    db.commit()
    db.refresh(obj)
    return obj


def delete_user(db: Session, user_id: int) -> bool:
    obj = db.query(models.User).filter(models.User.id == user_id).first()
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True


def authenticate_user(db: Session, email: str, password: str) -> Optional[models.User]:
    user = get_user_by_email(db, email.strip().lower())
    if not user or not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def seed_admin(db: Session) -> None:
    """Create default admin if no users exist yet."""
    if db.query(models.User).count() == 0:
        obj = models.User(
            username="admin",
            email="admin@gmail.com",
            password_hash=hash_password("1234"),
            role="admin",
        )
        db.add(obj)
        db.commit()


# ── Clients ──────────────────────────────────────────────────────────────────
def list_clients(db: Session) -> List[models.Client]:
    return db.query(models.Client).order_by(models.Client.name).all()


def get_client(db: Session, client_id: int) -> Optional[models.Client]:
    return db.query(models.Client).filter(models.Client.id == client_id).first()


def get_client_by_name(db: Session, name: str) -> Optional[models.Client]:
    return db.query(models.Client).filter(models.Client.name == name).first()


def update_client(db: Session, client_id: int, data: schemas.ClientUpdate) -> Optional[models.Client]:
    obj = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not obj:
        return None
    obj.name     = data.name.strip()
    obj.location = data.location or None
    obj.industry = data.industry or None
    obj.email    = data.email or None
    obj.phone    = data.phone or None
    db.commit()
    db.refresh(obj)
    return obj


def create_client(db: Session, data: schemas.ClientCreate) -> models.Client:
    obj = models.Client(
        name=data.name.strip(),
        location=data.location or None,
        industry=data.industry or None,
        email=data.email or None,
        phone=data.phone or None,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


# ── Orders ───────────────────────────────────────────────────────────────────
def list_orders(db: Session, client_id: int) -> List[models.Order]:
    return (
        db.query(models.Order)
        .filter(models.Order.client_id == client_id)
        .order_by(models.Order.created_at.desc())
        .all()
    )


def get_order(db: Session, order_id: int) -> Optional[models.Order]:
    return db.query(models.Order).filter(models.Order.id == order_id).first()


def create_order(db: Session, client_id: int, data: schemas.OrderCreate) -> models.Order:
    obj = models.Order(name=data.name.strip(), client_id=client_id, order_date=data.order_date)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_order(db: Session, order_id: int, name: str) -> Optional[models.Order]:
    obj = get_order(db, order_id)
    if not obj:
        return None
    obj.name = name.strip()
    db.commit()
    db.refresh(obj)
    return obj


# ── Substrates ───────────────────────────────────────────────────────────────
def list_substrates(db: Session) -> List[models.Substrate]:
    return db.query(models.Substrate).order_by(models.Substrate.id).all()


def create_substrate(db: Session, data: schemas.SubstrateCreate) -> models.Substrate:
    obj = models.Substrate(name=data.name, price=data.price)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_substrate(db: Session, substrate_id: int, data: schemas.SubstrateUpdate) -> Optional[models.Substrate]:
    obj = db.query(models.Substrate).filter(models.Substrate.id == substrate_id).first()
    if not obj:
        return None
    if data.name  is not None: obj.name  = data.name.strip()
    if data.price is not None: obj.price = data.price
    db.commit()
    db.refresh(obj)
    return obj


def delete_substrate(db: Session, substrate_id: int) -> bool:
    obj = db.query(models.Substrate).filter(models.Substrate.id == substrate_id).first()
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True


def set_substrate_availability(
    db: Session, substrate_id: int, available: bool
) -> Optional[models.Substrate]:
    obj = db.query(models.Substrate).filter(models.Substrate.id == substrate_id).first()
    if not obj:
        return None
    obj.available = available
    db.commit()
    db.refresh(obj)
    return obj


# ── Teeth ────────────────────────────────────────────────────────────────────
def list_teeth(db: Session, available_only: bool = False) -> List[models.TeethData]:
    q = db.query(models.TeethData).order_by(models.TeethData.teeth)
    if available_only:
        q = q.filter(models.TeethData.available == True)
    return q.all()


def create_teeth(db: Session, data: schemas.TeethCreate) -> models.TeethData:
    obj = models.TeethData(teeth=data.teeth, paper_size=data.paper_size)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_teeth(db: Session, teeth_id: int, data: schemas.TeethUpdate) -> Optional[models.TeethData]:
    obj = db.query(models.TeethData).filter(models.TeethData.id == teeth_id).first()
    if not obj:
        return None
    if data.teeth      is not None: obj.teeth      = data.teeth
    if data.paper_size is not None: obj.paper_size = data.paper_size
    db.commit()
    db.refresh(obj)
    return obj


def delete_teeth(db: Session, teeth_id: int) -> bool:
    obj = db.query(models.TeethData).filter(models.TeethData.id == teeth_id).first()
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True


def set_teeth_availability(
    db: Session, teeth_id: int, available: bool
) -> Optional[models.TeethData]:
    obj = db.query(models.TeethData).filter(models.TeethData.id == teeth_id).first()
    if not obj:
        return None
    obj.available = available
    db.commit()
    db.refresh(obj)
    return obj


# ── Calculations ─────────────────────────────────────────────────────────────
def _build_ref_code(db: Session, client_id, order_id) -> Optional[str]:
    """Generate a unique reference code like AR03-ORD001-Q1.
    AR   = first 2 chars of client name
    03   = client's global sequence number (makes same-prefix clients unique)
    ORD  = first 3 chars of order name
    001  = sequential order number within client (padded)
    Q1   = sequential quote number within order
    """
    if not order_id:
        return None
    client = get_client(db, client_id) if client_id else None
    order  = get_order(db, order_id)

    c_name = ((client.name if client else '') or 'XX').replace(' ', '')
    c_slug = c_name[:2].upper()

    # Client global sequence number — unique even if prefix collides
    if client_id:
        client_seq = db.query(models.Client).filter(models.Client.id <= client_id).count()
    else:
        client_seq = 0

    o_slug = ((order.name if order else '') or 'ORD').replace(' ', '')[:3].upper()

    # Order sequence number within this client
    if client_id and order:
        order_seq = db.query(models.Order).filter(
            models.Order.client_id == client_id,
            models.Order.id <= order.id,
        ).count()
    else:
        order_seq = 1

    # Quote sequence number within this order
    quote_seq = db.query(models.Calculation).filter(
        models.Calculation.order_id == order_id
    ).count() + 1

    client_part = f"{c_slug}{str(client_seq).zfill(2)}" if client_seq else 'XX'
    return f"{client_part}-{o_slug}{str(order_seq).zfill(3)}-Q{quote_seq}"


def save_calculation(
    db: Session, req: schemas.CalculationRequest, result: dict, user_id: int = None
) -> models.Calculation:
    ref_code = _build_ref_code(db, req.client_id, req.order_id)
    obj = models.Calculation(
        width=req.width,
        height=req.height,
        yield_pct=req.yield_pct,
        substrate_name=req.substrate_name,
        substrate_price=req.substrate_price,
        foil_cost=req.foil_cost,
        custom_cost=req.custom_cost,
        selected_teeth=req.selected_teeth if req.selected_teeth is not None else result["matched"]["matched_teeth"],
        exchange_rate=req.exchange_rate,
        order_qty=req.order_qty,
        ref_code=ref_code,
        result=result,
        client_id=req.client_id,
        order_id=req.order_id,
        created_by_id=user_id,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def list_calculations(db: Session, limit: int = 50) -> List[models.Calculation]:
    return (
        db.query(models.Calculation)
        .order_by(models.Calculation.created_at.desc())
        .limit(limit)
        .all()
    )


def list_order_calculations(db: Session, order_id: int) -> List[models.Calculation]:
    return (
        db.query(models.Calculation)
        .filter(models.Calculation.order_id == order_id)
        .order_by(models.Calculation.created_at.desc())
        .all()
    )


def get_calculation(db: Session, calc_id: int) -> Optional[models.Calculation]:
    return db.query(models.Calculation).filter(models.Calculation.id == calc_id).first()


def update_selected_cylinder(
    db: Session, calc_id: int, selected_teeth: int, user_id: int = None
) -> Optional[models.Calculation]:
    from datetime import datetime as _dt
    obj = db.query(models.Calculation).filter(models.Calculation.id == calc_id).first()
    if not obj:
        return None
    obj.selected_teeth = selected_teeth
    if user_id: obj.updated_by_id = user_id
    obj.updated_at = _dt.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


def update_selected_tier(
    db: Session, calc_id: int, selected_tier: str, user_id: int = None
) -> Optional[models.Calculation]:
    from datetime import datetime as _dt
    obj = db.query(models.Calculation).filter(models.Calculation.id == calc_id).first()
    if not obj:
        return None
    obj.selected_tier = selected_tier
    if user_id: obj.updated_by_id = user_id
    obj.updated_at = _dt.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


def list_versions(db: Session, calc_id: int) -> List[models.CalculationVersion]:
    return (
        db.query(models.CalculationVersion)
        .filter(models.CalculationVersion.calculation_id == calc_id)
        .order_by(models.CalculationVersion.version_number)
        .all()
    )


def create_version(
    db: Session, calc_id: int, req: "schemas.CalculationRequest", result: dict, user_id: int = None
) -> models.CalculationVersion:
    count = (
        db.query(models.CalculationVersion)
        .filter(models.CalculationVersion.calculation_id == calc_id)
        .count()
    )
    version_number = count + 1
    parent = get_calculation(db, calc_id)
    parent_ref = parent.ref_code if parent else None
    ref_code = f"{parent_ref}-V{version_number}" if parent_ref else None
    obj = models.CalculationVersion(
        calculation_id=calc_id,
        version_number=version_number,
        ref_code=ref_code,
        width=req.width,
        height=req.height,
        yield_pct=req.yield_pct,
        substrate_name=req.substrate_name,
        substrate_price=req.substrate_price,
        foil_cost=req.foil_cost,
        custom_cost=req.custom_cost,
        selected_teeth=req.selected_teeth,
        exchange_rate=req.exchange_rate,
        order_qty=req.order_qty,
        result=result,
        created_by_id=user_id,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def _order_calc_ids(db: Session, order_id: int) -> list:
    """Return all calculation IDs belonging to an order."""
    return [
        c.id for c in db.query(models.Calculation)
        .filter(models.Calculation.order_id == order_id)
        .all()
    ]


def _unconfirm_order(db: Session, order_id: int, except_calc_id: int = None, except_version_id: int = None) -> None:
    """Unconfirm every base calculation and every version that belongs to an order."""
    calc_q = db.query(models.Calculation).filter(
        models.Calculation.order_id == order_id,
        models.Calculation.status == "confirmed",
    )
    if except_calc_id:
        calc_q = calc_q.filter(models.Calculation.id != except_calc_id)
    calc_q.update({"status": "pending"})

    calc_ids = _order_calc_ids(db, order_id)
    if calc_ids:
        ver_q = db.query(models.CalculationVersion).filter(
            models.CalculationVersion.calculation_id.in_(calc_ids),
            models.CalculationVersion.status == "confirmed",
        )
        if except_version_id:
            ver_q = ver_q.filter(models.CalculationVersion.id != except_version_id)
        ver_q.update({"status": "pending"})


def update_version_status(
    db: Session, version_id: int, status: str, user_id: int = None, remarks: str = None
) -> Optional[models.CalculationVersion]:
    obj = db.query(models.CalculationVersion).filter(models.CalculationVersion.id == version_id).first()
    if not obj:
        return None
    if status == "confirmed":
        parent = db.query(models.Calculation).filter(
            models.Calculation.id == obj.calculation_id
        ).first()
        if parent and parent.order_id:
            _unconfirm_order(db, parent.order_id, except_version_id=version_id)
        else:
            db.query(models.CalculationVersion).filter(
                models.CalculationVersion.calculation_id == obj.calculation_id,
                models.CalculationVersion.id != version_id,
                models.CalculationVersion.status == "confirmed",
            ).update({"status": "pending"})
    from datetime import datetime as _dt
    obj.status = status
    if user_id:
        obj.status_changed_by_id = user_id
    obj.status_changed_at = _dt.utcnow()
    obj.status_remarks = remarks
    db.commit()
    db.refresh(obj)
    return obj


def get_company_settings(db: Session) -> models.CompanySettings:
    obj = db.query(models.CompanySettings).filter(models.CompanySettings.id == 1).first()
    if not obj:
        obj = models.CompanySettings(id=1)
        db.add(obj)
        db.commit()
        db.refresh(obj)
    return obj


def update_company_logo(db: Session, logo_data) -> models.CompanySettings:
    from datetime import datetime as _dt
    obj = get_company_settings(db)
    obj.logo = logo_data
    obj.updated_at = _dt.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


def upsert_company_settings(db: Session, data: schemas.CompanySettingsUpdate) -> models.CompanySettings:
    from datetime import datetime as _dt
    from .auth import encrypt_smtp_password
    obj = get_company_settings(db)
    fields = data.model_dump(exclude_unset=True)
    for key, val in fields.items():
        if key == "smtp_password" and val:
            val = encrypt_smtp_password(val)
        setattr(obj, key, val)
    obj.updated_at = _dt.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


def create_email_log(
    db: Session,
    calc_id: Optional[int],
    sent_by_id: Optional[int],
    to_email: str,
    client_name: Optional[str],
    order_name: Optional[str],
    subject: Optional[str],
    status: str,
    remarks: Optional[str] = None,
) -> models.EmailLog:
    obj = models.EmailLog(
        calc_id=calc_id,
        sent_by_id=sent_by_id,
        to_email=to_email,
        client_name=client_name,
        order_name=order_name,
        subject=subject,
        status=status,
        remarks=remarks,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def list_email_logs(db: Session, limit: int = 200) -> List[models.EmailLog]:
    return (
        db.query(models.EmailLog)
        .order_by(models.EmailLog.sent_at.desc())
        .limit(limit)
        .all()
    )


def update_email_log_status(
    db: Session, log_id: int, status: str, remarks: Optional[str] = None
) -> Optional[models.EmailLog]:
    obj = db.query(models.EmailLog).filter(models.EmailLog.id == log_id).first()
    if not obj:
        return None
    obj.status = status
    if remarks is not None:
        obj.remarks = remarks
    db.commit()
    db.refresh(obj)
    return obj


def update_calculation_status(
    db: Session, calc_id: int, status: str, user_id: int = None, remarks: str = None
) -> Optional[models.Calculation]:
    from datetime import datetime as _dt
    obj = db.query(models.Calculation).filter(models.Calculation.id == calc_id).first()
    if not obj:
        return None
    if status == "confirmed" and obj.order_id:
        _unconfirm_order(db, obj.order_id, except_calc_id=calc_id)
    obj.status = status
    if user_id:
        obj.updated_by_id = user_id
        obj.status_changed_by_id = user_id
    obj.status_changed_at = _dt.utcnow()
    obj.status_remarks = remarks
    obj.updated_at = _dt.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


def update_client_status(
    db: Session, calc_id: int, status: str, user_id: int = None
) -> Optional[models.Calculation]:
    from datetime import datetime as _dt
    obj = db.query(models.Calculation).filter(models.Calculation.id == calc_id).first()
    if not obj:
        return None
    obj.client_status = status
    if user_id:
        obj.client_status_changed_by_id = user_id
    obj.client_status_changed_at = _dt.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


def update_version_client_status(
    db: Session, version_id: int, status: str, user_id: int = None
) -> Optional[models.CalculationVersion]:
    from datetime import datetime as _dt
    obj = db.query(models.CalculationVersion).filter(models.CalculationVersion.id == version_id).first()
    if not obj:
        return None
    obj.client_status = status
    if user_id:
        obj.client_status_changed_by_id = user_id
    obj.client_status_changed_at = _dt.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


# ── Notifications ─────────────────────────────────────────────────────────────
def list_notifications(db: Session) -> List[models.Notification]:
    return (
        db.query(models.Notification)
        .order_by(models.Notification.updated_at.desc())
        .limit(50)
        .all()
    )


def list_notifications_admin(db: Session) -> List[models.Notification]:
    return (
        db.query(models.Notification)
        .order_by(models.Notification.updated_at.desc())
        .limit(200)
        .all()
    )


def get_unread_count(db: Session) -> int:
    return db.query(models.Notification).filter(models.Notification.is_read == False).count()


def mark_notification_read(db: Session, notif_id: int, user_id: int) -> Optional[models.Notification]:
    from datetime import datetime as _dt
    obj = db.query(models.Notification).filter(models.Notification.id == notif_id).first()
    if not obj:
        return None
    if not obj.is_read:
        obj.is_read    = True
        obj.read_by_id = user_id
        obj.read_at    = _dt.utcnow()
        db.commit()
        db.refresh(obj)
    return obj


def mark_all_notifications_read(db: Session, user_id: int) -> None:
    from datetime import datetime as _dt
    now = _dt.utcnow()
    db.query(models.Notification).filter(
        models.Notification.is_read == False
    ).update({"is_read": True, "read_by_id": user_id, "read_at": now})
    db.commit()


def upsert_order_notification(
    db: Session, order_id: int, client_id: Optional[int], title: str, message: str
) -> models.Notification:
    obj = models.Notification(
        title=title,
        message=message,
        client_id=client_id,
        order_id=order_id,
        notification_type="unconfirmed_quote",
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def resolve_order_notifications(db: Session, order_id: int) -> None:
    db.query(models.Notification).filter(
        models.Notification.order_id == order_id,
        models.Notification.notification_type == "unconfirmed_quote",
    ).delete()
    db.commit()
