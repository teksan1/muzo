import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const API_BASE = `${EXPO_PUBLIC_BACKEND_URL}/api`;

// Musical key options
const MUSICAL_KEYS = [
  'C major', 'C minor', 'C# major', 'C# minor',
  'D major', 'D minor', 'D# major', 'D# minor',
  'E major', 'E minor',
  'F major', 'F minor', 'F# major', 'F# minor',
  'G major', 'G minor', 'G# major', 'G# minor',
  'A major', 'A minor', 'A# major', 'A# minor',
  'B major', 'B minor',
];

const CAMELOT_KEYS = [
  '1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B',
  '5A', '5B', '6A', '6B', '7A', '7B', '8A', '8B',
  '9A', '9B', '10A', '10B', '11A', '11B', '12A', '12B',
];

interface Playlist {
  id: string;
  name: string;
  emoji: string;
}

export default function AnalyzeScreen() {
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [analysisMethod, setAnalysisMethod] = useState<'manual' | 'client' | 'ai'>('manual');
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Track data
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [key, setKey] = useState('C major');
  const [bpm, setBpm] = useState('120');
  const [energy, setEnergy] = useState('5');
  const [duration, setDuration] = useState(0);
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  
  const [showKeyPicker, setShowKeyPicker] = useState(false);
  const [keyFormat, setKeyFormat] = useState<'musical' | 'camelot'>('musical');
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    try {
      const response = await axios.get(`${API_BASE}/playlists`);
      setPlaylists(response.data);
    } catch (error) {
      console.error('Error fetching playlists:', error);
    }
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile(file);
        
        // Extract filename without extension as title
        const filename = file.name;
        const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
        setTitle(nameWithoutExt);
        
        // Try to get duration
        if (Platform.OS !== 'web') {
          try {
            const { sound } = await Audio.Sound.createAsync({ uri: file.uri });
            const status = await sound.getStatusAsync();
            if (status.isLoaded && status.durationMillis) {
              setDuration(status.durationMillis / 1000);
            }
            await sound.unloadAsync();
          } catch (e) {
            console.log('Could not get duration:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to select file');
    }
  };

  const analyzeWithAI = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select an audio file first');
      return;
    }

    setAnalyzing(true);
    try {
      // Simulate client-side audio analysis features
      // In a real app, you'd use Web Audio API or native audio processing
      const audioFeatures = {
        frequency_peaks: [440, 523, 659, 784, 880], // A4, C5, E5, G5, A5 (simulated)
        beat_intervals: [500, 502, 498, 501, 499], // ~120 BPM (simulated)
        avg_amplitude: 0.65,
        peak_amplitude: 0.92,
        spectral_centroid: 2500,
        zero_crossing_rate: 0.08,
      };

      const response = await axios.post(`${API_BASE}/analyze-ai`, {
        audio_features: audioFeatures,
        filename: selectedFile.name,
      });

      const result = response.data;
      setKey(result.key);
      setBpm(result.bpm.toString());
      setEnergy(result.energy.toString());
      setAiConfidence(result.confidence);
      
      Alert.alert(
        'AI Analysis Complete',
        `Key: ${result.key}\nBPM: ${result.bpm}\nEnergy: ${result.energy}\nConfidence: ${(result.confidence * 100).toFixed(0)}%`
      );
    } catch (error) {
      console.error('AI Analysis error:', error);
      Alert.alert('Error', 'AI analysis failed. Please try manual entry.');
    } finally {
      setAnalyzing(false);
    }
  };

  const simulateClientAnalysis = () => {
    // Simulate BPM detection based on file name patterns
    const filename = selectedFile?.name?.toLowerCase() || '';
    
    let detectedBpm = 120 + Math.floor(Math.random() * 20);
    let detectedEnergy = 5 + Math.floor(Math.random() * 3);
    
    // Simple heuristics based on common genre keywords
    if (filename.includes('house') || filename.includes('techno')) {
      detectedBpm = 125 + Math.floor(Math.random() * 10);
      detectedEnergy = 7;
    } else if (filename.includes('drum') || filename.includes('dnb')) {
      detectedBpm = 170 + Math.floor(Math.random() * 10);
      detectedEnergy = 9;
    } else if (filename.includes('chill') || filename.includes('ambient')) {
      detectedBpm = 80 + Math.floor(Math.random() * 20);
      detectedEnergy = 3;
    } else if (filename.includes('hip') || filename.includes('rap')) {
      detectedBpm = 85 + Math.floor(Math.random() * 15);
      detectedEnergy = 6;
    }
    
    setBpm(detectedBpm.toString());
    setEnergy(Math.min(10, detectedEnergy).toString());
    
    Alert.alert(
      'Client Analysis',
      `Estimated BPM: ${detectedBpm}\nEstimated Energy: ${detectedEnergy}\n\nNote: For accurate key detection, use AI analysis or manual entry.`
    );
  };

  const saveTrack = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a track title');
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API_BASE}/tracks`, {
        filename: selectedFile?.name || title,
        title: title.trim(),
        artist: artist.trim(),
        album: album.trim(),
        key: key,
        bpm: parseFloat(bpm) || 120,
        energy: parseInt(energy) || 5,
        duration: duration,
        playlist_id: playlistId,
        analysis_method: analysisMethod,
      });

      Alert.alert('Success', 'Track added to library!', [
        { text: 'Add Another', onPress: resetForm },
        { text: 'View Library', onPress: () => router.replace('/') },
      ]);
    } catch (error) {
      console.error('Error saving track:', error);
      Alert.alert('Error', 'Failed to save track');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setTitle('');
    setArtist('');
    setAlbum('');
    setKey('C major');
    setBpm('120');
    setEnergy('5');
    setDuration(0);
    setPlaylistId(null);
    setAiConfidence(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analyze Track</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* File Selection */}
        <TouchableOpacity style={styles.fileSelector} onPress={pickFile}>
          {selectedFile ? (
            <>
              <Ionicons name="musical-note" size={40} color="#A855F7" />
              <Text style={styles.fileName} numberOfLines={2}>{selectedFile.name}</Text>
              <Text style={styles.fileSize}>
                {duration > 0 ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}` : 'Tap to change'}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={48} color="#6B7280" />
              <Text style={styles.fileSelectorText}>Tap to select audio file</Text>
              <Text style={styles.fileSelectorHint}>MP3, WAV, FLAC supported</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Analysis Method */}
        <Text style={styles.sectionTitle}>Analysis Method</Text>
        <View style={styles.methodContainer}>
          <TouchableOpacity
            style={[styles.methodButton, analysisMethod === 'manual' && styles.methodButtonActive]}
            onPress={() => setAnalysisMethod('manual')}
          >
            <Ionicons name="create-outline" size={24} color={analysisMethod === 'manual' ? '#A855F7' : '#6B7280'} />
            <Text style={[styles.methodText, analysisMethod === 'manual' && styles.methodTextActive]}>Manual</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.methodButton, analysisMethod === 'client' && styles.methodButtonActive]}
            onPress={() => {
              setAnalysisMethod('client');
              if (selectedFile) simulateClientAnalysis();
            }}
          >
            <Ionicons name="phone-portrait-outline" size={24} color={analysisMethod === 'client' ? '#A855F7' : '#6B7280'} />
            <Text style={[styles.methodText, analysisMethod === 'client' && styles.methodTextActive]}>Client</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.methodButton, analysisMethod === 'ai' && styles.methodButtonActive]}
            onPress={() => {
              setAnalysisMethod('ai');
              if (selectedFile) analyzeWithAI();
            }}
          >
            <Ionicons name="sparkles" size={24} color={analysisMethod === 'ai' ? '#A855F7' : '#6B7280'} />
            <Text style={[styles.methodText, analysisMethod === 'ai' && styles.methodTextActive]}>AI</Text>
          </TouchableOpacity>
        </View>

        {analyzing && (
          <View style={styles.analyzingContainer}>
            <ActivityIndicator size="large" color="#A855F7" />
            <Text style={styles.analyzingText}>Analyzing with AI...</Text>
          </View>
        )}

        {aiConfidence !== null && (
          <View style={styles.confidenceContainer}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.confidenceText}>
              AI Confidence: {(aiConfidence * 100).toFixed(0)}%
            </Text>
          </View>
        )}

        {/* Track Info */}
        <Text style={styles.sectionTitle}>Track Information</Text>
        
        <Text style={styles.inputLabel}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="Track title"
          placeholderTextColor="#6B7280"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.inputLabel}>Artist</Text>
        <TextInput
          style={styles.input}
          placeholder="Artist name"
          placeholderTextColor="#6B7280"
          value={artist}
          onChangeText={setArtist}
        />

        <Text style={styles.inputLabel}>Album</Text>
        <TextInput
          style={styles.input}
          placeholder="Album name"
          placeholderTextColor="#6B7280"
          value={album}
          onChangeText={setAlbum}
        />

        {/* Key Selection */}
        <Text style={styles.sectionTitle}>Musical Key</Text>
        <View style={styles.keyFormatContainer}>
          <TouchableOpacity
            style={[styles.keyFormatButton, keyFormat === 'musical' && styles.keyFormatButtonActive]}
            onPress={() => setKeyFormat('musical')}
          >
            <Text style={[styles.keyFormatText, keyFormat === 'musical' && styles.keyFormatTextActive]}>
              Musical (A minor)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.keyFormatButton, keyFormat === 'camelot' && styles.keyFormatButtonActive]}
            onPress={() => setKeyFormat('camelot')}
          >
            <Text style={[styles.keyFormatText, keyFormat === 'camelot' && styles.keyFormatTextActive]}>
              Camelot (8A)
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.keySelector}
          onPress={() => setShowKeyPicker(!showKeyPicker)}
        >
          <Text style={styles.keySelectorText}>{key}</Text>
          <Ionicons name={showKeyPicker ? "chevron-up" : "chevron-down"} size={20} color="#A855F7" />
        </TouchableOpacity>

        {showKeyPicker && (
          <ScrollView style={styles.keyPicker} nestedScrollEnabled>
            {(keyFormat === 'musical' ? MUSICAL_KEYS : CAMELOT_KEYS).map((k) => (
              <TouchableOpacity
                key={k}
                style={[styles.keyOption, key === k && styles.keyOptionActive]}
                onPress={() => {
                  setKey(k);
                  setShowKeyPicker(false);
                }}
              >
                <Text style={[styles.keyOptionText, key === k && styles.keyOptionTextActive]}>{k}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* BPM and Energy */}
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.inputLabel}>BPM</Text>
            <TextInput
              style={styles.input}
              placeholder="120"
              placeholderTextColor="#6B7280"
              keyboardType="numeric"
              value={bpm}
              onChangeText={setBpm}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.inputLabel}>Energy (1-10)</Text>
            <TextInput
              style={styles.input}
              placeholder="5"
              placeholderTextColor="#6B7280"
              keyboardType="numeric"
              value={energy}
              onChangeText={(text) => {
                const num = parseInt(text);
                if (!text || (num >= 1 && num <= 10)) {
                  setEnergy(text);
                }
              }}
            />
          </View>
        </View>

        {/* Energy Indicator */}
        <View style={styles.energyIndicator}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.energyBar,
                level <= parseInt(energy || '0') && styles.energyBarActive,
              ]}
              onPress={() => setEnergy(level.toString())}
            />
          ))}
        </View>

        {/* Playlist Selection */}
        <Text style={styles.sectionTitle}>Add to Playlist (Optional)</Text>
        <TouchableOpacity
          style={styles.playlistSelector}
          onPress={() => setShowPlaylistPicker(!showPlaylistPicker)}
        >
          <Text style={styles.playlistSelectorText}>
            {playlistId
              ? playlists.find((p) => p.id === playlistId)?.name || 'Select playlist'
              : 'No playlist selected'}
          </Text>
          <Ionicons name={showPlaylistPicker ? "chevron-up" : "chevron-down"} size={20} color="#A855F7" />
        </TouchableOpacity>

        {showPlaylistPicker && (
          <View style={styles.playlistPicker}>
            <TouchableOpacity
              style={[styles.playlistOption, !playlistId && styles.playlistOptionActive]}
              onPress={() => {
                setPlaylistId(null);
                setShowPlaylistPicker(false);
              }}
            >
              <Text style={styles.playlistOptionText}>None</Text>
            </TouchableOpacity>
            {playlists.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.playlistOption, playlistId === p.id && styles.playlistOptionActive]}
                onPress={() => {
                  setPlaylistId(p.id);
                  setShowPlaylistPicker(false);
                }}
              >
                <Text style={styles.playlistEmoji}>{p.emoji}</Text>
                <Text style={styles.playlistOptionText}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveTrack}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.saveButtonText}>Save to Library</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  content: {
    flex: 1,
    padding: 16,
  },
  fileSelector: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#374151',
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  fileName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  fileSize: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 4,
  },
  fileSelectorText: {
    color: '#9CA3AF',
    fontSize: 16,
    marginTop: 12,
  },
  fileSelectorHint: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 4,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  methodContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  methodButtonActive: {
    backgroundColor: '#2D1F47',
    borderWidth: 1,
    borderColor: '#A855F7',
  },
  methodText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  methodTextActive: {
    color: '#A855F7',
  },
  analyzingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    marginBottom: 16,
  },
  analyzingText: {
    color: '#A855F7',
    fontSize: 16,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#064E3B',
    borderRadius: 10,
    marginBottom: 16,
  },
  confidenceText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '500',
  },
  inputLabel: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1F2937',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
  },
  keyFormatContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  keyFormatButton: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  keyFormatButtonActive: {
    backgroundColor: '#2D1F47',
  },
  keyFormatText: {
    color: '#6B7280',
    fontSize: 14,
  },
  keyFormatTextActive: {
    color: '#A855F7',
  },
  keySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  keySelectorText: {
    color: '#fff',
    fontSize: 16,
  },
  keyPicker: {
    maxHeight: 200,
    backgroundColor: '#1F2937',
    borderRadius: 10,
    marginBottom: 16,
  },
  keyOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  keyOptionActive: {
    backgroundColor: '#2D1F47',
  },
  keyOptionText: {
    color: '#fff',
    fontSize: 16,
  },
  keyOptionTextActive: {
    color: '#A855F7',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  energyIndicator: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 24,
  },
  energyBar: {
    flex: 1,
    height: 24,
    backgroundColor: '#374151',
    borderRadius: 4,
  },
  energyBarActive: {
    backgroundColor: '#A855F7',
  },
  playlistSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  playlistSelectorText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  playlistPicker: {
    backgroundColor: '#1F2937',
    borderRadius: 10,
    marginBottom: 24,
  },
  playlistOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  playlistOptionActive: {
    backgroundColor: '#2D1F47',
  },
  playlistEmoji: {
    fontSize: 20,
  },
  playlistOptionText: {
    color: '#fff',
    fontSize: 16,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#A855F7',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
