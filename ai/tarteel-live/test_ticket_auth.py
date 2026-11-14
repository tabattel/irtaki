from __future__ import annotations

import base64
import hashlib
import hmac
import json
import unittest

import ticket_auth

SECRET = b"0123456789abcdef0123456789abcdef"


def encode_base64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def create_ticket(
    *,
    user_id: str = "user-test-123",
    mode: str = "tarteel1",
    jti: str = "0123456789abcdef0123456789abcdef",
    issued_at: int = 1000,
    expires_at: int = 1045,
    audience: str = ticket_auth.AUDIENCE,
    secret: bytes = SECRET,
) -> str:
    payload = {
        "sub": user_id,
        "aud": audience,
        "mode": mode,
        "jti": jti,
        "iat": issued_at,
        "exp": expires_at,
    }

    payload_part = encode_base64url(
        json.dumps(payload, separators=(",", ":")).encode("utf-8")
    )

    signature = hmac.new(
        secret,
        payload_part.encode("ascii"),
        hashlib.sha256,
    ).digest()

    return f"{payload_part}.{encode_base64url(signature)}"


class TicketAuthenticationTests(unittest.TestCase):

    def setUp(self):
        ticket_auth._USED_TICKETS.clear()

    def test_valid_ticket(self):
        ticket = create_ticket()

        user_id = ticket_auth.verify_ticket(
            ticket,
            "tarteel1",
            SECRET,
            now=1010,
        )

        self.assertEqual(user_id, "user-test-123")

    def test_expired_ticket(self):
        ticket = create_ticket(expires_at=1005)

        with self.assertRaises(ticket_auth.TicketValidationError):
            ticket_auth.verify_ticket(
                ticket,
                "tarteel1",
                SECRET,
                now=1010,
            )

    def test_invalid_signature(self):
        ticket = create_ticket()
        altered = ticket[:-1] + ("A" if ticket[-1] != "A" else "B")

        with self.assertRaises(ticket_auth.TicketValidationError):
            ticket_auth.verify_ticket(
                altered,
                "tarteel1",
                SECRET,
                now=1010,
            )

    def test_wrong_secret(self):
        ticket = create_ticket()

        with self.assertRaises(ticket_auth.TicketValidationError):
            ticket_auth.verify_ticket(
                ticket,
                "tarteel1",
                b"another-secret-0123456789abcdef",
                now=1010,
            )

    def test_wrong_mode(self):
        ticket = create_ticket(mode="tarteel1")

        with self.assertRaises(ticket_auth.TicketValidationError):
            ticket_auth.verify_ticket(
                ticket,
                "tarteel2",
                SECRET,
                now=1010,
            )

    def test_wrong_audience(self):
        ticket = create_ticket(audience="another-service")

        with self.assertRaises(ticket_auth.TicketValidationError):
            ticket_auth.verify_ticket(
                ticket,
                "tarteel1",
                SECRET,
                now=1010,
            )

    def test_ticket_cannot_be_reused(self):
        ticket = create_ticket()

        first_user = ticket_auth.verify_ticket(
            ticket,
            "tarteel1",
            SECRET,
            now=1010,
        )

        self.assertEqual(first_user, "user-test-123")

        with self.assertRaises(ticket_auth.TicketValidationError):
            ticket_auth.verify_ticket(
                ticket,
                "tarteel1",
                SECRET,
                now=1011,
            )

    def test_ticket_lifetime_is_limited(self):
        ticket = create_ticket(expires_at=1100)

        with self.assertRaises(ticket_auth.TicketValidationError):
            ticket_auth.verify_ticket(
                ticket,
                "tarteel1",
                SECRET,
                now=1010,
            )

    def test_future_ticket_is_rejected(self):
        ticket = create_ticket(issued_at=1020, expires_at=1065)

        with self.assertRaises(ticket_auth.TicketValidationError):
            ticket_auth.verify_ticket(
                ticket,
                "tarteel1",
                SECRET,
                now=1000,
            )

    def test_invalid_structure(self):
        with self.assertRaises(ticket_auth.TicketValidationError):
            ticket_auth.verify_ticket(
                "invalid-ticket",
                "tarteel1",
                SECRET,
                now=1010,
            )


if __name__ == "__main__":
    unittest.main(verbosity=2)
