# SCORE - AI Audio Processing Platform

Cloud-based audio processing platform that uses AI models like Omnizart to automatically perform instrument separation, pitch recognition, rhythm quantization, and generate sheet music, MIDI files, and separated audio tracks.

## 🚀 Quick Start

### Current Status: Development Mode ✅

The application now runs in **development mode**, using mock data. **No backend server required** to test the complete UI workflow.

### Testing the Application

1. **Start the frontend** (if not already running):
   ```bash
   npm run dev
   # or
   yarn dev
   ```

2. **Open browser** and access the application

3. **Test upload functionality**:
   - Go to upload page
   - Drag & drop or select an audio file (MP3, WAV, FLAC) or video file (MP4, MOV)
   - Observe upload and processing animations
   - View real-time progress and processing steps
   - Automatically navigate to Results page when complete

**Currently using mock data. All processing is frontend simulation, no real backend needed.**

---

## 🔧 Connecting to Real Backend

When you're ready to use real audio processing features, follow these steps:

### Option A: Google Colab (Easiest) ⭐

1. **Open Colab Notebook**
   ```
   Upload and open: backend/SCORE_Backend_Colab.ipynb
   ```

2. **Run all cells**
   - Execute all code blocks in order
   - Wait for dependency installation (about 5-10 minutes)

3. **Copy ngrok URL**
   - After server starts, you'll see: `https://xxxx-xx-xxx-xxx-xx.ngrok-free.app`

4. **Update frontend configuration**
   ```bash
   # Create .env file (copy from .env.example)
   cp .env.example .env
   
   # Edit .env file
   VITE_API_URL=https://your-ngrok-url
   ```

5. **Restart frontend**
   ```bash
   # Press Ctrl+C in terminal, then rerun
   npm run dev
   ```

### Option B: Local Backend

1. **Install dependencies**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Start backend**
   ```bash
   python main.py
   # Server will run at http://localhost:8000
   ```

3. **Update frontend configuration**
   ```bash
   # Create .env file
   cp .env.example .env
   
   # Edit .env file
   VITE_API_URL=http://localhost:8000
   ```

4. **Restart frontend**

---

## 📁 Project Structure

```
/
├── components/          # React components
│   ├── HomePage.tsx     # Home page
│   ├── UploadPage.tsx   # Upload page
│   ├── ResultsPage.tsx  # Results page
│   └── Navigation.tsx   # Navigation bar
├── api/                 # API client
│   └── scoreApi.ts      # Backend communication (supports mock mode)
├── backend/             # Python backend
│   ├── main.py          # FastAPI server
│   ├── requirements.txt # Python dependencies
│   └── SCORE_Backend_Colab.ipynb  # Colab notebook
├── translations.ts      # Trilingual translations
├── .env                 # Environment variables
└── .env.example         # Environment variables template
```

---

## 🎨 Features

### Completed ✅
- ✅ Trilingual support (Chinese/English/Dutch)
- ✅ Responsive design
- ✅ Neon green theme + holographic colors
- ✅ Pixel art style elements
- ✅ Ripple interaction effects
- ✅ File drag & drop upload
- ✅ Real-time processing progress
- ✅ Complete Results Hub design
- ✅ Music recommendation system
- ✅ PDF generation
- ✅ Frontend-backend API integration architecture
- ✅ Development mode (mock data)
- ✅ Processing options selection (user chooses tracks and outputs)

### Backend Processing Pipeline (Real Backend)
1. **Format Conversion** - ffmpeg converts to WAV
2. **Audio Analysis** - librosa analyzes BPM, pitch, key
3. **AI Transcription** - Omnizart audio to MIDI
4. **Sheet Music Generation** - MusicXML → LilyPond → PDF
5. **Instrument Separation** - Demucs separates vocals, drums, bass, etc.

---

## 🛠️ Tech Stack

### Frontend
- React + TypeScript
- Vite
- Tailwind CSS
- Motion (Framer Motion)
- Lucide Icons
- Recharts

### Backend
- Python 3.8+
- FastAPI
- Omnizart (AI audio transcription)
- librosa (audio analysis)
- Demucs (instrument separation)
- LilyPond (sheet music generation)
- ffmpeg (format conversion)

---

## 🔍 FAQ

### Why no real processing after uploading files?

Because the app is running in **development mode** (using mock data). To use real processing:
1. Start backend server (see "Connecting to Real Backend" section above)
2. Update `VITE_API_URL` in `.env` file
3. Restart frontend development server

### How to check current mode?

Open browser DevTools (F12) and check Console:
- If you see `🔧 SCORE API: Running in development mode` → Mock mode
- If you see `🚀 SCORE API: Connected to backend: ...` → Real backend mode

### Backend won't start?

Check detailed troubleshooting guide:
```bash
# View backend documentation
cat backend/README.md

# View quick setup guide
cat BACKEND_SETUP_GUIDE.md
```

### How to switch languages?

Click language selector in top-right corner: ZH / EN / NL

### Why are files appearing before I select processing options?

**FIXED**: Files now only appear after you:
1. Select which tracks/outputs you want
2. Click "Start Processing"
3. Wait for processing to complete

Files are generated based on your selections only.

---

## 📖 Documentation

- **[Backend Deployment](backend/README.md)** - Detailed backend installation and configuration
- **[Quick Setup Guide](BACKEND_SETUP_GUIDE.md)** - 3 quick start options
- **[Design Guidelines](guidelines/Guidelines.md)** - UI/UX design specifications

---

## 🎯 Roadmap

### Short-term (Current Sprint)
- [x] Frontend-backend API integration
- [x] Development mode support
- [x] Fix file auto-loading issue
- [ ] Improve error handling
- [ ] Add user feedback

### Mid-term
- [ ] Implement real Omnizart transcription
- [ ] Integrate Demucs instrument separation
- [ ] LilyPond PDF generation
- [ ] Enhanced file download functionality

### Long-term
- [ ] User account system
- [ ] History management
- [ ] Batch processing
- [ ] Cloud storage integration

---

## 📝 Environment Variables

```bash
# .env file configuration

# Development mode (default) - uses mock data
VITE_API_URL=mock

# Local backend
# VITE_API_URL=http://localhost:8000

# Colab backend
# VITE_API_URL=https://xxxx-xx-xxx-xxx-xx.ngrok-free.app

# Production
# VITE_API_URL=https://api.yourdomain.com
```

---

## 🤝 Contributing

Issues and Pull Requests are welcome!

---

## 📄 License

MIT License

---

## 🎉 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Open browser
# Visit http://localhost:5173

# 4. Test upload functionality
# Currently uses mock data, no backend needed
```

**Ready to use real backend? Check [BACKEND_SETUP_GUIDE.md](BACKEND_SETUP_GUIDE.md)**

---

**Built with ❤️ using React, FastAPI, and Omnizart**
