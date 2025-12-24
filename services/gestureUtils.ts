import type { NormalizedLandmark, NormalizedLandmarkList } from '@mediapipe/hands';

// Helper to calculate Euclidean distance between two 3D points
const getDistance = (p1: NormalizedLandmark, p2: NormalizedLandmark): number => {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) + 
    Math.pow(p1.y - p2.y, 2) + 
    Math.pow(p1.z - p2.z, 2)
  );
};

export const analyzeHandGesture = (landmarks: NormalizedLandmarkList) => {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];
  const wrist = landmarks[0];

  // 1. PINCH DETECTION (Thumb to Index)
  const pinchDist = getDistance(thumbTip, indexTip);
  const isPinching = pinchDist < 0.05; // Threshold for pinch

  // 2. FIST VS OPEN PALM DETECTION
  // Measure distance of fingertips to wrist
  const tips = [indexTip, middleTip, ringTip, pinkyTip];
  const avgDistToWrist = tips.reduce((acc, tip) => acc + getDistance(tip, wrist), 0) / 4;
  
  // These thresholds might need tuning based on camera FOV, but roughly:
  // Closed fist implies tips are closer to wrist/palm center.
  // Open palm implies tips are far.
  const isFist = avgDistToWrist < 0.25; 
  const isOpen = avgDistToWrist > 0.35;

  // 3. POSITION & ZOOM
  // Use wrist position for rotation center
  // X is inverted in MediaPipe relative to screen coordinates usually
  const position = {
    x: 1 - wrist.x, 
    y: 1 - wrist.y,
    z: wrist.z // Approximate depth
  };

  return {
    isPinching,
    isFist,
    isOpen,
    position
  };
};