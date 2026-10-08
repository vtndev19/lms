import React, { useState } from "react";
import type { ExamFile } from "../lib/types";
import { formatFileSize, formatDate } from "../lib/utils";
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Download,
  Eye,
  Trash2,
  X,
} from "lucide-react";

interface FileListProps {
  files: ExamFile[];
  canDelete?: boolean;
  onDeleteFile?: (file: ExamFile) => void;
}

export const FileList: React.FC<FileListProps> = ({ files, canDelete = false, onDeleteFile }) => {
  const [previewFile, setPreviewFile] = useState<ExamFile | null>(null);

  if (!files || files.length === 0) {
    return (
      <div className="p-6 text-center rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 text-xs">
        Chưa có file đính kèm nào cho đề thi này.
      </div>
    );
  }

  const getFileIcon = (contentType: string, name: string) => {
    if (contentType.includes("pdf") || name.endsWith(".pdf")) {
      return <FileText className="w-5 h-5 text-rose-500" />;
    }
    if (contentType.includes("image") || /\.(png|jpg|jpeg|webp)$/i.test(name)) {
      return <ImageIcon className="w-5 h-5 text-indigo-500" />;
    }
    if (contentType.includes("spreadsheet") || /\.(xlsx|xls)$/i.test(name)) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    }
    return <FileCode className="w-5 h-5 text-blue-500" />;
  };

  const isPreviewable = (f: ExamFile) => {
    return (
      f.contentType.includes("pdf") ||
      f.contentType.includes("image") ||
      /\.(pdf|png|jpg|jpeg|webp)$/i.test(f.name)
    );
  };

  return (
    <>
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        {files.map((file, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50/70 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0 pr-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                {getFileIcon(file.contentType, file.name)}
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-bold text-slate-800 truncate block">
                  {file.name}
                </span>
                <span className="text-[11px] text-slate-400 flex items-center gap-2">
                  <span>{formatFileSize(file.size)}</span>
                  <span>•</span>
                  <span>{formatDate(file.uploadedAt)}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Xem trước nếu là PDF hoặc ảnh */}
              {isPreviewable(file) && (
                <button
                  type="button"
                  onClick={() => setPreviewFile(file)}
                  className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                  title="Xem trực tiếp"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}

              {/* Tải về */}
              {file.downloadUrl && (
                <a
                  href={file.downloadUrl}
                  download={file.name}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                  title="Tải về máy"
                >
                  <Download className="w-4 h-4" />
                </a>
              )}

              {/* Xóa file (GV) */}
              {canDelete && onDeleteFile && (
                <button
                  type="button"
                  onClick={() => onDeleteFile(file)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  title="Xóa file này"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal xem trước */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
              <span className="font-bold text-sm text-slate-800 truncate pr-4">
                Xem trước: {previewFile.name}
              </span>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-2 bg-slate-100 overflow-auto flex items-center justify-center">
              {previewFile.contentType.includes("image") ||
              /\.(png|jpg|jpeg|webp)$/i.test(previewFile.name) ? (
                <img
                  src={previewFile.downloadUrl || previewFile.path}
                  alt={previewFile.name}
                  loading="lazy"
                  decoding="async"
                  className="max-h-full max-w-full object-contain rounded-xl shadow-xs"
                />
              ) : (
                <iframe
                  src={previewFile.downloadUrl || previewFile.path}
                  title={previewFile.name}
                  className="w-full h-full rounded-xl border border-slate-200 bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
