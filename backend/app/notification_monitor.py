"""Background task: periodically flag orders with no confirmed quotation."""

import asyncio
import logging

from .database import SessionLocal
from . import crud, models

_logger = logging.getLogger(__name__)
_INTERVAL_SECONDS = 60  # 1 minute


async def notification_monitor_loop() -> None:
    await asyncio.sleep(30)
    while True:
        try:
            await _run_check()
        except Exception as exc:
            _logger.error("Notification monitor error: %s", exc)
        await asyncio.sleep(_INTERVAL_SECONDS)


async def _run_check() -> None:
    db = SessionLocal()
    try:
        orders = db.query(models.Order).all()
        for order in orders:
            calcs = db.query(models.Calculation).filter(
                models.Calculation.order_id == order.id
            ).all()
            if not calcs:
                continue
            if _order_has_confirmed(calcs, db):
                crud.resolve_order_notifications(db, order.id)
            else:
                client_name = order.client.name if order.client else "Unknown Client"
                crud.upsert_order_notification(
                    db,
                    order_id=order.id,
                    client_id=order.client_id,
                    title=f"Unconfirmed cost estimate — {client_name}",
                    message=f'Order "{order.name}" under {client_name} has no confirmed cost estimate.',
                )
    finally:
        db.close()


def _order_has_confirmed(calcs: list, db) -> bool:
    for calc in calcs:
        if calc.status == "confirmed":
            return True
        ver = db.query(models.CalculationVersion).filter(
            models.CalculationVersion.calculation_id == calc.id,
            models.CalculationVersion.status == "confirmed",
        ).first()
        if ver:
            return True
    return False

