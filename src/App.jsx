import { useState } from "react";
import { useFileUpload, fmtSize, fileExt } from "./hooks/useFileUpload";

const THEME = {
  bg: "#000000",
  surface: "#050505",
  surfaceHover: "#0d0d0d",
  border: "#1a1a1a",
  borderStrong: "#2a2a2a",
  jade: "#00C853",
  jadeDark: "#007a33",
  jadeMid: "#33d46a",
  jadeLight: "#b3f0cc",
  amethyst: "#00a040",
  amethystDark: "#005c24",
  amethystLight: "#66e699",
  textPrimary: "#ffffff",
  textSecondary: "#aaaaaa",
  textMuted: "#555555",
};

const BADGE_STYLE = {
  ".pdf": "background:#2D1A0E;color:#F4A261;border:1px solid #5C3A1E",
  ".doc": "background:#0E1A2D;color:#74B3F4;border:1px solid #1E3A5C",
  ".docx": "background:#0E1A2D;color:#74B3F4;border:1px solid #1E3A5C",
  ".ppt": "background:#2D1A00;color:#F4C261;border:1px solid #5C3A00",
  ".pptx": "background:#2D1A00;color:#F4C261;border:1px solid #5C3A00",
};

const STATUS_DOT = {
  pending: THEME.textMuted,
  loading: "#F4C261",
  done: THEME.jade,
  error: "#E05252",
};

const NAV_ITEMS = ["Upload", "How to Use", "About"];

// ── Parser ──────────────────────────────────────────────────────────────────

function parseNotesResponse(raw) {
  if (!raw) return { keywords: [], summary: "" };

  const kwMatch = raw.match(/KEYWORDS:\s*([\s\S]*?)(?=\nSUMMARY:|$)/i);
  const kwText = kwMatch ? kwMatch[1].trim() : "";
  const keywords = kwText
    .split("\n")
    .map((line) => {
      const idx = line.indexOf("->");
      if (idx === -1) return null;
      const keyword = line
        .slice(0, idx)
        .replace(/^[•\-*]\s*/, "")
        .trim();
      const description = line.slice(idx + 2).trim();
      if (!keyword || !description) return null;
      return { keyword, description };
    })
    .filter(Boolean);

  const sumMatch = raw.match(/SUMMARY:\s*([\s\S]*?)$/i);
  const summary = sumMatch ? sumMatch[1].trim() : "";

  return { keywords, summary };
}

function notesToPlainText(note, parsed) {
  const { keywords, summary } = parsed;
  const lines = [`Notes: ${note.filename}`, ""];
  if (keywords.length) {
    lines.push("KEYWORDS");
    keywords.forEach(({ keyword, description }) =>
      lines.push(`${keyword} → ${description}`),
    );
    lines.push("");
  }
  if (summary) lines.push("SUMMARY", summary);
  return lines.join("\n");
}

// ── Note display components ──────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <p
      style={{
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: THEME.amethyst,
        margin: "0 0 8px",
      }}>
      {children}
    </p>
  );
}

function KeywordRow({ keyword, description }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "8px 0",
        borderBottom: `1px solid ${THEME.border}`,
        alignItems: "baseline",
      }}>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: THEME.jadeMid,
          flexShrink: 0,
          minWidth: 110,
          maxWidth: 150,
          wordBreak: "break-word",
        }}>
        {keyword}
      </span>
      <span
        style={{
          color: THEME.jadeDark,
          fontSize: 12,
          flexShrink: 0,
          userSelect: "none",
        }}>
        →
      </span>
      <span
        style={{
          fontSize: 13,
          color: THEME.textSecondary,
          lineHeight: 1.5,
        }}>
        {description}
      </span>
    </div>
  );
}

function NotesSections({ notes, expanded }) {
  const { keywords, summary } = notes;
  const visible = expanded ? keywords : keywords.slice(0, 6);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {keywords.length > 0 && (
        <div>
          <SectionLabel>Keywords</SectionLabel>
          <div>
            {visible.map((item, i) => (
              <KeywordRow
                key={i}
                keyword={item.keyword}
                description={item.description}
              />
            ))}
          </div>
        </div>
      )}

      {summary && (
        <div
          style={{
            paddingTop: 14,
            borderTop: `1px solid ${THEME.border}`,
          }}>
          <SectionLabel>Summary</SectionLabel>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: THEME.textSecondary,
              lineHeight: 1.65,
            }}>
            {summary}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Buttons ──────────────────────────────────────────────────────────────────

function IconBtn({ onClick, title, children }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 10px",
        fontSize: 12,
        fontWeight: 500,
        borderRadius: 8,
        cursor: "pointer",
        transition: "all 0.15s",
        background: hover ? THEME.jadeDark : "transparent",
        color: hover ? THEME.jadeLight : THEME.textSecondary,
        border: `1px solid ${hover ? THEME.jade : THEME.border}`,
      }}>
      {children}
    </button>
  );
}

function CopyButton({ note, parsed }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(notesToPlainText(note, parsed)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <IconBtn onClick={handle} title="Copy notes">
      {copied ?
        <>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>{" "}
          Copied
        </>
      : <>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>{" "}
          Copy
        </>
      }
    </IconBtn>
  );
}

function DownloadButton({ note, parsed }) {
  const handle = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    const margin = 56;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = pageWidth - margin * 2;
    let y = margin;

    const checkPage = (needed = 20) => {
      if (y + needed > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const addParagraph = (
      text,
      fontSize,
      color,
      bold = false,
      lineGap = 1.5,
    ) => {
      doc.setFontSize(fontSize);
      doc.setTextColor(...color);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line) => {
        checkPage(fontSize * lineGap);
        doc.text(line, margin, y);
        y += fontSize * lineGap;
      });
    };

    // White page
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // Top accent bar
    doc.setFillColor(0, 122, 51);
    doc.rect(0, 0, pageWidth, 8, "F");

    y = 44;

    // App name
    doc.setFontSize(9);
    doc.setTextColor(0, 122, 51);
    doc.setFont("helvetica", "bold");
    doc.text("SMARTNOTES", margin, y);
    y += 20;

    // Filename title
    addParagraph(note.filename, 20, [20, 20, 20], true, 1.3);
    y += 4;

    if (note.word_count) {
      addParagraph(
        `${note.word_count.toLocaleString()} words`,
        9,
        [150, 150, 150],
        false,
        1.6,
      );
    }
    y += 6;

    // Divider
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + maxWidth, y);
    y += 16;

    const { keywords, summary } = parsed;

    // KEYWORDS section
    if (keywords.length) {
      checkPage(40);
      doc.setFontSize(11);
      doc.setTextColor(0, 160, 70);
      doc.setFont("helvetica", "bold");
      doc.text("KEYWORDS", margin, y);
      y += 4;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.4);
      doc.line(margin, y, margin + maxWidth, y);
      y += 12;

      const colBreak = 160;
      const arrowW = 16;

      keywords.forEach(({ keyword, description }) => {
        checkPage(22);
        // keyword in green bold
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(0, 160, 70);
        const kwLines = doc.splitTextToSize(keyword, colBreak);
        kwLines.forEach((line, i) => {
          if (i > 0) checkPage(14);
          doc.text(line, margin, y);
          if (i < kwLines.length - 1) y += 13;
        });
        // arrow
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text("→", margin + colBreak + 4, y);
        // description
        doc.setTextColor(50, 50, 50);
        const descLines = doc.splitTextToSize(
          description,
          maxWidth - colBreak - arrowW,
        );
        descLines.forEach((line, i) => {
          if (i > 0) {
            checkPage(14);
            doc.text(line, margin + colBreak + arrowW + 8, y);
            y += 13;
          } else doc.text(line, margin + colBreak + arrowW + 8, y);
        });
        y += 16;
      });

      y += 6;
    }

    // SUMMARY section
    if (summary) {
      checkPage(40);
      doc.setFontSize(11);
      doc.setTextColor(0, 160, 70);
      doc.setFont("helvetica", "bold");
      doc.text("SUMMARY", margin, y);
      y += 4;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.4);
      doc.line(margin, y, margin + maxWidth, y);
      y += 12;
      addParagraph(summary, 10, [60, 60, 60], false, 1.6);
    }

    // Footer
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(180, 180, 180);
      doc.setFont("helvetica", "normal");
      doc.text(
        `SmartNotes  ·  ${note.filename}  ·  Page ${i} of ${totalPages}`,
        margin,
        pageHeight - 24,
      );
    }

    doc.save(`${note.filename.replace(/\.[^.]+$/, "")}-notes.pdf`);
  };

  return (
    <IconBtn onClick={handle} title="Download PDF">
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Download PDF
    </IconBtn>
  );
}

// ── NoteCard ─────────────────────────────────────────────────────────────────

function NoteCard({ note, onDismiss }) {
  const [expanded, setExpanded] = useState(false);
  const ext = fileExt(note.filename);
  const parsed = parseNotesResponse(note.summary);
  const { keywords } = parsed;
  const hasMore = keywords.length > 6;

  const badgeStyles =
    BADGE_STYLE[ext] ?
      Object.fromEntries(
        BADGE_STYLE[ext]
          .split(";")
          .map((s) => {
            const [k, v] = s.split(":");
            return [
              k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase()),
              v?.trim(),
            ];
          })
          .filter(([k]) => k),
      )
    : { background: THEME.border, color: THEME.textSecondary };

  return (
    <div
      style={{
        background: THEME.surface,
        border: `1px solid ${THEME.border}`,
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: `0 0 0 1px ${THEME.border}`,
      }}>
      {/* Accent bar */}
      <div
        style={{
          height: 3,
          background: `linear-gradient(90deg, ${THEME.jadeDark}, ${THEME.amethystDark})`,
        }}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          borderBottom: `1px solid ${THEME.border}`,
        }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: "2px 7px",
            borderRadius: 6,
            ...badgeStyles,
          }}>
          {ext.replace(".", "").toUpperCase()}
        </span>
        <span
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: 500,
            color: THEME.textPrimary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
          {note.filename}
        </span>
        <span style={{ fontSize: 11, color: THEME.textMuted, flexShrink: 0 }}>
          {note.word_count?.toLocaleString()} words
        </span>
        {note.summary_method === "gemini" && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: "2px 7px",
              borderRadius: 6,
              background: "#0a2a0a",
              color: THEME.jadeMid,
              border: `1px solid ${THEME.jadeDark}`,
              flexShrink: 0,
            }}>
            AI
          </span>
        )}
        <button
          onClick={onDismiss}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: THEME.textMuted,
            fontSize: 18,
            lineHeight: 1,
            padding: "0 0 0 4px",
            flexShrink: 0,
          }}>
          ×
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: "16px 16px 12px" }}>
        {!note.summary ?
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: THEME.textMuted,
              fontStyle: "italic",
            }}>
            No notes available.
          </p>
        : <>
            <NotesSections notes={parsed} expanded={expanded} />
            {hasMore && (
              <button
                onClick={() => setExpanded(!expanded)}
                style={{
                  marginTop: 12,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  color: THEME.amethyst,
                  padding: 0,
                }}>
                {expanded ?
                  "↑ Show less"
                : `↓ Show ${keywords.length - 6} more`}
              </button>
            )}
          </>
        }
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          borderTop: `1px solid ${THEME.border}`,
          background: "#020202",
        }}>
        <span
          style={{ fontSize: 11, color: THEME.textMuted, marginRight: "auto" }}>
          {fmtSize(note.file_size)}
        </span>
        <CopyButton note={note} parsed={parsed} />
        <DownloadButton note={note} parsed={parsed} />
      </div>
    </div>
  );
}

// ── Pages ─────────────────────────────────────────────────────────────────────

function UploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const {
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
  } = useFileUpload();

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <h2
          style={{
            margin: "0 0 4px",
            fontSize: 22,
            fontWeight: 500,
            color: THEME.textPrimary,
          }}>
          Upload files
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: THEME.textMuted }}>
          PDF, DOC, DOCX, PPT, PPTX · max 10 MB each
        </p>
      </div>

      {/* Info banner */}
      <div
        style={{
          display: "flex",
          gap: 12,
          padding: "14px 16px",
          borderRadius: 12,
          background: "#050f05",
          border: `1px solid #1a3a1a`,
          borderLeft: `3px solid ${THEME.jade}`,
        }}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={THEME.jade}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0, marginTop: 1 }}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 600,
              color: THEME.jadeMid,
            }}>
            Upload limits &amp; rate limiting
          </p>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}>
            {[
              ["Max file size", "10 MB per file"],
              ["Supported formats", "PDF, DOC, DOCX, PPT, PPTX"],
              [
                "Text cap",
                "First 30,000 characters sent to AI — long files get truncated",
              ],
              [
                "Gemini rate limit",
                "Free tier: ~15 req/min, ~1,500/day — heavy use falls back to simple extraction",
              ],
              [
                "Batch uploads",
                "Files processed sequentially — large batches may take a moment",
              ],
            ].map(([label, val]) => (
              <li
                key={label}
                style={{
                  fontSize: 12,
                  color: THEME.textSecondary,
                  display: "flex",
                  gap: 6,
                }}>
                <span style={{ color: THEME.jadeDark, flexShrink: 0 }}>▸</span>
                <span>
                  <span style={{ color: THEME.jadeMid, fontWeight: 500 }}>
                    {label}:
                  </span>{" "}
                  {val}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? THEME.jade : THEME.border}`,
          borderRadius: 14,
          padding: "48px 24px",
          textAlign: "center",
          cursor: "pointer",
          background: dragOver ? "#0a1a0a" : THEME.surface,
          transition: "all 0.2s",
        }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            margin: "0 auto 14px",
            background: "#050f05",
            border: `1px solid ${THEME.jadeDark}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke={THEME.jade}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <p
          style={{
            margin: "0 0 4px",
            fontSize: 14,
            fontWeight: 500,
            color: THEME.textPrimary,
          }}>
          Drop files here
        </p>
        <p style={{ margin: 0, fontSize: 12, color: THEME.textMuted }}>
          or click to browse
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.ppt,.pptx"
          style={{ display: "none" }}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {files.map((item, i) => {
            const ext = fileExt(item.file.name);
            const badgeStyles =
              BADGE_STYLE[ext] ?
                Object.fromEntries(
                  BADGE_STYLE[ext]
                    .split(";")
                    .map((s) => {
                      const [k, v] = s.split(":");
                      return [
                        k
                          .trim()
                          .replace(/-([a-z])/g, (_, c) => c.toUpperCase()),
                        v?.trim(),
                      ];
                    })
                    .filter(([k]) => k),
                )
              : { background: THEME.border, color: THEME.textSecondary };
            return (
              <div key={`${item.file.name}-${i}`}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    background: THEME.surface,
                    border: `1px solid ${THEME.border}`,
                    borderRadius: 10,
                  }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "2px 7px",
                      borderRadius: 5,
                      flexShrink: 0,
                      ...badgeStyles,
                    }}>
                    {ext.replace(".", "").toUpperCase()}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 13,
                      color: THEME.textPrimary,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                    {item.file.name}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: THEME.textMuted,
                      flexShrink: 0,
                    }}>
                    {fmtSize(item.file.size)}
                  </span>
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: STATUS_DOT[item.status] || THEME.textMuted,
                      flexShrink: 0,
                      ...(item.status === "loading" ?
                        { boxShadow: `0 0 0 3px ${THEME.jadeDark}40` }
                      : {}),
                    }}
                  />
                  {item.status !== "loading" && (
                    <button
                      onClick={() => removeFile(i)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: THEME.textMuted,
                        fontSize: 16,
                        lineHeight: 1,
                        padding: 0,
                        flexShrink: 0,
                      }}>
                      ×
                    </button>
                  )}
                </div>
                {item.message && (
                  <p
                    style={{
                      margin: "3px 0 0 14px",
                      fontSize: 11,
                      fontFamily: "monospace",
                      color: item.status === "done" ? THEME.jade : "#E05252",
                    }}>
                    {item.message}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      {files.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={clearAll}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 8,
              cursor: "pointer",
              background: "transparent",
              color: THEME.textSecondary,
              border: `1px solid ${THEME.border}`,
            }}>
            Clear
          </button>
          <span style={{ fontSize: 12, color: THEME.textMuted }}>
            {doneCount} uploaded · {errCount} error{errCount !== 1 ? "s" : ""}
          </span>
          <button
            onClick={uploadAll}
            disabled={allSettled || anyLoading}
            style={{
              marginLeft: "auto",
              padding: "8px 20px",
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 8,
              cursor: allSettled || anyLoading ? "not-allowed" : "pointer",
              background:
                allSettled || anyLoading ?
                  THEME.jadeDark + "60"
                : THEME.jadeDark,
              color:
                allSettled || anyLoading ?
                  THEME.jadeMid + "80"
                : THEME.jadeLight,
              border: `1px solid ${THEME.jade}`,
              opacity: allSettled || anyLoading ? 0.5 : 1,
            }}>
            {anyLoading ? "Uploading…" : "Upload all"}
          </button>
        </div>
      )}

      {/* Extracted notes */}
      {notes.length > 0 && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 14,
            }}>
            <h3
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 500,
                color: THEME.textSecondary,
              }}>
              Extracted notes
            </h3>
            <span
              style={{
                fontSize: 11,
                padding: "1px 8px",
                borderRadius: 20,
                background: "#0a2a0a",
                color: THEME.jadeMid,
                border: `1px solid ${THEME.jadeDark}`,
              }}>
              {notes.length}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {notes.map((note) => (
              <NoteCard
                key={note.id || note.filename}
                note={note}
                onDismiss={() => dismissNote(note.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HowToUsePage() {
  const steps = [
    {
      icon: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
      title: "Upload your document",
      body: "Drag and drop or click to browse. SmartNotes accepts PDF, DOC, DOCX, PPT, and PPTX files up to 10 MB each. You can upload multiple files at once.",
    },
    {
      icon: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4M12 16h.01",
      title: "AI extracts the key notes",
      body: "The document is sent to Gemini AI which reads the full text and extracts keywords with descriptions, plus a concise summary at the bottom.",
    },
    {
      icon: "M9 12h6M9 16h6M9 8h6M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
      title: "Review your notes",
      body: 'Notes appear as cards with keyword → description pairs and a summary. Long lists are collapsed by default — hit "Show more" to expand.',
    },
    {
      icon: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
      title: "Copy or download",
      body: "Use the Copy button to paste notes anywhere, or Download PDF to save a styled PDF named after your document.",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div>
        <h2
          style={{
            margin: "0 0 4px",
            fontSize: 22,
            fontWeight: 500,
            color: THEME.textPrimary,
          }}>
          How to use SmartNotes
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: THEME.textMuted }}>
          Four steps from file to structured notes.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {steps.map((s, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              gap: 16,
              padding: "20px 0",
              borderBottom: `1px solid ${THEME.border}`,
            }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                flexShrink: 0,
                background: "#050f05",
                border: `1px solid ${THEME.jadeDark}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={THEME.jade}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round">
                <path d={s.icon} />
              </svg>
            </div>
            <div>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: 14,
                  fontWeight: 500,
                  color: THEME.textPrimary,
                }}>
                {s.title}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: THEME.textSecondary,
                  lineHeight: 1.6,
                }}>
                {s.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: THEME.surface,
          border: `1px solid ${THEME.border}`,
          borderRadius: 12,
          padding: "16px 18px",
        }}>
        <p
          style={{
            margin: "0 0 10px",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: THEME.amethyst,
          }}>
          Supported formats
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {[".pdf", ".doc", ".docx", ".ppt", ".pptx"].map((ext) => {
            const bs =
              BADGE_STYLE[ext] ?
                Object.fromEntries(
                  BADGE_STYLE[ext]
                    .split(";")
                    .map((s) => {
                      const [k, v] = s.split(":");
                      return [
                        k
                          .trim()
                          .replace(/-([a-z])/g, (_, c) => c.toUpperCase()),
                        v?.trim(),
                      ];
                    })
                    .filter(([k]) => k),
                )
              : {};
            return (
              <span
                key={ext}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 6,
                  ...bs,
                }}>
                {ext.replace(".", "").toUpperCase()}
              </span>
            );
          })}
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 12, color: THEME.textMuted }}>
          Max file size: 10 MB per file.
        </p>
      </div>
    </div>
  );
}

function AboutPage() {
  const stats = [
    { label: "AI model", value: "Gemini 1.5 Pro" },
    { label: "Storage", value: "Supabase" },
    { label: "Backend", value: "FastAPI" },
    { label: "Max file size", value: "10 MB" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <h2
          style={{
            margin: "0 0 4px",
            fontSize: 22,
            fontWeight: 500,
            color: THEME.textPrimary,
          }}>
          About SmartNotes
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: THEME.textMuted }}>
          What it is and how it works under the hood.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {[
          "SmartNotes is a document intelligence tool that turns long, dense files into structured notes in seconds. Upload any PDF, Word doc, or PowerPoint and get back a keyword → description glossary plus a concise summary paragraph.",
          "Text is extracted locally on the server using PyPDF2, python-docx, and python-pptx — no third-party OCR service involved. The extracted text is then sent to Google Gemini 1.5 Pro with a structured prompt. The response is stored in Supabase alongside the original file.",
          "If Gemini is unavailable the app falls back to a simple extractive summary built from the document's sentences, so you always get something useful.",
        ].map((para, i) => (
          <p
            key={i}
            style={{
              margin: 0,
              fontSize: 13,
              color: THEME.textSecondary,
              lineHeight: 1.7,
            }}>
            {para}
          </p>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {stats.map((item) => (
          <div
            key={item.label}
            style={{
              background: THEME.surface,
              border: `1px solid ${THEME.border}`,
              borderRadius: 12,
              padding: "14px 16px",
              borderTop: `2px solid ${THEME.jadeDark}`,
            }}>
            <p
              style={{
                margin: "0 0 4px",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: THEME.amethyst,
              }}>
              {item.label}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 500,
                color: THEME.textPrimary,
              }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Navbar & App ──────────────────────────────────────────────────────────────

function Navbar({ page, setPage }) {
  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: THEME.bg + "F0",
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${THEME.border}`,
      }}>
      <div
        style={{
          maxWidth: 680,
          margin: "0 auto",
          padding: "0 20px",
          height: 56,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}>
        <button
          onClick={() => setPage("Upload")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            background: "none",
            border: "none",
            cursor: "pointer",
            flexShrink: 0,
          }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: THEME.jadeDark,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: THEME.textPrimary,
              letterSpacing: "-0.02em",
            }}>
            SmartNotes
          </span>
        </button>

        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            marginLeft: "auto",
          }}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item}
              onClick={() => setPage(item)}
              style={{
                padding: "6px 14px",
                fontSize: 13,
                borderRadius: 8,
                cursor: "pointer",
                border: "none",
                background: page === item ? "#0a1a0a" : "transparent",
                color: page === item ? THEME.jadeMid : THEME.textMuted,
                fontWeight: page === item ? 500 : 400,
                transition: "all 0.15s",
              }}>
              {item}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  const [page, setPage] = useState("Upload");
  return (
    <div style={{ minHeight: "100vh", background: THEME.bg }}>
      <Navbar page={page} setPage={setPage} />
      <main
        style={{ maxWidth: 680, margin: "0 auto", padding: "80px 20px 80px" }}>
        {page === "Upload" && <UploadPage />}
        {page === "How to Use" && <HowToUsePage />}
        {page === "About" && <AboutPage />}
      </main>
    </div>
  );
}
