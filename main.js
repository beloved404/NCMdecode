/*
 * NCM 在线解码核心逻辑
 * 仅在浏览器端运行，无需任何后端依赖。
 */

const CORE_KEY = "hzHRAmso5kInbaxW";
const META_KEY = "#14ljk_!]&0U<'(";

// DOM 元素
const fileInput = document.getElementById("fileInput");
const uploadArea = document.getElementById("uploadArea");
const uploadBtn = document.getElementById("uploadBtn");
const progressSection = document.getElementById("progressSection");
const progressText = document.getElementById("progressText");
const progressBar = document.getElementById("progressBar");
const progressFill = progressBar.querySelector('.progress-fill');
const progressStatus = document.getElementById("progressStatus");
const resultSection = document.getElementById("resultSection");
const coverImg = document.getElementById("coverImg");
const downloadBtn = document.getElementById("downloadBtn");
const audioPlayer = document.getElementById("audioPlayer");
const newFileBtn = document.getElementById("newFileBtn");

// 事件监听器
fileInput.addEventListener("change", handleFileSelect);
uploadBtn.addEventListener("click", () => fileInput.click());
newFileBtn.addEventListener("click", resetApp);

// 添加音乐交互效果
addMusicInteractions();

// 拖拽上传功能
setupDragAndDrop();

function setupDragAndDrop() {
  const events = ['dragenter', 'dragover', 'dragleave', 'drop'];
  
  events.forEach(eventName => {
    uploadArea.addEventListener(eventName, preventDefaults);
    document.body.addEventListener(eventName, preventDefaults);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    uploadArea.addEventListener(eventName, highlight);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, unhighlight);
  });

  function highlight() {
    uploadArea.classList.add('dragover');
  }

  function unhighlight() {
    uploadArea.classList.remove('dragover');
  }

  uploadArea.addEventListener('drop', handleDrop);

  function handleDrop(e) {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.toLowerCase().endsWith('.ncm')) {
        handleFile(file);
      } else {
        alert('请选择 .ncm 格式的文件！');
      }
    }
  }
}

async function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  handleFile(file);
}

async function handleFile(file) {
  resetUI();
  showProgress();

  try {
    updateProgressStatus("正在读取文件...");
    const arrayBuffer = await file.arrayBuffer();
    
    updateProgressStatus("正在解密文件...");
    const {audioBlob: rawBlob, meta, coverBlob} = await decodeNcm(arrayBuffer, updateProgress);

    // 固定转换为MP3格式
    let finalBlob = rawBlob;
    let finalExt = (meta.format || 'mp3').toLowerCase();
    const originalExt = finalExt;
    
    if (originalExt !== 'mp3') {
      // 需要转码为MP3
      updateProgressStatus("正在加载转码器...");
      updateProgress(0);
      try {
        finalBlob = await transcodeAudio(rawBlob, originalExt, 'mp3', (p) => {
          updateProgress(p);
          updateProgressStatus(`正在转码为 MP3...`);
        });
        finalExt = 'mp3';
        updateProgressStatus(`转码完成，格式：MP3`);
      } catch (error) {
        console.error('转码失败:', error);
        // 转码失败时，提供选择：使用原格式或重试
        const useOriginal = confirm(`转码失败: ${error.message}\n\n点击"确定"使用原格式 ${originalExt.toUpperCase()}，点击"取消"重新选择文件。`);
        if (useOriginal) {
          finalExt = originalExt;
          updateProgressStatus(`使用原格式：${originalExt.toUpperCase()}`);
        } else {
          hideProgress();
          return;
        }
      }
    } else {
      // 原本就是MP3，无需转码
      updateProgressStatus(`格式匹配，无需转码 (MP3)`);
    }

    // 显示结果
    showResult(meta, finalExt, finalBlob, coverBlob);
    
  } catch (err) {
    console.error(err);
    alert("解码失败: " + err.message);
    hideProgress();
  }
}

function resetUI() {
  resultSection.classList.remove("show");
  progressSection.classList.remove("show");
  updateProgress(0);
  updateProgressStatus("准备开始...");
  
  // 清理之前的URL对象
  if (audioPlayer.src) URL.revokeObjectURL(audioPlayer.src);
  if (downloadBtn.href) URL.revokeObjectURL(downloadBtn.href);
  if (coverImg.src && coverImg.src.startsWith('blob:')) URL.revokeObjectURL(coverImg.src);
}

function resetApp() {
  resetUI();
  fileInput.value = '';
}

function showProgress() {
  progressSection.classList.add("show");
  resultSection.classList.remove("show");
}

function hideProgress() {
  progressSection.classList.remove("show");
}

function updateProgress(percent) {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  progressFill.style.width = `${clampedPercent}%`;
  progressText.textContent = `${clampedPercent.toFixed(1)}%`;
}

function updateProgressStatus(status) {
  progressStatus.textContent = status;
}

function showResult(meta, format, audioBlob, coverBlob) {
  // 设置封面
  const albumCover = coverImg.parentElement;
  if (coverBlob) {
    coverImg.src = URL.createObjectURL(coverBlob);
    coverImg.style.display = 'block';
    albumCover.querySelector('.cover-placeholder').style.display = 'none';
  } else {
    coverImg.style.display = 'none';
    albumCover.querySelector('.cover-placeholder').style.display = 'flex';
  }

  // 设置音频和下载
  const audioUrl = URL.createObjectURL(audioBlob);
  audioPlayer.src = audioUrl;
  downloadBtn.href = audioUrl;
  downloadBtn.download = `music.${format}`;

  // 显示结果区域
  hideProgress();
  resultSection.classList.add("show");
  
  // 启动音频可视化
  setupAudioVisualizer();
}

// 音乐交互效果
function addMusicInteractions() {
  // 为卡片添加音乐节拍效果
  const cards = document.querySelectorAll('.upload-card, .info-card, .result-card');
  cards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.animation = 'cardPulse 0.6s ease-in-out';
    });
    card.addEventListener('animationend', () => {
      card.style.animation = '';
    });
  });
  
  // 添加键盘音符效果
  document.addEventListener('keypress', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      createFloatingNote(e.clientX || window.innerWidth / 2, e.clientY || window.innerHeight / 2);
    }
  });
  
  // 点击创建音符效果
  document.addEventListener('click', (e) => {
    if (!e.target.closest('button, a, input, audio')) {
      createFloatingNote(e.clientX, e.clientY);
    }
  });
}

// 创建飘动音符
function createFloatingNote(x, y) {
  const note = document.createElement('div');
  const notes = ['♪', '♫', '♬', '♩', '♭', '♯'];
  note.textContent = notes[Math.floor(Math.random() * notes.length)];
  note.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    color: rgba(220, 20, 60, 0.9);
    font-size: ${12 + Math.random() * 8}px;
    pointer-events: none;
    z-index: 1000;
    font-weight: bold;
    text-shadow: 0 0 10px rgba(220, 20, 60, 0.7);
    animation: floatUp 2s ease-out forwards;
  `;
  
  document.body.appendChild(note);
  
  setTimeout(() => {
    if (note.parentNode) {
      note.parentNode.removeChild(note);
    }
  }, 2000);
}

// 音频可视化设置
function setupAudioVisualizer() {
  const audioPlayer = document.getElementById('audioPlayer');
  const visualizer = document.getElementById('audioVisualizer');
  const bars = visualizer.querySelectorAll('.visualizer-bars span');
  
  // 监听音频播放状态
  audioPlayer.addEventListener('play', () => {
    visualizer.classList.add('playing');
    bars.forEach(bar => {
      bar.style.animationPlayState = 'running';
    });
  });
  
  audioPlayer.addEventListener('pause', () => {
    visualizer.classList.remove('playing');
    bars.forEach(bar => {
      bar.style.animationPlayState = 'paused';
    });
  });
  
  audioPlayer.addEventListener('ended', () => {
    visualizer.classList.remove('playing');
    bars.forEach(bar => {
      bar.style.animationPlayState = 'paused';
    });
  });
}

// ---------------- 核心解码 ----------------
async function decodeNcm(buffer, progressCb = () => {}) {
  const dataView = new DataView(buffer);
  let offset = 0;

  // 1. 跳过前 10 字节的文件头
  offset += 10;

  // 2. 读取并解密 RC4 密钥
  const keyLen = dataView.getUint32(offset, true); // little endian
  offset += 4;
  let keyData = new Uint8Array(buffer, offset, keyLen);
  keyData = xorBytes(keyData, 0x64);
  const rc4KeyDecrypted = aesEcbDecrypt(keyData, CORE_KEY);
  const rc4Key = rc4KeyDecrypted.slice(17); // 去掉前 17 字节
  offset += keyLen;

  // 3. 读取并解密元数据
  const metaLen = dataView.getUint32(offset, true);
  offset += 4;
  let metaData = new Uint8Array(buffer, offset, metaLen);
  metaData = xorBytes(metaData, 0x63);
  const metaStr = new TextDecoder().decode(metaData.slice(22)); // 去掉22字节
  const metaBase64Decoded = CryptoJS.enc.Base64.parse(metaStr);
  const metaDecryptedWA = CryptoJS.AES.decrypt({ciphertext: metaBase64Decoded}, CryptoJS.enc.Utf8.parse(META_KEY), {
    mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7
  });
  const metaBytes = wordArrayToUint8Array(metaDecryptedWA);
  const jsonStr = new TextDecoder().decode(metaBytes.slice(6));
  let meta;
  try {
    meta = JSON.parse(jsonStr);
    console.log('解析的元数据:', meta); // 调试信息
  } catch (e) {
    console.warn('元数据解析失败:', e, '原始字符串:', jsonStr);
    meta = {musicName: "未知", artist: "未知", format: "mp3"};
  }
  offset += metaLen;

  // 4. 跳过 4 字节 CRC32 & 5 字节未知
  offset += 4 + 5;

  // 5. 读取封面
  const imageLen = dataView.getUint32(offset, true);
  offset += 4;
  let coverBlob = null;
  if (imageLen > 0) {
    const coverData = new Uint8Array(buffer, offset, imageLen);
    coverBlob = new Blob([coverData], {type: "image/jpeg"});
  }
  offset += imageLen;

  // 6. 解密音频数据
  const audioDataEncrypted = new Uint8Array(buffer, offset);
  const audioDataDecrypted = rc4VariantDecrypt(audioDataEncrypted, rc4Key, progressCb);

  const ext = (meta.format || "mp3").toLowerCase();
  const mime = ext === "flac" ? "audio/flac" : "audio/mpeg";
  const audioBlob = new Blob([audioDataDecrypted], {type: mime});

  return {audioBlob, meta, coverBlob};
}

// 工具函数
function xorBytes(data, xorConst) {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    out[i] = data[i] ^ xorConst;
  }
  return out;
}

function aesEcbDecrypt(bytes, keyStr) {
  const encryptedWA = CryptoJS.lib.WordArray.create(bytes);
  const decryptedWA = CryptoJS.AES.decrypt({ciphertext: encryptedWA}, CryptoJS.enc.Utf8.parse(keyStr), {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });
  return wordArrayToUint8Array(decryptedWA);
}

function wordArrayToUint8Array(wordArray) {
  const words = wordArray.words;
  const sigBytes = wordArray.sigBytes;
  const u8 = new Uint8Array(sigBytes);
  for (let i = 0; i < sigBytes; i++) {
    u8[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xFF;
  }
  return u8;
}

// RC4 变种解密
function rc4VariantDecrypt(data, keyBytes, progressCb) {
  // 生成 S 盒
  const S = new Uint8Array(256);
  for (let i = 0; i < 256; i++) S[i] = i;
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + keyBytes[i % keyBytes.length]) & 255;
    [S[i], S[j]] = [S[j], S[i]]; // swap
  }

  // 生成固定 256 字节的密钥流 K
  const K = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    const a = (i + 1) & 255;
    const b = S[(a + S[a]) & 255];
    K[i] = S[(S[a] + b) & 255] & 255;
  }

  // 解密数据（按 256 字节块）
  const out = new Uint8Array(data.length);
  const totalChunks = Math.ceil(data.length / 256);
  for (let chunk = 0; chunk < totalChunks; chunk++) {
    const start = chunk * 256;
    const end = Math.min(start + 256, data.length);
    for (let i = start; i < end; i++) {
      out[i] = data[i] ^ K[i - start];
    }
    if (chunk % 20 === 0) { // 只偶尔更新 UI，防止卡顿
      progressCb((chunk + 1) / totalChunks * 100);
    }
  }
  progressCb(100);
  return out;
}

// 使用 ffmpeg.wasm 转码音频，fromExt / toExt 如 'mp3', 'flac'
async function transcodeAudio(blob, fromExt, toExt, progressCb = ()=>{}) {
  if (!window.FFmpeg) {
    throw new Error('FFmpeg.wasm 库未加载，请刷新页面重试');
  }
  
  const { createFFmpeg, fetchFile } = FFmpeg;
  const ffmpeg = createFFmpeg({ 
    log: true,
    corePath: 'https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js',
    progress: ({ ratio }) => {
      if (ratio >= 0 && ratio <= 1) {
        progressCb(ratio * 100);
      }
    }
  });
  
  try {
    if (!ffmpeg.isLoaded()) {
      await ffmpeg.load();
    }

    const inputName = `input.${fromExt}`;
    const outputName = `output.${toExt}`;
    
    // 写入输入文件
    ffmpeg.FS('writeFile', inputName, await fetchFile(blob));

    // 构建FFmpeg命令
    const args = ['-i', inputName];
    if (toExt === 'mp3') {
      args.push('-codec:a', 'libmp3lame', '-b:a', '320k');
    } else if (toExt === 'flac') {
      args.push('-codec:a', 'flac');
    }
    args.push('-y', outputName); // -y 覆盖输出文件

    // 执行转码
    await ffmpeg.run(...args);
    
    // 读取输出文件
    const data = ffmpeg.FS('readFile', outputName);
    
    // 清理临时文件
    ffmpeg.FS('unlink', inputName);
    ffmpeg.FS('unlink', outputName);

    const mime = toExt === 'flac' ? 'audio/flac' : 'audio/mpeg';
    return new Blob([data.buffer], {type: mime});
    
  } catch (error) {
    console.error('FFmpeg转码错误:', error);
    throw new Error(`音频转码失败: ${error.message}`);
  }
}
