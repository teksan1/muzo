import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Svg, { Circle, Text as SvgText, G, Line } from 'react-native-svg';
import axios from 'axios';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const API_BASE = `${EXPO_PUBLIC_BACKEND_URL}/api`;

const { width } = Dimensions.get('window');
const WHEEL_SIZE = Math.min(width - 64, 350);
const CENTER = WHEEL_SIZE / 2;
const OUTER_RADIUS = WHEEL_SIZE / 2 - 20;
const INNER_RADIUS = WHEEL_SIZE / 2 - 70;

// Camelot wheel positions and colors
const CAMELOT_WHEEL = [
  { position: 1, minor: '1A', major: '1B', keyMinor: 'Ab minor', keyMajor: 'B major', color: '#FF6B6B' },
  { position: 2, minor: '2A', major: '2B', keyMinor: 'Eb minor', keyMajor: 'Gb major', color: '#FF9F43' },
  { position: 3, minor: '3A', major: '3B', keyMinor: 'Bb minor', keyMajor: 'Db major', color: '#FECA57' },
  { position: 4, minor: '4A', major: '4B', keyMinor: 'F minor', keyMajor: 'Ab major', color: '#48C9B0' },
  { position: 5, minor: '5A', major: '5B', keyMinor: 'C minor', keyMajor: 'Eb major', color: '#5DADE2' },
  { position: 6, minor: '6A', major: '6B', keyMinor: 'G minor', keyMajor: 'Bb major', color: '#AF7AC5' },
  { position: 7, minor: '7A', major: '7B', keyMinor: 'D minor', keyMajor: 'F major', color: '#EC7063' },
  { position: 8, minor: '8A', major: '8B', keyMinor: 'A minor', keyMajor: 'C major', color: '#45B7D1' },
  { position: 9, minor: '9A', major: '9B', keyMinor: 'E minor', keyMajor: 'G major', color: '#96CEB4' },
  { position: 10, minor: '10A', major: '10B', keyMinor: 'B minor', keyMajor: 'D major', color: '#DDA0DD' },
  { position: 11, minor: '11A', major: '11B', keyMinor: 'Gb minor', keyMajor: 'A major', color: '#98D8C8' },
  { position: 12, minor: '12A', major: '12B', keyMinor: 'Db minor', keyMajor: 'E major', color: '#F7DC6F' },
];

interface KeyDistribution {
  _id: string;
  count: number;
}

export default function CamelotScreen() {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [keyDistribution, setKeyDistribution] = useState<KeyDistribution[]>([]);
  const [showMusicalKey, setShowMusicalKey] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE}/stats`);
      setKeyDistribution(response.data.key_distribution || []);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getTrackCount = (camelotKey: string): number => {
    const found = keyDistribution.find((k) => k._id === camelotKey);
    return found?.count || 0;
  };

  const getCompatibleKeys = (camelotKey: string): string[] => {
    if (!camelotKey) return [];
    const num = parseInt(camelotKey.slice(0, -1));
    const letter = camelotKey.slice(-1);
    
    const compatible = [
      camelotKey,
      `${((num % 12) + 1)}${letter}`,
      `${((num - 2 + 12) % 12) + 1}${letter}`,
      `${num}${letter === 'A' ? 'B' : 'A'}`,
    ];
    
    return compatible;
  };

  const renderWheelSegment = (item: typeof CAMELOT_WHEEL[0], index: number) => {
    const angle = (index * 30) - 90; // Start from top
    const radians = (angle * Math.PI) / 180;
    
    const outerX = CENTER + OUTER_RADIUS * Math.cos(radians);
    const outerY = CENTER + OUTER_RADIUS * Math.sin(radians);
    const innerX = CENTER + INNER_RADIUS * Math.cos(radians);
    const innerY = CENTER + INNER_RADIUS * Math.sin(radians);
    
    const midRadius = (OUTER_RADIUS + INNER_RADIUS) / 2;
    const midX = CENTER + midRadius * Math.cos(radians);
    const midY = CENTER + midRadius * Math.sin(radians);
    
    const majorRadius = OUTER_RADIUS - 15;
    const minorRadius = INNER_RADIUS + 15;
    const majorX = CENTER + majorRadius * Math.cos(radians);
    const majorY = CENTER + majorRadius * Math.sin(radians);
    const minorX = CENTER + minorRadius * Math.cos(radians);
    const minorY = CENTER + minorRadius * Math.sin(radians);
    
    const isSelected = selectedKey === item.minor || selectedKey === item.major;
    const isCompatible = selectedKey ? getCompatibleKeys(selectedKey).includes(item.minor) || getCompatibleKeys(selectedKey).includes(item.major) : false;
    
    const minorCount = getTrackCount(item.minor);
    const majorCount = getTrackCount(item.major);
    
    return (
      <G key={item.position}>
        {/* Connection line to next segment */}
        <Line
          x1={outerX}
          y1={outerY}
          x2={CENTER}
          y2={CENTER}
          stroke="#374151"
          strokeWidth="1"
          opacity={0.3}
        />
        
        {/* Major key (outer) */}
        <Circle
          cx={majorX}
          cy={majorY}
          r={isSelected ? 22 : 18}
          fill={isSelected ? item.color : isCompatible ? item.color : '#1F2937'}
          opacity={isSelected ? 1 : isCompatible ? 0.7 : 0.5}
          onPress={() => setSelectedKey(selectedKey === item.major ? null : item.major)}
        />
        <SvgText
          x={majorX}
          y={majorY + 1}
          fontSize={10}
          fontWeight="bold"
          fill={isSelected || isCompatible ? '#000' : '#fff'}
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {showMusicalKey ? item.keyMajor.split(' ')[0] : item.major}
        </SvgText>
        {majorCount > 0 && (
          <Circle
            cx={majorX + 12}
            cy={majorY - 12}
            r={8}
            fill="#A855F7"
          />
        )}
        {majorCount > 0 && (
          <SvgText
            x={majorX + 12}
            y={majorY - 11}
            fontSize={8}
            fontWeight="bold"
            fill="#fff"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {majorCount}
          </SvgText>
        )}
        
        {/* Minor key (inner) */}
        <Circle
          cx={minorX}
          cy={minorY}
          r={isSelected ? 22 : 18}
          fill={isSelected ? item.color : isCompatible ? item.color : '#374151'}
          opacity={isSelected ? 1 : isCompatible ? 0.7 : 0.5}
          onPress={() => setSelectedKey(selectedKey === item.minor ? null : item.minor)}
        />
        <SvgText
          x={minorX}
          y={minorY + 1}
          fontSize={10}
          fontWeight="bold"
          fill={isSelected || isCompatible ? '#000' : '#fff'}
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {showMusicalKey ? item.keyMinor.split(' ')[0] : item.minor}
        </SvgText>
        {minorCount > 0 && (
          <Circle
            cx={minorX + 12}
            cy={minorY - 12}
            r={8}
            fill="#A855F7"
          />
        )}
        {minorCount > 0 && (
          <SvgText
            x={minorX + 12}
            y={minorY - 11}
            fontSize={8}
            fontWeight="bold"
            fill="#fff"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {minorCount}
          </SvgText>
        )}
      </G>
    );
  };

  const selectedKeyInfo = selectedKey
    ? CAMELOT_WHEEL.find((k) => k.minor === selectedKey || k.major === selectedKey)
    : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Camelot Wheel</Text>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setShowMusicalKey(!showMusicalKey)}
        >
          <Ionicons
            name={showMusicalKey ? 'musical-note' : 'grid'}
            size={24}
            color="#A855F7"
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Camelot Wheel */}
        <View style={styles.wheelContainer}>
          <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
            {/* Background circles */}
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={OUTER_RADIUS}
              fill="none"
              stroke="#374151"
              strokeWidth="1"
            />
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={INNER_RADIUS}
              fill="none"
              stroke="#374151"
              strokeWidth="1"
            />
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={30}
              fill="#1F2937"
            />
            
            {/* Wheel segments */}
            {CAMELOT_WHEEL.map((item, index) => renderWheelSegment(item, index))}
            
            {/* Center text */}
            <SvgText
              x={CENTER}
              y={CENTER - 6}
              fontSize={10}
              fill="#9CA3AF"
              textAnchor="middle"
            >
              A=Minor
            </SvgText>
            <SvgText
              x={CENTER}
              y={CENTER + 8}
              fontSize={10}
              fill="#9CA3AF"
              textAnchor="middle"
            >
              B=Major
            </SvgText>
          </Svg>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#A855F7' }]} />
            <Text style={styles.legendText}>Tracks in library</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#374151' }]} />
            <Text style={styles.legendText}>Inner = Minor (A)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#1F2937' }]} />
            <Text style={styles.legendText}>Outer = Major (B)</Text>
          </View>
        </View>

        {/* Selected Key Info */}
        {selectedKeyInfo && (
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedTitle}>Selected: {selectedKey}</Text>
            <Text style={styles.selectedSubtitle}>
              {selectedKey?.endsWith('A') ? selectedKeyInfo.keyMinor : selectedKeyInfo.keyMajor}
            </Text>
            
            <Text style={styles.compatibleTitle}>Compatible Keys:</Text>
            <View style={styles.compatibleKeys}>
              {getCompatibleKeys(selectedKey!).map((key) => {
                const keyInfo = CAMELOT_WHEEL.find(
                  (k) => k.minor === key || k.major === key
                );
                return (
                  <View
                    key={key}
                    style={[
                      styles.compatibleKey,
                      { backgroundColor: keyInfo?.color || '#374151' },
                    ]}
                  >
                    <Text style={styles.compatibleKeyText}>{key}</Text>
                  </View>
                );
              })}
            </View>
            
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => {
                router.push(`/?camelot=${selectedKey}`);
              }}
            >
              <Ionicons name="filter" size={20} color="#fff" />
              <Text style={styles.filterButtonText}>View tracks in {selectedKey}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Mixing Guide */}
        <View style={styles.mixingGuide}>
          <Text style={styles.guideTitle}>Harmonic Mixing Guide</Text>
          
          <View style={styles.guideItem}>
            <View style={styles.guideIcon}>
              <Ionicons name="arrow-forward" size={20} color="#10B981" />
            </View>
            <View style={styles.guideContent}>
              <Text style={styles.guideLabel}>Same Key</Text>
              <Text style={styles.guideDesc}>Perfect harmonic match, smooth transition</Text>
            </View>
          </View>
          
          <View style={styles.guideItem}>
            <View style={styles.guideIcon}>
              <Ionicons name="arrow-up" size={20} color="#F59E0B" />
            </View>
            <View style={styles.guideContent}>
              <Text style={styles.guideLabel}>+1 Position</Text>
              <Text style={styles.guideDesc}>Energy boost, raises the vibe</Text>
            </View>
          </View>
          
          <View style={styles.guideItem}>
            <View style={styles.guideIcon}>
              <Ionicons name="arrow-down" size={20} color="#3B82F6" />
            </View>
            <View style={styles.guideContent}>
              <Text style={styles.guideLabel}>-1 Position</Text>
              <Text style={styles.guideDesc}>Energy drop, mellows the mood</Text>
            </View>
          </View>
          
          <View style={styles.guideItem}>
            <View style={styles.guideIcon}>
              <Ionicons name="swap-horizontal" size={20} color="#A855F7" />
            </View>
            <View style={styles.guideContent}>
              <Text style={styles.guideLabel}>A/B Switch</Text>
              <Text style={styles.guideDesc}>Major/minor switch, mood change</Text>
            </View>
          </View>
        </View>

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
  toggleButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    alignItems: 'center',
  },
  wheelContainer: {
    backgroundColor: '#0A0A0F',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  selectedInfo: {
    width: '100%',
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  selectedTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  selectedSubtitle: {
    color: '#9CA3AF',
    fontSize: 16,
    marginTop: 4,
    marginBottom: 16,
  },
  compatibleTitle: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 8,
  },
  compatibleKeys: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  compatibleKey: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  compatibleKeyText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#A855F7',
    borderRadius: 10,
    padding: 14,
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  mixingGuide: {
    width: '100%',
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
  },
  guideTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  guideItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  guideIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideContent: {
    flex: 1,
  },
  guideLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  guideDesc: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 2,
  },
});
