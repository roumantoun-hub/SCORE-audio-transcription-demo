import { useState, useRef, DragEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, File, Check, X, AlertCircle } from 'lucide-react';
import pixelHeroImage from 'figma:asset/6d1322606b0400e5d4aa1878c93f9ad5ee53d74a.png';
import { uploadFile, getProcessingStatus, getProcessingResult } from '../api/scoreApi';
import type { ProcessingStatus } from '../api/scoreApi';

interface UploadPageProps {
  t: any;
  setCurrentPage: (page: 'home' | 'upload' | 'results') => void;
  setUploadedFileData: (data: any) => void;
}

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

interface UploadedFile {
  name: string;
  size: number;
  status: UploadStatus;
  progress: number;
  jobId?: string;
  error?: string;
  currentStep?: string;
}

export function UploadPage({ t, setCurrentPage, setUploadedFileData }: UploadPageProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    const newFile: UploadedFile = {
      name: file.name,
      size: file.size,
      status: 'uploading',
      progress: 0,
    };
    
    setUploadedFile(newFile);

    try {
      // Upload file to backend
      const response = await uploadFile(file, (progress) => {
        setUploadedFile(prev => prev ? { ...prev, progress: Math.min(progress, 100) } : null);
      });

      if (response.success) {
        // Upload successful, start processing
        setUploadedFile(prev => prev ? { 
          ...prev, 
          status: 'processing',
          jobId: response.jobId,
          progress: 0,
          currentStep: 'Starting processing...'
        } : null);

        // Start polling processing status
        startStatusPolling(response.jobId, file);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed, please check if backend is running';
      
      setUploadedFile(prev => prev ? { 
        ...prev, 
        status: 'error',
        error: errorMessage
      } : null);
    }
  };

  const startStatusPolling = (jobId: string, originalFile: File) => {
    // Clear previous polling
    if (statusCheckInterval.current) {
      clearInterval(statusCheckInterval.current);
    }

    // Check status every 2 seconds
    statusCheckInterval.current = setInterval(async () => {
      try {
        const status: ProcessingStatus = await getProcessingStatus(jobId);
        
        setUploadedFile(prev => prev ? {
          ...prev,
          progress: status.progress,
          currentStep: status.currentStep || 'Processing...',
        } : null);

        if (status.status === 'completed') {
          // Processing complete
          if (statusCheckInterval.current) {
            clearInterval(statusCheckInterval.current);
          }

          // Get complete result
          const result = await getProcessingResult(jobId);
          
          setUploadedFile(prev => prev ? { 
            ...prev, 
            status: 'completed',
            progress: 100 
          } : null);

          // Prepare data and navigate to results page
          setUploadedFileData({
            jobId: jobId,
            name: originalFile.name,
            size: originalFile.size,
            format: originalFile.name.split('.').pop()?.toLowerCase() || 'mp3',
            duration: result.originalFile.duration || '3:45',
            uploadTime: new Date().toLocaleTimeString(),
            analysis: result.analysis,
            outputs: result.outputs,
          });

          // Delayed navigation
          setTimeout(() => {
            setCurrentPage('results');
          }, 1000);
        } else if (status.status === 'error') {
          // Processing failed
          if (statusCheckInterval.current) {
            clearInterval(statusCheckInterval.current);
          }
          
          setUploadedFile(prev => prev ? {
            ...prev,
            status: 'error',
            error: status.error || 'Processing failed'
          } : null);
        }
      } catch (error) {
        console.error('Status check error:', error);
        
        if (statusCheckInterval.current) {
          clearInterval(statusCheckInterval.current);
        }
        
        setUploadedFile(prev => prev ? {
          ...prev,
          status: 'error',
          error: 'Unable to get processing status, backend may be disconnected'
        } : null);
      }
    }, 2000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const resetUpload = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen pt-32 px-6 pb-16 relative overflow-hidden">
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
            filter: 'contrast(1.5)',
          }}
        />
      </motion.div>

      {/* Animated grid overlay */}
      <div className="absolute inset-0 z-0 opacity-10">
        <motion.div
          animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="w-full h-full"
          style={{
            backgroundImage: 'linear-gradient(rgba(0, 255, 65, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 65, 0.3) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-6xl mb-16 tracking-tight relative"
        >
          <span className="relative">
            {t.upload.title}
            <motion.span
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 blur-sm text-[#00ff41]"
              style={{ zIndex: -1 }}
            >
              {t.upload.title}
            </motion.span>
          </span>
        </motion.h1>

        <AnimatePresence mode="wait">
          {!uploadedFile ? (
            <motion.div
              key="dropzone"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden ${
                isDragging
                  ? 'border-[#00ff41] bg-[#00ff41]/[0.05]'
                  : 'border-white/20 hover:border-[#00ff41]/60 hover:bg-white/[0.01]'
              }`}
              style={{
                boxShadow: isDragging ? '0 0 40px rgba(0, 255, 65, 0.3), inset 0 0 40px rgba(0, 255, 65, 0.1)' : 'none',
              }}
            >
              {/* Neon corner decorations */}
              <motion.div
                animate={{ 
                  opacity: isDragging ? [0.5, 1, 0.5] : 0.3,
                }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00ff41]"
                style={{ boxShadow: '0 0 10px rgba(0, 255, 65, 0.5)' }}
              />
              <motion.div
                animate={{ 
                  opacity: isDragging ? [0.5, 1, 0.5] : 0.3,
                }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}
                className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#ff00ff]"
                style={{ boxShadow: '0 0 10px rgba(255, 0, 255, 0.5)' }}
              />

              <div className="py-32 px-8 text-center relative">
                <motion.div
                  animate={{ 
                    y: isDragging ? [0, -10, 0] : 0,
                    filter: isDragging ? 'drop-shadow(0 0 20px rgba(0, 255, 65, 0.8))' : 'drop-shadow(0 0 0px rgba(0, 255, 65, 0))',
                  }}
                  transition={{ duration: 1, repeat: isDragging ? Infinity : 0 }}
                >
                  <Upload className="w-16 h-16 mx-auto mb-8 opacity-40" strokeWidth={1} />
                </motion.div>
                <p className="text-xl mb-4 tracking-wide">{t.upload.dragDrop}</p>
                <p className="text-sm text-white/40 tracking-wider">{t.upload.formats}</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.wav,.flac,.mp4,.mov"
                onChange={handleFileSelect}
                className="hidden"
              />
            </motion.div>
          ) : (
            <motion.div
              key="file-info"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="border border-[#00ff41]/30 relative overflow-hidden"
              style={{ boxShadow: '0 0 30px rgba(0, 255, 65, 0.2)' }}
            >
              {/* Animated border glow */}
              <motion.div
                animate={{ 
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 pointer-events-none"
                style={{
                  boxShadow: 'inset 0 0 30px rgba(0, 255, 65, 0.2)',
                }}
              />

              <div className="p-12 relative z-10">
                <div className="flex items-start justify-between mb-8">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-6">
                      <motion.div
                        animate={{ 
                          filter: 'drop-shadow(0 0 10px rgba(0, 255, 65, 0.6))',
                        }}
                      >
                        <File className="w-8 h-8 opacity-60 text-[#00ff41]" strokeWidth={1} />
                      </motion.div>
                      <div>
                        <h3 className="text-xl mb-1">{uploadedFile.name}</h3>
                        <p className="text-sm text-white/40">{formatFileSize(uploadedFile.size)}</p>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="mb-6">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-sm text-white/60 tracking-wider">{t.upload.status}:</span>
                        <StatusBadge status={uploadedFile.status} t={t} />
                      </div>
                      
                      {uploadedFile.status === 'uploading' && (
                        <div className="w-full h-px bg-white/10 relative overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadedFile.progress}%` }}
                            className="h-full bg-[#00ff41] relative"
                            style={{ boxShadow: '0 0 10px rgba(0, 255, 65, 0.8)' }}
                          >
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                              animate={{ x: ['-100%', '200%'] }}
                              transition={{ duration: 1, repeat: Infinity }}
                            />
                          </motion.div>
                        </div>
                      )}
                    </div>

                    {uploadedFile.status === 'completed' && (
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        whileHover={{ 
                          boxShadow: '0 0 20px rgba(0, 255, 65, 0.5)',
                        }}
                        className="px-6 py-3 border border-[#00ff41]/40 hover:border-[#00ff41] transition-all text-sm tracking-widest hover:text-[#00ff41]"
                      >
                        {t.upload.download}
                      </motion.button>
                    )}
                  </div>

                  <button
                    onClick={resetUpload}
                    className="p-2 hover:bg-white/[0.05] transition-colors"
                  >
                    <X className="w-5 h-5 opacity-40 hover:opacity-100 transition-opacity hover:text-[#ff00ff]" />
                  </button>
                </div>

                {uploadedFile.status === 'processing' && (
                  <>
                    {/* Current Step Display */}
                    {uploadedFile.currentStep && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mb-6"
                      >
                        <p className="text-xs text-white/50 mb-2">Current Step:</p>
                        <p className="text-sm text-[#ff00ff]">{uploadedFile.currentStep}</p>
                      </motion.div>
                    )}
                    
                    {/* Progress Percentage */}
                    <div className="mb-6 text-center">
                      <motion.span
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="text-2xl text-[#00ff41]"
                      >
                        {uploadedFile.progress}%
                      </motion.span>
                    </div>
                    
                    <ProcessingAnimation />
                  </>
                )}

                {/* Error Display */}
                {uploadedFile.status === 'error' && uploadedFile.error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 border border-[#ff0040]/30 bg-[#ff0040]/5 mt-6"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-[#ff0040]" />
                      <span className="text-sm text-[#ff0040]">Processing Failed</span>
                    </div>
                    <p className="text-xs text-white/60">{uploadedFile.error}</p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StatusBadge({ status, t }: { status: UploadStatus; t: any }) {
  const statusConfig = {
    idle: { label: t.upload.ready, icon: null, color: '#ffffff' },
    uploading: { label: t.upload.uploading, icon: null, color: '#00d9ff' },
    processing: { label: t.upload.processing, icon: null, color: '#ff00ff' },
    completed: { label: t.upload.completed, icon: Check, color: '#00ff41' },
    error: { label: 'Error', icon: X, color: '#ff0040' },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <motion.div 
      className="flex items-center gap-2"
      animate={{ 
        filter: `drop-shadow(0 0 5px ${config.color})`,
      }}
    >
      {Icon && <Icon className="w-4 h-4" style={{ color: config.color }} />}
      <span className="text-sm tracking-wider" style={{ color: config.color }}>
        {config.label}
      </span>
    </motion.div>
  );
}

function ProcessingAnimation() {
  return (
    <div className="relative h-32 flex items-center justify-center">
      <div className="relative w-full h-px bg-white/10">
        {/* Multiple scanning beams */}
        <motion.div
          animate={{ x: ['-10%', '110%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="absolute top-0 left-0 w-32 h-px bg-gradient-to-r from-transparent via-[#00ff41] to-transparent"
          style={{ boxShadow: '0 0 10px rgba(0, 255, 65, 0.8)' }}
        />
        <motion.div
          animate={{ x: ['110%', '-10%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="absolute top-0 left-0 w-24 h-px bg-gradient-to-r from-transparent via-[#ff00ff] to-transparent"
          style={{ boxShadow: '0 0 10px rgba(255, 0, 255, 0.8)' }}
        />
        <motion.div
          animate={{ x: ['-10%', '110%'] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', delay: 0.5 }}
          className="absolute top-0 left-0 w-20 h-px bg-gradient-to-r from-transparent via-[#00d9ff] to-transparent"
          style={{ boxShadow: '0 0 10px rgba(0, 217, 255, 0.8)' }}
        />
      </div>
      
      {/* Pixel particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-[#00ff41]"
          animate={{
            x: [0, (Math.random() - 0.5) * 200],
            y: [0, (Math.random() - 0.5) * 100],
            opacity: [1, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: 'easeOut',
          }}
          style={{ boxShadow: '0 0 5px rgba(0, 255, 65, 0.8)' }}
        />
      ))}
    </div>
  );
}