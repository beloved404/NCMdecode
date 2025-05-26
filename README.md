# NCM 在线解密转码器

一个纯前端（静态）网页，可在浏览器本地将网易云音乐 `.ncm` 文件解密为原始音频（MP3 / FLAC），并自动提取封面、元数据。

> 解密逻辑全部在客户端执行，不会上传用户文件。可直接部署至 GitHub Pages。

## 体验

1. 克隆或 Fork 本仓库
2. 进入 **Settings → Pages**，将 **Source** 设为 `main` 分支下的 `docs` 目录
3. 几秒后即可通过 `https://<your-username>.github.io/<repo-name>/` 访问

本地测试：直接用浏览器打开 `docs/index.html` 即可。

## 主要技术点

* AES-128-ECB 解密 — 使用 CryptoJS 完成
* NCM 自定义 RC4 变种算法 — 纯 JavaScript 实现
* 纯静态，无任何后端；大文件处理使用 `ArrayBuffer`、`Uint8Array`

## 法律说明

* `.ncm` 文件包含版权内容，仅供个人学习与格式转换之用，请勿将解密后的文件用于商业或传播。
* 本项目仅演示技术实现，作者不对使用者行为承担责任。 