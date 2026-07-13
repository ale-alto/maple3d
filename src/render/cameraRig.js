import {
  CAMERA_Z,
  CAMERA_HEIGHT,
  CAMERA_LERP,
  CAMERA_Y_FACTOR,
} from '../core/constants.js';

// Side-view follow camera with soft lerp, clamped to map bounds so the void
// past the map edge never shows.

export function createCameraRig(camera, map) {
  function clampX(x, aspect) {
    const halfH = Math.tan((camera.fov * Math.PI) / 360) * CAMERA_Z;
    const halfW = halfH * aspect;
    const lo = map.minX + halfW;
    const hi = map.maxX - halfW;
    if (lo >= hi) return (map.minX + map.maxX) / 2; // map narrower than view
    return Math.max(lo, Math.min(hi, x));
  }

  return {
    update(player, dt) {
      const targetX = clampX(player.x, camera.aspect);
      const targetY = CAMERA_HEIGHT + player.y * CAMERA_Y_FACTOR;
      const t = Math.min(1, CAMERA_LERP * dt);
      camera.position.x += (targetX - camera.position.x) * t;
      camera.position.y += (targetY - camera.position.y) * t;
      camera.lookAt(camera.position.x, camera.position.y - CAMERA_HEIGHT + 1, 0);
    },

    snap(player) {
      camera.position.x = clampX(player.x, camera.aspect);
      camera.position.y = CAMERA_HEIGHT + player.y * CAMERA_Y_FACTOR;
      camera.lookAt(camera.position.x, camera.position.y - CAMERA_HEIGHT + 1, 0);
    },
  };
}
