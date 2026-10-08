import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { Navbar } from "../../components/Navbar";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { FileUploader } from "../../components/FileUploader";
import { FileList } from "../../components/FileList";
import { getExamById, saveExam } from "../../lib/db";
import type { Exam, ExamFile } from "../../lib/types";
import { ArrowLeft, Paperclip, AlertCircle } from "lucide-react";

export default function TeacherExamFilesPage() {
  const { id } = useParams<{ id: string }>();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadExam(id);
  }, [id]);

  async function loadExam(examId: string) {
    setLoading(true);
    try {
      const e = await getExamById(examId);
      setExam(e);
    } finally {
      setLoading(false);
    }
  }

  const handleUpload = async (file: File) => {
    if (!exam || !id) return;

    // Giả lập upload lên Cloud Storage hoặc nạp Data URL / Object URL
    const fileUrl = URL.createObjectURL(file);
    const newFile: ExamFile = {
      id: `f-${Date.now()}`,
      name: file.name,
      path: `exams/${id}/files/${Date.now()}_${file.name}`,
      size: file.size,
      contentType: file.type || "application/octet-stream",
      uploadedAt: new Date().toISOString(),
      downloadUrl: fileUrl,
    };

    const updatedFiles = [...(exam.files || []), newFile];
    const updatedExam = await saveExam({
      ...exam,
      files: updatedFiles,
    });
    setExam(updatedExam);
  };

  const handleDeleteFile = async (fileToDelete: ExamFile) => {
    if (!exam || !confirm(`Xác nhận xóa file "${fileToDelete.name}"?`)) return;

    const updatedFiles = (exam.files || []).filter(
      (f) => f.path !== fileToDelete.path && f.name !== fileToDelete.name
    );
    const updatedExam = await saveExam({
      ...exam,
      files: updatedFiles,
    });
    setExam(updatedExam);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRole="teacher">
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            to="/t/exams"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách đề
          </Link>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <Paperclip className="w-6 h-6 text-indigo-600" />
                Quản lý file đính kèm: {exam?.title}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Upload đề bài định dạng PDF, Word, Excel hoặc Ảnh để học sinh xem và tải về
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Uploader Box */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
              <h3 className="font-bold text-slate-900 text-sm mb-3">Tải lên tài liệu mới</h3>
              <FileUploader onUpload={handleUpload} maxSizeMB={20} />
            </div>

            {/* Files List */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">
                  Danh sách file đã đính kèm ({exam?.files?.length || 0})
                </h3>
              </div>

              <FileList
                files={exam?.files || []}
                canDelete={true}
                onDeleteFile={handleDeleteFile}
              />
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
