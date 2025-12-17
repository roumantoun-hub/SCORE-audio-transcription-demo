import { motion, AnimatePresence } from 'motion/react';
import { X, Activity, Music, Zap } from 'lucide-react';

interface SongAnalysisModalProps {
  song: {
    title: string;
    artist: string;
    similarityTag: string;
  } | null;
  onClose: () => void;
  getSongFeatures: (title: string, artist: string) => any;
  getSpotifyUrl: (title: string, artist: string) => string;
}

export function SongAnalysisModal({ song, onClose, getSongFeatures, getSpotifyUrl }: SongAnalysisModalProps) {
  if (!song) return null;

  const features = getSongFeatures(song.title, song.artist);
  if (!features) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-black border-2 border-[#00d9ff] max-w-2xl w-full p-8 relative overflow-hidden"
        >
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00d9ff]" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00d9ff]" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00d9ff]" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00d9ff]" />

          {/* Scanline effect */}
          <motion.div
            animate={{ y: ['0%', '100%'] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, transparent 50%, rgba(0, 217, 255, 0.03) 50%)',
              backgroundSize: '100% 4px',
            }}
          />

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <motion.h2
                  className="text-2xl mb-2 text-[#00d9ff] uppercase tracking-wider"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  MUSIC ANALYSIS
                </motion.h2>
                <h3 className="text-xl text-white/90 font-mono mb-1" style={{ fontFamily: 'system-ui, monospace' }}>
                  {song.title}
                </h3>
                <p className="text-sm text-white/50 font-mono" style={{ fontFamily: 'system-ui, monospace' }}>
                  {song.artist}
                </p>
              </div>
              <motion.button
                onClick={onClose}
                className="w-10 h-10 border-2 border-white/30 hover:border-[#ff00ff] hover:text-[#ff00ff] text-white/70 flex items-center justify-center transition-all"
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Features Analysis */}
            <div className="space-y-4">
              {/* BPM & Tempo */}
              <div className="border-2 border-[#00ff41]/30 bg-[#00ff41]/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-[#00ff41]" />
                  <h4 className="text-xs uppercase tracking-wider text-[#00ff41]">Tempo & Rhythm</h4>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] text-white/40 uppercase mb-1">BPM</p>
                    <p className="text-lg font-mono text-[#00ff41]">{features.bpm}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40 uppercase mb-1">Note Density</p>
                    <p className="text-lg font-mono text-white/90">{features.note_density.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40 uppercase mb-1">Rhythm Variety</p>
                    <p className="text-lg font-mono text-white/90">{features.rhythm_variety.toFixed(1)}</p>
                  </div>
                </div>
              </div>

              {/* Pitch & Harmony */}
              <div className="border-2 border-[#ff00ff]/30 bg-[#ff00ff]/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Music className="w-4 h-4 text-[#ff00ff]" />
                  <h4 className="text-xs uppercase tracking-wider text-[#ff00ff]">Pitch & Harmony</h4>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] text-white/40 uppercase mb-1">Avg Pitch</p>
                    <p className="text-lg font-mono text-white/90">{features.average_pitch.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40 uppercase mb-1">Pitch Range</p>
                    <p className="text-lg font-mono text-white/90">{features.pitch_range.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40 uppercase mb-1">Key Stability</p>
                    <p className="text-lg font-mono text-white/90">{(features.key_stability * 100).toFixed(0)}%</p>
                  </div>
                </div>
              </div>

              {/* Musical Mode */}
              <div className="border-2 border-[#00d9ff]/30 bg-[#00d9ff]/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-[#00d9ff]" />
                  <h4 className="text-xs uppercase tracking-wider text-[#00d9ff]">Musical Character</h4>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-[10px] text-white/40 uppercase mb-2">Mode</p>
                    <div className="flex gap-2">
                      <span className={`text-xs px-3 py-1 border-2 ${features.mode_major === 1 ? 'border-[#00d9ff] text-[#00d9ff] bg-[#00d9ff]/10' : 'border-white/20 text-white/40'}`}>
                        MAJOR
                      </span>
                      <span className={`text-xs px-3 py-1 border-2 ${features.mode_major === 0 ? 'border-[#00d9ff] text-[#00d9ff] bg-[#00d9ff]/10' : 'border-white/20 text-white/40'}`}>
                        MINOR
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-white/40 uppercase mb-2">Similarity</p>
                    <p className="text-2xl font-mono text-[#00ff41]">{song.similarityTag}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <motion.a
                  href={getSpotifyUrl(song.title, song.artist)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-6 py-3 border-2 border-[#1DB954] text-[#1DB954] hover:bg-[#1DB954]/10 transition-all text-sm uppercase tracking-wider text-center inline-flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                  Listen on Spotify
                </motion.a>
                <motion.button
                  onClick={onClose}
                  className="px-6 py-3 border-2 border-white/30 hover:border-white/50 text-white/70 hover:text-white/90 transition-all text-sm uppercase tracking-wider"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Close
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
