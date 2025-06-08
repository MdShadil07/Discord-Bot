import React, { useState, useEffect } from "react";

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/ogg",
];

const MAX_FILE_SIZE_MB = 10;

const MediaPage = ({ userRole = "Vagos", userName = "Member" }) => {
  const [mediaFiles, setMediaFiles] = useState([]);
  const [newCaption, setNewCaption] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingCaption, setEditingCaption] = useState("");
  const [commentInputs, setCommentInputs] = useState({}); // postId => comment text

  // Handle file input change
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    let validFiles = [];

    for (let file of files) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        alert(`File type not supported: ${file.name}`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        alert(`File too large (max ${MAX_FILE_SIZE_MB} MB): ${file.name}`);
        continue;
      }
      validFiles.push({
        id: Date.now() + Math.random(),
        url: URL.createObjectURL(file),
        uploadedBy: userName,
        timestamp: new Date(),
        caption: newCaption.trim(),
        fileType: file.type,
        comments: [], // {id, user, text, timestamp}
      });
    }

    if (validFiles.length) {
      setMediaFiles((prev) => [...validFiles, ...prev]);
      setNewCaption("");
      e.target.value = null; // reset input
    }
  };

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      mediaFiles.forEach((media) => {
        if (media.url.startsWith("blob:")) URL.revokeObjectURL(media.url);
      });
    };
  }, [mediaFiles]);

  // Delete post (admin only)
  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      setMediaFiles((prev) => prev.filter((m) => m.id !== id));
    }
  };

  // Start editing caption (admin only)
  const handleEdit = (id, currentCaption) => {
    setEditingId(id);
    setEditingCaption(currentCaption);
  };

  // Save edited caption
  const saveEdit = () => {
    setMediaFiles((prev) =>
      prev.map((m) => (m.id === editingId ? { ...m, caption: editingCaption } : m))
    );
    setEditingId(null);
    setEditingCaption("");
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditingCaption("");
  };

  // Comment input change
  const handleCommentChange = (postId, text) => {
    setCommentInputs((prev) => ({ ...prev, [postId]: text }));
  };

  // Add comment
  const addComment = (postId) => {
    const commentText = (commentInputs[postId] || "").trim();
    if (!commentText) return;

    const newComment = {
      id: Date.now() + Math.random(),
      user: userName,
      text: commentText,
      timestamp: new Date(),
    };

    setMediaFiles((prev) =>
      prev.map((m) =>
        m.id === postId ? { ...m, comments: [...m.comments, newComment] } : m
      )
    );

    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
  };

  // Delete comment (admin only)
  const deleteComment = (postId, commentId) => {
    if (window.confirm("Delete this comment?")) {
      setMediaFiles((prev) =>
        prev.map((m) =>
          m.id === postId
            ? { ...m, comments: m.comments.filter((c) => c.id !== commentId) }
            : m
        )
      );
    }
  };

  if (!["admin", "Vagos"].includes(userRole)) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <h3>Access Denied</h3>
        <p>You do not have permission to access media uploads.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "auto", padding: 20 }}>
      <h2>Media Upload</h2>
      <p>Upload photos or videos (max {MAX_FILE_SIZE_MB} MB each).</p>

      {/* Upload section for admin and vagos */}
      {(userRole === "admin" || userRole === "Vagos") && (
        <div style={{ marginBottom: 20 }}>
          <textarea
            rows={2}
            placeholder="Add a caption for your upload (optional)..."
            value={newCaption}
            onChange={(e) => setNewCaption(e.target.value)}
            style={{ width: "100%", padding: 8, marginBottom: 8, fontSize: 14 }}
            maxLength={200}
          />
          <input
            type="file"
            multiple
            accept={ACCEPTED_TYPES.join(",")}
            onChange={handleFileChange}
            style={{ display: "block", marginBottom: 12 }}
          />
        </div>
      )}

      {mediaFiles.length === 0 ? (
        <p>No media uploaded yet.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: 16,
          }}
        >
          {mediaFiles.map(
            ({ id, url, uploadedBy, timestamp, caption, fileType, comments }) => {
              const isVideo = fileType.startsWith("video/");
              const isEditing = editingId === id;

              return (
                <div
                  key={id}
                  style={{
                    border: "1px solid #ccc",
                    borderRadius: 8,
                    padding: 8,
                    backgroundColor: "#fafafa",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {isVideo ? (
                    <video src={url} controls style={{ width: "100%", borderRadius: 6 }} />
                  ) : (
                    <img src={url} alt={caption || "media"} style={{ width: "100%", borderRadius: 6 }} />
                  )}

                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      color: "#555",
                      flexGrow: 1,
                      whiteSpace: "pre-wrap",
                      minHeight: 40,
                    }}
                  >
                    {isEditing ? (
                      <textarea
                        rows={3}
                        value={editingCaption}
                        onChange={(e) => setEditingCaption(e.target.value)}
                        style={{ width: "100%", resize: "vertical" }}
                        maxLength={200}
                      />
                    ) : (
                      caption || <em style={{ color: "#999" }}>No caption</em>
                    )}
                  </div>

                  <div
                    style={{
                      fontSize: 10,
                      color: "#777",
                      marginTop: 4,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <strong>{uploadedBy}</strong>
                      <br />
                      {timestamp.toLocaleString()}
                    </div>

                    {/* Admin controls */}
                    {userRole === "admin" && (
                      <div style={{ display: "flex", gap: 8 }}>
                        {isEditing ? (
                          <>
                            <button onClick={saveEdit} style={{ cursor: "pointer" }}>
                              Save
                            </button>
                            <button onClick={cancelEdit} style={{ cursor: "pointer" }}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleEdit(id, caption)} style={{ cursor: "pointer" }}>
                              Edit
                            </button>
                            <button onClick={() => handleDelete(id)} style={{ cursor: "pointer", color: "red" }}>
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Comments Section */}
                  <div
                    style={{
                      marginTop: 12,
                      borderTop: "1px solid #ddd",
                      paddingTop: 8,
                      maxHeight: 200,
                      overflowY: "auto",
                    }}
                  >
                    <strong>Comments:</strong>
                    {comments.length === 0 && <p style={{ fontSize: 12, color: "#999" }}>No comments yet.</p>}

                    {comments.map(({ id: cId, user, text, timestamp: cTime }) => (
                      <div
                        key={cId}
                        style={{
                          borderBottom: "1px solid #eee",
                          padding: "4px 0",
                          fontSize: 12,
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <div>
                          <strong>{user}</strong>: {text}
                          <br />
                          <small style={{ color: "#888" }}>{new Date(cTime).toLocaleString()}</small>
                        </div>

                        {/* Admin can delete comments */}
                        {userRole === "admin" && (
                          <button
                            onClick={() => deleteComment(id, cId)}
                            style={{ cursor: "pointer", color: "red", border: "none", background: "none" }}
                            title="Delete Comment"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    ))}

                    {/* Add comment input (Vagos + Admin) */}
                    {(userRole === "Vagos" || userRole === "admin") && (
                      <div style={{ marginTop: 8 }}>
                        <input
                          type="text"
                          placeholder="Add a comment..."
                          value={commentInputs[id] || ""}
                          onChange={(e) => handleCommentChange(id, e.target.value)}
                          style={{ width: "100%", padding: 6, fontSize: 14 }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              addComment(id);
                            }
                          }}
                        />
                        <button
                          onClick={() => addComment(id)}
                          disabled={!commentInputs[id]?.trim()}
                          style={{
                            marginTop: 4,
                            cursor: commentInputs[id]?.trim() ? "pointer" : "not-allowed",
                          }}
                        >
                          Post
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  );
};

export default MediaPage;
