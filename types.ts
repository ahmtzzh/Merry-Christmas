export interface HandGesture {
  isPinching: boolean;
  isFist: boolean;
  isOpen: boolean;
  position: { x: number; y: number; z: number };
  tilt: number;
}

export interface TreeState {
  explosionFactor: number; // 0 (tree) to 1 (exploded)
  glowIntensity: number;   // 0 to 1
  rotationY: number;
  zoomLevel: number;
}