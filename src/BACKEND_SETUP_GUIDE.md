# SCORE 后端快速启动指南 🚀

## 问题诊断

你提到"后端代码根本没有发挥作用"，主要原因是：
1. **前端只是模拟数据** - 之前的`UploadPage.tsx`使用`setTimeout`模拟上传，没有真实的API调用
2. **没有后端服务器运行** - 即使有Python代码，也需要启动一个Web服务器来接收前端请求
3. **缺少前后端连接** - 没有API客户端代码来桥接前端和后端

## 现在已完成的修复

✅ **已创建的文件:**
- `/api/scoreApi.ts` - 前端API客户端，处理所有HTTP请求
- `/backend/main.py` - 完整的FastAPI后端服务器
- `/backend/SCORE_Backend_Colab.ipynb` - Google Colab notebook
- `/backend/requirements.txt` - Python依赖列表
- `/backend/README.md` - 详细部署文档
- `/.env.example` - 环境变量模板

✅ **已更新的文件:**
- `/components/UploadPage.tsx` - 现在使用真实的API调用，包括：
  - 真实文件上传到后端
  - 实时进度显示
  - 状态轮询
  - 错误处理和用户提示

## 🎯 3个快速启动选项

### 选项1: Google Colab（最快最简单）⭐ 推荐

**步骤:**

1. **打开Colab Notebook**
   ```
   打开 backend/SCORE_Backend_Colab.ipynb
   或访问: https://colab.research.google.com/
   ```

2. **上传main.py内容**
   - 在notebook的第3个cell中，将`/backend/main.py`的完整代码粘贴进去

3. **运行所有cell**
   - 点击 Runtime > Run all
   - 等待安装完成（约5-10分钟）

4. **复制ngrok URL**
   - 服务器启动后会显示类似: `https://1234-xx-xxx-xxx-xx.ngrok-free.app`
   - 复制这个URL

5. **配置前端**
   ```bash
   # 在前端项目根目录创建 .env 文件
   echo "VITE_API_URL=https://你的ngrok-url" > .env
   ```

6. **重启前端开发服务器**
   - 在终端按 Ctrl+C 停止当前服务器
   - 重新运行: `npm run dev` 或 `yarn dev`

**优点:**
- ✅ 免费GPU
- ✅ 无需本地安装
- ✅ 5分钟启动

**缺点:**
- ❌ 12小时会话限制
- ❌ URL会改变（每次重启）

---

### 选项2: 本地开发环境

**前提条件:**
```bash
# 检查Python版本
python --version  # 需要 3.8+

# 检查ffmpeg
ffmpeg -version   # 如果没有，需要安装
```

**安装ffmpeg:**

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install ffmpeg

# macOS
brew install ffmpeg

# Windows (使用Chocolatey)
choco install ffmpeg
```

**启动步骤:**

```bash
# 1. 进入后端目录
cd backend

# 2. 创建虚拟环境
python -m venv venv

# 3. 激活虚拟环境
# Linux/Mac:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# 4. 安装依赖（这一步可能需要10-15分钟）
pip install -r requirements.txt

# 5. 启动服务器
python main.py

# 服务器将在 http://localhost:8000 运行
```

**配置前端:**
```bash
# 回到前端项目根目录
cd ..

# 创建 .env 文件
echo "VITE_API_URL=http://localhost:8000" > .env

# 重启前端
npm run dev
```

---

### 选项3: Docker（生产环境）

**前提条件:** 安装Docker

**步骤:**

```bash
# 1. 创建 Dockerfile（已在README中提供）
cd backend

# 2. 构建镜像
docker build -t score-backend .

# 3. 运行容器
docker run -d -p 8000:8000 \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/outputs:/app/outputs \
  --name score-api \
  score-backend

# 4. 查看日志
docker logs -f score-api
```

**配置前端:**
```bash
echo "VITE_API_URL=http://localhost:8000" > .env
```

---

## 🧪 测试后端是否正常工作

### 方法1: 浏览器访问

打开浏览器，访问:
```
http://localhost:8000/api/health
```

如果看到 `{"status":"ok","timestamp":"..."}` 说明后端正常运行！

### 方法2: cURL测试

```bash
# 健康检查
curl http://localhost:8000/api/health

# 上传文件测试
curl -X POST -F "file=@your_audio.mp3" http://localhost:8000/api/upload
```

### 方法3: 查看API文档

FastAPI自动生成了交互式API文档:
```
http://localhost:8000/docs
```

在这里你可以直接测试所有API端点！

---

## 🔍 故障排查

### 问题1: 前端显示"后端连接失败"

**检查清单:**
- [ ] 后端服务器是否在运行？
  ```bash
  # 检查进程
  ps aux | grep python  # Linux/Mac
  tasklist | findstr python  # Windows
  ```

- [ ] `.env` 文件是否创建？
  ```bash
  cat .env  # 应该显示 VITE_API_URL=...
  ```

- [ ] URL是否正确？
  - 本地: `http://localhost:8000`
  - Colab: `https://xxxx.ngrok-free.app`（不要忘记https://）

- [ ] 前端是否重启？（修改.env后必须重启）

### 问题2: Python依赖安装失败

**常见问题:**

1. **Omnizart安装失败**
   ```bash
   # 尝试单独安装
   pip install --upgrade pip
   pip install wheel setuptools
   pip install omnizart
   ```

2. **Torch安装慢**
   ```bash
   # 使用国内镜像（中国用户）
   pip install torch torchaudio -i https://pypi.tuna.tsinghua.edu.cn/simple
   ```

3. **Essentia编译失败**
   ```bash
   # 跳过Essentia（可选功能）
   # 编辑 requirements.txt，注释掉 essentia 那一行
   ```

### 问题3: Colab ngrok隧道断开

**解决方案:**
1. 注册ngrok账号: https://dashboard.ngrok.com/signup
2. 获取authtoken
3. 在Colab notebook中添加:
   ```python
   from pyngrok import ngrok
   ngrok.set_auth_token("your_token_here")
   ```

### 问题4: CORS错误

如果在浏览器控制台看到CORS错误，检查`main.py`中的CORS配置:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 开发环境可以用*，生产环境应该指定具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 📊 验证完整流程

**完整测试步骤:**

1. ✅ 启动后端服务器
2. ✅ 访问 `/api/health` 确认运行
3. ✅ 配置前端 `.env` 文件
4. ✅ 重启前端开发服务器
5. ✅ 在浏览器打开前端应用
6. ✅ 进入上传页面
7. ✅ 上传一个测试音频文件
8. ✅ 观察上传进度和处理状态
9. ✅ 查看Results页面

**如果一切正常，你应该看到:**
- ✅ 上传进度条（蓝色）
- ✅ 处理状态（紫色）
- ✅ 当前处理步骤（"格式转换中"、"AI转录中"等）
- ✅ 进度百分比（实时更新）
- ✅ 完成后跳转到Results页面

---

## 🎨 下一步：自定义后端处理

当前`main.py`中的处理函数是模拟实现。要使用真实的Omnizart等工具，参考`/backend/README.md`中的实现示例：

### 核心函数需要实现:

1. **`convert_audio_format()`** - 使用ffmpeg转换音频
2. **`analyze_audio()`** - 使用librosa分析音频特征
3. **`transcribe_with_omnizart()`** - 使用Omnizart转录
4. **`generate_musicxml()`** - MIDI转MusicXML
5. **`generate_sheet_music()`** - LilyPond生成PDF
6. **`separate_instruments()`** - Demucs乐器分离

每个函数的详细实现代码都在`/backend/README.md`中。

---

## 💡 开发建议

### 先使用模拟模式测试

当前的`main.py`已经包含了完整的API结构，但处理函数是模拟的。这样的好处是：

1. ✅ 可以立即测试前后端连接
2. ✅ 不需要等待漫长的依赖安装
3. ✅ 快速验证完整流程
4. ✅ 逐步实现真实处理功能

### 逐步实现真实功能

建议按以下顺序实现：

1. **第一阶段:** 测试API连接（当前状态）
2. **第二阶段:** 实现ffmpeg转换
3. **第三阶段:** 实现音频分析（librosa）
4. **第四阶段:** 实现Omnizart转录
5. **第五阶段:** 实现曲谱生成
6. **第六阶段:** 实现乐器分离

每个阶段都可以独立测试，不需要一次完成所有功能。

---

## 📞 需要帮助？

如果遇到问题：

1. **查看日志**
   ```bash
   # 后端日志
   tail -f score_backend.log  # 如果启用了日志
   
   # Colab中直接查看cell输出
   ```

2. **检查API文档**
   ```
   http://localhost:8000/docs
   ```

3. **查看详细README**
   ```
   backend/README.md
   ```

4. **浏览器开发者工具**
   - 打开Network标签
   - 查看API请求和响应
   - 检查Console中的错误信息

---

## 🎉 总结

现在你的SCORE项目已经有了：

✅ **完整的前后端架构**
- 前端: React + Vite + TypeScript
- 后端: FastAPI + Python

✅ **真实的API通信**
- 文件上传
- 状态轮询
- 结果获取

✅ **3种部署方案**
- Google Colab（快速测试）
- 本地开发（全功能开发）
- Docker（生产部署）

✅ **完善的错误处理**
- 用户友好的错误提示
- 实时状态更新
- 连接失败提醒

**下一步就是启动后端服务器，测试完整流程，然后逐步实现真实的音频处理功能！**

Good luck! 🚀
