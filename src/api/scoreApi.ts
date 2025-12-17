/**
 * SCORE API Client
 * Handles all communication with the Python backend server
 * Supports development mode (mock data) and production mode (real API)
 */

// Configure your backend API URL
// If set to 'mock', mock data will be used (no backend required)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'mock';
const IS_MOCK_MODE = API_BASE_URL === 'mock';

// Development mode notification
if (IS_MOCK_MODE) {
  console.log('🔧 SCORE API: Running in development mode (using mock data)');
  console.log('💡 To connect to real backend, set VITE_API_URL in .env file');
} else {
  console.log('🚀 SCORE API: Connected to backend:', API_BASE_URL);
}

export interface UploadResponse {
  success: boolean;
  jobId: string;
  message: string;
}

export interface ProcessingStatus {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  progress: number;
  currentStep?: string;
  error?: string;
}

export interface ProcessingResult {
  jobId: string;
  originalFile: {
    name: string;
    size: number;
    format: string;
    duration: string;
  };
  analysis: {
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
  outputs: {
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
  createdAt: string;
}

// ==================== Mock Data and Functions ====================

const mockJobs: Map<string, {
  status: ProcessingStatus;
  result?: ProcessingResult;
}> = new Map();

function generateMockJobId(): string {
  return `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createMockResult(jobId: string, fileName: string, fileSize: number): ProcessingResult {
  return {
    jobId,
    originalFile: {
      name: fileName,
      size: fileSize,
      format: fileName.split('.').pop() || 'mp3',
      duration: '3:45',
    },
    analysis: {
      bpm: 120,
      key: 'C Major',
      timeSignature: '4/4',
      avgPitch: 60.0,
      pitchRange: 30.0,
      keyStability: 0.85,
      modeMajor: 1,
      noteDensity: 2.5,
      rhythmVariety: 2.0,
    },
    outputs: {
      midi: `/api/download/${jobId}/midi`,
      musicxml: `/api/download/${jobId}/musicxml`,
      lilypond: `/api/download/${jobId}/lilypond`,
      pdf: `/api/download/${jobId}/pdf`,
      stems: {
        vocals: `/api/download/${jobId}/vocals`,
        drums: `/api/download/${jobId}/drums`,
        bass: `/api/download/${jobId}/bass`,
        other: `/api/download/${jobId}/other`,
      },
    },
    createdAt: new Date().toISOString(),
  };
}

async function mockUploadFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResponse> {
  // Simulate upload progress
  return new Promise((resolve) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      if (onProgress) {
        onProgress(Math.min(progress, 100));
      }
      
      if (progress >= 100) {
        clearInterval(interval);
        const jobId = generateMockJobId();
        
        // Create mock job
        mockJobs.set(jobId, {
          status: {
            jobId,
            status: 'queued',
            progress: 0,
            currentStep: 'Initializing',
          },
        });
        
        // Start mock processing
        startMockProcessing(jobId, file.name, file.size);
        
        resolve({
          success: true,
          jobId,
          message: 'File upload successful (mock mode)',
        });
      }
    }, 200);
  });
}

function startMockProcessing(jobId: string, fileName: string, fileSize: number) {
  const steps = [
    { progress: 10, step: 'Initializing', duration: 500 },
    { progress: 25, step: 'Format conversion', duration: 1000 },
    { progress: 40, step: 'Audio analysis', duration: 1000 },
    { progress: 60, step: 'AI transcription (Omnizart)', duration: 1500 },
    { progress: 70, step: 'Generating MusicXML', duration: 800 },
    { progress: 85, step: 'Music engraving (LilyPond)', duration: 1000 },
    { progress: 95, step: 'Instrument separation', duration: 1000 },
    { progress: 100, step: 'Processing complete', duration: 500 },
  ];
  
  let currentStepIndex = 0;
  
  function processNextStep() {
    if (currentStepIndex >= steps.length) {
      // Complete
      const job = mockJobs.get(jobId);
      if (job) {
        // Set result first, then set status to completed
        job.result = createMockResult(jobId, fileName, fileSize);
        job.status = {
          jobId,
          status: 'completed',
          progress: 100,
          currentStep: 'Processing complete',
        };
      }
      return;
    }
    
    const step = steps[currentStepIndex];
    const job = mockJobs.get(jobId);
    
    if (job) {
      job.status = {
        jobId,
        status: currentStepIndex < steps.length - 1 ? 'processing' : 'completed',
        progress: step.progress,
        currentStep: step.step,
      };
      
      // If this is the last step, also set result
      if (currentStepIndex === steps.length - 1) {
        job.result = createMockResult(jobId, fileName, fileSize);
      }
    }
    
    currentStepIndex++;
    setTimeout(processNextStep, step.duration);
  }
  
  processNextStep();
}

// ==================== API Functions ====================

/**
 * Upload audio/video file to backend
 */
export async function uploadFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResponse> {
  if (IS_MOCK_MODE) {
    return mockUploadFile(file, onProgress);
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      // Listen to upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      });

      // Listen to completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            reject(new Error('Invalid response format'));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      // Listen to errors
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      // Listen to timeout
      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timeout'));
      });

      // Send request
      xhr.open('POST', `${API_BASE_URL}/api/upload`);
      xhr.timeout = 300000; // 5 minute timeout
      xhr.send(formData);
    });
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

/**
 * Poll processing status
 */
export async function getProcessingStatus(jobId: string): Promise<ProcessingStatus> {
  if (IS_MOCK_MODE) {
    const job = mockJobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }
    return job.status;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/status/${jobId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Status check error:', error);
    throw error;
  }
}

/**
 * Get processing result
 */
export async function getProcessingResult(jobId: string): Promise<ProcessingResult> {
  if (IS_MOCK_MODE) {
    const job = mockJobs.get(jobId);
    if (!job || !job.result) {
      throw new Error('Result not available');
    }
    return job.result;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/result/${jobId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get result: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Result fetch error:', error);
    throw error;
  }
}

/**
 * Download file
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  try {
    // If relative path, add base URL
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    
    const response = await fetch(fullUrl);
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}

/**
 * Cancel processing job
 */
export async function cancelJob(jobId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/cancel/${jobId}`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to cancel job: ${response.status}`);
    }
  } catch (error) {
    console.error('Cancel job error:', error);
    throw error;
  }
}

/**
 * Health check - check if backend is available
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    
    return response.ok;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}
