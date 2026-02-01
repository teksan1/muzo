from fastapi import FastAPI, APIRouter, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
from datetime import datetime
import logging
from contextlib import asynccontextmanager
import os
import json

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Persistence file
DATA_FILE = os.environ.get("DATA_FILE", "/home/ubuntu/muzo/memory/data.json")
os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)

# In-memory storage
storage = {
    "tracks": [],
    "playlists": []
}

def load_data():
    global storage
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r') as f:
                storage = json.load(f)
                logger.info(f"Loaded {len(storage['tracks'])} tracks and {len(storage['playlists'])} playlists")
        except Exception as e:
            logger.error(f"Error loading data: {e}")

def save_data():
    try:
        with open(DATA_FILE, 'w') as f:
            json.dump(storage, f)
    except Exception as e:
        logger.error(f"Error saving data: {e}")

# Initial load
load_data()

# Camelot Wheel Mappings
CAMELOT_TO_KEY = {
    "1A": "Ab minor", "1B": "B major", "2A": "Eb minor", "2B": "Gb major",
    "3A": "Bb minor", "3B": "Db major", "4A": "F minor", "4B": "Ab major",
    "5A": "C minor", "5B": "Eb major", "6A": "G minor", "6B": "Bb major",
    "7A": "D minor", "7B": "F major", "8A": "A minor", "8B": "C major",
    "9A": "E minor", "9B": "G major", "10A": "B minor", "10B": "D major",
    "11A": "Gb minor", "11B": "A major", "12A": "Db minor", "12B": "E major"
}
KEY_TO_CAMELOT = {v: k for k, v in CAMELOT_TO_KEY.items()}

def get_camelot_from_key(key: str) -> str:
    return KEY_TO_CAMELOT.get(key, "?")

# Models
class Track(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    title: str
    artist: str = ""
    album: str = ""
    key: str
    camelot_key: str
    bpm: float
    energy: int
    duration: float = 0.0
    date_added: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    playlist_id: Optional[str] = None
    analysis_method: str = "manual"

class TrackCreate(BaseModel):
    filename: str
    title: str
    artist: str = ""
    album: str = ""
    key: str
    bpm: float
    energy: int
    duration: float = 0.0
    playlist_id: Optional[str] = None
    analysis_method: str = "manual"

class Playlist(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    emoji: str = "🎵"
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    track_count: int = 0

class PlaylistCreate(BaseModel):
    name: str
    description: str = ""
    emoji: str = "🎵"

# API Setup
app = FastAPI(title="Muzo API")
api_router = APIRouter(prefix="/api")

@api_router.get("/tracks", response_model=List[Track])
async def get_tracks(playlist_id: Optional[str] = None):
    tracks = storage["tracks"]
    if playlist_id:
        tracks = [t for t in tracks if t.get("playlist_id") == playlist_id]
    return tracks

@api_router.post("/tracks", response_model=Track)
async def create_track(track_data: TrackCreate):
    track = Track(
        **track_data.dict(),
        camelot_key=get_camelot_from_key(track_data.key)
    )
    storage["tracks"].append(track.dict())
    
    if track.playlist_id:
        for p in storage["playlists"]:
            if p["id"] == track.playlist_id:
                p["track_count"] += 1
                break
    
    save_data()
    return track

@api_router.put("/tracks/{track_id}", response_model=Track)
async def update_track(track_id: str, update_data: Dict = Body(...)):
    for i, track in enumerate(storage["tracks"]):
        if track["id"] == track_id:
            old_playlist_id = track.get("playlist_id")
            new_playlist_id = update_data.get("playlist_id")
            
            # Update track
            for key, value in update_data.items():
                if value is not None:
                    track[key] = value
            
            if "key" in update_data:
                track["camelot_key"] = get_camelot_from_key(update_data["key"])
            
            # Update playlist counts
            if old_playlist_id != new_playlist_id:
                for p in storage["playlists"]:
                    if p["id"] == old_playlist_id:
                        p["track_count"] = max(0, p["track_count"] - 1)
                    if p["id"] == new_playlist_id:
                        p["track_count"] += 1
            
            save_data()
            return track
    raise HTTPException(status_code=404, detail="Track not found")

@api_router.delete("/tracks/{track_id}")
async def delete_track(track_id: str):
    for i, track in enumerate(storage["tracks"]):
        if track["id"] == track_id:
            playlist_id = track.get("playlist_id")
            if playlist_id:
                for p in storage["playlists"]:
                    if p["id"] == playlist_id:
                        p["track_count"] = max(0, p["track_count"] - 1)
            
            storage["tracks"].pop(i)
            save_data()
            return {"message": "Track deleted"}
    raise HTTPException(status_code=404, detail="Track not found")

@api_router.get("/playlists", response_model=List[Playlist])
async def get_playlists():
    return storage["playlists"]

@api_router.post("/playlists", response_model=Playlist)
async def create_playlist(playlist_data: PlaylistCreate):
    playlist = Playlist(**playlist_data.dict())
    storage["playlists"].append(playlist.dict())
    save_data()
    return playlist

@api_router.delete("/playlists/{playlist_id}")
async def delete_playlist(playlist_id: str):
    for i, p in enumerate(storage["playlists"]):
        if p["id"] == playlist_id:
            # Unassign tracks
            for track in storage["tracks"]:
                if track.get("playlist_id") == playlist_id:
                    track["playlist_id"] = None
            
            storage["playlists"].pop(i)
            save_data()
            return {"message": "Playlist deleted"}
    raise HTTPException(status_code=404, detail="Playlist not found")

@api_router.post("/analyze-ai")
async def analyze_ai(request: Dict = Body(...)):
    # Mock AI response since we don't have the real key
    import random
    keys = list(KEY_TO_CAMELOT.keys())
    return {
        "key": random.choice(keys),
        "bpm": random.randint(70, 180),
        "energy": random.randint(1, 10),
        "confidence": 0.95
    }

app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
