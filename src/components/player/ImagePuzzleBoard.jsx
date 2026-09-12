import React, { useState, useEffect, useRef, memo } from "react";

function ImagePuzzleBoardComponent({ image, pieces, onSwapPieces, onSelectTile, disabled }) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [swappingIndices, setSwappingIndices] = useState([]);
  const [isImageReady, setIsImageReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const touchStartRef = useRef(null);
  const swappingTimerRef = useRef(null);

  // Preload game image to verify source URL before rendering tiles
  useEffect(() => {
    if (!image) {
      setLoadError(true);
      setIsImageReady(false);
      return;
    }

    setLoadError(false);
    setIsImageReady(false);

    const imgObj = new Image();
    imgObj.src = image;

    imgObj.onload = () => {
      setIsImageReady(true);
      setLoadError(false);
    };

    imgObj.onerror = () => {
      console.error("Failed to load puzzle image:", image);
      setLoadError(true);
      setIsImageReady(false);
    };

    return () => {
      imgObj.onload = null;
      imgObj.onerror = null;
    };
  }, [image]);

  useEffect(() => {
    return () => {
      if (swappingTimerRef.current) clearTimeout(swappingTimerRef.current);
    };
  }, []);

  if (!pieces || pieces.length === 0) return null;

  const totalPieces = pieces.length;
  const gridSize = Math.sqrt(totalPieces);

  const isTouchDraggingRef = useRef(false);
  const hasSwappedInCurrentGestureRef = useRef(false);

  // Execute smooth 2-tile swap
  const executeSwap = (idxA, idxB) => {
    if (idxA === idxB || idxA === null || idxB === null) return;
    if (hasSwappedInCurrentGestureRef.current) return;
    hasSwappedInCurrentGestureRef.current = true;
    
    // Set 2-tile swap animation state
    setSwappingIndices([idxA, idxB]);
    if (swappingTimerRef.current) clearTimeout(swappingTimerRef.current);
    swappingTimerRef.current = setTimeout(() => {
      setSwappingIndices([]);
    }, 250);

    onSwapPieces(idxA, idxB);
    setSelectedIndex(null);
    setDraggedIndex(null);
    setDragOverIndex(null);
    if (onSelectTile) onSelectTile(null);
  };

  // Tap-to-Swap fallback handler
  const handleTileClick = (index) => {
    if (disabled || !isImageReady) return;

    // Swallow synthetic click after a touch drag swap to prevent accidental re-selections
    if (isTouchDraggingRef.current) {
      isTouchDraggingRef.current = false;
      return;
    }

    if (selectedIndex === null) {
      setSelectedIndex(index);
      if (onSelectTile) onSelectTile(index);
    } else if (selectedIndex === index) {
      setSelectedIndex(null);
      if (onSelectTile) onSelectTile(null);
    } else {
      executeSwap(selectedIndex, index);
    }
  };

  // HTML5 Drag & Drop handlers
  const handleDragStart = (e, index) => {
    if (disabled || !isImageReady) return;
    e.dataTransfer.setData("text/plain", index.toString());
    e.dataTransfer.effectAllowed = "move";
    setDraggedIndex(index);
    setSelectedIndex(index);
    if (onSelectTile) onSelectTile(index);
  };

  const handleDragOver = (e, index) => {
    if (disabled || !isImageReady) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (index) => {
    if (dragOverIndex === index) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e, targetIndex) => {
    if (disabled || !isImageReady) return;
    e.preventDefault();
    const sourceStr = e.dataTransfer.getData("text/plain");
    const sourceIndex = parseInt(sourceStr, 10);

    if (!isNaN(sourceIndex) && sourceIndex !== targetIndex) {
      executeSwap(sourceIndex, targetIndex);
    } else {
      setDraggedIndex(null);
      setDragOverIndex(null);
    }
  };

  // Mobile Touch Drag Swap handlers with scroll prevention & real-time target tracking
  const handleTouchStart = (e, index) => {
    if (disabled || !isImageReady) return;
    const touch = e.touches[0];
    touchStartRef.current = {
      index,
      startX: touch.clientX,
      startY: touch.clientY
    };
    isTouchDraggingRef.current = false;
    hasSwappedInCurrentGestureRef.current = false;
    setSelectedIndex(index);
    if (onSelectTile) onSelectTile(index);
  };

  const handleTouchMove = (e) => {
    if (disabled || !isImageReady || !touchStartRef.current || hasSwappedInCurrentGestureRef.current) return;
    if (e.cancelable) {
      e.preventDefault();
    }
    const touch = e.touches[0];
    const dist = Math.hypot(
      touch.clientX - touchStartRef.current.startX,
      touch.clientY - touchStartRef.current.startY
    );

    if (dist > 6) {
      isTouchDraggingRef.current = true;
    }

    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
    if (elem) {
      const tileTarget = elem.closest("[data-tile-index]");
      if (tileTarget) {
        const targetIdx = parseInt(tileTarget.getAttribute("data-tile-index"), 10);
        if (!isNaN(targetIdx) && targetIdx !== touchStartRef.current.index) {
          if (dragOverIndex !== targetIdx) {
            setDragOverIndex(targetIdx);
          }
          return;
        }
      }
    }
    if (dragOverIndex !== null) setDragOverIndex(null);
  };

  const handleTouchEnd = (e) => {
    if (disabled || !isImageReady || !touchStartRef.current) {
      hasSwappedInCurrentGestureRef.current = false;
      return;
    }
    const touch = e.changedTouches[0];
    const elem = document.elementFromPoint(touch.clientX, touch.clientY);

    if (elem && !hasSwappedInCurrentGestureRef.current) {
      const tileTarget = elem.closest("[data-tile-index]");
      if (tileTarget) {
        const targetIdx = parseInt(tileTarget.getAttribute("data-tile-index"), 10);
        if (!isNaN(targetIdx) && targetIdx !== touchStartRef.current.index) {
          executeSwap(touchStartRef.current.index, targetIdx);
          isTouchDraggingRef.current = true;
          touchStartRef.current = null;
          setDragOverIndex(null);
          hasSwappedInCurrentGestureRef.current = false;
          return;
        }
      }
    }
    touchStartRef.current = null;
    setDragOverIndex(null);
    hasSwappedInCurrentGestureRef.current = false;
  };

  if (loadError) {
    return (
      <div className="puzzle-board-container center-wrapper">
        <div className="puzzle-error-card glass-card">
          <span className="error-icon">⚠️</span>
          <h3>Unable to load game image</h3>
          <p>Please reconnect or contact the host operator.</p>
        </div>
      </div>
    );
  }

  if (!isImageReady) {
    return (
      <div className="puzzle-board-container center-wrapper">
        <div className="puzzle-loading-card glass-card">
          <div className="btn-spinner-sm" />
          <span>LOADING PUZZLE...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="puzzle-board-container">
      <div
        className="image-puzzle-grid"
        onTouchMove={handleTouchMove}
        style={{
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gridTemplateRows: `repeat(${gridSize}, 1fr)`
        }}
      >
        {pieces.map((piece, index) => {
          const isSelected = selectedIndex === index;
          const isDragged = draggedIndex === index;
          const isDragOver = dragOverIndex === index;
          const isSwapping = swappingIndices.includes(index);

          return (
            <div
              key={`${piece.id}-${index}`}
              data-tile-index={index}
              className={`puzzle-tile ${isSelected ? "selected-tile" : ""} ${isDragged ? "dragged-tile" : ""} ${isDragOver ? "drag-over-tile" : ""} ${isSwapping ? "tile-swapping" : ""}`}
              draggable={!disabled && isImageReady}
              onClick={() => handleTileClick(index)}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={() => handleDragLeave(index)}
              onDrop={(e) => handleDrop(e, index)}
              onTouchStart={(e) => handleTouchStart(e, index)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                backgroundImage: `url("${image}")`,
                backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
                backgroundPosition: `${piece.bgX}% ${piece.bgY}%`,
                backgroundRepeat: "no-repeat",
                cursor: disabled ? "default" : "grab",
                userSelect: "none",
                WebkitUserSelect: "none",
                touchAction: "none"
              }}
              aria-label={`Puzzle tile ${index + 1}`}
            >
              {isSelected && (
                <div className="tile-selected-overlay">
                  <span className="tile-selected-badge">✓ SWAP TARGET</span>
                </div>
              )}
              {isDragOver && (
                <div className="tile-selected-overlay" style={{ background: "rgba(16, 185, 129, 0.35)" }}>
                  <span className="tile-selected-badge" style={{ background: "#10b981", color: "#fff" }}>🎯 DROP TO SWAP</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// React.memo to prevent re-renders when timer updates every 100ms in parent PlayerApp
export const ImagePuzzleBoard = memo(ImagePuzzleBoardComponent, (prevProps, nextProps) => {
  return (
    prevProps.image === nextProps.image &&
    prevProps.pieces === nextProps.pieces &&
    prevProps.disabled === nextProps.disabled
  );
});
