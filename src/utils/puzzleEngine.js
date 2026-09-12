/**
 * Puzzle Engine for Memory Rush
 * Slices images into NxN grids, handles seeded unique shuffling per player,
 * and validates solved arrangements.
 */

// Mulberry32 deterministic seeded random number generator
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate string numeric hash for seed creation
 */
export function hashSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash) || 123456;
}

/**
 * Shuffle array deterministically using seed
 */
export function seededShuffle(array, seedVal) {
  const arr = [...array];
  const rng = mulberry32(seedVal);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  
  // Ensure the shuffle isn't accidentally already solved
  if (isPuzzleSolved(arr) && arr.length > 1) {
    [arr[0], arr[1]] = [arr[1], arr[0]];
  }
  return arr;
}

/**
 * Generate sliced puzzle pieces metadata for N pieces (9, 16, 25, 36)
 */
export function createPuzzlePieces(totalPieces, seedStr) {
  const gridSize = Math.sqrt(totalPieces);
  if (!Number.isInteger(gridSize)) {
    throw new Error(`Total pieces ${totalPieces} must be a perfect square (9, 16, 25, 36)`);
  }

  const pieces = [];
  for (let i = 0; i < totalPieces; i++) {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;
    
    // Background position percentages
    const bgX = gridSize > 1 ? (col / (gridSize - 1)) * 100 : 0;
    const bgY = gridSize > 1 ? (row / (gridSize - 1)) * 100 : 0;

    pieces.push({
      id: i,
      correctId: i,
      row,
      col,
      bgX,
      bgY
    });
  }

  const numericSeed = hashSeed(seedStr || Math.random().toString());
  return seededShuffle(pieces, numericSeed);
}

/**
 * Check if the puzzle is currently in solved order
 */
export function isPuzzleSolved(pieces) {
  if (!pieces || pieces.length === 0) return false;
  return pieces.every((piece, index) => piece.correctId === index);
}

/**
 * Calculate player points based on rank
 */
export function calculatePoints(rank) {
  if (rank === 1) return 100;
  if (rank === 2) return 80;
  if (rank === 3) return 65;
  if (rank === 4) return 50;
  if (rank === 5) return 40;
  if (rank >= 6 && rank <= 10) return 25;
  if (rank > 10) return 10;
  return 0;
}

/**
 * Difficulty preset metadata mapping
 */
export const DIFFICULTY_PRESETS = {
  EASY: { name: "EASY", pieces: 9, grid: 3, memorySec: 20, puzzleSec: 45 },
  MEDIUM: { name: "MEDIUM", pieces: 16, grid: 4, memorySec: 15, puzzleSec: 40 },
  HARD: { name: "HARD", pieces: 25, grid: 5, memorySec: 10, puzzleSec: 35 },
  EXTREME: { name: "EXTREME", pieces: 36, grid: 6, memorySec: 8, puzzleSec: 30 }
};

/**
 * Resize and compress uploaded image files in browser to guarantee fast Realtime broadcast
 */
export function compressImageFile(file, maxWidth = 800, maxHeight = 800, quality = 0.85) {
  return new Promise((resolve) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(e.target.result || "");
      img.src = e.target.result;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}
