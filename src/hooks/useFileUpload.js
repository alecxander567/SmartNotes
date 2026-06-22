import { useState, useRef, useCallback } from "react";

const ENDPOINT_SINGLE = "http://localhost:8000/upload/";
const ENDPOINT_MULTIPLE = "http://localhost:8000/upload/multiple/";
const ALLOWED = [".pdf", ".doc", ".docx", ".ppt", ".pptx"];
const MAX_SIZE = 10 * 1024 * 1024;

export function fileExt(name) {
  return name.slice(name.lastIndexOf(".")).toLowerCase();
}

export function fmtSize(b) {
  return b < 1024 * 1024 ?
      (b / 1024).toFixed(1) + " KB"
    : (b / 1024 / 1024).toFixed(1) + " MB";
}

export function useFileUpload() {
  const [files, setFiles] = useState([]);
  const [notes, setNotes] = useState([]);
  const inputRef = useRef(null);

  const updateFile = (name, patch) =>
    setFiles((prev) =>
      prev.map((f) => (f.file.name === name ? { ...f, ...patch } : f)),
    );

  const addFiles = useCallback((newFiles) => {
    const incoming = [...newFiles].map((f) => {
      const e = fileExt(f.name);
      let error = null;
      if (!ALLOWED.includes(e)) error = "File type not allowed";
      else if (f.size > MAX_SIZE) error = "File exceeds 10 MB limit";
      return {
        file: f,
        status: error ? "error" : "pending",
        message: error || "",
      };
    });

    setFiles((prev) => {
      const merged = [...prev];
      for (const item of incoming) {
        const dup = merged.find(
          (x) =>
            x.file.name === item.file.name && x.file.size === item.file.size,
        );
        if (!dup) merged.push(item);
      }
      return merged;
    });
  }, []);

  const removeFile = (i) =>
    setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const clearAll = () => {
    setFiles([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const uploadSingle = async (item) => {
    updateFile(item.file.name, { status: "loading" });
    try {
      const fd = new FormData();
      fd.append("file", item.file);
      const res = await fetch(ENDPOINT_SINGLE, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        updateFile(item.file.name, {
          status: "error",
          message: data.detail || "Upload failed",
        });
      } else {
        updateFile(item.file.name, {
          status: "done",
          message: `Saved · ${fmtSize(data.file_size)}`,
        });
        setNotes((prev) => [
          {
            id: data.file_id,
            filename: data.filename,
            file_path: data.file_path,
            file_size: data.file_size,
            summary: data.summary,
            text_preview: data.text_preview,
            word_count: data.word_count,
            summary_method: data.summary_method,
            uploaded_at: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    } catch {
      updateFile(item.file.name, {
        status: "error",
        message: "Network error — is your server running?",
      });
    }
  };

  const uploadMultiple = async (pending) => {
    pending.forEach((f) => updateFile(f.file.name, { status: "loading" }));
    try {
      const fd = new FormData();
      pending.forEach((f) => fd.append("files", f.file));
      const res = await fetch(ENDPOINT_MULTIPLE, { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        pending.forEach((f) =>
          updateFile(f.file.name, {
            status: "error",
            message: "Batch upload failed",
          }),
        );
      } else {
        const uploadedMap = Object.fromEntries(
          (data.uploaded || []).map((u) => [u.filename, u]),
        );
        const errMap = Object.fromEntries(
          (data.errors || []).map((e) => [e.filename, e]),
        );
        const newNotes = [];
        pending.forEach((item) => {
          if (uploadedMap[item.file.name]) {
            const u = uploadedMap[item.file.name];
            updateFile(item.file.name, {
              status: "done",
              message: `Saved · ${fmtSize(u.file_size)}`,
            });
            newNotes.push({
              id: u.file_id,
              filename: u.filename,
              file_path: u.file_path,
              file_size: u.file_size,
              summary: u.summary,
              text_preview: u.text_preview,
              word_count: u.word_count,
              summary_method: u.summary_method,
              uploaded_at: new Date().toISOString(),
            });
          } else if (errMap[item.file.name]) {
            updateFile(item.file.name, {
              status: "error",
              message: errMap[item.file.name].error,
            });
          } else {
            updateFile(item.file.name, {
              status: "error",
              message: "Unknown response",
            });
          }
        });
        if (newNotes.length) setNotes((prev) => [...newNotes, ...prev]);
      }
    } catch {
      pending.forEach((f) =>
        updateFile(f.file.name, {
          status: "error",
          message: "Network error — is your server running?",
        }),
      );
    }
  };

  const uploadAll = async () => {
    const pending = files.filter((f) => f.status === "pending");
    if (!pending.length) return;
    if (pending.length === 1) {
      await uploadSingle(pending[0]);
    } else {
      await uploadMultiple(pending);
    }
  };

  const dismissNote = (id) =>
    setNotes((prev) => prev.filter((n) => n.id !== id));

  const allSettled =
    files.length > 0 &&
    files.every((f) => f.status === "done" || f.status === "error");
  const anyLoading = files.some((f) => f.status === "loading");
  const doneCount = files.filter((f) => f.status === "done").length;
  const errCount = files.filter((f) => f.status === "error").length;

  return {
    files,
    notes,
    inputRef,
    addFiles,
    removeFile,
    clearAll,
    uploadAll,
    dismissNote,
    allSettled,
    anyLoading,
    doneCount,
    errCount,
  };
}
