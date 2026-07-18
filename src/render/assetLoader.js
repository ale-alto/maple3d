// GLB loading for animated characters (M08). One fetch per file (cached
// promise); every view gets its own SkeletonUtils.clone — a regular
// .clone() breaks SkinnedMesh bindings and T-poses the model.

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const loader = new GLTFLoader();
const cache = new Map();

// ?nomodels=1 keeps primitives (tests + instant-boot fallback).
export const modelsEnabled = !new URLSearchParams(window.location.search).has('nomodels');

function load(path) {
  if (!cache.has(path)) {
    cache.set(
      path,
      new Promise((resolve, reject) => {
        loader.load(path, resolve, undefined, (err) =>
          reject(new Error(`model load failed: ${path} — ${err?.message ?? err}`)),
        );
      }),
    );
  }
  return cache.get(path);
}

// Resolves {model, clips} or null (disabled / missing file → caller keeps
// its primitive). Never throws: the fallback IS the error handling.
export async function loadCharacter(path) {
  if (!modelsEnabled) return null;
  try {
    const gltf = await load(path);
    return { model: SkeletonUtils.clone(gltf.scene), clips: gltf.animations };
  } catch (e) {
    console.warn(e.message ?? e);
    return null;
  }
}
