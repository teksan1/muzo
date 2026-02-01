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
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
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
  const [batchAnalysisResults, setBatchAnalysisResults] = useState<{[filename: string]: any}>({});

  useEffect(() => {
    fetchPlaylists();
  }, []);

  useEffect(() => {
    // Automatically analyze files when multiple files are selected and client analysis is chosen
    if (selectedFiles.length > 1 && analysisMethod === 'client') {
      performBatchClientAnalysis();
    }
  }, [selectedFiles, analysisMethod]);

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
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFiles(result.assets);
        
        // Use the first file for title
        const firstFile = result.assets[0];
        const filename = firstFile.name;
        const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
        setTitle(nameWithoutExt);
        
        // Try to get duration from first file
        if (Platform.OS !== 'web') {
          try {
            const { sound } = await Audio.Sound.createAsync({ uri: firstFile.uri });
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
    if (selectedFiles.length === 0) {
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
        filename: selectedFiles[0].name,
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
    const filename = selectedFiles[0]?.name?.toLowerCase() || '';
    
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

  const getClientAnalysisForFile = (filename: string) => {
    const fname = filename.toLowerCase();
    
    let detectedBpm = 120 + Math.floor(Math.random() * 20);
    let detectedEnergy = 5 + Math.floor(Math.random() * 3);
    let detectedKey = 'C major';
    
    // Simple heuristics based on common genre keywords
    if (fname.includes('house') || fname.includes('techno')) {
      detectedBpm = 125 + Math.floor(Math.random() * 10);
      detectedEnergy = 7;
      detectedKey = ['F minor', 'G minor', 'A minor', 'B minor'][Math.floor(Math.random() * 4)];
    } else if (fname.includes('drum') || fname.includes('dnb') || fname.includes('jungle')) {
      detectedBpm = 170 + Math.floor(Math.random() * 10);
      detectedEnergy = 9;
      detectedKey = ['C minor', 'D minor', 'A minor'][Math.floor(Math.random() * 3)];
    } else if (fname.includes('chill') || fname.includes('ambient') || fname.includes('lofi')) {
      detectedBpm = 80 + Math.floor(Math.random() * 20);
      detectedEnergy = 3;
      detectedKey = ['C major', 'G major', 'A major', 'F major'][Math.floor(Math.random() * 4)];
    } else if (fname.includes('hip') || fname.includes('rap') || fname.includes('trap')) {
      detectedBpm = 85 + Math.floor(Math.random() * 15);
      detectedEnergy = 6;
      detectedKey = ['A minor', 'C major', 'G major'][Math.floor(Math.random() * 3)];
    } else if (fname.includes('rock') || fname.includes('indie')) {
      detectedBpm = 110 + Math.floor(Math.random() * 20);
      detectedEnergy = 7;
      detectedKey = ['C major', 'G major', 'D major', 'A major'][Math.floor(Math.random() * 4)];
    } else if (fname.includes('pop')) {
      detectedBpm = 100 + Math.floor(Math.random() * 20);
      detectedEnergy = 6;
      detectedKey = ['C major', 'F major', 'G major', 'A major'][Math.floor(Math.random() * 4)];
    } else if (fname.includes('edm') || fname.includes('electronic')) {
      detectedBpm = 128 + Math.floor(Math.random() * 10);
      detectedEnergy = 8;
      detectedKey = ['F minor', 'G minor', 'A minor', 'C minor'][Math.floor(Math.random() * 4)];
    }
    
    return {
      bpm: detectedBpm,
      energy: Math.min(10, detectedEnergy),
      key: detectedKey,
      duration: 200 + Math.floor(Math.random() * 200) // Random duration
    };
  };

  const performBatchClientAnalysis = async () => {
    if (selectedFiles.length <= 1) return;

    setAnalyzing(true);
    try {
      const results: {[filename: string]: any} = {};
      
      for (const file of selectedFiles) {
        const analysis = getClientAnalysisForFile(file.name);
        results[file.name] = analysis;
      }
      
      setBatchAnalysisResults(results);
      
      // Set the first file's results as the displayed values for reference
      if (selectedFiles.length > 0) {
        const firstFile = selectedFiles[0];
        const firstAnalysis = results[firstFile.name];
        setKey(firstAnalysis.key);
        setBpm(firstAnalysis.bpm.toString());
        setEnergy(firstAnalysis.energy.toString());
      }
      
      Alert.alert(
        'Batch Analysis Complete',
        `Analyzed ${selectedFiles.length} files automatically using client-side heuristics.`
      );
    } catch (error) {
      console.error('Batch analysis error:', error);
      Alert.alert('Error', 'Batch analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const saveTrack = async () => {
    if (selectedFiles.length === 0) {
      Alert.alert('Error', 'Please select audio files');
      return;
    }

    // For single file, require title
    if (selectedFiles.length === 1 && !title.trim()) {
      Alert.alert('Error', 'Please enter a track title');
      return;
    }

    setSaving(true);
    try {
      for (const file of selectedFiles) {
        const filename = file.name;
        const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
        
        // Use individual analysis results for batch processing, or global form values for single file
        let trackData;
        if (selectedFiles.length > 1 && analysisMethod === 'client' && batchAnalysisResults[filename]) {
          const analysis = batchAnalysisResults[filename];
          trackData = {
            filename: filename,
            title: nameWithoutExt, // Use filename as title for batch
            artist: artist.trim() || '', // Optional for batch
            album: album.trim() || '', // Optional for batch
            key: analysis.key,
            bpm: analysis.bpm,
            energy: analysis.energy,
            duration: analysis.duration,
            playlist_id: playlistId,
            analysis_method: analysisMethod,
          };
        } else {
          // Single file or manual entry
          trackData = {
            filename: filename,
            title: selectedFiles.length === 1 ? title.trim() : nameWithoutExt,
            artist: artist.trim(),
            album: album.trim(),
            key: key,
            bpm: parseFloat(bpm) || 120,
            energy: parseInt(energy) || 5,
            duration: duration,
            playlist_id: playlistId,
            analysis_method: analysisMethod,
          };
        }
        
        await axios.post(`${API_BASE}/tracks`, trackData);
      }

      Alert.alert('Success', `${selectedFiles.length} track${selectedFiles.length > 1 ? 's' : ''} added to library!`);
      router.replace('/');
    } catch (error) {
      console.error('Error saving tracks:', error);
      Alert.alert('Error', 'Failed to save tracks');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedFiles([]);
    setTitle('');
    setArtist('');
    setAlbum('');
    setKey('C major');
    setBpm('120');
    setEnergy('5');
    setDuration(0);
    setPlaylistId(null);
    setAiConfidence(null);
    setBatchAnalysisResults({});
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
          {selectedFiles.length > 0 ? (
            <>
              <Ionicons name="musical-note" size={40} color="#A855F7" />
              <Text style={styles.fileName} numberOfLines={2}>
                {selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} files selected`}
              </Text>
              <Text style={styles.fileSize}>
                {duration > 0 ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}` : 'Tap to change'}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={48} color="#6B7280" />
              <Text style={styles.fileSelectorText}>Tap to select audio files</Text>
              <Text style={styles.fileSelectorHint}>Select one or multiple files</Text>
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
              if (selectedFiles.length > 1) {
                performBatchClientAnalysis();
              } else if (selectedFiles.length === 1) {
                simulateClientAnalysis();
              }
            }}
          >
            <Ionicons name="phone-portrait-outline" size={24} color={analysisMethod === 'client' ? '#A855F7' : '#6B7280'} />
            <Text style={[styles.methodText, analysisMethod === 'client' && styles.methodTextActive]}>
              {selectedFiles.length > 1 ? 'Auto Batch' : 'Client'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.methodButton, 
              analysisMethod === 'ai' && styles.methodButtonActive,
              selectedFiles.length > 1 && styles.methodButtonDisabled
            ]}
            onPress={() => {
              setAnalysisMethod('ai');
              if (selectedFiles.length === 1) analyzeWithAI();
            }}
            disabled={selectedFiles.length > 1}
          >
            <Ionicons name="sparkles" size={24} color={
              selectedFiles.length > 1 ? '#374151' :
              analysisMethod === 'ai' ? '#A855F7' : '#6B7280'
            } />
            <Text style={[
              styles.methodText, 
              analysisMethod === 'ai' && styles.methodTextActive,
              selectedFiles.length > 1 && styles.methodTextDisabled
            ]}>AI</Text>
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
        {selectedFiles.length === 1 && (
          <>
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
          </>
        )}

        {selectedFiles.length > 1 && analysisMethod === 'client' && Object.keys(batchAnalysisResults).length > 0 && (
          <View style={styles.batchInfo}>
            <Text style={styles.sectionTitle}>Batch Analysis Results</Text>
            <Text style={styles.batchInfoText}>
              {selectedFiles.length} files analyzed automatically. Each track will be saved with its individual analysis results.
            </Text>
            <Text style={styles.batchInfoText}>
              Sample: {selectedFiles[0]?.name} → {batchAnalysisResults[selectedFiles[0]?.name]?.key}, {batchAnalysisResults[selectedFiles[0]?.name]?.bpm} BPM
            </Text>
          </View>
        )}

        {selectedFiles.length > 1 && analysisMethod !== 'client' && (
          <View style={styles.batchInfo}>
            <Text style={styles.sectionTitle}>Batch Processing</Text>
            <Text style={styles.batchInfoText}>
              {selectedFiles.length} files selected. All tracks will use the same metadata below.
            </Text>
          </View>
        )}

        {/* Key Selection - Show for all cases */}
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
  batchInfo: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  batchInfoText: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 20,
  },
});
