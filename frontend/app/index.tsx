import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import axios from 'axios';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const API_BASE = `${EXPO_PUBLIC_BACKEND_URL}/api`;

// Camelot colors for visual representation
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

interface Playlist {
  id: string;
  name: string;
  description: string;
  emoji: string;
  track_count: number;
  created_at: string;
}

export default function LibraryScreen() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'library' | 'playlists'>('library');
  const [sortBy, setSortBy] = useState<'date_added' | 'bpm' | 'key' | 'energy'>('date_added');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [bpmRange, setBpmRange] = useState({ min: '', max: '' });
  const [energyRange, setEnergyRange] = useState({ min: '', max: '' });
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [newPlaylistModal, setNewPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistEmoji, setNewPlaylistEmoji] = useState('\uD83C\uDFB5');

  const fetchTracks = useCallback(async () => {
    try {
      const params: any = {
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (selectedPlaylist) params.playlist_id = selectedPlaylist;
      if (bpmRange.min) params.min_bpm = parseFloat(bpmRange.min);
      if (bpmRange.max) params.max_bpm = parseFloat(bpmRange.max);
      if (energyRange.min) params.min_energy = parseInt(energyRange.min);
      if (energyRange.max) params.max_energy = parseInt(energyRange.max);

      const response = await axios.get(`${API_BASE}/tracks`, { params });
      setTracks(response.data);
    } catch (error) {
      console.error('Error fetching tracks:', error);
    }
  }, [sortBy, sortOrder, selectedPlaylist, bpmRange, energyRange]);

  const fetchPlaylists = async () => {
    try {
      const response = await axios.get(`${API_BASE}/playlists`);
      setPlaylists(response.data);
    } catch (error) {
      console.error('Error fetching playlists:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchTracks(), fetchPlaylists()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredTracks = tracks.filter(track => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      track.title.toLowerCase().includes(query) ||
      track.artist.toLowerCase().includes(query) ||
      track.camelot_key.toLowerCase().includes(query) ||
      track.key.toLowerCase().includes(query)
    );
  });

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) {
      Alert.alert('Error', 'Please enter a playlist name');
      return;
    }
    try {
      await axios.post(`${API_BASE}/playlists`, {
        name: newPlaylistName,
        emoji: newPlaylistEmoji,
      });
      setNewPlaylistModal(false);
      setNewPlaylistName('');
      fetchPlaylists();
    } catch (error) {
      console.error('Error creating playlist:', error);
      Alert.alert('Error', 'Failed to create playlist');
    }
  };

  const deletePlaylist = async (id: string) => {
    Alert.alert(
      'Delete Playlist',
      'Are you sure you want to delete this playlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE}/playlists/${id}`);
              fetchPlaylists();
              if (selectedPlaylist === id) {
                setSelectedPlaylist(null);
              }
            } catch (error) {
              console.error('Error deleting playlist:', error);
            }
          },
        },
      ]
    );
  };

  const deleteTrack = async (id: string) => {
    Alert.alert(
      'Delete Track',
      'Are you sure you want to delete this track?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE}/tracks/${id}`);
              fetchTracks();
            } catch (error) {
              console.error('Error deleting track:', error);
            }
          },
        },
      ]
    );
  };

  const renderTrackCard = (track: Track) => {
    const camelotColor = CAMELOT_COLORS[track.camelot_key] || '#6B7280';
    
    return (
      <TouchableOpacity
        key={track.id}
        style={styles.trackCard}
        onPress={() => router.push(`/track/${track.id}`)}
        onLongPress={() => deleteTrack(track.id)}
      >
        <View style={styles.trackLeft}>
          <View style={[styles.camelotBadge, { backgroundColor: camelotColor }]}>
            <Text style={styles.camelotText}>{track.camelot_key}</Text>
          </View>
          <View style={styles.trackInfo}>
            <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
            <Text style={styles.trackArtist} numberOfLines={1}>{track.artist || 'Unknown Artist'}</Text>
          </View>
        </View>
        <View style={styles.trackRight}>
          <View style={styles.statItem}>
            <Ionicons name="speedometer-outline" size={14} color="#9CA3AF" />
            <Text style={styles.statText}>{track.bpm.toFixed(0)}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="flash-outline" size={14} color="#9CA3AF" />
            <Text style={styles.statText}>{track.energy}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6B7280" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderPlaylistCard = (playlist: Playlist) => (
    <TouchableOpacity
      key={playlist.id}
      style={[
        styles.playlistCard,
        selectedPlaylist === playlist.id && styles.playlistCardSelected,
      ]}
      onPress={() => {
        setSelectedPlaylist(selectedPlaylist === playlist.id ? null : playlist.id);
        setActiveTab('library');
      }}
      onLongPress={() => deletePlaylist(playlist.id)}
    >
      <Text style={styles.playlistEmoji}>{playlist.emoji}</Text>
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistName}>{playlist.name}</Text>
        <Text style={styles.playlistCount}>{playlist.track_count} tracks</Text>
      </View>
    </TouchableOpacity>
  );

  const renderSortButton = (label: string, value: typeof sortBy) => (
    <TouchableOpacity
      style={[styles.sortButton, sortBy === value && styles.sortButtonActive]}
      onPress={() => {
        if (sortBy === value) {
          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
          setSortBy(value);
        }
      }}
    >
      <Text style={[styles.sortButtonText, sortBy === value && styles.sortButtonTextActive]}>
        {label}
      </Text>
      {sortBy === value && (
        <Ionicons
          name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
          size={14}
          color="#A855F7"
        />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="musical-notes" size={28} color="#A855F7" />
          <Text style={styles.headerTitle}>Mixed In Key</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/camelot')}
          >
            <Ionicons name="color-palette-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/analyze')}
          >
            <Ionicons name="add-circle-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tracks, artists, keys..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6B7280" />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="options-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'library' && styles.tabActive]}
          onPress={() => setActiveTab('library')}
        >
          <Ionicons
            name="library-outline"
            size={20}
            color={activeTab === 'library' ? '#A855F7' : '#6B7280'}
          />
          <Text style={[styles.tabText, activeTab === 'library' && styles.tabTextActive]}>
            Library ({filteredTracks.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'playlists' && styles.tabActive]}
          onPress={() => setActiveTab('playlists')}
        >
          <Ionicons
            name="list-outline"
            size={20}
            color={activeTab === 'playlists' ? '#A855F7' : '#6B7280'}
          />
          <Text style={[styles.tabText, activeTab === 'playlists' && styles.tabTextActive]}>
            Playlists ({playlists.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Selected Playlist Indicator */}
      {selectedPlaylist && (
        <TouchableOpacity
          style={styles.selectedPlaylistBanner}
          onPress={() => setSelectedPlaylist(null)}
        >
          <Text style={styles.selectedPlaylistText}>
            Filtering: {playlists.find(p => p.id === selectedPlaylist)?.name}
          </Text>
          <Ionicons name="close" size={18} color="#A855F7" />
        </TouchableOpacity>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A855F7" />
          <Text style={styles.loadingText}>Loading your library...</Text>
        </View>
      ) : activeTab === 'library' ? (
        <>
          {/* Sort Buttons */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortContainer}>
            {renderSortButton('Date', 'date_added')}
            {renderSortButton('BPM', 'bpm')}
            {renderSortButton('Key', 'key')}
            {renderSortButton('Energy', 'energy')}
          </ScrollView>

          {/* Tracks List */}
          <ScrollView
            style={styles.tracksList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#A855F7"
              />
            }
          >
            {filteredTracks.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="musical-notes-outline" size={64} color="#374151" />
                <Text style={styles.emptyTitle}>No tracks yet</Text>
                <Text style={styles.emptySubtitle}>Tap + to analyze and add tracks</Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => router.push('/analyze')}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.emptyButtonText}>Add Track</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredTracks.map(renderTrackCard)
            )}
            <View style={{ height: 100 }} />
          </ScrollView>
        </>
      ) : (
        /* Playlists View */
        <ScrollView
          style={styles.playlistsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#A855F7"
            />
          }
        >
          <TouchableOpacity
            style={styles.createPlaylistButton}
            onPress={() => setNewPlaylistModal(true)}
          >
            <Ionicons name="add-circle" size={24} color="#A855F7" />
            <Text style={styles.createPlaylistText}>Create New Playlist</Text>
          </TouchableOpacity>
          {playlists.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={64} color="#374151" />
              <Text style={styles.emptyTitle}>No playlists yet</Text>
              <Text style={styles.emptySubtitle}>Create playlists to organize your tracks</Text>
            </View>
          ) : (
            playlists.map(renderPlaylistCard)
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Tracks</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.filterLabel}>BPM Range</Text>
            <View style={styles.rangeInputs}>
              <TextInput
                style={styles.rangeInput}
                placeholder="Min"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
                value={bpmRange.min}
                onChangeText={(text) => setBpmRange({ ...bpmRange, min: text })}
              />
              <Text style={styles.rangeSeparator}>-</Text>
              <TextInput
                style={styles.rangeInput}
                placeholder="Max"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
                value={bpmRange.max}
                onChangeText={(text) => setBpmRange({ ...bpmRange, max: text })}
              />
            </View>

            <Text style={styles.filterLabel}>Energy Level (1-10)</Text>
            <View style={styles.rangeInputs}>
              <TextInput
                style={styles.rangeInput}
                placeholder="Min"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
                value={energyRange.min}
                onChangeText={(text) => setEnergyRange({ ...energyRange, min: text })}
              />
              <Text style={styles.rangeSeparator}>-</Text>
              <TextInput
                style={styles.rangeInput}
                placeholder="Max"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
                value={energyRange.max}
                onChangeText={(text) => setEnergyRange({ ...energyRange, max: text })}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setBpmRange({ min: '', max: '' });
                  setEnergyRange({ min: '', max: '' });
                }}
              >
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* New Playlist Modal */}
      <Modal
        visible={newPlaylistModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setNewPlaylistModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Playlist</Text>
              <TouchableOpacity onPress={() => setNewPlaylistModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.filterLabel}>Playlist Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter playlist name"
              placeholderTextColor="#6B7280"
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
            />

            <Text style={styles.filterLabel}>Emoji</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiPicker}>
              {['\uD83C\uDFB5', '\uD83C\uDFA7', '\uD83D\uDD25', '\uD83D\uDC9C', '\u26A1', '\uD83C\uDF1F', '\uD83C\uDF89', '\uD83C\uDFB6', '\uD83D\uDCA5', '\uD83C\uDF08'].map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.emojiButton,
                    newPlaylistEmoji === emoji && styles.emojiButtonSelected,
                  ]}
                  onPress={() => setNewPlaylistEmoji(emoji)}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.createButton} onPress={createPlaylist}>
              <Text style={styles.createButtonText}>Create Playlist</Text>
            </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: '#fff',
    fontSize: 16,
  },
  filterButton: {
    width: 44,
    height: 44,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1F2937',
  },
  tabActive: {
    backgroundColor: '#2D1F47',
  },
  tabText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#A855F7',
  },
  selectedPlaylistBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#2D1F47',
    borderRadius: 8,
  },
  selectedPlaylistText: {
    color: '#A855F7',
    fontSize: 14,
  },
  sortContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1F2937',
    borderRadius: 20,
    marginRight: 8,
  },
  sortButtonActive: {
    backgroundColor: '#2D1F47',
  },
  sortButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#A855F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 16,
  },
  tracksList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  trackLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  camelotBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camelotText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  trackArtist: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 2,
  },
  trackRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: '#6B7280',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#A855F7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  playlistsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  createPlaylistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#A855F7',
    borderStyle: 'dashed',
  },
  createPlaylistText: {
    color: '#A855F7',
    fontSize: 16,
    fontWeight: '600',
  },
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  playlistCardSelected: {
    backgroundColor: '#2D1F47',
    borderWidth: 1,
    borderColor: '#A855F7',
  },
  playlistEmoji: {
    fontSize: 32,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  playlistCount: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 2,
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
  filterLabel: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 8,
    marginTop: 16,
  },
  rangeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rangeInput: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  rangeSeparator: {
    color: '#6B7280',
    fontSize: 18,
  },
  textInput: {
    backgroundColor: '#374151',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 16,
  },
  emojiPicker: {
    flexDirection: 'row',
    marginTop: 8,
  },
  emojiButton: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  emojiButtonSelected: {
    backgroundColor: '#A855F7',
  },
  emojiText: {
    fontSize: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#A855F7',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#A855F7',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
