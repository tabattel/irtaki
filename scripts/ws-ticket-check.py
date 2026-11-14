import asyncio, base64, hashlib, hmac, json, secrets, sys, time
from pathlib import Path
import websockets

target = sys.argv[1] if len(sys.argv) > 1 else "local"
BASE, ORIGIN = {
    "local": ("ws://127.0.0.1:8767", "http://localhost:3000"),
    "cloudflare": ("wss://irtaki.com", "https://irtaki.com"),
}[target]

def b64u(data):
    return base64.urlsafe_b64encode(data).decode().rstrip("=")

def make_ticket(mode):
    raw = (Path.home() / ".config/irtaki/tarteel-live.secret").read_text().strip()
    key = bytes.fromhex(raw)
    now = int(time.time())
    claims = {"sub": "diag-test", "aud": "irtaki-tarteel-live", "mode": mode,
              "jti": secrets.token_hex(16), "iat": now, "exp": now + 45}
    payload = b64u(json.dumps(claims, separators=(",", ":")).encode())
    sig = b64u(hmac.new(key, payload.encode("ascii"), hashlib.sha256).digest())
    return f"{payload}.{sig}"

async def attempt(label, mode, ticket):
    msg = {"type": "configure", "sample_rate": 16000}
    if ticket:
        msg["ticket"] = ticket
    try:
        async with websockets.connect(f"{BASE}/ws/{mode}", origin=ORIGIN, open_timeout=10) as ws:
            await ws.send(json.dumps(msg))
            reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=40))
            print(f"   {label:<12} -> {reply.get('type')} {reply.get('message', '')[:50]}")
    except Exception as e:
        print(f"   {label:<12} -> {type(e).__name__} {str(e)[:90]}")

async def main():
    print(f"Cible : {target}")
    for mode in ("tarteel1", "tarteel2"):
        print(f" {mode}")
        await attempt("sans ticket", mode, None)
        ticket = make_ticket(mode)
        await attempt("ticket valide", mode, ticket)
        await asyncio.sleep(2)
        await attempt("rejeu", mode, ticket)

asyncio.run(main())
