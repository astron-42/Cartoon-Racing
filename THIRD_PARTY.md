# 第三方组件

只有一处第三方运行时代码，其余美术、音效、贴图全部在运行时由 canvas 程序化生成。

**本项目自身**以 [MIT](LICENSE) 许可发布（Copyright (c) 2026 astron-42）。下面各节的条款只约束各自涉及的那部分文件。

## three.js r169

- 文件：`vendor/three.module.min.js`、`vendor/GLTFLoader.js`
- 许可：MIT License，Copyright 2010-2024 Three.js Authors（https://threejs.org）
- 用途：渲染层唯一依赖；打包时（`tools/build.mjs`）被内联进 `dist/paper-racing.html`，所以单文件版可以 `file://` 直接双击运行。
- GLTFLoader 在本项目中未被实际加载模型使用（模型都是代码拼的程序化纸偶），保留是为了后续替换资源时不用改构建脚本。

## 画风参考

视觉语言参考 **Kağıt Kart** 的剪纸/纸雕风格（木桌、纸带赛道、撕纸 UI），但仓库内**不含任何来自该作品的素材或代码**：纸纹、木纹、赛道等高线、草地、天空、纸偶立绘、音效全部由本项目程序化生成。八条赛道与章节名均为虚构。
