#!/usr/bin/env python3
"""
Backend API Testing for Mixed In Key Clone
Tests all API endpoints with realistic DJ music data
"""

import requests
import json
import uuid
from datetime import datetime
import sys
import os

# Get backend URL from frontend .env file
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except Exception as e:
        print(f"Error reading frontend .env: {e}")
    return "http://localhost:8001"

BASE_URL = get_backend_url() + "/api"
print(f"Testing backend at: {BASE_URL}")

# Test data - realistic DJ tracks
TEST_TRACKS = [
    {
        "filename": "deadmau5_strobe.mp3",
        "title": "Strobe",
        "artist": "deadmau5",
        "album": "For Lack of a Better Name",
        "key": "F# minor",
        "bpm": 128.0,
        "energy": 8,
        "duration": 645.2,
        "analysis_method": "manual"
    },
    {
        "filename": "calvin_harris_feel_so_close.mp3", 
        "title": "Feel So Close",
        "artist": "Calvin Harris",
        "album": "18 Months",
        "key": "A minor",
        "bpm": 132.0,
        "energy": 9,
        "duration": 212.5,
        "analysis_method": "client"
    },
    {
        "filename": "avicii_levels.mp3",
        "title": "Levels", 
        "artist": "Avicii",
        "album": "True",
        "key": "C major",
        "bpm": 126.0,
        "energy": 10,
        "duration": 195.8,
        "analysis_method": "ai"
    }
]

TEST_PLAYLISTS = [
    {
        "name": "Progressive House Mix",
        "description": "Deep progressive tracks for late night sets",
        "emoji": "🌙"
    },
    {
        "name": "Peak Time Bangers",
        "description": "High energy tracks for main room",
        "emoji": "🔥"
    }
]

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.created_tracks = []
        self.created_playlists = []
        self.test_results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }

    def log_result(self, test_name, success, message="", response=None):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        if response and not success:
            print(f"   Response: {response.status_code} - {response.text[:200]}")
        
        if success:
            self.test_results["passed"] += 1
        else:
            self.test_results["failed"] += 1
            self.test_results["errors"].append(f"{test_name}: {message}")

    def test_root_endpoint(self):
        """Test API root endpoint"""
        try:
            response = self.session.get(f"{BASE_URL}/")
            if response.status_code == 200:
                data = response.json()
                self.log_result("Root endpoint", True, f"API version: {data.get('version', 'unknown')}")
            else:
                self.log_result("Root endpoint", False, f"Status: {response.status_code}", response)
        except Exception as e:
            self.log_result("Root endpoint", False, f"Exception: {str(e)}")

    def test_camelot_wheel(self):
        """Test Camelot wheel endpoint"""
        try:
            response = self.session.get(f"{BASE_URL}/camelot-wheel")
            if response.status_code == 200:
                data = response.json()
                camelot_to_key = data.get("camelot_to_key", {})
                key_to_camelot = data.get("key_to_camelot", {})
                
                # Test specific mappings
                if camelot_to_key.get("8A") == "A minor" and key_to_camelot.get("C major") == "8B":
                    self.log_result("Camelot wheel mappings", True, f"Found {len(camelot_to_key)} Camelot keys")
                else:
                    self.log_result("Camelot wheel mappings", False, "Key mappings incorrect")
            else:
                self.log_result("Camelot wheel endpoint", False, f"Status: {response.status_code}", response)
        except Exception as e:
            self.log_result("Camelot wheel endpoint", False, f"Exception: {str(e)}")

    def test_create_tracks(self):
        """Test track creation with key detection and Camelot conversion"""
        for i, track_data in enumerate(TEST_TRACKS):
            try:
                response = self.session.post(f"{BASE_URL}/tracks", json=track_data)
                if response.status_code == 200:
                    track = response.json()
                    self.created_tracks.append(track)
                    
                    # Verify Camelot conversion
                    expected_camelot = {"F# minor": "11A", "A minor": "8A", "C major": "8B"}
                    expected = expected_camelot.get(track_data["key"])
                    actual = track.get("camelot_key")
                    
                    if actual == expected:
                        self.log_result(f"Create track {i+1} - {track_data['title']}", True, 
                                      f"Key: {track['key']} → Camelot: {actual}")
                    else:
                        self.log_result(f"Create track {i+1} - {track_data['title']}", False, 
                                      f"Wrong Camelot: expected {expected}, got {actual}")
                else:
                    self.log_result(f"Create track {i+1}", False, f"Status: {response.status_code}", response)
            except Exception as e:
                self.log_result(f"Create track {i+1}", False, f"Exception: {str(e)}")

    def test_get_tracks(self):
        """Test track listing with filtering"""
        try:
            # Test basic listing
            response = self.session.get(f"{BASE_URL}/tracks")
            if response.status_code == 200:
                tracks = response.json()
                self.log_result("Get all tracks", True, f"Found {len(tracks)} tracks")
                
                # Test filtering by key
                response = self.session.get(f"{BASE_URL}/tracks?key=A minor")
                if response.status_code == 200:
                    filtered = response.json()
                    a_minor_tracks = [t for t in filtered if t.get("key") == "A minor"]
                    self.log_result("Filter by key", len(a_minor_tracks) > 0, 
                                  f"Found {len(a_minor_tracks)} A minor tracks")
                
                # Test BPM filtering
                response = self.session.get(f"{BASE_URL}/tracks?min_bpm=125&max_bpm=130")
                if response.status_code == 200:
                    bpm_filtered = response.json()
                    self.log_result("Filter by BPM range", True, f"Found {len(bpm_filtered)} tracks in BPM range")
                
                # Test energy filtering
                response = self.session.get(f"{BASE_URL}/tracks?min_energy=8")
                if response.status_code == 200:
                    energy_filtered = response.json()
                    self.log_result("Filter by energy", True, f"Found {len(energy_filtered)} high energy tracks")
                    
            else:
                self.log_result("Get tracks", False, f"Status: {response.status_code}", response)
        except Exception as e:
            self.log_result("Get tracks", False, f"Exception: {str(e)}")

    def test_get_single_track(self):
        """Test getting single track by ID"""
        if not self.created_tracks:
            self.log_result("Get single track", False, "No tracks created to test")
            return
            
        try:
            track_id = self.created_tracks[0]["id"]
            response = self.session.get(f"{BASE_URL}/tracks/{track_id}")
            if response.status_code == 200:
                track = response.json()
                self.log_result("Get single track", True, f"Retrieved: {track.get('title')}")
            else:
                self.log_result("Get single track", False, f"Status: {response.status_code}", response)
        except Exception as e:
            self.log_result("Get single track", False, f"Exception: {str(e)}")

    def test_update_track(self):
        """Test track updates"""
        if not self.created_tracks:
            self.log_result("Update track", False, "No tracks created to test")
            return
            
        try:
            track_id = self.created_tracks[0]["id"]
            update_data = {
                "title": "Strobe (Extended Mix)",
                "key": "Gb minor",  # Test key change and Camelot conversion
                "energy": 7
            }
            
            response = self.session.put(f"{BASE_URL}/tracks/{track_id}", json=update_data)
            if response.status_code == 200:
                updated_track = response.json()
                if (updated_track.get("title") == "Strobe (Extended Mix)" and 
                    updated_track.get("camelot_key") == "11A"):  # Gb minor = 11A
                    self.log_result("Update track", True, "Title and key updated correctly")
                else:
                    self.log_result("Update track", False, "Update data not reflected correctly")
            else:
                self.log_result("Update track", False, f"Status: {response.status_code}", response)
        except Exception as e:
            self.log_result("Update track", False, f"Exception: {str(e)}")

    def test_harmonic_suggestions(self):
        """Test harmonic mixing suggestions"""
        if not self.created_tracks:
            self.log_result("Harmonic suggestions", False, "No tracks created to test")
            return
            
        try:
            # Test with A minor track (8A)
            a_minor_track = next((t for t in self.created_tracks if t.get("key") == "A minor"), None)
            if not a_minor_track:
                self.log_result("Harmonic suggestions", False, "No A minor track found")
                return
                
            track_id = a_minor_track["id"]
            response = self.session.get(f"{BASE_URL}/tracks/{track_id}/harmonic-suggestions")
            if response.status_code == 200:
                suggestions = response.json()
                self.log_result("Harmonic suggestions", True, f"Found {len(suggestions)} compatible tracks")
                
                # Verify suggestion logic
                for suggestion in suggestions:
                    track = suggestion.get("track", {})
                    camelot = track.get("camelot_key")
                    compatibility = suggestion.get("compatibility")
                    reason = suggestion.get("reason", "")
                    print(f"   → {track.get('title')} ({camelot}) - {compatibility}: {reason}")
                    
            else:
                self.log_result("Harmonic suggestions", False, f"Status: {response.status_code}", response)
        except Exception as e:
            self.log_result("Harmonic suggestions", False, f"Exception: {str(e)}")

    def test_create_playlists(self):
        """Test playlist creation"""
        for i, playlist_data in enumerate(TEST_PLAYLISTS):
            try:
                response = self.session.post(f"{BASE_URL}/playlists", json=playlist_data)
                if response.status_code == 200:
                    playlist = response.json()
                    self.created_playlists.append(playlist)
                    self.log_result(f"Create playlist {i+1} - {playlist_data['name']}", True, 
                                  f"ID: {playlist.get('id')}")
                else:
                    self.log_result(f"Create playlist {i+1}", False, f"Status: {response.status_code}", response)
            except Exception as e:
                self.log_result(f"Create playlist {i+1}", False, f"Exception: {str(e)}")

    def test_playlist_operations(self):
        """Test playlist CRUD operations"""
        try:
            # Get all playlists
            response = self.session.get(f"{BASE_URL}/playlists")
            if response.status_code == 200:
                playlists = response.json()
                self.log_result("Get playlists", True, f"Found {len(playlists)} playlists")
            else:
                self.log_result("Get playlists", False, f"Status: {response.status_code}", response)
                
            if not self.created_playlists:
                return
                
            # Test single playlist retrieval
            playlist_id = self.created_playlists[0]["id"]
            response = self.session.get(f"{BASE_URL}/playlists/{playlist_id}")
            if response.status_code == 200:
                self.log_result("Get single playlist", True)
            else:
                self.log_result("Get single playlist", False, f"Status: {response.status_code}", response)
                
            # Test playlist update
            update_data = {
                "name": "Progressive House Mix (Updated)",
                "description": "Updated description",
                "emoji": "🎧"
            }
            response = self.session.put(f"{BASE_URL}/playlists/{playlist_id}", json=update_data)
            if response.status_code == 200:
                self.log_result("Update playlist", True)
            else:
                self.log_result("Update playlist", False, f"Status: {response.status_code}", response)
                
        except Exception as e:
            self.log_result("Playlist operations", False, f"Exception: {str(e)}")

    def test_track_playlist_assignment(self):
        """Test assigning tracks to playlists and track count updates"""
        if not self.created_tracks or not self.created_playlists:
            self.log_result("Track playlist assignment", False, "Missing tracks or playlists")
            return
            
        try:
            track_id = self.created_tracks[0]["id"]
            playlist_id = self.created_playlists[0]["id"]
            
            # Assign track to playlist
            update_data = {"playlist_id": playlist_id}
            response = self.session.put(f"{BASE_URL}/tracks/{track_id}", json=update_data)
            if response.status_code == 200:
                # Check if playlist track count updated
                response = self.session.get(f"{BASE_URL}/playlists/{playlist_id}")
                if response.status_code == 200:
                    playlist = response.json()
                    track_count = playlist.get("track_count", 0)
                    self.log_result("Track playlist assignment", track_count > 0, 
                                  f"Playlist track count: {track_count}")
                else:
                    self.log_result("Track playlist assignment", False, "Could not verify track count")
            else:
                self.log_result("Track playlist assignment", False, f"Status: {response.status_code}", response)
        except Exception as e:
            self.log_result("Track playlist assignment", False, f"Exception: {str(e)}")

    def test_ai_analysis(self):
        """Test AI analysis endpoint"""
        try:
            # Mock audio features for testing
            test_request = {
                "filename": "test_track.mp3",
                "audio_features": {
                    "frequency_peaks": [440.0, 880.0, 1320.0],
                    "beat_intervals": [468.75, 468.75, 468.75],  # 128 BPM
                    "avg_amplitude": 0.6,
                    "peak_amplitude": 0.95,
                    "spectral_centroid": 2500.0,
                    "zero_crossing_rate": 0.1
                }
            }
            
            response = self.session.post(f"{BASE_URL}/analyze-ai", json=test_request)
            if response.status_code == 200:
                analysis = response.json()
                key = analysis.get("key")
                camelot = analysis.get("camelot_key")
                bpm = analysis.get("bpm")
                energy = analysis.get("energy")
                confidence = analysis.get("confidence")
                
                self.log_result("AI analysis", True, 
                              f"Key: {key} ({camelot}), BPM: {bpm}, Energy: {energy}, Confidence: {confidence}")
            elif response.status_code == 500:
                error_text = response.text
                if "AI analysis not configured" in error_text:
                    self.log_result("AI analysis", False, "AI analysis not configured (missing API key)")
                else:
                    self.log_result("AI analysis", False, f"Server error: {error_text[:100]}")
            else:
                self.log_result("AI analysis", False, f"Status: {response.status_code}", response)
        except Exception as e:
            self.log_result("AI analysis", False, f"Exception: {str(e)}")

    def test_statistics(self):
        """Test library statistics endpoint"""
        try:
            response = self.session.get(f"{BASE_URL}/stats")
            if response.status_code == 200:
                stats = response.json()
                total_tracks = stats.get("total_tracks", 0)
                total_playlists = stats.get("total_playlists", 0)
                key_dist = stats.get("key_distribution", [])
                bpm_stats = stats.get("bpm_stats", {})
                energy_dist = stats.get("energy_distribution", [])
                
                self.log_result("Library statistics", True, 
                              f"Tracks: {total_tracks}, Playlists: {total_playlists}, Keys: {len(key_dist)}")
                
                if bpm_stats:
                    print(f"   BPM range: {bpm_stats.get('min_bpm', 'N/A')} - {bpm_stats.get('max_bpm', 'N/A')}")
                    
            else:
                self.log_result("Library statistics", False, f"Status: {response.status_code}", response)
        except Exception as e:
            self.log_result("Library statistics", False, f"Exception: {str(e)}")

    def test_delete_operations(self):
        """Test delete operations (cleanup)"""
        # Delete tracks
        for track in self.created_tracks:
            try:
                response = self.session.delete(f"{BASE_URL}/tracks/{track['id']}")
                if response.status_code == 200:
                    self.log_result(f"Delete track {track['title']}", True)
                else:
                    self.log_result(f"Delete track {track['title']}", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result(f"Delete track {track['title']}", False, f"Exception: {str(e)}")
        
        # Delete playlists
        for playlist in self.created_playlists:
            try:
                response = self.session.delete(f"{BASE_URL}/playlists/{playlist['id']}")
                if response.status_code == 200:
                    self.log_result(f"Delete playlist {playlist['name']}", True)
                else:
                    self.log_result(f"Delete playlist {playlist['name']}", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result(f"Delete playlist {playlist['name']}", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all API tests"""
        print("=" * 60)
        print("MIXED IN KEY CLONE - BACKEND API TESTING")
        print("=" * 60)
        
        # Core API tests
        self.test_root_endpoint()
        self.test_camelot_wheel()
        
        # Track CRUD operations
        self.test_create_tracks()
        self.test_get_tracks()
        self.test_get_single_track()
        self.test_update_track()
        
        # Harmonic mixing
        self.test_harmonic_suggestions()
        
        # Playlist management
        self.test_create_playlists()
        self.test_playlist_operations()
        self.test_track_playlist_assignment()
        
        # AI analysis
        self.test_ai_analysis()
        
        # Statistics
        self.test_statistics()
        
        # Cleanup
        self.test_delete_operations()
        
        # Summary
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {self.test_results['passed']}")
        print(f"❌ Failed: {self.test_results['failed']}")
        
        if self.test_results['errors']:
            print("\nFAILED TESTS:")
            for error in self.test_results['errors']:
                print(f"  • {error}")
        
        return self.test_results['failed'] == 0

if __name__ == "__main__":
    tester = APITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)