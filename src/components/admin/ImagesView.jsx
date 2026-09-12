import React, { useState } from "react";
import { CATEGORIES } from "../../config/supabase";

export function ImagesView({
  images,
  activeImage,
  onSelectImage,
  onUploadImage,
  onDeleteImage
}) {
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedPieces, setSelectedPieces] = useState(16);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewModalImage, setPreviewModalImage] = useState(null);
  const [deleteConfirmImage, setDeleteConfirmImage] = useState(null);

  // Upload Form state
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Generative AI");
  const [uploadDescription, setUploadDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const filteredImages = images.filter(
    (img) => selectedCategory === "ALL" || img.category === selectedCategory
  );

  const handleFileSelect = (file) => {
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmitUpload = async (e) => {
    e.preventDefault();
    if (!uploadName.trim() || (!selectedFile && !previewUrl)) return;

    setIsUploading(true);
    try {
      await onUploadImage({
        name: uploadName.trim(),
        category: uploadCategory,
        description: uploadDescription.trim(),
        file: selectedFile,
        fallbackDataUrl: previewUrl
      });
      setShowUploadModal(false);
      setUploadName("");
      setUploadDescription("");
      setSelectedFile(null);
      setPreviewUrl("");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="images-view">
      <div className="data-panel glass-card">
        <div className="panel-header">
          <div className="panel-title-wrap">
            <h3>AI IMAGE LIBRARY ({images.length} Assets)</h3>
            <span className="panel-subtitle">
              Manage high-res AI themed images for TCS Expo rounds
            </span>
          </div>

          <button className="btn btn-primary pulse-glow" onClick={() => setShowUploadModal(true)}>
            + UPLOAD GAME IMAGE
          </button>
        </div>

        {/* GRID SIZE SELECTOR BAR */}
        <div className="grid-size-selector-bar" style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", padding: "12px 16px", background: "rgba(15, 23, 42, 0.7)", borderRadius: "12px", border: "1px solid rgba(124, 92, 255, 0.3)", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#a78bfa", letterSpacing: "1px", whiteSpace: "nowrap" }}>
            🧩 TARGET GRID SIZE:
          </span>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", flex: 1 }}>
            {[9, 16, 25, 36, 49, 64].map((num) => {
              const gSize = Math.round(Math.sqrt(num));
              const isActive = selectedPieces === num;
              return (
                <button
                  key={num}
                  type="button"
                  className={`round-selector-btn ${isActive ? "active" : ""}`}
                  onClick={() => setSelectedPieces(num)}
                  style={{ padding: "6px 12px", fontSize: "0.85rem", fontWeight: 700 }}
                >
                  {num} Pieces ({gSize}×{gSize})
                </button>
              );
            })}
          </div>
        </div>

        {/* CATEGORY FILTER TABS */}
        <div className="category-tabs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`category-tab ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* IMAGE CARDS GRID */}
        <div className="image-grid">
          {filteredImages.length === 0 ? (
            <div className="empty-grid-state">
              <p>No images found in category "{selectedCategory}".</p>
            </div>
          ) : (
            filteredImages.map((img) => {
              const isSelected = activeImage?.id === img.id || activeImage?.url === img.public_url || activeImage?.public_url === img.public_url;
              return (
                <div
                  key={img.id}
                  className={`image-card glass-card ${isSelected ? "selected-card" : ""}`}
                >
                  <div className="image-preview-wrapper" onClick={() => setPreviewModalImage(img)}>
                    <img src={img.public_url} alt={img.name} />
                    <span className="category-badge">{img.category}</span>
                    {isSelected && <span className="active-marker">✓ SELECTED FOR ROUND</span>}
                  </div>

                  <div className="card-body">
                    <h4 className="image-title">{img.name}</h4>
                    <p className="image-desc">{img.description || "AI Expo featured asset"}</p>
                    <div className="image-meta">
                      <span>Used {img.times_used || 0} times</span>
                      <span>{img.created_at ? new Date(img.created_at).toLocaleDateString() : "Permanent"}</span>
                    </div>
                  </div>

                  <div className="card-actions">
                    <button
                      className={`btn btn-sm ${isSelected ? "btn-success" : "btn-primary"}`}
                      onClick={() => onSelectImage(img, selectedPieces)}
                    >
                      {isSelected ? "Active Image" : `[ USE IN ROUND (${selectedPieces}P) ]`}
                    </button>

                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setPreviewModalImage(img)}
                    >
                      Preview
                    </button>

                    <button
                      className="btn btn-danger-outline btn-sm"
                      onClick={() => setDeleteConfirmImage(img)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card modal-lg">
            <div className="modal-header">
              <h3>UPLOAD GAME IMAGE</h3>
              <button className="drawer-close-btn" onClick={() => setShowUploadModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitUpload}>
              <div
                className={`dropzone ${isDragOver ? "drag-over" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById("fileInput").click()}
              >
                <input
                  type="file"
                  id="fileInput"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  style={{ display: "none" }}
                  onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                />

                {previewUrl ? (
                  <div className="dropzone-preview">
                    <img src={previewUrl} alt="Selected preview" />
                    <span>Click or drop another file to change</span>
                  </div>
                ) : (
                  <div className="dropzone-placeholder">
                    <div className="upload-icon">📁</div>
                    <strong>Drop AI image here or browse</strong>
                    <small>Supported formats: PNG, JPG, JPEG, WEBP</small>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Image Name</label>
                <input
                  type="text"
                  required
                  placeholder='e.g., "Future of Generative AI"'
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                >
                  {CATEGORIES.filter((c) => c !== "ALL").map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  rows="2"
                  placeholder='e.g., "AI-powered future workplace at TCS Expo booth"'
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowUploadModal(false)}
                >
                  [ CANCEL ]
                </button>
                <button type="submit" className="btn btn-primary" disabled={isUploading}>
                  {isUploading ? "Uploading to Storage..." : "[ UPLOAD IMAGE ]"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL PREVIEW MODAL */}
      {previewModalImage && (
        <div className="modal-overlay" onClick={() => setPreviewModalImage(null)}>
          <div className="modal-content glass-card preview-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{previewModalImage.name}</h3>
              <button className="drawer-close-btn" onClick={() => setPreviewModalImage(null)}>
                ✕
              </button>
            </div>
            <div className="preview-modal-img-holder">
              <img
                src={previewModalImage.public_url}
                alt={previewModalImage.name}
                className="preview-modal-img"
              />
            </div>
            <div className="preview-info">
              <p>{previewModalImage.description || "AI Expo featured asset"}</p>
              <div className="modal-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setPreviewModalImage(null)}
                >
                  Close
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    onSelectImage(previewModalImage, selectedPieces);
                    setPreviewModalImage(null);
                  }}
                >
                  Use in Next Round ({selectedPieces}P)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteConfirmImage && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <h3>Delete this image?</h3>
            <p>
              Are you sure you want to remove <strong>{deleteConfirmImage.name}</strong>?
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirmImage(null)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  onDeleteImage(deleteConfirmImage.id);
                  setDeleteConfirmImage(null);
                }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
