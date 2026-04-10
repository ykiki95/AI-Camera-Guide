# AI Camera Guide

브라우저 카메라를 활용한 실시간 AI 사진 구도 가이드 웹앱

## 주요 기능

- **실시간 객체 감지**: TensorFlow.js (COCO-SSD) 기반 객체 인식
- **피사체 윤곽선 추출**: MediaPipe ImageSegmenter + Canny Edge Detection + Marching Squares
- **구도 분석**: 삼분할법 기반 실시간 구도 평가 및 점수
- **이동 가이드**: 피사체 최적 위치 안내 (화살표 + 목표 위치 표시)
- **장면 자동 분류**: 인물 / 음식 / 풍경 / 일반 장면 자동 인식
- **촬영 팁**: 장면별 맞춤 촬영 팁 제공
- **데모 모드**: 카메라 없는 환경에서도 체험 가능

## 기술 스택

- React 19 + TypeScript + Vite
- TailwindCSS v4
- TensorFlow.js + COCO-SSD
- MediaPipe Image Segmenter (WASM)
- Canny Edge Detection (순수 구현)
- Marching Squares Contour Tracing

## 실행 방법

```bash
npm install
npm run dev
```

## 배포

Vercel에 배포하려면:
1. Vercel에서 이 GitHub 저장소를 연결
2. Framework: Vite 선택
3. 별도 설정 없이 자동 배포

## 라이선스

All rights reserved.
