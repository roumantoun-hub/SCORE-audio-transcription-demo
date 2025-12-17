# SCORE 后端部署指南

## 概述

SCORE后端是一个基于FastAPI的音频处理服务，集成了Omnizart、ffmpeg、LilyPond等工具，用于音频转录、乐器分离和曲谱生成。

## 部署选项

### 选项1: Google Colab (推荐用于测试)

**优点:**
- 免费GPU支持
- 无需本地安装
- 快速启动

**缺点:**
- 会话有时间限制（12小时）
- 每次重启URL会改变
- 存储空间有限

**步骤:**

1. 打开Google Colab: https://colab.research.google.com/
2. 上传 `SCORE_Backend_Colab.ipynb` 文件
3. 按顺序运行所有cell
4. 复制生成的ngrok URL
5. 在前端项目创建 `.env` 文件:
   ```
   VITE_API_URL=https://xxxx-xx-xxx-xxx-xx.ngrok-free.app
   ```
6. 重启前端开发服务器

### 选项2: 本地开发环境

**前提条件:**
- Python 3.8+
- ffmpeg
- LilyPond (可选)

**安装步骤:**

```bash
# 1. 创建Python虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 2. 安装依赖
cd backend
pip install -r requirements.txt

# 3. 安装ffmpeg (Ubuntu/Debian)
sudo apt-get install ffmpeg

# 或者 (macOS)
brew install ffmpeg

# 4. 安装LilyPond (可选，用于生成PDF曲谱)
# Ubuntu/Debian
sudo apt-get install lilypond

# macOS
brew install lilypond

# 5. 启动服务器
python main.py
```

服务器将在 `http://localhost:8000` 启动

**前端配置:**
```bash
# 在前端项目根目录创建 .env 文件
echo "VITE_API_URL=http://localhost:8000" > .env
```

### 选项3: Docker部署

**创建 Dockerfile:**

```dockerfile
FROM python:3.8-slim

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    ffmpeg \
    lilypond \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY main.py .

# 创建必要目录
RUN mkdir -p /app/uploads /app/outputs

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**构建和运行:**

```bash
# 构建镜像
docker build -t score-backend .

# 运行容器
docker run -p 8000:8000 -v $(pwd)/uploads:/app/uploads -v $(pwd)/outputs:/app/outputs score-backend
```

### 选项4: 生产环境部署

**推荐服务:**
- AWS EC2
- Google Cloud Run
- Azure App Service
- DigitalOcean Droplet

**Nginx配置示例:**

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # 增加超时时间（用于大文件上传）
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        
        # 增加上传大小限制
        client_max_body_size 100M;
    }
}
```

**使用systemd管理服务:**

创建 `/etc/systemd/system/score-backend.service`:

```ini
[Unit]
Description=SCORE Backend API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/score-backend
Environment="PATH=/var/www/score-backend/venv/bin"
ExecStart=/var/www/score-backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

启动服务:
```bash
sudo systemctl enable score-backend
sudo systemctl start score-backend
sudo systemctl status score-backend
```

## 依赖列表 (requirements.txt)

创建 `backend/requirements.txt`:

```
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6
pyngrok==7.0.1
nest-asyncio==1.5.8

# 音频处理
omnizart==0.5.0
librosa==0.10.1
pretty-midi==0.2.10
music21==9.1.0
essentia==2.1b6.dev1110

# 乐器分离
demucs==4.0.1
# spleeter==2.3.2  # 可选

# 视频处理
ffmpeg-python==0.2.0
```

## 实现核心功能

### 1. Omnizart转录

```python
async def transcribe_with_omnizart(audio_file: Path, output_dir: Path) -> Path:
    """使用Omnizart进行音频转录"""
    from omnizart.music import app as omnizart_music
    
    midi_file = output_dir / "transcribed.mid"
    
    # 运行Omnizart转录
    await asyncio.to_thread(
        omnizart_music.transcribe,
        str(audio_file),
        str(midi_file),
        model_path=None  # 使用默认模型
    )
    
    return midi_file
```

### 2. ffmpeg格式转换

```python
async def convert_audio_format(input_file: Path, output_dir: Path) -> Path:
    """使用ffmpeg转换音频格式为WAV"""
    import ffmpeg
    
    output_file = output_dir / "converted.wav"
    
    await asyncio.to_thread(
        lambda: (
            ffmpeg
            .input(str(input_file))
            .output(str(output_file), acodec='pcm_s16le', ar='44100', ac='2')
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )
    )
    
    return output_file
```

### 3. 音频分析

```python
async def analyze_audio(audio_file: Path) -> Dict[str, Any]:
    """分析音频特征"""
    import librosa
    import numpy as np
    
    # 加载音频
    y, sr = librosa.load(str(audio_file), sr=None)
    
    # BPM检测
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    
    # 音高分析
    pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
    pitch_values = []
    for t in range(pitches.shape[1]):
        index = magnitudes[:, t].argmax()
        pitch = pitches[index, t]
        if pitch > 0:
            pitch_values.append(librosa.hz_to_midi(pitch))
    
    avg_pitch = np.mean(pitch_values) if pitch_values else 60.0
    pitch_range = np.ptp(pitch_values) if pitch_values else 0.0
    
    # 调性检测
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    key = np.argmax(np.mean(chroma, axis=1))
    
    return {
        "bpm": float(tempo),
        "key": f"{['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][key]} Major",
        "timeSignature": "4/4",
        "avgPitch": float(avg_pitch),
        "pitchRange": float(pitch_range),
        "keyStability": 0.85,
        "modeMajor": 1,
        "noteDensity": len(pitch_values) / (len(y) / sr),
        "rhythmVariety": 2.0
    }
```

### 4. LilyPond制谱

```python
async def generate_sheet_music(musicxml_file: Path, output_dir: Path) -> tuple[Path, Path]:
    """使用LilyPond生成曲谱PDF"""
    import subprocess
    from music21 import converter
    
    # 读取MusicXML
    score = converter.parse(str(musicxml_file))
    
    # 导出为LilyPond格式
    lilypond_file = output_dir / "score.ly"
    score.write('lilypond', fp=str(lilypond_file))
    
    # 使用LilyPond生成PDF
    pdf_file = output_dir / "score.pdf"
    await asyncio.to_thread(
        lambda: subprocess.run(
            ['lilypond', '--output', str(output_dir / 'score'), str(lilypond_file)],
            check=True
        )
    )
    
    return lilypond_file, pdf_file
```

### 5. 乐器分离

```python
async def separate_instruments(audio_file: Path, output_dir: Path) -> Dict[str, Path]:
    """使用Demucs进行乐器分离"""
    import subprocess
    
    # 运行Demucs
    await asyncio.to_thread(
        lambda: subprocess.run(
            ['demucs', '--two-stems', 'vocals', '-o', str(output_dir), str(audio_file)],
            check=True
        )
    )
    
    # 查找输出文件
    model_output_dir = output_dir / 'htdemucs' / audio_file.stem
    
    stems = {}
    for stem_name in ['vocals', 'drums', 'bass', 'other']:
        stem_file = model_output_dir / f"{stem_name}.wav"
        if stem_file.exists():
            # 移动到输出目录
            new_path = output_dir / f"{stem_name}.wav"
            stem_file.rename(new_path)
            stems[stem_name] = new_path
    
    return stems
```

## 测试API

### 使用cURL测试:

```bash
# 健康检查
curl http://localhost:8000/api/health

# 上传文件
curl -X POST -F "file=@test_audio.mp3" http://localhost:8000/api/upload

# 查询状态
curl http://localhost:8000/api/status/{job_id}

# 获取结果
curl http://localhost:8000/api/result/{job_id}
```

### 使用Python测试:

```python
import requests

# 上传文件
with open('test_audio.mp3', 'rb') as f:
    response = requests.post('http://localhost:8000/api/upload', files={'file': f})
    job_id = response.json()['jobId']
    print(f"Job ID: {job_id}")

# 轮询状态
import time
while True:
    status = requests.get(f'http://localhost:8000/api/status/{job_id}').json()
    print(f"Progress: {status['progress']}% - {status['currentStep']}")
    
    if status['status'] == 'completed':
        result = requests.get(f'http://localhost:8000/api/result/{job_id}').json()
        print("Result:", result)
        break
    elif status['status'] == 'error':
        print("Error:", status['error'])
        break
    
    time.sleep(2)
```

## 故障排除

### 问题: 前端无法连接后端

**检查:**
1. 后端服务器是否正在运行？
2. `.env` 文件中的 `VITE_API_URL` 是否正确？
3. CORS是否配置正确？
4. 防火墙是否阻止了连接？

### 问题: Omnizart转录失败

**解决方案:**
1. 确保micromamba环境正确激活
2. 检查Omnizart模型是否下载
3. 音频文件格式是否支持（建议转换为WAV）

### 问题: 内存不足

**解决方案:**
1. 减小音频文件大小
2. 增加服务器内存
3. 使用GPU加速（Colab推荐）
4. 分批处理大文件

### 问题: LilyPond生成PDF失败

**解决方案:**
1. 确保LilyPond已安装：`lilypond --version`
2. 检查MusicXML格式是否正确
3. 查看LilyPond错误日志

## 性能优化

### 1. 使用缓存
```python
from functools import lru_cache

@lru_cache(maxsize=100)
def get_cached_result(job_id: str):
    return jobs_status.get(job_id)
```

### 2. 使用任务队列（生产环境）
```bash
pip install celery redis

# 使用Celery处理后台任务
celery -A main.celery worker --loglevel=info
```

### 3. 限流保护
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/api/upload")
@limiter.limit("10/minute")
async def upload_file(...):
    ...
```

## 监控和日志

### 添加日志:
```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('score_backend.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)
```

### 监控工具推荐:
- Prometheus + Grafana
- Sentry (错误追踪)
- ELK Stack (日志分析)

## 安全建议

1. **API密钥认证:**
```python
from fastapi.security import APIKeyHeader

api_key_header = APIKeyHeader(name="X-API-Key")

@app.post("/api/upload")
async def upload_file(api_key: str = Depends(api_key_header)):
    if api_key != os.getenv("API_KEY"):
        raise HTTPException(status_code=403, detail="Invalid API key")
```

2. **文件类型验证:**
```python
import magic

def validate_file_type(file: UploadFile):
    mime = magic.from_buffer(file.file.read(1024), mime=True)
    file.file.seek(0)
    if mime not in ['audio/mpeg', 'audio/wav', 'video/mp4']:
        raise HTTPException(400, "Invalid file type")
```

3. **文件大小限制:**
```python
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(413, "File too large")
```

## 支持

遇到问题？
- 查看日志文件
- 检查API文档: http://localhost:8000/docs
- 提交Issue到GitHub仓库

## 许可证

MIT License
