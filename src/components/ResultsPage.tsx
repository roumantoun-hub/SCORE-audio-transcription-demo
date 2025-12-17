import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  Download, 
  Check,
  X,
  Loader2,
  Zap,
  Music,
  FileAudio,
  Activity,
} from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { generateSimplePDF } from '../utils/pdfGenerator';
import pixelHeroImage from 'figma:asset/6d1322606b0400e5d4aa1878c93f9ad5ee53d74a.png';
import { SongAnalysisModal } from './SongAnalysisModal';
import { downloadFile as apiDownloadFile } from '../api/scoreApi';

// --- Song Library Data Structure (from Python backend) ---
// Format: [title, artist, bpm, avg_pitch, pitch_range, key_stability, mode_major, note_density, rhythm_variety]
const REAL_SONG_LIBRARY = [
  // Classical/Chill Cluster (Low BPM, High Stability, Low Density)
  ["Clair de Lune", "Debussy", 60, 65.0, 35.0, 0.95, 0, 0.7, 1.2],
  ["Gymnopédie No. 1", "Satie", 80, 50.0, 20.0, 0.90, 0, 0.5, 1.0],
  ["The Four Seasons: Spring", "Vivaldi", 130, 70.0, 45.0, 0.88, 1, 2.8, 3.5],
  ["Canon in D", "Pachelbel", 60, 55.0, 25.0, 0.98, 1, 1.0, 1.5],
  ["Für Elise", "Beethoven", 130, 68.0, 38.0, 0.85, 0, 1.5, 2.2],

  // Pop/Rock Cluster (Mid BPM, Mid Range, Major Mode)
  ["Can't Stop The Feeling!", "Timberlake", 113, 56.0, 30.0, 0.70, 1, 2.5, 2.0],
  ["Imagine", "Lennon", 75, 52.0, 25.0, 0.80, 1, 1.0, 1.5],
  ["A Thousand Miles", "Carlton", 95, 60.0, 30.0, 0.78, 1, 1.8, 1.8],
  ["Happy", "Pharrell Williams", 160, 54.0, 28.0, 0.65, 1, 3.0, 2.5],
  ["Shape of You", "Ed Sheeran", 96, 50.0, 22.0, 0.72, 0, 2.2, 1.6],
  ["Blinding Lights", "The Weeknd", 171, 58.0, 35.0, 0.60, 0, 3.5, 3.0],

  // Jazz/Electronic/Fast Cluster (High BPM, High Variety/Density, Lower Stability)
  ["Take Five", "Dave Brubeck", 170, 60.5, 45.0, 0.50, 0, 3.5, 4.0],
  ["So What", "Miles Davis", 140, 65.0, 55.0, 0.55, 1, 3.0, 4.5],
  ["Rhapsody in Blue", "Gershwin", 100, 72.0, 50.0, 0.65, 1, 2.8, 3.8],
  ["Strobe", "deadmau5", 128, 55.0, 30.0, 0.58, 0, 3.2, 3.2],
  ["Levels", "Avicii", 126, 62.0, 40.0, 0.62, 1, 3.8, 3.5],
  ["Aerodynamic", "Daft Punk", 120, 68.0, 42.0, 0.53, 0, 4.0, 4.2],

  // World/Diverse Cluster
  ["Libertango", "Piazzolla", 120, 65.0, 35.0, 0.70, 0, 2.5, 3.0],
  ["Oye Como Va", "Santana", 128, 55.0, 30.0, 0.68, 1, 3.0, 3.5],
  ["The Girl from Ipanema", "Jobim", 115, 58.0, 25.0, 0.75, 1, 1.5, 2.0]
];

// --- Recommendation Algorithm (K-Nearest Neighbors) ---
interface MusicFeatures {
  bpm: number;
  average_pitch: number;
  pitch_range: number;
  key_stability: number;
  mode_major: number;
  note_density: number;
  rhythm_variety: number;
}

interface SongRecommendation {
  title: string;
  artist: string;
  similarity_score: number;
}

// Standard Scaler implementation
function standardScale(data: number[][]): { scaled: number[][]; mean: number[]; std: number[] } {
  const numFeatures = data[0].length;
  const mean: number[] = [];
  const std: number[] = [];

  // Calculate mean for each feature
  for (let i = 0; i < numFeatures; i++) {
    const sum = data.reduce((acc, row) => acc + row[i], 0);
    mean.push(sum / data.length);
  }

  // Calculate standard deviation for each feature
  for (let i = 0; i < numFeatures; i++) {
    const variance = data.reduce((acc, row) => acc + Math.pow(row[i] - mean[i], 2), 0) / data.length;
    std.push(Math.sqrt(variance));
  }

  // Scale the data
  const scaled = data.map(row =>
    row.map((val, i) => (std[i] === 0 ? 0 : (val - mean[i]) / std[i]))
  );

  return { scaled, mean, std };
}

// Apply scaling transformation to new data point
function applyScaling(point: number[], mean: number[], std: number[]): number[] {
  return point.map((val, i) => (std[i] === 0 ? 0 : (val - mean[i]) / std[i]));
}

// Calculate Euclidean distance
function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
}

// K-Nearest Neighbors recommendation function
function recommendSongs(inputFeatures: MusicFeatures, k: number = 5): SongRecommendation[] {
  // Extract features from library (indices 2-8 are the feature columns)
  const libraryFeatures = REAL_SONG_LIBRARY.map(song => song.slice(2) as number[]);
  
  // Scale the library data
  const { scaled: scaledLibrary, mean, std } = standardScale(libraryFeatures);

  // Prepare input vector (must match feature order)
  const inputVector = [
    inputFeatures.bpm,
    inputFeatures.average_pitch,
    inputFeatures.pitch_range,
    inputFeatures.key_stability,
    inputFeatures.mode_major,
    inputFeatures.note_density,
    inputFeatures.rhythm_variety,
  ];

  // Scale the input vector
  const scaledInput = applyScaling(inputVector, mean, std);

  // Calculate distances to all songs in library
  const distances = scaledLibrary.map((libraryPoint, index) => ({
    index,
    distance: euclideanDistance(scaledInput, libraryPoint),
  }));

  // Sort by distance (closest first)
  distances.sort((a, b) => a.distance - b.distance);

  // Get top k recommendations
  const recommendations = distances.slice(0, k).map(({ index, distance }) => {
    const song = REAL_SONG_LIBRARY[index];
    // Convert distance to similarity score (0-100)
    const similarity_score = Math.max(0, 100 - distance * 8);

    return {
      title: song[0] as string,
      artist: song[1] as string,
      similarity_score,
    };
  });

  return recommendations;
}

// --- Mock feature generator based on file type ---
function generateMockFeatures(fileName: string, format: string): MusicFeatures {
  // Generate pseudo-random but consistent features based on filename hash
  const hash = fileName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const seed = hash % 100;

  // Different profiles based on file format or name patterns
  const isPiano = fileName.toLowerCase().includes('piano') || fileName.toLowerCase().includes('classical');
  const isElectronic = fileName.toLowerCase().includes('edm') || fileName.toLowerCase().includes('electronic');
  const isJazz = fileName.toLowerCase().includes('jazz');

  if (isPiano) {
    // Classical/Piano-like profile
    return {
      bpm: 60 + (seed % 40),
      average_pitch: 60 + (seed % 15),
      pitch_range: 20 + (seed % 20),
      key_stability: 0.85 + (seed % 15) / 100,
      mode_major: seed % 2,
      note_density: 0.5 + (seed % 20) / 10,
      rhythm_variety: 1.0 + (seed % 15) / 10,
    };
  } else if (isElectronic) {
    // Electronic/EDM-like profile
    return {
      bpm: 120 + (seed % 50),
      average_pitch: 55 + (seed % 15),
      pitch_range: 30 + (seed % 20),
      key_stability: 0.55 + (seed % 15) / 100,
      mode_major: 1,
      note_density: 3.0 + (seed % 15) / 10,
      rhythm_variety: 3.0 + (seed % 20) / 10,
    };
  } else if (isJazz) {
    // Jazz-like profile
    return {
      bpm: 100 + (seed % 70),
      average_pitch: 60 + (seed % 15),
      pitch_range: 40 + (seed % 20),
      key_stability: 0.50 + (seed % 20) / 100,
      mode_major: seed % 2,
      note_density: 2.5 + (seed % 20) / 10,
      rhythm_variety: 3.5 + (seed % 15) / 10,
    };
  } else {
    // Default Pop/Rock profile
    return {
      bpm: 90 + (seed % 40),
      average_pitch: 52 + (seed % 12),
      pitch_range: 22 + (seed % 15),
      key_stability: 0.70 + (seed % 15) / 100,
      mode_major: 1,
      note_density: 1.5 + (seed % 15) / 10,
      rhythm_variety: 1.8 + (seed % 12) / 10,
    };
  }
}

interface ResultsPageProps {
  t: any;
  fileData: {
    name: string;
    size: number;
    format: string;
    duration: string;
    uploadTime: string;
    jobId?: string;
    analysis?: {
      bpm: number;
      key: string;
      timeSignature: string;
      avgPitch: number;
      pitchRange: number;
      keyStability: number;
      modeMajor: number;
      noteDensity: number;
      rhythmVariety: number;
    };
    outputs?: {
      midi?: string;
      musicxml?: string;
      lilypond?: string;
      pdf?: string;
      stems?: {
        vocals?: string;
        drums?: string;
        bass?: string;
        other?: string;
      };
    };
  };
}

type PipelineStep = 'upload' | 'convert' | 'omnizart' | 'synthesize' | 'engrave';
type StepStatus = 'not-started' | 'running' | 'done' | 'failed';

interface PipelineLog {
  step: PipelineStep;
  message: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface TrackOption {
  id: string;
  enabled: boolean;
  status: 'idle' | 'generating' | 'success' | 'error';
}

interface OutputOption {
  id: string;
  enabled: boolean;
  status: 'idle' | 'generating' | 'success' | 'error';
}

interface GeneratedFile {
  id: string;
  name: string;
  format: string;
  size: string;
  generatedTime: string;
  status: 'success' | 'error';
  downloadUrl?: string;
}

interface RecommendedSong {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  similarityTag: string;
  duration: string;
}

export function ResultsPage({ t, fileData }: ResultsPageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pipelineStatus, setPipelineStatus] = useState<Record<PipelineStep, StepStatus>>({
    upload: 'done',
    convert: 'running',
    omnizart: 'not-started',
    synthesize: 'not-started',
    engrave: 'not-started',
  });
  
  // Track separation options (highest priority)
  const [tracks, setTracks] = useState<Record<string, TrackOption>>({
    vocal: { id: 'vocal', enabled: false, status: 'idle' },
    piano: { id: 'piano', enabled: false, status: 'idle' },
    drums: { id: 'drums', enabled: false, status: 'idle' },
    chords: { id: 'chords', enabled: false, status: 'idle' },
    beat: { id: 'beat', enabled: false, status: 'idle' },
    vocalContour: { id: 'vocalContour', enabled: false, status: 'idle' },
  });

  // Output options
  const [outputs, setOutputs] = useState<Record<string, OutputOption>>({
    midi: { id: 'midi', enabled: true, status: 'idle' },
    synthAudio: { id: 'synthAudio', enabled: false, status: 'idle' },
    pdf: { id: 'pdf', enabled: false, status: 'idle' },
    lilypond: { id: 'lilypond', enabled: false, status: 'idle' },
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  // Generate music recommendations using KNN algorithm
  const musicRecommendations = useMemo(() => {
    // Generate mock features based on uploaded file
    const features = generateMockFeatures(fileData.name, fileData.format);
    
    // Get song recommendations using KNN
    const recs = recommendSongs(features, 4);
    
    console.log('🎵 Music Recommendations Generated:', {
      fileName: fileData.name,
      features,
      recommendations: recs
    });
    
    return recs;
  }, [fileData.name, fileData.format]);

  // Convert recommendations to display format
  const recommendedSongs: RecommendedSong[] = useMemo(() => {
    // Image URLs for different artists/styles
    const coverImages: Record<string, string> = {
      'Debussy': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
      'Satie': 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&h=300&fit=crop',
      'Vivaldi': 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=300&h=300&fit=crop',
      'Pachelbel': 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
      'Beethoven': 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=300&h=300&fit=crop',
      'Timberlake': 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
      'Lennon': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
      'Carlton': 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=300&h=300&fit=crop',
      'Pharrell Williams': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
      'Ed Sheeran': 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop',
      'The Weeknd': 'https://images.unsplash.com/photo-1485579149621-3123dd979885?w=300&h=300&fit=crop',
      'Dave Brubeck': 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=300&h=300&fit=crop',
      'Miles Davis': 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop',
      'Gershwin': 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=300&h=300&fit=crop',
      'deadmau5': 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
      'Avicii': 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=300&h=300&fit=crop',
      'Daft Punk': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
      'Piazzolla': 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop',
      'Santana': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
      'Jobim': 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=300&h=300&fit=crop',
    };

    return musicRecommendations.map((rec, index) => ({
      id: String(index + 1),
      title: rec.title,
      artist: rec.artist,
      coverUrl: coverImages[rec.artist] || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
      similarityTag: `${Math.round(rec.similarity_score)}%`,
      duration: '3:45', // Mock duration
    }));
  }, [musicRecommendations]);

  // Simulate pipeline progress
  useEffect(() => {
    const timer1 = setTimeout(() => {
      setPipelineStatus({
        upload: 'done',
        convert: 'done',
        omnizart: 'running',
        synthesize: 'not-started',
        engrave: 'not-started',
      });
    }, 3000);

    const timer2 = setTimeout(() => {
      setPipelineStatus({
        upload: 'done',
        convert: 'done',
        omnizart: 'done',
        synthesize: 'not-started',
        engrave: 'not-started',
      });
      setAnalysisComplete(true);
    }, 6000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Don't auto-load files on page load
  // Files will be loaded when user clicks "Start Processing" based on their selections

  const handleTrackToggle = (id: string) => {
    setTracks(prev => ({
      ...prev,
      [id]: { ...prev[id], enabled: !prev[id].enabled }
    }));
  };

  const handleOutputToggle = (id: string) => {
    setOutputs(prev => ({
      ...prev,
      [id]: { ...prev[id], enabled: !prev[id].enabled }
    }));
  };

  const handleStartProcessing = () => {
    setIsProcessing(true);
    setPipelineStatus(prev => ({ ...prev, synthesize: 'running' }));
    
    const enabledTracks = Object.values(tracks).filter(t => t.enabled);
    const enabledOutputs = Object.values(outputs).filter(o => o.enabled);
    
    let processIndex = 0;

    // Process track separation
    enabledTracks.forEach((track, index) => {
      setTimeout(() => {
        setTracks(prev => ({
          ...prev,
          [track.id]: { ...prev[track.id], status: 'generating' }
        }));

        setTimeout(() => {
          setTracks(prev => ({
            ...prev,
            [track.id]: { ...prev[track.id], status: 'success' }
          }));

          const trackNames: Record<string, string> = {
            vocal: 'vocals',
            piano: 'piano',
            drums: 'drums',
            chords: 'chords',
            beat: 'beat',
            vocalContour: 'vocal_contour',
          };

          const baseName = fileData.name.replace(/\.[^.]+$/, '');
          
          // Check if we have this track from API
          const apiTrackUrl = fileData.outputs?.stems?.[trackNames[track.id] as keyof typeof fileData.outputs.stems];
          
          setGeneratedFiles(prev => [...prev, {
            id: `user_track_${track.id}`, // Use 'user_' prefix for user-selected files
            name: `${baseName}_${trackNames[track.id]}.wav`,
            format: 'WAV',
            size: '3.2 MB',
            generatedTime: new Date().toLocaleTimeString(),
            status: 'success',
            downloadUrl: apiTrackUrl || '#', // Use API URL if available
          }]);

          processIndex++;

          if (processIndex === enabledTracks.length) {
            processOutputs(enabledOutputs);
          }
        }, 2000 + index * 1000);
      }, index * 500);
    });

    if (enabledTracks.length === 0) {
      processOutputs(enabledOutputs);
    }
  };

  const processOutputs = (enabledOutputs: OutputOption[]) => {
    enabledOutputs.forEach((output, index) => {
      setTimeout(() => {
        setOutputs(prev => ({
          ...prev,
          [output.id]: { ...prev[output.id], status: 'generating' }
        }));

        setTimeout(() => {
          setOutputs(prev => ({
            ...prev,
            [output.id]: { ...prev[output.id], status: 'success' }
          }));

          const baseName = fileData.name.replace(/\.[^.]+$/, '');
          const fileNames: Record<string, { name: string; format: string; size: string }> = {
            midi: { name: `${baseName}.mid`, format: 'MIDI', size: '24 KB' },
            synthAudio: { name: `${baseName}_synth.wav`, format: 'WAV', size: '8.5 MB' },
            pdf: { name: `${baseName}.pdf`, format: 'PDF', size: '156 KB' },
            lilypond: { name: `${baseName}.ly`, format: 'LilyPond', size: '12 KB' },
          };

          const fileInfo = fileNames[output.id];
          
          // Map output IDs to API output keys
          const apiOutputMap: Record<string, keyof NonNullable<typeof fileData.outputs>> = {
            midi: 'midi',
            pdf: 'pdf',
            lilypond: 'lilypond',
            // synthAudio doesn't have a direct API mapping, it would need to be generated
          };
          
          // Check if we have this output from API
          const apiKey = apiOutputMap[output.id];
          const apiOutputUrl = apiKey && fileData.outputs ? fileData.outputs[apiKey] : undefined;
          
          setGeneratedFiles(prev => [...prev, {
            id: `user_output_${output.id}`,
            name: fileInfo.name,
            format: fileInfo.format,
            size: fileInfo.size,
            generatedTime: new Date().toLocaleTimeString(),
            status: 'success',
            downloadUrl: apiOutputUrl || '#', // Use API URL if available
          }]);

          if (index === enabledOutputs.length - 1) {
            setTimeout(() => {
              setIsProcessing(false);
              setPipelineStatus(prev => ({ ...prev, synthesize: 'done', engrave: 'done' }));
            }, 500);
          }
        }, 2000 + index * 1000);
      }, index * 500);
    });

    // If no outputs selected, just finish processing
    if (enabledOutputs.length === 0) {
      setTimeout(() => {
        setIsProcessing(false);
        setPipelineStatus(prev => ({ ...prev, synthesize: 'done' }));
      }, 1000);
    }
  };

  const handleResetSelection = () => {
    setTracks({
      vocal: { id: 'vocal', enabled: false, status: 'idle' },
      piano: { id: 'piano', enabled: false, status: 'idle' },
      drums: { id: 'drums', enabled: false, status: 'idle' },
      chords: { id: 'chords', enabled: false, status: 'idle' },
      beat: { id: 'beat', enabled: false, status: 'idle' },
      vocalContour: { id: 'vocalContour', enabled: false, status: 'idle' },
    });
    setOutputs({
      midi: { id: 'midi', enabled: true, status: 'idle' },
      synthAudio: { id: 'synthAudio', enabled: false, status: 'idle' },
      pdf: { id: 'pdf', enabled: false, status: 'idle' },
      lilypond: { id: 'lilypond', enabled: false, status: 'idle' },
    });
  };

  return (
    <div className="min-h-screen pt-24 px-6 pb-16 relative overflow-hidden">
      {/* Pixel background */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.08 }}
        className="absolute inset-0 z-0"
      >
        <img 
          src={pixelHeroImage} 
          alt="" 
          className="w-full h-full object-cover"
          style={{ 
            mixBlendMode: 'screen',
            filter: 'contrast(1.2)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00ff41]/5 to-transparent" />
      </motion.div>

      {/* Scanline effect */}
      <motion.div
        animate={{ y: ['0%', '100%'] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent 50%, rgba(0, 255, 65, 0.02) 50%)',
          backgroundSize: '100% 4px',
        }}
      />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Title with neon glow */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl mb-12 tracking-tight relative inline-block"
        >
          <span className="relative">
            {t.results.title}
            <motion.span
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 blur-md text-[#00ff41]"
              style={{ zIndex: -1 }}
            >
              {t.results.title}
            </motion.span>
          </span>
        </motion.h1>

        {/* Content Grid */}
        <div className="space-y-6">
          <FileOverview 
            t={t}
            fileData={fileData}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            progress={progress}
            setProgress={setProgress}
          />

          <PipelineSection t={t} pipelineStatus={pipelineStatus} />

          <ProcessingOptionsSection 
            t={t}
            tracks={tracks}
            outputs={outputs}
            onTrackToggle={handleTrackToggle}
            onOutputToggle={handleOutputToggle}
            onStartProcessing={handleStartProcessing}
            onReset={handleResetSelection}
            isProcessing={isProcessing}
          />

          {generatedFiles.length > 0 && (
            <DownloadsSection 
              t={t}
              files={generatedFiles}
            />
          )}

          {analysisComplete && (
            <RecommendedSongsSection 
              t={t}
              songs={recommendedSongs}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// File Overview Component
function FileOverview({ t, fileData, isPlaying, setIsPlaying, progress, setProgress }: any) {
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev: number) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.5;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, setIsPlaying, setProgress]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-2 border-[#00ff41]/20 bg-black/40 backdrop-blur-sm p-6 relative overflow-hidden group"
    >
      {/* Neon corner accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#00ff41]" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#00ff41]" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#00ff41]" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#00ff41]" />

      {/* Pulsing glow on hover */}
      <motion.div
        className="absolute inset-0 bg-[#00ff41]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        animate={{ opacity: [0, 0.1, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-6">
          <FileAudio className="w-5 h-5 text-[#00ff41]" />
          <h2 className="text-lg text-[#00ff41] uppercase tracking-wider">{t.results.fileOverview}</h2>
        </div>
        
        {/* File Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          <div className="space-y-2">
            <p className="text-xs text-white/40 uppercase tracking-wider">{t.upload.fileName}</p>
            <p className="text-sm text-white/90 font-mono" style={{ fontFamily: 'system-ui, monospace' }}>{fileData.name}</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-white/40 uppercase tracking-wider">{t.results.format}</p>
            <p className="text-sm text-[#00ff41] font-mono">{fileData.format.toUpperCase()}</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-white/40 uppercase tracking-wider">{t.results.duration}</p>
            <p className="text-sm text-white/90 font-mono" style={{ fontFamily: 'system-ui, monospace' }}>{fileData.duration}</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-white/40 uppercase tracking-wider">{t.upload.fileSize}</p>
            <p className="text-sm text-white/90 font-mono" style={{ fontFamily: 'system-ui, monospace' }}>{formatFileSize(fileData.size)}</p>
          </div>
        </div>

        {/* Audio Player */}
        <div className="border border-[#00ff41]/30 bg-black/60 p-4 relative overflow-hidden">
          {/* Active playing glow */}
          {isPlaying && (
            <motion.div
              className="absolute inset-0 bg-[#00ff41]/5"
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
          
          <div className="flex items-center gap-4 relative z-10">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-12 h-12 border-2 border-[#00ff41] hover:bg-[#00ff41]/20 transition-all flex items-center justify-center relative group"
            >
              <motion.div
                className="absolute inset-0 bg-[#00ff41]/20 opacity-0 group-hover:opacity-100"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              {isPlaying ? (
                <Pause className="w-5 h-5 text-[#00ff41]" />
              ) : (
                <Play className="w-5 h-5 text-[#00ff41]" />
              )}
            </motion.button>

            <div className="flex-1">
              <div className="h-[3px] bg-white/10 relative overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#00ff41] to-[#00d9ff] relative"
                  style={{ width: `${progress}%` }}
                >
                  {/* Scanning beam on progress bar */}
                  <motion.div
                    className="absolute inset-0 bg-white/40"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                </motion.div>
              </div>
            </div>

            <span className="text-xs text-[#00ff41] font-mono w-12 text-right tabular-nums">
              {Math.floor(progress)}%
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Pipeline Section Component
function PipelineSection({ t, pipelineStatus }: any) {
  const steps: { key: PipelineStep; label: string }[] = [
    { key: 'upload', label: t.results.pipeline.upload },
    { key: 'convert', label: t.results.pipeline.convert },
    { key: 'omnizart', label: t.results.pipeline.omnizart },
    { key: 'synthesize', label: t.results.pipeline.synthesize },
    { key: 'engrave', label: t.results.pipeline.engrave },
  ];

  const getStatusLabel = (status: StepStatus) => {
    const labels = {
      'not-started': t.results.pipeline.notStarted,
      'running': t.results.pipeline.running,
      'done': t.results.pipeline.done,
      'failed': t.results.pipeline.failed,
    };
    return labels[status];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="border-2 border-[#00d9ff]/20 bg-black/40 backdrop-blur-sm p-6 relative overflow-hidden"
    >
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#00d9ff]" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#00d9ff]" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#00d9ff]" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#00d9ff]" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-5 h-5 text-[#00d9ff]" />
          <h2 className="text-lg text-[#00d9ff] uppercase tracking-wider">{t.results.pipeline.title}</h2>
        </div>

        {/* Horizontal Steps with Arrows */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const status = pipelineStatus[step.key];
            const isActive = status === 'running';
            const isDone = status === 'done';
            const isFailed = status === 'failed';

            return (
              <div key={step.key} className="contents">
                <div className="flex flex-col items-center flex-1">
                  <motion.div
                    className="w-10 h-10 border-2 flex items-center justify-center mb-2 bg-black relative"
                    style={{
                      borderColor: isDone ? '#00ff41' : isActive ? '#00d9ff' : 'rgba(255, 255, 255, 0.2)',
                    }}
                    animate={isActive ? {
                      boxShadow: [
                        '0 0 0px rgba(0, 217, 255, 0)',
                        '0 0 15px rgba(0, 217, 255, 0.6)',
                        '0 0 0px rgba(0, 217, 255, 0)',
                      ]
                    } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    {isDone ? (
                      <Check className="w-4 h-4 text-[#00ff41]" />
                    ) : isFailed ? (
                      <X className="w-4 h-4 text-red-400" />
                    ) : isActive ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      >
                        <Loader2 className="w-4 h-4 text-[#00d9ff]" />
                      </motion.div>
                    ) : (
                      <span className="text-white/30 text-xs font-mono">{index + 1}</span>
                    )}
                  </motion.div>

                  <p className="text-[10px] text-center uppercase tracking-wider mb-1" style={{
                    color: isDone ? '#00ff41' : isActive ? '#00d9ff' : 'rgba(255, 255, 255, 0.4)',
                  }}>
                    {step.label}
                  </p>

                  <p className="text-[9px] text-white/30 text-center font-mono">
                    {getStatusLabel(status)}
                  </p>
                </div>

                {index < steps.length - 1 && (
                  <div className="flex items-center justify-center" style={{ width: '40px', marginBottom: '50px' }}>
                    <motion.div
                      className="text-white/20"
                      animate={isDone ? { color: 'rgba(0, 255, 65, 0.5)' } : {}}
                    >
                      →
                    </motion.div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// Processing Options Section Component
function ProcessingOptionsSection({ t, tracks, outputs, onTrackToggle, onOutputToggle, onStartProcessing, onReset, isProcessing }: any) {
  const trackConfigs = [
    { id: 'vocal', label: t.results.processing.vocal, icon: '🎤' },
    { id: 'piano', label: t.results.processing.piano, icon: '🎹' },
    { id: 'drums', label: t.results.processing.drums, icon: '🥁' },
    { id: 'chords', label: t.results.processing.chords, icon: '🎵' },
    { id: 'beat', label: t.results.processing.beat, icon: '🥁' },
    { id: 'vocalContour', label: t.results.processing.vocalContour, icon: '🎤' },
  ];

  const outputConfigs = [
    {
      id: 'midi',
      title: t.results.processing.midi,
      desc: t.results.processing.midiDesc,
    },
    {
      id: 'synthAudio',
      title: t.results.processing.synthAudio,
      desc: t.results.processing.synthAudioDesc,
    },
    {
      id: 'pdf',
      title: t.results.processing.pdf,
      desc: t.results.processing.pdfDesc,
    },
    {
      id: 'lilypond',
      title: t.results.processing.lilypond,
      desc: t.results.processing.lilypondDesc,
    },
  ];

  const hasSelection = Object.values(tracks).some((t: any) => t.enabled) || Object.values(outputs).some((o: any) => o.enabled);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="border-2 border-[#ff00ff]/20 bg-black/40 backdrop-blur-sm p-6 relative overflow-hidden group"
    >
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#ff00ff]" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#ff00ff]" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#ff00ff]" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#ff00ff]" />

      <div className="relative z-10">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-[#ff00ff]" />
            <h2 className="text-lg text-[#ff00ff] uppercase tracking-wider">{t.results.processing.title}</h2>
          </div>
          <p className="text-xs text-white/40 uppercase tracking-wider">{t.results.processing.subtitle}</p>
        </div>

        {/* Track Separation Section */}
        <div className="mb-8 border border-[#ff00ff]/30 bg-[#ff00ff]/5 p-5 relative">
          <motion.div
            className="absolute inset-0 bg-[#ff00ff]/5"
            animate={{ opacity: [0.05, 0.1, 0.05] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          
          <div className="relative z-10">
            <div className="mb-4">
              <h3 className="text-sm mb-1 text-[#ff00ff] uppercase tracking-wider">{t.results.processing.trackSeparation}</h3>
              <p className="text-xs text-white/50">{t.results.processing.trackSeparationSubtitle}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {trackConfigs.map((config) => {
                const track = tracks[config.id];
                const isGenerating = track.status === 'generating';
                const isSuccess = track.status === 'success';

                return (
                  <motion.div
                    key={config.id}
                    className={`border-2 p-3 transition-all cursor-pointer relative ${
                      track.enabled 
                        ? 'border-[#ff00ff] bg-[#ff00ff]/10' 
                        : 'border-white/20 hover:border-[#ff00ff]/50'
                    }`}
                    onClick={() => !isGenerating && onTrackToggle(config.id)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {track.enabled && (
                      <motion.div
                        className="absolute inset-0 bg-[#ff00ff]/10"
                        animate={{ opacity: [0.1, 0.2, 0.1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                    
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{config.icon}</span>
                        <span className="text-sm text-white/90 uppercase tracking-wide">{config.label}</span>
                      </div>

                      {isGenerating && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center gap-2"
                        >
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                          >
                            <Loader2 className="w-3 h-3 text-[#ff00ff]" />
                          </motion.div>
                          <span className="text-xs text-[#ff00ff] font-mono">
                            {t.results.processing.processing}
                          </span>
                        </motion.div>
                      )}

                      {isSuccess && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-2"
                        >
                          <Check className="w-3 h-3 text-[#00ff41]" />
                          <span className="text-xs text-[#00ff41] font-mono">
                            {t.upload.completed}
                          </span>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Output Options Section */}
        <div className="mb-6">
          <div className="mb-4">
            <h3 className="text-sm mb-1 text-white/80 uppercase tracking-wider">{t.results.processing.outputOptions}</h3>
            <p className="text-xs text-white/50">{t.results.processing.outputOptionsSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {outputConfigs.map((config) => {
              const output = outputs[config.id];
              const isGenerating = output.status === 'generating';
              const isSuccess = output.status === 'success';

              return (
                <motion.div
                  key={config.id}
                  className={`border-2 p-4 transition-all cursor-pointer relative ${
                    output.enabled 
                      ? 'border-white/40 bg-white/5' 
                      : 'border-white/20 hover:border-white/30'
                  }`}
                  onClick={() => !isGenerating && onOutputToggle(config.id)}
                  whileHover={{ scale: 1.02 }}
                >
                  {output.enabled && (
                    <motion.div
                      className="absolute inset-0 bg-white/5"
                      animate={{ opacity: [0.05, 0.1, 0.05] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                  
                  <div className="relative z-10">
                    <h4 className="text-sm mb-2 text-white/90 uppercase tracking-wide">
                      {config.title}
                    </h4>
                    <p className="text-xs text-white/50 leading-relaxed mb-3">{config.desc}</p>

                    {isGenerating && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2"
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        >
                          <Loader2 className="w-3 h-3 text-[#00d9ff]" />
                        </motion.div>
                        <span className="text-xs text-[#00d9ff] font-mono">
                          {t.results.processing.processing}
                        </span>
                      </motion.div>
                    )}

                    {isSuccess && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-2"
                      >
                        <Check className="w-3 h-3 text-[#00ff41]" />
                        <span className="text-xs text-[#00ff41] font-mono">
                          {t.upload.completed}
                        </span>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <motion.button
            whileHover={hasSelection && !isProcessing ? { scale: 1.02 } : {}}
            whileTap={hasSelection && !isProcessing ? { scale: 0.98 } : {}}
            onClick={onStartProcessing}
            disabled={!hasSelection || isProcessing}
            className={`flex-1 px-6 py-4 border-2 transition-all text-sm uppercase tracking-wider relative overflow-hidden ${
              hasSelection && !isProcessing
                ? 'border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41]/10'
                : 'border-white/20 text-white/30 cursor-not-allowed'
            }`}
          >
            {hasSelection && !isProcessing && (
              <motion.div
                className="absolute inset-0 bg-[#00ff41]/10"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
            
            <span className="relative z-10">
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader2 className="w-4 h-4" />
                  </motion.div>
                  {t.results.processing.processing}
                </span>
              ) : (
                t.results.processing.startProcessing
              )}
            </span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onReset}
            disabled={isProcessing}
            className="px-6 py-4 border-2 border-white/30 hover:border-white/50 transition-all text-white/70 hover:text-white/90 text-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t.results.processing.reset}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// Downloads Section Component
function DownloadsSection({ t, files }: any) {
  // Function to generate and download a file
  const handleDownload = async (file: GeneratedFile) => {
    // If we have a real download URL from the API, use it
    if (file.downloadUrl && file.downloadUrl !== '#') {
      try {
        await apiDownloadFile(file.downloadUrl, file.name);
        console.log('✅ Downloaded file from API:', file.name);
        return;
      } catch (error) {
        console.error('❌ Failed to download from API, falling back to mock:', error);
      }
    }
    
    // Fallback: Generate mock file content based on file type
    let blob: Blob;
    
    if (file.format === 'MIDI') {
      // Create a simple MIDI file header (mock data)
      const midiHeader = new Uint8Array([
        0x4D, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x60, 0x4D, 0x54,
        0x72, 0x6B, 0x00, 0x00, 0x00, 0x04, 0x00, 0xFF,
        0x2F, 0x00
      ]);
      blob = new Blob([midiHeader], { type: 'audio/midi' });
    } else if (file.format === 'WAV') {
      // Create a minimal WAV file (1 second of silence)
      const sampleRate = 44100;
      const numChannels = 2;
      const bitsPerSample = 16;
      const duration = 1;
      const numSamples = sampleRate * duration;
      const blockAlign = numChannels * bitsPerSample / 8;
      const byteRate = sampleRate * blockAlign;
      const dataSize = numSamples * blockAlign;
      
      const buffer = new ArrayBuffer(44 + dataSize);
      const view = new DataView(buffer);
      
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };
      
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + dataSize, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, byteRate, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, bitsPerSample, true);
      writeString(36, 'data');
      view.setUint32(40, dataSize, true);
      
      blob = new Blob([buffer], { type: 'audio/wav' });
    } else if (file.format === 'PDF') {
      // Use utility function to generate a valid PDF
      blob = generateSimplePDF(file.name);
      let pdf = '%PDF-1.4\n';
      const obj1Start = pdf.length;
      pdf += '1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n';
      const obj2Start = pdf.length;
      pdf += '2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n';
      const obj3Start = pdf.length;
      pdf += '3 0 obj\n<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>>>>>\nendobj\n';
      const obj4Start = pdf.length;
      pdf += `4 0 obj\n<</Length ${streamLength}>>\nstream\n${stream}\nendstream\nendobj\n`;
      const xrefStart = pdf.length;
      pdf += 'xref\n';
      pdf += '0 5\n';
      pdf += '0000000000 65535 f \n';
      pdf += String(obj1Start).padStart(10, '0') + ' 00000 n \n';
      pdf += String(obj2Start).padStart(10, '0') + ' 00000 n \n';
      pdf += String(obj3Start).padStart(10, '0') + ' 00000 n \n';
      pdf += String(obj4Start).padStart(10, '0') + ' 00000 n \n';
      pdf += 'trailer\n';
      pdf += '<</Size 5/Root 1 0 R>>\n';
      pdf += 'startxref\n';
      pdf += xrefStart + '\n';
      pdf += '%%EOF';
      
      blob = new Blob([pdf], { type: 'application/pdf' });
    } else if (file.format === 'LilyPond') {
      const lilypondContent = `\\version "2.20.0"
\\header {
  title = "${file.name.replace('.ly', '')}"
  composer = "Generated by SCORE"
}

\\score {
  \\new Staff {
    \\clef treble
    \\time 4/4
    c'4 d'4 e'4 f'4 |
    g'4 a'4 b'4 c''4 |
  }
  \\layout { }
  \\midi { }
}`;
      blob = new Blob([lilypondContent], { type: 'text/plain' });
    } else {
      const content = `Generated file: ${file.name}\nFormat: ${file.format}\nSize: ${file.size}\nGenerated at: ${file.generatedTime}`;
      blob = new Blob([content], { type: 'text/plain' });
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-2 border-[#ffff00]/20 bg-black/40 backdrop-blur-sm p-6 relative overflow-hidden"
    >
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#ffff00]" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#ffff00]" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#ffff00]" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#ffff00]" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-6">
          <Download className="w-5 h-5 text-[#ffff00]" />
          <h2 className="text-lg text-[#ffff00] uppercase tracking-wider">{t.results.downloads.title}</h2>
        </div>

        <div className="space-y-3">
          {files.map((file: GeneratedFile, index: number) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border-2 border-white/20 p-4 hover:border-[#ffff00]/50 transition-all group flex items-center justify-between relative overflow-hidden"
            >
              <motion.div
                className="absolute inset-0 bg-[#ffff00]/0 group-hover:bg-[#ffff00]/5 transition-colors"
              />
              
              <div className="flex items-center gap-4 flex-1 min-w-0 relative z-10">
                <div className="w-10 h-10 border-2 border-[#ffff00]/50 flex items-center justify-center">
                  <FileAudio className="w-5 h-5 text-[#ffff00]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm mb-1 truncate font-mono" style={{ fontFamily: 'system-ui, monospace' }}>{file.name}</h3>
                  <p className="text-xs text-white/50 font-mono">
                    {file.format} · {file.size}
                  </p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleDownload(file)}
                className="px-5 py-2 border-2 border-[#ffff00] text-[#ffff00] hover:bg-[#ffff00]/10 text-xs uppercase tracking-wider transition-all flex-shrink-0 relative z-10"
              >
                {t.results.downloads.download}
              </motion.button>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Recommended Songs Section Component
function RecommendedSongsSection({ t, songs }: any) {
  const [hoveredSong, setHoveredSong] = useState<string | null>(null);
  const [analyzingSong, setAnalyzingSong] = useState<RecommendedSong | null>(null);

  // Generate Spotify search URL for a song
  const getSpotifyUrl = (title: string, artist: string) => {
    const query = encodeURIComponent(`${title} ${artist}`);
    return `https://open.spotify.com/search/${query}`;
  };

  // Get detailed features for a song from the library
  const getSongFeatures = (title: string, artist: string) => {
    const song = REAL_SONG_LIBRARY.find(s => s[0] === title && s[1] === artist);
    if (!song) return null;

    return {
      bpm: song[2],
      average_pitch: song[3],
      pitch_range: song[4],
      key_stability: song[5],
      mode_major: song[6],
      note_density: song[7],
      rhythm_variety: song[8],
    };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-2 border-white/20 bg-black/40 backdrop-blur-sm p-6 relative overflow-hidden"
    >
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white/40" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white/40" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white/40" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white/40" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-6">
          <Music className="w-5 h-5 text-white/70" />
          <h2 className="text-lg text-white/90 uppercase tracking-wider">{t.results.recommendations.title}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {songs.map((song: RecommendedSong) => (
            <motion.div
              key={song.id}
              className="border-2 border-white/20 hover:border-white/40 transition-all group overflow-hidden relative"
              onMouseEnter={() => setHoveredSong(song.id)}
              onMouseLeave={() => setHoveredSong(null)}
              whileHover={{ scale: 1.03 }}
            >
              <motion.div
                className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors"
              />
              
              <div className="flex gap-4 p-4 relative z-10">
                <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden border-2 border-white/30">
                  <img 
                    src={song.coverUrl} 
                    alt={song.title}
                    className="w-full h-full object-cover"
                  />
                  <AnimatePresence>
                    {hoveredSong === song.id && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/70 flex items-center justify-center cursor-pointer"
                        onClick={() => window.open(getSpotifyUrl(song.title, song.artist), '_blank')}
                      >
                        <div className="text-center">
                          <Play className="w-8 h-8 text-[#00ff41] mx-auto mb-1" />
                          <span className="text-[8px] text-[#00ff41] uppercase tracking-wider">Spotify</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm mb-1 truncate text-white/90 font-mono" style={{ fontFamily: 'system-ui, monospace' }}>{song.title}</h3>
                  <p className="text-xs text-white/50 mb-3 font-mono" style={{ fontFamily: 'system-ui, monospace' }}>{song.artist}</p>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] px-2 py-1 border border-[#00ff41]/50 text-[#00ff41] uppercase tracking-wider font-mono">
                      {song.similarityTag}
                    </span>
                    <span className="text-[10px] text-white/40 font-mono" style={{ fontFamily: 'system-ui, monospace' }}>{song.duration}</span>
                  </div>
                  <div className="flex gap-2">
                    <motion.a
                      href={getSpotifyUrl(song.title, song.artist)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] px-3 py-1 border border-[#1DB954] text-[#1DB954] hover:bg-[#1DB954]/10 transition-all uppercase tracking-wider inline-flex items-center gap-1"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                      Spotify
                    </motion.a>
                    <motion.button
                      onClick={() => setAnalyzingSong(song)}
                      className="text-[10px] px-3 py-1 border border-white/30 hover:border-[#00d9ff] hover:text-[#00d9ff] text-white/70 transition-all uppercase tracking-wider"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {t.results.recommendations.analyze}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Analysis Modal */}
      <SongAnalysisModal
        song={analyzingSong}
        onClose={() => setAnalyzingSong(null)}
        getSongFeatures={getSongFeatures}
        getSpotifyUrl={getSpotifyUrl}
      />
    </motion.div>
  );
}