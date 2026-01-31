import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import axios from 'axios';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const API_BASE = `${EXPO_PUBLIC_BACKEND_URL}/api`;

// Camelot colors
const CAMELOT_COLORS: { [key: string]: string } = {
  '1A': '#FF6B6B', '1B': '#FF8E8E',
  '2A': '#FF9F43', '2B': '#FFB976',
  '3A': '#FECA57', '3B': '#FFE066',
  '4A': '#48C9B0', '4B': '#76D7C4',
  '5A': '#5DADE2', '5B': '#85C1E9',
  '6A': '#AF7AC5', '6B': '#C39BD3',
  '7A': '#EC7063', '7B': '#F1948A',
  '8A': '#45B7D1', '8B': '#73C8DE',
  '9A': '#96CEB4', '9B': '#B4DCC4',
  '10A': '#DDA0DD', '10B': '#E8B9E8',
  '11A': '#98D8C8', '11B': '#B5E5D9',
  '12A': '#F7DC6F', '12B': '#F9E79F',
};

interface Track {
  id: string;
  filename: string;
  title: string;
  artist: string;
  album: string;
  key: string;
  camelot_key: string;
  bpm: number;
  energy: number;
  duration: number;
  date_added: string;
  playlist_id: string | null;
  analysis_method: string;
}

interface HarmonicSuggestion {
  track: Track;
  compatibility: string;
  reason: string;
}

interface Playlist {
  id: string;
  name: string;
  emoji: string;
}

export default function TrackDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [track, setTrack] = useState<Track | null>(null);
  const [suggestions, setSuggestions] = useState<HarmonicSuggestion[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  
  // Edit fields
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editBpm, setEditBpm] = useState('');
  const [editEnergy, setEditEnergy] = useState('');

  useEffect(() => {
    fetchTrack();
    fetchPlaylists();
  }, [id]);

  const fetchTrack = async () => {
    try {
      const [trackRes, suggestionsRes] = await Promise.all([
        axios.get(`${API_BASE}/tracks/${id}`),
        axios.get(`${API_BASE}/tracks/${id}/harmonic-suggestions`),
      ]);
      setTrack(trackRes.data);
      setSuggestions(suggestionsRes.data);
      
      // Initialize edit fields
      setEditTitle(trackRes.data.title);
      setEditArtist(trackRes.data.artist);
      setEditBpm(trackRes.data.bpm.toString());
      setEditEnergy(trackRes.data.energy.toString());
    } catch (error) {
      console.error('Error fetching track:', error);
      Alert.alert('Error', 'Failed to load track details');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaylists = async () => {
    try {
      const response = await axios.get(`${API_BASE}/playlists`);
      setPlaylists(response.data);
    } catch (error) {
      console.error('Error fetching playlists:', error);
    }
  };

  const saveChanges = async () => {
    try {
      await axios.put(`${API_BASE}/tracks/${id}`, {
        title: editTitle,
        artist: editArtist,
        bpm: parseFloat(editBpm),
        energy: parseInt(editEnergy),
      });
      setEditMode(false);
      fetchTrack();
      Alert.alert('Success', 'Track updated successfully');
    } catch (error) {
      console.error('Error updating track:', error);
      Alert.alert('Error', 'Failed to update track');
    }
  };

  const assignToPlaylist = async (playlistId: string | null) => {
    try {
      await axios.put(`${API_BASE}/tracks/${id}`, {
        playlist_id: playlistId,
      });
      setShowPlaylistModal(false);
      fetchTrack();
    } catch (error) {
      console.error('Error assigning playlist:', error);
      Alert.alert('Error', 'Failed to assign to playlist');
    }
  };

  const deleteTrack = () => {
    Alert.alert(
      'Delete Track',
      'Are you sure you want to delete this track from your library?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE}/tracks/${id}`);
              router.replace('/');
            } catch (error) {
              console.error('Error deleting track:', error);
              Alert.alert('Error', 'Failed to delete track');
            }
          },
        },
      ]
    );
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const getCompatibilityIcon = (compatibility: string) => {
    switch (compatibility) {
      case 'perfect':
        return { name: 'checkmark-circle', color: '#10B981' };
      case 'energy_boost':
        return { name: 'arrow-up-circle', color: '#F59E0B' };
      case 'energy_drop':
        return { name: 'arrow-down-circle', color: '#3B82F6' };
      default:
        return { name: 'ellipse', color: '#6B7280' };
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A855F7" />
        </View>
      </SafeAreaView>
    );
  }

  if (!track) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Track not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const camelotColor = CAMELOT_COLORS[track.camelot_key] || '#6B7280';
  const currentPlaylist = playlists.find(p => p.id === track.playlist_id);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Details</Text>
        <TouchableOpacity onPress={() => setEditMode(!editMode)} style={styles.editButton}>
          <Ionicons name={editMode ? 'close' : 'create-outline'} size={24} color="#A855F7" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Main Info Card */}
        <View style={styles.mainCard}>
          <View style={[styles.camelotLarge, { backgroundColor: camelotColor }]}>
            <Text style={styles.camelotLargeText}>{track.camelot_key}</Text>
          </View>
          
          {editMode ? (
            <>
              <TextInput
                style={styles.editInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Title"
                placeholderTextColor="#6B7280"
              />
              <TextInput
                style={styles.editInputSmall}
                value={editArtist}
                onChangeText={setEditArtist}
                placeholder="Artist"
                placeholderTextColor="#6B7280"
              />
            </>
          ) : (
            <>
              <Text style={styles.trackTitle}>{track.title}</Text>
              <Text style={styles.trackArtist}>{track.artist || 'Unknown Artist'}</Text>
            </>
          )}
          
          <Text style={styles.trackKey}>{track.key}</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="speedometer-outline" size={28} color="#A855F7" />
            {editMode ? (
              <TextInput
                style={styles.statEditInput}
                value={editBpm}
                onChangeText={setEditBpm}
                keyboardType="numeric"
              />
            ) : (
              <Text style={styles.statValue}>{track.bpm.toFixed(0)}</Text>
            )}
            <Text style={styles.statLabel}>BPM</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="flash-outline" size={28} color="#F59E0B" />
            {editMode ? (
              <TextInput
                style={styles.statEditInput}
                value={editEnergy}
                onChangeText={(text) => {
                  const num = parseInt(text);
                  if (!text || (num >= 1 && num <= 10)) setEditEnergy(text);
                }}
                keyboardType="numeric"
              />
            ) : (
              <Text style={styles.statValue}>{track.energy}</Text>
            )}
            <Text style={styles.statLabel}>Energy</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={28} color="#3B82F6" />
            <Text style={styles.statValue}>
              {track.duration > 0 ? formatDuration(track.duration) : '--:--'}
            </Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
        </View>

        {/* Energy Bar */}
        <View style={styles.energySection}>
          <Text style={styles.sectionTitle}>Energy Level</Text>
          <View style={styles.energyBar}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
              <View
                key={level}
                style={[
                  styles.energySegment,
                  level <= track.energy && styles.energySegmentActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Playlist Assignment */}
        <TouchableOpacity
          style={styles.playlistSection}
          onPress={() => setShowPlaylistModal(true)}
        >
          <View style={styles.playlistLeft}>
            <Ionicons name="folder-outline" size={24} color="#9CA3AF" />
            <View>
              <Text style={styles.playlistLabel}>Playlist</Text>
              <Text style={styles.playlistValue}>
                {currentPlaylist ? `${currentPlaylist.emoji} ${currentPlaylist.name}` : 'Not assigned'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6B7280" />
        </TouchableOpacity>

        {/* Edit Actions */}
        {editMode && (
          <View style={styles.editActions}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveChanges}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={deleteTrack}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
              <Text style={styles.deleteButtonText}>Delete Track</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Harmonic Suggestions */}
        <View style={styles.suggestionsSection}>
          <Text style={styles.sectionTitle}>Harmonic Mixing Suggestions</Text>
          <Text style={styles.sectionSubtitle}>
            Tracks that mix well with this one
          </Text>
          
          {suggestions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="musical-notes-outline" size={48} color="#374151" />
              <Text style={styles.emptyText}>No compatible tracks in library</Text>
              <Text style={styles.emptySubtext}>Add more tracks to see suggestions</Text>
            </View>
          ) : (
            suggestions.map((suggestion) => {
              const icon = getCompatibilityIcon(suggestion.compatibility);
              const suggestionColor = CAMELOT_COLORS[suggestion.track.camelot_key] || '#6B7280';
              
              return (
                <TouchableOpacity
                  key={suggestion.track.id}
                  style={styles.suggestionCard}
                  onPress={() => router.push(`/track/${suggestion.track.id}`)}
                >
                  <View style={styles.suggestionLeft}>
                    <View style={[styles.suggestionCamelot, { backgroundColor: suggestionColor }]}>
                      <Text style={styles.suggestionCamelotText}>
                        {suggestion.track.camelot_key}
                      </Text>
                    </View>
                    <View style={styles.suggestionInfo}>
                      <Text style={styles.suggestionTitle} numberOfLines={1}>
                        {suggestion.track.title}
                      </Text>
                      <Text style={styles.suggestionArtist} numberOfLines={1}>
                        {suggestion.track.artist || 'Unknown Artist'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.suggestionRight}>
                    <Ionicons name={icon.name as any} size={24} color={icon.color} />
                    <Text style={styles.suggestionBpm}>{suggestion.track.bpm.toFixed(0)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Playlist Selection Modal */}
      <Modal
        visible={showPlaylistModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPlaylistModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign to Playlist</Text>
              <TouchableOpacity onPress={() => setShowPlaylistModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={[
                styles.playlistOption,
                !track.playlist_id && styles.playlistOptionActive,
              ]}
              onPress={() => assignToPlaylist(null)}
            >
              <Ionicons name="close-circle-outline" size={24} color="#9CA3AF" />
              <Text style={styles.playlistOptionText}>No Playlist</Text>
            </TouchableOpacity>
            
            {playlists.map((playlist) => (
              <TouchableOpacity
                key={playlist.id}
                style={[
                  styles.playlistOption,
                  track.playlist_id === playlist.id && styles.playlistOptionActive,
                ]}
                onPress={() => assignToPlaylist(playlist.id)}
              >
                <Text style={styles.playlistOptionEmoji}>{playlist.emoji}</Text>
                <Text style={styles.playlistOptionText}>{playlist.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 16,
  },
  backLink: {
    color: '#A855F7',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  editButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  mainCard: {
    backgroundColor: '#1F2937',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  camelotLarge: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  camelotLargeText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  trackTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  trackArtist: {
    color: '#9CA3AF',
    fontSize: 18,
    marginTop: 4,
  },
  trackKey: {
    color: '#A855F7',
    fontSize: 16,
    marginTop: 8,
  },
  editInput: {
    backgroundColor: '#374151',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%',
    marginBottom: 8,
  },
  editInputSmall: {
    backgroundColor: '#374151',
    borderRadius: 10,
    padding: 10,
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
    width: '100%',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 4,
  },
  statEditInput: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 8,
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    width: 60,
    marginTop: 8,
  },
  energySection: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionSubtitle: {
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 16,
    marginTop: -8,
  },
  energyBar: {
    flexDirection: 'row',
    gap: 4,
  },
  energySegment: {
    flex: 1,
    height: 28,
    backgroundColor: '#374151',
    borderRadius: 6,
  },
  energySegmentActive: {
    backgroundColor: '#A855F7',
  },
  playlistSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  playlistLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playlistLabel: {
    color: '#6B7280',
    fontSize: 14,
  },
  playlistValue: {
    color: '#fff',
    fontSize: 16,
  },
  editActions: {
    gap: 12,
    marginBottom: 16,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#A855F7',
    borderRadius: 12,
    padding: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  suggestionsSection: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
  },
  emptySubtext: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 4,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  suggestionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  suggestionCamelot: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionCamelotText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  suggestionArtist: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 2,
  },
  suggestionRight: {
    alignItems: 'center',
    gap: 4,
  },
  suggestionBpm: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  playlistOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#374151',
    borderRadius: 12,
    marginBottom: 8,
  },
  playlistOptionActive: {
    backgroundColor: '#2D1F47',
    borderWidth: 1,
    borderColor: '#A855F7',
  },
  playlistOptionEmoji: {
    fontSize: 24,
  },
  playlistOptionText: {
    color: '#fff',
    fontSize: 16,
  },
});
