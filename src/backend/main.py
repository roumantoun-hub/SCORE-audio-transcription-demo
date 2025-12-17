"""
SCORE Backend API Server
基于FastAPI的音频处理后端服务

运行方式:
1. 本地开发: uvicorn main:app --reload --host 0.0.0.0 --port 8000
2. Colab: 使用 pyngrok 创建公共隧道

依赖安装:
pip install fastapi uvicorn python-multipart pyngrok
pip install omnizart pretty-midi music21 ffmpeg-python
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import os
import uuid
import shutil
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any
import json
from datetime import datetime

# 初始化FastAPI
app = FastAPI(title="SCORE API", version="1.0.0")

# CORS配置 - 允许前端访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应该指定具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 配置
UPLOAD_DIR = Path("./uploads")
OUTPUT_DIR = Path("./outputs")
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

# 任务状态存储（生产环境应该使用Redis或数据库）
jobs_status: Dict[str, Dict[str, Any]] = {}

# 支持的文件格式
ALLOWED_EXTENSIONS = {'.mp3', '.wav', '.flac', '.mp4', '.mov'}


class JobStatus(BaseModel):
    jobId: str
    status: str  # queued, processing, completed, error
    progress: int
    currentStep: Optional[str] = None
    error: Optional[str] = None


class UploadResponse(BaseModel):
    success: bool
    jobId: str
    message: str


@app.get("/api/health")
async def health_check():
    """健康检查端点"""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


@app.post("/api/upload", response_model=UploadResponse)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    接收文件上传并启动后台处理任务
    """
    # 验证文件扩展名
    file_extension = Path(file.filename).suffix.lower()
    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件格式。支持的格式: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # 生成唯一任务ID
    job_id = str(uuid.uuid4())
    
    # 保存上传的文件
    file_path = UPLOAD_DIR / f"{job_id}{file_extension}"
    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件保存失败: {str(e)}")
    
    # 初始化任务状态
    jobs_status[job_id] = {
        "jobId": job_id,
        "status": "queued",
        "progress": 0,
        "currentStep": "初始化",
        "fileName": file.filename,
        "filePath": str(file_path),
        "createdAt": datetime.now().isoformat()
    }
    
    # 启动后台处理任务
    background_tasks.add_task(process_audio_file, job_id, file_path)
    
    return UploadResponse(
        success=True,
        jobId=job_id,
        message="文件上传成功，正在处理中"
    )


@app.get("/api/status/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str):
    """
    查询任务处理状态
    """
    if job_id not in jobs_status:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    job = jobs_status[job_id]
    return JobStatus(
        jobId=job["jobId"],
        status=job["status"],
        progress=job["progress"],
        currentStep=job.get("currentStep"),
        error=job.get("error")
    )


@app.get("/api/result/{job_id}")
async def get_job_result(job_id: str):
    """
    获取处理完成的结果
    """
    if job_id not in jobs_status:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    job = jobs_status[job_id]
    
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="任务尚未完成")
    
    return job.get("result", {})


@app.get("/api/download/{job_id}/{file_type}")
async def download_file(job_id: str, file_type: str):
    """
    下载生成的文件
    file_type: midi, musicxml, pdf, lilypond, vocals, drums, bass, other
    """
    if job_id not in jobs_status:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    job = jobs_status[job_id]
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="任务尚未完成")
    
    # 获取文件路径（使用file_paths而不是outputs，因为outputs现在包含URL）
    file_paths = job.get("file_paths", {})
    
    file_path = None
    if file_type in file_paths:
        file_path = OUTPUT_DIR / file_paths[file_type]
    elif file_type in file_paths.get("stems", {}):
        file_path = OUTPUT_DIR / file_paths["stems"][file_type]
    
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    
    return FileResponse(
        path=str(file_path),
        filename=file_path.name,
        media_type="application/octet-stream"
    )


@app.post("/api/cancel/{job_id}")
async def cancel_job(job_id: str):
    """
    取消处理任务
    """
    if job_id not in jobs_status:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    job = jobs_status[job_id]
    if job["status"] in ["completed", "error"]:
        raise HTTPException(status_code=400, detail="任务已完成或失败，无法取消")
    
    jobs_status[job_id]["status"] = "cancelled"
    return {"message": "任务已取消"}


async def process_audio_file(job_id: str, file_path: Path):
    """
    后台处理音频文件
    这是核心处理流程，集成你的Omnizart等工具
    """
    try:
        # 更新状态：处理中
        jobs_status[job_id]["status"] = "processing"
        jobs_status[job_id]["progress"] = 10
        jobs_status[job_id]["currentStep"] = "格式转换中"
        
        # 创建输出目录
        job_output_dir = OUTPUT_DIR / job_id
        job_output_dir.mkdir(exist_ok=True)
        
        # === 步骤1: 格式转换 (如果需要) ===
        await asyncio.sleep(2)  # 模拟处理
        converted_file = await convert_audio_format(file_path, job_output_dir)
        jobs_status[job_id]["progress"] = 25
        
        # === 步骤2: 音频分析 ===
        jobs_status[job_id]["currentStep"] = "音频分析中"
        await asyncio.sleep(2)
        analysis_result = await analyze_audio(converted_file)
        jobs_status[job_id]["progress"] = 40
        
        # === 步骤3: Omnizart转录 ===
        jobs_status[job_id]["currentStep"] = "AI转录中 (Omnizart)"
        await asyncio.sleep(3)
        midi_file = await transcribe_with_omnizart(converted_file, job_output_dir)
        jobs_status[job_id]["progress"] = 60
        
        # === 步骤4: 生成MusicXML ===
        jobs_status[job_id]["currentStep"] = "生成MusicXML"
        await asyncio.sleep(2)
        musicxml_file = await generate_musicxml(midi_file, job_output_dir)
        jobs_status[job_id]["progress"] = 70
        
        # === 步骤5: LilyPond制谱 ===
        jobs_status[job_id]["currentStep"] = "制谱中 (LilyPond)"
        await asyncio.sleep(2)
        lilypond_file, pdf_file = await generate_sheet_music(musicxml_file, job_output_dir)
        jobs_status[job_id]["progress"] = 85
        
        # === 步骤6: 乐器分离 (可选) ===
        jobs_status[job_id]["currentStep"] = "乐器分离中"
        await asyncio.sleep(2)
        stems = await separate_instruments(converted_file, job_output_dir)
        jobs_status[job_id]["progress"] = 95
        
        # === 完成 ===
        jobs_status[job_id]["status"] = "completed"
        jobs_status[job_id]["progress"] = 100
        jobs_status[job_id]["currentStep"] = "处理完成"
        
        # 保存结果（返回下载URL而不是文件路径）
        jobs_status[job_id]["result"] = {
            "jobId": job_id,
            "originalFile": {
                "name": jobs_status[job_id]["fileName"],
                "size": file_path.stat().st_size,
                "format": file_path.suffix,
                "duration": "3:45"  # 需要实际计算
            },
            "analysis": analysis_result,
            "outputs": {
                "midi": f"/api/download/{job_id}/midi",
                "musicxml": f"/api/download/{job_id}/musicxml",
                "lilypond": f"/api/download/{job_id}/lilypond",
                "pdf": f"/api/download/{job_id}/pdf",
                "stems": {
                    "vocals": f"/api/download/{job_id}/vocals" if stems.get('vocals') else None,
                    "drums": f"/api/download/{job_id}/drums" if stems.get('drums') else None,
                    "bass": f"/api/download/{job_id}/bass" if stems.get('bass') else None,
                    "other": f"/api/download/{job_id}/other" if stems.get('other') else None,
                }
            },
            "createdAt": jobs_status[job_id]["createdAt"]
        }
        
        # 同时保存文件路径供download endpoint使用
        jobs_status[job_id]["file_paths"] = {
            "midi": f"{job_id}/{midi_file.name}",
            "musicxml": f"{job_id}/{musicxml_file.name}",
            "lilypond": f"{job_id}/{lilypond_file.name}",
            "pdf": f"{job_id}/{pdf_file.name}",
            "stems": {
                "vocals": f"{job_id}/{stems['vocals'].name}" if stems.get('vocals') else None,
                "drums": f"{job_id}/{stems['drums'].name}" if stems.get('drums') else None,
                "bass": f"{job_id}/{stems['bass'].name}" if stems.get('bass') else None,
                "other": f"{job_id}/{stems['other'].name}" if stems.get('other') else None,
            }
        }
        
    except Exception as e:
        jobs_status[job_id]["status"] = "error"
        jobs_status[job_id]["error"] = str(e)
        print(f"处理错误 [{job_id}]: {e}")


# ==================== 核心处理函数 ====================
# 以下函数需要根据你的实际环境实现

async def convert_audio_format(input_file: Path, output_dir: Path) -> Path:
    """使用ffmpeg转换音频格式为WAV"""
    # TODO: 实现ffmpeg转换
    # import ffmpeg
    # output_file = output_dir / f"converted.wav"
    # ffmpeg.input(str(input_file)).output(str(output_file)).run()
    
    # 模拟实现
    output_file = output_dir / "converted.wav"
    shutil.copy(input_file, output_file)
    return output_file


async def analyze_audio(audio_file: Path) -> Dict[str, Any]:
    """分析音频特征 (BPM, 音高, 调性等)"""
    # TODO: 实现音频分析
    # 可以使用librosa, essentia等库
    
    # 模拟数据
    return {
        "bpm": 120,
        "key": "C Major",
        "timeSignature": "4/4",
        "avgPitch": 60.0,
        "pitchRange": 30.0,
        "keyStability": 0.85,
        "modeMajor": 1,
        "noteDensity": 2.5,
        "rhythmVariety": 2.0
    }


async def transcribe_with_omnizart(audio_file: Path, output_dir: Path) -> Path:
    """使用Omnizart进行音频转录"""
    # TODO: 实现Omnizart转录
    # from omnizart.music import app as omnizart_music
    # midi_file = output_dir / "transcribed.mid"
    # omnizart_music.transcribe(str(audio_file), str(midi_file))
    
    # 模拟实现
    midi_file = output_dir / "transcribed.mid"
    midi_file.write_text("MIDI placeholder")
    return midi_file


async def generate_musicxml(midi_file: Path, output_dir: Path) -> Path:
    """从MIDI生成MusicXML"""
    # TODO: 实现MIDI到MusicXML的转换
    # import pretty_midi
    # from music21 import converter
    
    # 模拟实现
    musicxml_file = output_dir / "score.musicxml"
    musicxml_file.write_text("MusicXML placeholder")
    return musicxml_file


async def generate_sheet_music(musicxml_file: Path, output_dir: Path) -> tuple[Path, Path]:
    """使用LilyPond生成曲谱PDF"""
    # TODO: 实现LilyPond制谱
    # 1. 将MusicXML转换为LilyPond格式
    # 2. 调用lilypond命令生成PDF
    
    # 模拟实现
    lilypond_file = output_dir / "score.ly"
    pdf_file = output_dir / "score.pdf"
    lilypond_file.write_text("LilyPond placeholder")
    pdf_file.write_bytes(b"PDF placeholder")
    return lilypond_file, pdf_file


async def separate_instruments(audio_file: Path, output_dir: Path) -> Dict[str, Path]:
    """使用Demucs或Spleeter进行乐器分离"""
    # TODO: 实现乐器分离
    # from demucs import separate
    # 或使用 spleeter
    
    # 模拟实现
    stems = {}
    for stem_name in ['vocals', 'drums', 'bass', 'other']:
        stem_file = output_dir / f"{stem_name}.wav"
        stem_file.write_bytes(b"Audio placeholder")
        stems[stem_name] = stem_file
    
    return stems


# ==================== Colab支持 ====================

def run_in_colab():
    """
    在Google Colab中运行服务器并创建公共隧道
    """
    try:
        from pyngrok import ngrok
        import nest_asyncio
        import uvicorn
        
        # 允许嵌套事件循环（Colab需要）
        nest_asyncio.apply()
        
        # 创建ngrok隧道
        public_url = ngrok.connect(8000)
        print(f"\n🚀 SCORE API 已启动!")
        print(f"📡 公共URL: {public_url}")
        print(f"💡 将此URL设置为前端的 VITE_API_URL\n")
        
        # 启动服务器
        uvicorn.run(app, host="0.0.0.0", port=8000)
        
    except ImportError:
        print("请先安装依赖: !pip install pyngrok nest-asyncio uvicorn")


if __name__ == "__main__":
    import sys
    
    if "google.colab" in sys.modules:
        # Colab环境
        run_in_colab()
    else:
        # 本地环境
        import uvicorn
        print("\n🚀 启动SCORE API服务器...")
        print("📡 本地URL: http://localhost:8000")
        print("📖 API文档: http://localhost:8000/docs\n")
        uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
