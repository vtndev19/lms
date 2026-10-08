import React, { useState } from "react";
import { Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { formatFileSize } from "../lib/utils";

interface FileUploaderProps {
  onUpload: (file: File) => Promise<void>;
  maxSizeMB?: number;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onUpload, maxSizeMB = 20 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const allowedExtensions = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".png", ".jpg", ".jpeg"];

  const validateAndUpload = async (file: File) => {
    setError(null);
    setSuccess(null);

    // Kiểm tra dung lượng
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`Dung lượng file (${formatFileSize(file.size)}) vượt quá giới hạn tối đa ${maxSizeMB} MB`);
      return;
    }

    // Kiểm tra định dạng
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setError(`Định dạng file không được hỗ trợ. Chỉ chấp nhận: PDF, Word, Excel, ảnh (PNG, JPG)`);
      return;
    }

    setUploading(true);
    try {
      await onUpload(file);
      setSuccess(`Tải lên thành công: ${file.name}`);
    } catch (err: any) {
      setError("Lỗi khi tải lên file: " + (err.message || "Không xác định"));
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      validateAndUpload(files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndUpload(files[0]);
    }
  };

  return (
    <div className="space-y-3">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
          isDragging
            ? "border-indigo-600 bg-indigo-50/50"
            : "border-slate-300 hover:border-indigo-400 bg-slate-50/50"
        } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <input
          type="file"
          accept={allowedExtensions.join(",")}
          onChange={handleChange}
          disabled={uploading}
          className="hidden"
        />
        <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2.5">
          <Upload className="w-6 h-6" />
        </div>
        <span className="font-bold text-sm text-slate-800 mb-1">
          {uploading ? "Đang tải lên file..." : "Chọn file hoặc kéo thả tài liệu vào đây"}
        </span>
        <span className="text-xs text-slate-400">
          PDF, Word, Excel hoặc Ảnh (Tối đa {maxSizeMB} MB)
        </span>
      </label>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
};
