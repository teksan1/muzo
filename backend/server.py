from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import base64
from contextlib import asynccontextmanager

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Camelot Wheel Mappings
CAMELOT_TO_KEY = {
    "1A": "Ab minor", "1B": "B major",
    "2A": "Eb minor", "2B": "Gb major",
    "3A": "Bb minor", "3B": "Db major",
    "4A": "F minor", "4B": "Ab major",
    "5A": "C minor", "5B": "Eb major",
    "6A": "G minor", "6B": "Bb major",
    "7A": "D minor", "7B": "F major",
    "8A": "A minor", "8B": "C major",
    "9A": "E minor", "9B": "G major",
    "10A": "B minor", "10B": "D major",
    "11A": "Gb minor", "11B": "A major",
    "12A": "Db minor", "12B": "E major"
}

KEY_TO_CAMELOT = {v: k for k, v in CAMELOT_TO_KEY.items()}

# Alternative key names mapping
ALT_KEY_NAMES = {
    "Ab minor": ["G# minor", "G#m", "Abm"],
    "Eb minor": ["D# minor", "D#m", "Ebm"],
    "Bb minor": ["A# minor", "A#m", "Bbm"],
    "F minor": ["Fm"],
    "C minor": ["Cm"],
    "G minor": ["Gm"],
    "D minor": ["Dm"],
    "A minor": ["Am"],
    "E minor": ["Em"],
    "B minor": ["Bm"],
    "Gb minor": ["F# minor", "F#m", "Gbm"],
    "Db minor": ["C# minor", "C#m", "Dbm"],
    "B major": ["Bmaj", "B"],
    "Gb major": ["F# major", "F#maj", "F#", "Gb"],
    "Db major": ["C# major", "C#maj", "C#", "Db"],
    "Ab major": ["G# major", "G#maj", "G#", "Ab"],
    "Eb major": ["D# major", "D#maj", "D#", "Eb"],
    "Bb major": ["A# major", "A#maj", "A#", "Bb"],
    "F major": ["Fmaj", "F"],
    "C major": ["Cmaj", "C"],
    "G major": ["Gmaj", "G"],
    "D major": ["Dmaj", "D"],
    "A major": ["Amaj", "A"],
    "E major": ["Emaj", "E"]
}

def normalize_key(key: str) -> str:
    """Convert any key format to standard format"""
    key = key.strip()
    if key in KEY_TO_CAMELOT:
        return key
    for standard, alternatives in ALT_KEY_NAMES.items():
        if key in alternatives:
            return standard
    return key

def get_camelot_from_key(key: str) -> str:
    """Convert musical key to Camelot notation"""
    normalized = normalize_key(key)
    return KEY_TO_CAMELOT.get(normalized, "?")

def get_harmonic_keys(camelot: str) -> List[str]:
    """Get harmonically compatible Camelot keys"""
    if len(camelot) < 2:
        return []
    
    try:
        num = int(camelot[:-1])
        letter = camelot[-1]
    except ValueError:
        return []
    
    compatible = []
    # Same position (perfect for energy boost)
    compatible.append(camelot)
    # +1 semitone (energy boost)
    next_num = num % 12 + 1
    compatible.append(f"{next_num}{letter}")
    # -1 semitone (energy drop)
    prev_num = (num - 2) % 12 + 1
    compatible.append(f"{prev_num}{letter}")
    # Relative major/minor (same energy, different mood)
    other_letter = "B" if letter == "A" else "A"
    compatible.append(f"{num}{other_letter}")
    
    return compatible

# Models
class Track(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    title: str
    artist: str = ""
    album: str = ""
    key: str  # Musical key (A minor, C major, etc.)
    camelot_key: str  # Camelot notation (8A, 9B, etc.)
    bpm: float
    energy: int  # 1-10 scale
    duration: float = 0.0  # Duration in seconds
    date_added: datetime = Field(default_factory=datetime.utcnow)
    playlist_id: Optional[str] = None
    analysis_method: str = "manual"  # manual, client, ai
    waveform_data: Optional[str] = None  # Base64 encoded waveform
    audio_data: Optional[str] = None  # Base64 encoded audio for small files

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
    waveform_data: Optional[str] = None
    audio_data: Optional[str] = None

class TrackUpdate(BaseModel):
    title: Optional[str] = None
    artist: Optional[str] = None
    album: Optional[str] = None
    key: Optional[str] = None
    bpm: Optional[float] = None
    energy: Optional[int] = None
    playlist_id: Optional[str] = None

class Playlist(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    emoji: str = "🎵"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    track_count: int = 0

class PlaylistCreate(BaseModel):
    name: str
    description: str = ""
    emoji: str = "🎵"

class HarmonicSuggestion(BaseModel):
    track: Track
    compatibility: str  # "perfect", "good", "energy_boost", "energy_drop"
    reason: str

class AIAnalysisRequest(BaseModel):
    audio_features: dict  # Client-side extracted features
    filename: str

class AIAnalysisResponse(BaseModel):
    key: str
    camelot_key: str
    bpm: float
    energy: int
    confidence: float

# Routes
@api_router.get("/")
async def root():
    return {"message": "Mixed In Key Clone API", "version": "1.0"}

@api_router.get("/camelot-wheel")
async def get_camelot_wheel():
    """Get the complete Camelot wheel mapping"""
    return {
        "camelot_to_key": CAMELOT_TO_KEY,
        "key_to_camelot": KEY_TO_CAMELOT
    }

# Track CRUD
@api_router.post("/tracks", response_model=Track)
async def create_track(track_data: TrackCreate):
    """Create a new track with analysis data"""
    camelot = get_camelot_from_key(track_data.key)
    normalized_key = normalize_key(track_data.key)
    
    track = Track(
        filename=track_data.filename,
        title=track_data.title,
        artist=track_data.artist,
        album=track_data.album,
        key=normalized_key,
        camelot_key=camelot,
        bpm=track_data.bpm,
        energy=max(1, min(10, track_data.energy)),  # Clamp 1-10
        duration=track_data.duration,
        playlist_id=track_data.playlist_id,
        analysis_method=track_data.analysis_method,
        waveform_data=track_data.waveform_data,
        audio_data=track_data.audio_data
    )
    
    await db.tracks.insert_one(track.dict())
    
    # Update playlist track count if assigned
    if track.playlist_id:
        await db.playlists.update_one(
            {"id": track.playlist_id},
            {"$inc": {"track_count": 1}}
        )
    
    return track

@api_router.get("/tracks", response_model=List[Track])
async def get_tracks(
    playlist_id: Optional[str] = None,
    key: Optional[str] = None,
    camelot: Optional[str] = None,
    min_bpm: Optional[float] = None,
    max_bpm: Optional[float] = None,
    min_energy: Optional[int] = None,
    max_energy: Optional[int] = None,
    sort_by: str = "date_added",
    sort_order: str = "desc"
):
    """Get all tracks with optional filtering"""
    query = {}
    
    if playlist_id:
        query["playlist_id"] = playlist_id
    if key:
        query["key"] = normalize_key(key)
    if camelot:
        query["camelot_key"] = camelot.upper()
    if min_bpm is not None:
        query["bpm"] = {"$gte": min_bpm}
    if max_bpm is not None:
        query.setdefault("bpm", {})["$lte"] = max_bpm
    if min_energy is not None:
        query["energy"] = {"$gte": min_energy}
    if max_energy is not None:
        query.setdefault("energy", {})["$lte"] = max_energy
    
    sort_direction = -1 if sort_order == "desc" else 1
    tracks = await db.tracks.find(query).sort(sort_by, sort_direction).to_list(1000)
    return [Track(**track) for track in tracks]

@api_router.get("/tracks/{track_id}", response_model=Track)
async def get_track(track_id: str):
    """Get a single track by ID"""
    track = await db.tracks.find_one({"id": track_id})
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    return Track(**track)

@api_router.put("/tracks/{track_id}", response_model=Track)
async def update_track(track_id: str, update_data: TrackUpdate):
    """Update a track"""
    track = await db.tracks.find_one({"id": track_id})
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    
    # Handle playlist change
    old_playlist_id = track.get("playlist_id")
    new_playlist_id = update_dict.get("playlist_id")
    
    if "key" in update_dict:
        update_dict["key"] = normalize_key(update_dict["key"])
        update_dict["camelot_key"] = get_camelot_from_key(update_dict["key"])
    
    if "energy" in update_dict:
        update_dict["energy"] = max(1, min(10, update_dict["energy"]))
    
    await db.tracks.update_one({"id": track_id}, {"$set": update_dict})
    
    # Update playlist counts
    if old_playlist_id != new_playlist_id:
        if old_playlist_id:
            await db.playlists.update_one(
                {"id": old_playlist_id},
                {"$inc": {"track_count": -1}}
            )
        if new_playlist_id:
            await db.playlists.update_one(
                {"id": new_playlist_id},
                {"$inc": {"track_count": 1}}
            )
    
    updated_track = await db.tracks.find_one({"id": track_id})
    return Track(**updated_track)

@api_router.delete("/tracks/{track_id}")
async def delete_track(track_id: str):
    """Delete a track"""
    track = await db.tracks.find_one({"id": track_id})
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    # Update playlist count
    if track.get("playlist_id"):
        await db.playlists.update_one(
            {"id": track["playlist_id"]},
            {"$inc": {"track_count": -1}}
        )
    
    await db.tracks.delete_one({"id": track_id})
    return {"message": "Track deleted successfully"}

# Harmonic Mixing Suggestions
@api_router.get("/tracks/{track_id}/harmonic-suggestions", response_model=List[HarmonicSuggestion])
async def get_harmonic_suggestions(track_id: str, limit: int = 10):
    """Get harmonically compatible tracks for mixing"""
    track = await db.tracks.find_one({"id": track_id})
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    camelot = track.get("camelot_key", "")
    if not camelot or camelot == "?":
        return []
    
    compatible_keys = get_harmonic_keys(camelot)
    
    # Find compatible tracks
    compatible_tracks = await db.tracks.find({
        "id": {"$ne": track_id},
        "camelot_key": {"$in": compatible_keys}
    }).to_list(100)
    
    suggestions = []
    source_num = int(camelot[:-1])
    source_letter = camelot[-1]
    
    for t in compatible_tracks:
        t_camelot = t.get("camelot_key", "")
        if not t_camelot:
            continue
        
        try:
            t_num = int(t_camelot[:-1])
            t_letter = t_camelot[-1]
        except ValueError:
            continue
        
        # Determine compatibility type
        if t_camelot == camelot:
            compatibility = "perfect"
            reason = "Same key - perfect harmonic match"
        elif t_num == (source_num % 12) + 1 and t_letter == source_letter:
            compatibility = "energy_boost"
            reason = "Energy boost - raises the energy"
        elif t_num == ((source_num - 2) % 12) + 1 and t_letter == source_letter:
            compatibility = "energy_drop"
            reason = "Energy drop - mellows the vibe"
        elif t_num == source_num and t_letter != source_letter:
            compatibility = "good"
            reason = "Relative major/minor - mood shift"
        else:
            compatibility = "good"
            reason = "Harmonically compatible"
        
        suggestions.append(HarmonicSuggestion(
            track=Track(**t),
            compatibility=compatibility,
            reason=reason
        ))
    
    # Sort by compatibility priority
    priority = {"perfect": 0, "energy_boost": 1, "energy_drop": 2, "good": 3}
    suggestions.sort(key=lambda x: priority.get(x.compatibility, 4))
    
    return suggestions[:limit]

# Playlist CRUD
@api_router.post("/playlists", response_model=Playlist)
async def create_playlist(playlist_data: PlaylistCreate):
    """Create a new playlist"""
    playlist = Playlist(
        name=playlist_data.name,
        description=playlist_data.description,
        emoji=playlist_data.emoji
    )
    await db.playlists.insert_one(playlist.dict())
    return playlist

@api_router.get("/playlists", response_model=List[Playlist])
async def get_playlists():
    """Get all playlists"""
    playlists = await db.playlists.find().sort("created_at", -1).to_list(100)
    return [Playlist(**p) for p in playlists]

@api_router.get("/playlists/{playlist_id}", response_model=Playlist)
async def get_playlist(playlist_id: str):
    """Get a single playlist"""
    playlist = await db.playlists.find_one({"id": playlist_id})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return Playlist(**playlist)

@api_router.put("/playlists/{playlist_id}", response_model=Playlist)
async def update_playlist(playlist_id: str, playlist_data: PlaylistCreate):
    """Update a playlist"""
    playlist = await db.playlists.find_one({"id": playlist_id})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    await db.playlists.update_one(
        {"id": playlist_id},
        {"$set": {
            "name": playlist_data.name,
            "description": playlist_data.description,
            "emoji": playlist_data.emoji
        }}
    )
    
    updated = await db.playlists.find_one({"id": playlist_id})
    return Playlist(**updated)

@api_router.delete("/playlists/{playlist_id}")
async def delete_playlist(playlist_id: str):
    """Delete a playlist and unassign all tracks"""
    playlist = await db.playlists.find_one({"id": playlist_id})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    # Unassign tracks
    await db.tracks.update_many(
        {"playlist_id": playlist_id},
        {"$set": {"playlist_id": None}}
    )
    
    await db.playlists.delete_one({"id": playlist_id})
    return {"message": "Playlist deleted successfully"}

# AI Analysis endpoint
@api_router.post("/analyze-ai", response_model=AIAnalysisResponse)
async def analyze_with_ai(request: AIAnalysisRequest):
    """Use AI to enhance audio analysis"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="AI analysis not configured")
    
    features = request.audio_features
    
    prompt = f"""You are an expert DJ and music analyst. Analyze these audio features and determine the musical key, BPM, and energy level.

Audio Features:
- Filename: {request.filename}
- Detected frequency peaks: {features.get('frequency_peaks', [])}
- Detected beat intervals (ms): {features.get('beat_intervals', [])}
- Average amplitude: {features.get('avg_amplitude', 0)}
- Peak amplitude: {features.get('peak_amplitude', 0)}
- Spectral centroid: {features.get('spectral_centroid', 0)}
- Zero crossing rate: {features.get('zero_crossing_rate', 0)}

Provide your analysis in this exact JSON format:
{{
    "key": "<musical key like A minor, C major>",
    "bpm": <number>,
    "energy": <1-10 scale>,
    "confidence": <0-1 scale>
}}

Only respond with the JSON, no other text."""
    
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"analysis-{uuid.uuid4()}",
            system_message="You are a professional music analysis AI. Respond only with valid JSON."
        ).with_model("gemini", "gemini-2.0-flash")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        import json
        # Clean response
        clean_response = response.strip()
        if clean_response.startswith("```"):
            clean_response = clean_response.split("```")[1]
            if clean_response.startswith("json"):
                clean_response = clean_response[4:]
        clean_response = clean_response.strip()
        
        result = json.loads(clean_response)
        
        key = result.get("key", "C major")
        camelot = get_camelot_from_key(key)
        
        return AIAnalysisResponse(
            key=normalize_key(key),
            camelot_key=camelot,
            bpm=float(result.get("bpm", 120)),
            energy=int(result.get("energy", 5)),
            confidence=float(result.get("confidence", 0.7))
        )
    except Exception as e:
        logger.error(f"AI analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

# Statistics endpoint
@api_router.get("/stats")
async def get_library_stats():
    """Get library statistics"""
    total_tracks = await db.tracks.count_documents({})
    total_playlists = await db.playlists.count_documents({})
    
    # Key distribution
    key_pipeline = [
        {"$group": {"_id": "$camelot_key", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    key_dist = await db.tracks.aggregate(key_pipeline).to_list(100)
    
    # BPM range
    bpm_pipeline = [
        {"$group": {
            "_id": None,
            "min_bpm": {"$min": "$bpm"},
            "max_bpm": {"$max": "$bpm"},
            "avg_bpm": {"$avg": "$bpm"}
        }}
    ]
    bpm_stats = await db.tracks.aggregate(bpm_pipeline).to_list(1)
    
    # Energy distribution
    energy_pipeline = [
        {"$group": {"_id": "$energy", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    energy_dist = await db.tracks.aggregate(energy_pipeline).to_list(100)
    
    return {
        "total_tracks": total_tracks,
        "total_playlists": total_playlists,
        "key_distribution": key_dist,
        "bpm_stats": bpm_stats[0] if bpm_stats else {},
        "energy_distribution": energy_dist
    }

# Lifespan handler for database connection management
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown
    client.close()

# Create the main FastAPI app
app = FastAPI(
    title="Muzo DJ Music App API",
    description="API for track analysis, playlist management, and DJ set creation",
    version="1.0.0",
    lifespan=lifespan
)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
