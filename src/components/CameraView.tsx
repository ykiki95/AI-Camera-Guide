import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useCamera } from '../hooks/useCamera';
import { useObjectDetection } from '../hooks/useObjectDetection';
import { useComposition } from '../hooks/useComposition';
import { processImage } from '../utils/imageProcessor';
import { computeObjectGuides } from '../utils/compositionRules';
import { SceneBadge } from './SceneBadge';
import { ScoreGauge } from './ScoreGauge';
import { ShutterButton } from './ShutterButton';
import { CompositionOverlay } from './CompositionOverlay';
import { TipsPanel } from './TipsPanel';
import { ResultScreen } from './ResultScreen';
import { LoadingScreen } from './LoadingScreen';
import { CameraErrorScreen } from './CameraErrorScreen';
import { DemoView } from './DemoView';

export function CameraView() {
  const { videoRef, canvasRef, isReady, error, switchCamera, startCamera, captureFrame, resumeCamera } = useCamera();
  const { isModelLoading, loadProgress, detections, startDetection, stopDetection } = useObjectDetection();
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 });
  const [capturedImage, setCapturedImage] = useState<HTMLCanvasElement | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { scene, composition } = useComposition(
    detections,
    dimensions.width,
    dimensions.height,
  );

  const objectGuides = useMemo(
    () => computeObjectGuides(scene.type, detections, dimensions.width, dimensions.height),
    [scene.type, detections, dimensions.width, dimensions.height],
  );

  useEffect(() => {
    if (isReady && videoRef.current && !isModelLoading && !capturedImage) {
      startDetection(videoRef.current);

      const checkDimensions = () => {
        const video = videoRef.current;
        if (video && video.videoWidth > 0) {
          setDimensions({ width: video.videoWidth, height: video.videoHeight });
        }
      };

      checkDimensions();
      const interval = setInterval(checkDimensions, 1000);
      return () => {
        clearInterval(interval);
        stopDetection();
      };
    }
  }, [isReady, isModelLoading, capturedImage]);

  const handleCapture = useCallback(() => {
    const canvas = captureFrame();
    if (canvas) {
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 200);

      const resultCanvas = document.createElement('canvas');
      resultCanvas.width = canvas.width;
      resultCanvas.height = canvas.height;
      const ctx = resultCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(canvas, 0, 0);
        processImage(resultCanvas);
        setCapturedImage(resultCanvas);
        stopDetection();
      }
    }
  }, [captureFrame, stopDetection]);

  const handleRetake = useCallback(async () => {
    setCapturedImage(null);
    await resumeCamera();
  }, [resumeCamera]);

  if (isModelLoading) {
    return <LoadingScreen progress={loadProgress} />;
  }

  if (demoMode) {
    return <DemoView onBack={() => setDemoMode(false)} />;
  }

  if (error && !capturedImage) {
    return <CameraErrorScreen error={error} onRetry={startCamera} onDemo={() => setDemoMode(true)} />;
  }

  if (capturedImage) {
    return (
      <ResultScreen
        imageCanvas={capturedImage}
        scene={scene}
        composition={composition}
        onRetake={handleRetake}
      />
    );
  }

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />

      <canvas ref={canvasRef} className="hidden" />

      {showFlash && (
        <div className="absolute inset-0 bg-white z-40 animate-flash" />
      )}

      <CompositionOverlay
        sceneType={scene.type}
        composition={composition}
        width={dimensions.width}
        height={dimensions.height}
        objectGuides={objectGuides}
      />

      <div className="absolute top-0 left-0 right-0 z-20 pt-3 px-4 flex items-start justify-between">
        <SceneBadge scene={scene} />
        <ScoreGauge composition={composition} />
      </div>

      <TipsPanel sceneType={scene.type} />

      <div className="absolute bottom-0 left-0 right-0 z-20 pb-10 flex items-center justify-center gap-8">
        <button
          onClick={switchCamera}
          className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-white active:bg-white/10 transition-colors"
          aria-label="카메라 전환"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
        </button>

        <ShutterButton
          composition={composition}
          onCapture={handleCapture}
          disabled={!isReady}
        />

        <div className="w-11 h-11" />
      </div>
    </div>
  );
}
