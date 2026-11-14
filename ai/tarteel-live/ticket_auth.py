from __future__ import annotations

import base64
import hashlib
import hmac
import json
import re
import time
from typing import Any

AUDIENCE = "irtaki-tarteel-live"
ALLOWED_MODES = {"tarteel1", "tarteel2"}
MAX_TICKET_LIFETIME = 60

_USED_TICKETS: dict[str, int] = {}

_B64_PATTERN = re.compile(r"^[A-Za-z0-9_-]+$")
_JTI_PATTERN = re.compile(r"^[0-9a-f]{32}$")


class TicketValidationError(ValueError):
    """Ticket absent, invalide, expiré ou déjà utilisé."""


def _decode_base64url(value: str) -> bytes:
    if not value or not _B64_PATTERN.fullmatch(value):
        raise TicketValidationError("Invalid ticket encoding")

    try:
        decoded = base64.urlsafe_b64decode(
            value + "=" * (-len(value) % 4)
        )
    except Exception as exc:
        raise TicketValidationError("Invalid ticket encoding") from exc

    canonical = base64.urlsafe_b64encode(decoded).decode("ascii").rstrip("=")

    if not hmac.compare_digest(canonical, value):
        raise TicketValidationError("Non-canonical ticket encoding")

    return decoded


def verify_ticket(
    ticket: str,
    expected_mode: str,
    secret: bytes,
    now: int | None = None,
) -> str:
    """
    Vérifie un ticket HMAC-SHA256 et interdit sa réutilisation
    dans le processus Python courant.

    Retourne l'identifiant de l'utilisateur authentifié.
    """

    current_time = int(time.time()) if now is None else now

    if expected_mode not in ALLOWED_MODES:
        raise TicketValidationError("Invalid recognition mode")

    if not isinstance(ticket, str) or len(ticket) > 4096:
        raise TicketValidationError("Invalid ticket")

    if not isinstance(secret, bytes) or len(secret) < 32:
        raise TicketValidationError("Invalid server secret")

    parts = ticket.split(".")

    if len(parts) != 2:
        raise TicketValidationError("Invalid ticket structure")

    payload_part, signature_part = parts

    if not _B64_PATTERN.fullmatch(payload_part):
        raise TicketValidationError("Invalid ticket payload")

    supplied_signature = _decode_base64url(signature_part)

    expected_signature = hmac.new(
        secret,
        payload_part.encode("ascii"),
        hashlib.sha256,
    ).digest()

    if not hmac.compare_digest(
        supplied_signature,
        expected_signature,
    ):
        raise TicketValidationError("Invalid ticket signature")

    payload_bytes = _decode_base64url(payload_part)

    try:
        claims: Any = json.loads(payload_bytes.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise TicketValidationError("Invalid ticket payload") from exc

    if not isinstance(claims, dict):
        raise TicketValidationError("Invalid ticket claims")

    user_id = claims.get("sub")
    audience = claims.get("aud")
    mode = claims.get("mode")
    jti = claims.get("jti")
    issued_at = claims.get("iat")
    expires_at = claims.get("exp")

    if not isinstance(user_id, str) or not user_id or len(user_id) > 128:
        raise TicketValidationError("Invalid user")

    if audience != AUDIENCE:
        raise TicketValidationError("Invalid ticket audience")

    if mode != expected_mode:
        raise TicketValidationError("Invalid ticket mode")

    if not isinstance(jti, str) or not _JTI_PATTERN.fullmatch(jti):
        raise TicketValidationError("Invalid ticket identifier")

    # bool est une sous-classe de int en Python : on le refuse explicitement.
    if type(issued_at) is not int or type(expires_at) is not int:
        raise TicketValidationError("Invalid ticket timestamps")

    if issued_at > current_time + 10:
        raise TicketValidationError("Ticket issued in the future")

    if expires_at <= current_time:
        raise TicketValidationError("Ticket expired")

    if expires_at <= issued_at:
        raise TicketValidationError("Invalid ticket lifetime")

    if expires_at - issued_at > MAX_TICKET_LIFETIME:
        raise TicketValidationError("Ticket lifetime too long")

    # Nettoyage des identifiants expirés.
    expired = [
        identifier
        for identifier, expiry in _USED_TICKETS.items()
        if expiry <= current_time
    ]

    for identifier in expired:
        del _USED_TICKETS[identifier]

    if jti in _USED_TICKETS:
        raise TicketValidationError("Ticket already used")

    # Validation et consommation sont synchrones : avec un seul worker
    # asyncio, aucune autre coroutine ne s'intercale ici.
    _USED_TICKETS[jti] = expires_at

    return user_id
