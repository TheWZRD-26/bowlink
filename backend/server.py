from fastapi import FastAPI, APIRouter, HTTPException, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import secrets
import string
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import jwt, JWTError

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ========== MODELS ==========

class User(BaseModel):
    user_id: str
    identifiant: str
    name: str
    nickname: Optional[str] = None
    picture: Optional[str] = None
    custom_avatar: Optional[str] = None
    created_at: datetime


class RegisterRequest(BaseModel):
    identifiant: str
    pin: str
    name: str


class LoginRequest(BaseModel):
    identifiant: str
    pin: str


class ProfileUpdate(BaseModel):
    nickname: Optional[str] = None
    picture: Optional[str] = None
    custom_avatar: Optional[str] = None


class MatchSettings(BaseModel):
    format: str
    ends: int = 12
    arrows_per_end: int = 6
    set_system: bool = False
    sets: int = 5


class CreateMatchRequest(BaseModel):
    settings: MatchSettings


class JoinMatchRequest(BaseModel):
    code: str


class ScoreSubmit(BaseModel):
    end_index: int
    arrow_index: int
    value: int
    is_x: bool = False


class ResetArrow(BaseModel):
    end_index: int
    arrow_index: int


class ShootoffScore(BaseModel):
    value: int
    is_x: bool = False


class ManualWinner(BaseModel):
    user_id: str


# ========== HELPERS ==========

def now_utc():
    return datetime.now(timezone.utc)

def iso(dt: datetime) -> str:
    return dt.isoformat()

def gen_code(length: int = 6) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def hash_pin(pin: str) -> str:
    return pwd_ctx.hash(pin)

def verify_pin(pin: str, hashed: str) -> bool:
    return pwd_ctx.verify(pin, hashed)

def create_token(user_id: str, identifiant: str) -> str:
    expire = now_utc() + timedelta(hours=JWT_EXPIRE_HOURS)
    return jwt.encode(
        {"sub": user_id, "identifiant": identifiant, "exp": expire},
        JWT_SECRET, algorithm=JWT_ALGORITHM,
    )

def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None

async def get_user_from_token(token: Optional[str]) -> Optional[User]:
    if not token:
        return None
    payload = decode_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not doc:
        return None
    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return User(**doc)

async def require_user(authorization: Optional[str] = Header(default=None)) -> User:
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    user = await get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


# ========== AUTH ==========

@api_router.post("/auth/register")
async def register(body: RegisterRequest):
    identifiant = body.identifiant.strip()
    if not identifiant or len(identifiant) < 3:
        raise HTTPException(status_code=400, detail="Identifiant trop court (min 3 caractères)")
    if not body.pin.isdigit() or len(body.pin) < 4:
        raise HTTPException(status_code=400, detail="PIN invalide (min 4 chiffres)")
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Nom requis")
    if await db.users.find_one({"identifiant": identifiant}):
        raise HTTPException(status_code=400, detail="Identifiant déjà utilisé")

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    name = body.name.strip()[:40]
    doc = {
        "user_id": user_id,
        "identifiant": identifiant,
        "pin_hash": hash_pin(body.pin),
        "name": name,
        "nickname": name.split(" ")[0],
        "picture": None,
        "custom_avatar": None,
        "created_at": iso(now_utc()),
    }
    await db.users.insert_one(doc)
    return {"token": create_token(user_id, identifiant), "user_id": user_id}


@api_router.post("/auth/login")
async def login(body: LoginRequest):
    doc = await db.users.find_one({"identifiant": body.identifiant.strip()})
    if not doc or not verify_pin(body.pin, doc["pin_hash"]):
        raise HTTPException(status_code=401, detail="Identifiant ou PIN incorrect")
    return {"token": create_token(doc["user_id"], doc["identifiant"]), "user_id": doc["user_id"]}


@api_router.get("/auth/me")
async def me(authorization: Optional[str] = Header(default=None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    user = await get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user.model_dump(mode="json")


# ========== PROFILE ==========

@api_router.put("/profile")
async def update_profile(body: ProfileUpdate, authorization: Optional[str] = Header(default=None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    user = await get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    update: Dict[str, Any] = {}
    if body.nickname is not None:
        update["nickname"] = body.nickname.strip()[:30]
    if body.picture is not None:
        update["picture"] = body.picture
    if body.custom_avatar is not None:
        if len(body.custom_avatar) > 3_000_000:
            raise HTTPException(status_code=413, detail="Avatar too large")
        update["custom_avatar"] = body.custom_avatar
    if update:
        await db.users.update_one({"user_id": user.user_id}, {"$set": update})
    return await db.users.find_one({"user_id": user.user_id}, {"_id": 0})


# ========== MATCHES ==========

def empty_ends(ends: int, arrows_per_end: int):
    return [[None] * arrows_per_end for _ in range(ends)]

def end_total(end: list) -> int:
    return sum(v for v in end if v is not None)

def end_filled(end: list) -> bool:
    return all(v is not None for v in end)

def compute_recurve_set_points(players: list) -> list:
    if len(players) != 2:
        return [0, 0]
    a_scores, b_scores = players[0]["scores"], players[1]["scores"]
    pa, pb = 0, 0
    for i in range(min(len(a_scores), len(b_scores))):
        if not end_filled(a_scores[i]) or not end_filled(b_scores[i]):
            continue
        ta, tb = end_total(a_scores[i]), end_total(b_scores[i])
        if ta > tb: pa += 2
        elif tb > ta: pb += 2
        else: pa += 1; pb += 1
    return [pa, pb]

def recurve_match_won(match: dict) -> bool:
    if match["settings"]["format"] != "recurve" or len(match["players"]) != 2:
        return False
    pts = compute_recurve_set_points(match["players"])
    return pts[0] >= 6 or pts[1] >= 6

async def _unique_code() -> str:
    for _ in range(20):
        code = gen_code(6)
        if not await db.matches.find_one({"code": code, "status": {"$ne": "finished"}}):
            return code
    return gen_code(8)


@api_router.post("/matches")
async def create_match(body: CreateMatchRequest, authorization: Optional[str] = Header(default=None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    user = await get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    s = body.settings
    match_id = f"match_{uuid.uuid4().hex[:12]}"
    code = await _unique_code()
    player = {
        "user_id": user.user_id,
        "nickname": user.nickname or user.name,
        "picture": user.custom_avatar or user.picture,
        "scores": empty_ends(s.ends if s.format != "recurve" else s.sets, s.arrows_per_end),
        "is_x": empty_ends(s.ends if s.format != "recurve" else s.sets, s.arrows_per_end),
    }
    doc = {
        "match_id": match_id, "code": code, "host_id": user.user_id,
        "settings": s.model_dump(), "status": "waiting", "players": [player],
        "current_end": 0, "created_at": iso(now_utc()), "updated_at": iso(now_utc()), "finished_at": None,
    }
    await db.matches.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.post("/matches/join")
async def join_match(body: JoinMatchRequest, authorization: Optional[str] = Header(default=None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    user = await get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    code = body.code.strip().upper()
    match = await db.matches.find_one({"code": code, "status": {"$ne": "finished"}}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if any(p["user_id"] == user.user_id for p in match["players"]):
        return match
    s = match["settings"]
    ends_count = s["sets"] if s["format"] == "recurve" else s["ends"]
    new_player = {
        "user_id": user.user_id, "nickname": user.nickname or user.name,
        "picture": user.custom_avatar or user.picture,
        "scores": empty_ends(ends_count, s["arrows_per_end"]),
        "is_x": empty_ends(ends_count, s["arrows_per_end"]),
    }
    await db.matches.update_one(
        {"match_id": match["match_id"]},
        {"$push": {"players": new_player}, "$set": {"updated_at": iso(now_utc())}},
    )
    return await db.matches.find_one({"match_id": match["match_id"]}, {"_id": 0})


@api_router.get("/matches/{match_id}")
async def get_match(match_id: str, authorization: Optional[str] = Header(default=None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    user = await get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    match = await db.matches.find_one({"match_id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match


@api_router.post("/matches/{match_id}/start")
async def start_match(match_id: str, authorization: Optional[str] = Header(default=None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    user = await get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    match = await db.matches.find_one({"match_id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match["host_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Only host can start")
    await db.matches.update_one({"match_id": match_id}, {"$set": {"status": "active", "updated_at": iso(now_utc())}})
    return await db.matches.find_one({"match_id": match_id}, {"_id": 0})


@api_router.post("/matches/{match_id}/score")
async def submit_score(match_id: str, body: ScoreSubmit, authorization: Optional[str] = Header(default=None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    user = await get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    match = await db.matches.find_one({"match_id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match["status"] != "active":
        raise HTTPException(status_code=400, detail="Match is not active")
    if recurve_match_won(match):
        raise HTTPException(status_code=400, detail="Match already decided")
    player_idx = next((i for i, p in enumerate(match["players"]) if p["user_id"] == user.user_id), None)
    if player_idx is None:
        raise HTTPException(status_code=403, detail="Not a player in this match")
    val = max(0, min(10, body.value))
    is_x = bool(body.is_x and val == 10)
    await db.matches.update_one({"match_id": match_id}, {"$set": {
        f"players.{player_idx}.scores.{body.end_index}.{body.arrow_index}": val,
        f"players.{player_idx}.is_x.{body.end_index}.{body.arrow_index}": is_x,
        "updated_at": iso(now_utc()),
    }})
    updated = await db.matches.find_one({"match_id": match_id}, {"_id": 0})
    if updated and recurve_match_won(updated) and updated["status"] == "active":
        await db.matches.update_one({"match_id": match_id}, {"$set": {
            "status": "finished", "finished_at": iso(now_utc()), "updated_at": iso(now_utc())
        }})
        updated = await db.matches.find_one({"match_id": match_id}, {"_id": 0})
    return updated


@api_router.post("/matches/{match_id}/score/reset")
async def reset_arrow(match_id: str, body: ResetArrow, authorization: Optional[str] = Header(default=None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    user = await get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    match = await db.matches.find_one({"match_id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    player_idx = next((i for i, p in enumerate(match["players"]) if p["user_id"] == user.user_id), None)
    if player_idx is None:
        raise HTTPException(status_code=403, detail="Not a player")
    await db.matches.update_one({"match_id": match_id}, {"$set": {
        f"players.{player_idx}.scores.{body.end_index}.{body.arrow_index}": None,
        f"players.{player_idx}.is_x.{body.end_index}.{body.arrow_index}": False,
        "updated_at": iso(now_utc()),
    }})
    return await db.matches.find_one({"match_id": match_id}, {"_id": 0})


@api_router.post("/matches/{match_id}/shootoff")
async def shootoff_submit(match_id: str, body: ShootoffScore, authorization: Optional[str] = Header(default=None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    user = await get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    match = await db.matches.find_one({"match_id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if not any(p["user_id"] == user.user_id for p in match["players"]):
        raise HTTPException(status_code=403, detail="Not a player")
    val = max(0, min(10, body.value))
    is_x = bool(body.is_x and val == 10)
    await db.matches.update_one({"match_id": match_id}, {"$set": {
        f"shootoff.{user.user_id}": {"value": val, "is_x": is_x, "at": iso(now_utc())},
        "updated_at": iso(now_utc()),
    }})
    return await db.matches.find_one({"match_id": match_id}, {"_id": 0})


@api_router.post("/matches/{match_id}/manual-winner")
async def manual_winner(match_id: str, body: ManualWinner, authorization: Optional[str] = Header(default=None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    user = await get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    match = await db.matches.find_one({"match_id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match["host_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Only host can pick")
    winner = body.user_id.strip() if body.user_id else ""
    if winner and not any(p["user_id"] == winner for p in match["players"]):
        raise HTTPException(status_code=400, detail="Unknown player")
    await db.matches.update_one({"match_id": match_id}, {"$set": {"manual_winner_id": winner or None, "updated_at": iso(now_utc())}})
    return await db.matches.find_one({"match_id": match_id}, {"_id": 0})


@api_router.post("/matches/{match_id}/finish")
async def finish_match(match_id: str, authorization: Optional[str] = Header(default=None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    user = await get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    match = await db.matches.find_one({"match_id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match["host_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Only host can finish")
    await db.matches.update_one({"match_id": match_id}, {"$set": {"status": "finished", "finished_at": iso(now_utc()), "updated_at": iso(now_utc())}})
    return await db.matches.find_one({"match_id": match_id}, {"_id": 0})


# ========== SOLO ==========

@api_router.post("/solo")
async def create_solo(body: CreateMatchRequest, authorization: Optional[str] = Header(default=None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    user = await get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    s = body.settings
    solo_id = f"solo_{uuid.uuid4().hex[:12]}"
    doc = {
        "solo_id": solo_id, "user_id": user.user_id, "settings": s.model_dump(),
        "status": "active", "scores": empty_ends(s.ends, s.arrows_per_end),
        "is_x": empty_ends(s.ends, s.arrows_per_end),
        "created_at": iso(now_utc()), "updated_at": iso(now_utc()), "finished_at": None,
    }
    await db.solo_sessions.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/solo/{solo_id}")
async def get_solo(solo_id: str, authorization: Optional[str] = Header(default=None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    user = await get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    doc = await db.solo_sessions.find_one({"solo_id": solo_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    return doc


@api_router.post("/solo/{solo_id}/score")
async def solo_score(solo_id: str, body: ScoreSubmit, authorization: Optional[str] = Header(default=None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    user = await get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    doc = await db.solo_sessions.find_one({"solo_id": solo_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    val = max(0, min(10, body.value))
    is_x = bool(body.is_x and val == 10)
    await db.solo_sessions.update_one({"solo_id": solo_id}, {"$set": {
        f"scores.{body.end_index}.{body.arrow_index}": val,
        f"is_x.{body.end_index}.{body.arrow_index}": is_x,
        "updated_at": iso(now_utc()),
    }})
    return await db.solo_sessions.find_one({"solo_id": solo_id}, {"_id": 0})


@api_router.post("/solo/{solo_id}/score/reset")
async def solo_score_reset(solo_id: str, body: ResetArrow, authorization: Optional[str] = Header(default=None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    user = await get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    doc = await db.solo_sessions.find_one({"solo_id": solo_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.solo_sessions.update_one({"solo_id": solo_id}, {"$set": {
        f"scores.{body.end_index}.{body.arrow_index}": None,
        f"is_x.{body.end_index}.{body.arrow_index}": False,
        "updated_at": iso(now_utc()),
    }})
    return await db.solo_sessions.find_one({"solo_id": solo_id}, {"_id": 0})


@api_router.post("/solo/{solo_id}/finish")
async def solo_finish(solo_id: str, authorization: Optional[str] = Header(default=None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    user = await get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    await db.solo_sessions.update_one(
        {"solo_id": solo_id, "user_id": user.user_id},
        {"$set": {"status": "finished", "finished_at": iso(now_utc()), "updated_at": iso(now_utc())}},
    )
    return await db.solo_sessions.find_one({"solo_id": solo_id}, {"_id": 0})


# ========== HISTORY ==========

@api_router.get("/history")
async def history(authorization: Optional[str] = Header(default=None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    user = await get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    matches = await db.matches.find(
        {"players.user_id": user.user_id, "hidden_for": {"$ne": user.user_id}}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    solos = await db.solo_sessions.find(
        {"user_id": user.user_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    items = []
    for m in matches:
        items.append({"type": "match", "id": m["match_id"], "format": m["settings"]["format"],
            "status": m["status"], "created_at": m["created_at"],
            "players": [{"nickname": p["nickname"], "user_id": p["user_id"]} for p in m["players"]],
            "settings": m["settings"], "code": m.get("code")})
    for s in solos:
        items.append({"type": "solo", "id": s["solo_id"], "format": "solo",
            "status": s["status"], "created_at": s["created_at"], "settings": s["settings"]})
    items.sort(key=lambda x: x["created_at"], reverse=True)
    return {"items": items}


@api_router.delete("/history/solo/{solo_id}")
async def delete_solo(solo_id: str, authorization: Optional[str] = Header(default=None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    user = await get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    res = await db.solo_sessions.delete_one({"solo_id": solo_id, "user_id": user.user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


@api_router.delete("/history/match/{match_id}")
async def hide_match(match_id: str, authorization: Optional[str] = Header(default=None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    user = await get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    match = await db.matches.find_one({"match_id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if not any(p["user_id"] == user.user_id for p in match["players"]):
        raise HTTPException(status_code=403, detail="Not a player in this match")
    await db.matches.update_one({"match_id": match_id}, {
        "$addToSet": {"hidden_for": user.user_id}, "$set": {"updated_at": iso(now_utc())}
    })
    updated = await db.matches.find_one({"match_id": match_id}, {"_id": 0})
    hidden = set(updated.get("hidden_for") or [])
    if {p["user_id"] for p in updated["players"]}.issubset(hidden):
        await db.matches.delete_one({"match_id": match_id})
    return {"ok": True}


@api_router.get("/")
async def root():
    return {"message": "BowLink Archery API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
