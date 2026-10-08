import React, { useEffect, useState, Suspense, lazy } from "react";
import { useParams, Link } from "react-router";
import { Navbar } from "../../components/Navbar";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { QuestionRenderer } from "../../components/QuestionRenderer";

const QuestionEditor = lazy(() =>
  import("../../components/QuestionEditor").then((m) => ({ default: m.QuestionEditor }))
);
const ImportDialog = lazy(() =>
  import("../../components/ImportDialog").then((m) => ({ default: m.ImportDialog }))
);
import {
  getExamById,
  getQuestionsByExamId,
  getAnswerKeysByExamId,
  saveQuestionItem,
  deleteQuestionItem,
  batchImportQuestions,
} from "../../lib/db";
import type { Exam, Question, AnswerKey, QuestionImportItem } from "../../lib/types";
import {
  ArrowLeft,
  Plus,
  Upload,
  Edit2,
  Trash2,
  HelpCircle,
  Award,
  Layers,
  Sparkles,
} from "lucide-react";

export default function TeacherExamQuestionsPage() {
  const { id } = useParams<{ id: string }>();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answerKeys, setAnswerKeys] = useState<Record<string, AnswerKey>>({});
  const [loading, setLoading] = useState(true);

  // Editor modal/toggle state
  const [editingQuestion, setEditingQuestion] = useState<
    (Partial<Question> & { answer?: any; explanation?: string }) | null
  >(null);
  const [showEditor, setShowEditor] = useState(false);

  // Import dialog state
  const [showImportDialog, setShowImportDialog] = useState(false);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  async function loadData(examId: string) {
    setLoading(true);
    try {
      const [eDoc, qList, kList] = await Promise.all([
        getExamById(examId),
        getQuestionsByExamId(examId),
        getAnswerKeysByExamId(examId),
      ]);
      setExam(eDoc);
      setQuestions(qList);
      setAnswerKeys(kList);
    } catch (err) {
      console.error("Lỗi tải câu hỏi:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleSaveQuestion = async (
    qData: Partial<Question>,
    answer: any,
    explanation: string
  ) => {
    if (!id) return;
    try {
      await saveQuestionItem(id, { ...editingQuestion, ...qData }, answer, explanation);
      setShowEditor(false);
      setEditingQuestion(null);
      await loadData(id);
    } catch (err: any) {
      alert("Lỗi lưu câu hỏi: " + err.message);
    }
  };

  const handleDelete = async (qId: string) => {
    if (!id || !confirm("Bạn có chắc chắn muốn xóa câu hỏi này?")) return;
    try {
      await deleteQuestionItem(id, qId);
      await loadData(id);
    } catch (err: any) {
      alert("Lỗi xóa câu hỏi: " + err.message);
    }
  };

  const handleImportQuestions = async (
    importItems: QuestionImportItem[],
    mode: "append" | "replace"
  ) => {
    if (!id) return;
    try {
      await batchImportQuestions(id, importItems, mode);
      await loadData(id);
    } catch (err: any) {
      alert("Lỗi import câu hỏi: " + err.message);
    }
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

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <Link
                to="/t/exams"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors mb-2"
              >
                <ArrowLeft className="w-4 h-4" /> Quay lại danh sách đề
              </Link>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <HelpCircle className="w-6 h-6 text-indigo-600" />
                {exam?.title || "Quản lý câu hỏi"}
              </h1>
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 mt-1">
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  {questions.length} câu hỏi
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-emerald-500" />
                  Tổng {exam?.totalPoints || 0} điểm
                </span>
              </div>
            </div>

            {/* Nút hành động */}
            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setShowImportDialog(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 font-bold text-xs shadow-xs transition-all"
              >
                <Upload className="w-4 h-4 text-emerald-600" /> Import JSON / Excel
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingQuestion(null);
                  setShowEditor(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition-all"
              >
                <Plus className="w-4 h-4" /> Thêm câu hỏi thủ công
              </button>
            </div>
          </div>

          {/* Form Editor (khi bật) */}
          {showEditor && (
            <Suspense
              fallback={
                <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-slate-500 font-medium">Đang tải trình soạn câu hỏi...</span>
                </div>
              }
            >
              <QuestionEditor
                initialQuestion={editingQuestion || undefined}
                onSave={handleSaveQuestion}
                onCancel={() => {
                  setShowEditor(false);
                  setEditingQuestion(null);
                }}
              />
            </Suspense>
          )}

          {/* Danh sách câu hỏi */}
          {questions.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <HelpCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Đề thi chưa có câu hỏi nào</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Bạn có thể thêm từng câu hỏi thủ công hoặc import hàng loạt từ file Excel/JSON.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditor(true)}
                  className="px-5 py-2.5 rounded-2xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-200"
                >
                  Thêm câu hỏi ngay
                </button>
                <button
                  type="button"
                  onClick={() => setShowImportDialog(true)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Import từ Excel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, idx) => {
                const key = answerKeys[q.id];
                return (
                  <div key={q.id} className="relative group">
                    <QuestionRenderer
                      index={idx}
                      question={q}
                      mode="preview"
                      correctAnswer={key?.correct}
                      explanation={key?.explanation}
                    />

                    {/* Quick Action buttons */}
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-xs p-1 rounded-xl shadow-xs border border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingQuestion({
                            ...q,
                            answer: key?.correct,
                            explanation: key?.explanation,
                          });
                          setShowEditor(true);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Chỉnh sửa câu hỏi này"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(q.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Xóa câu hỏi này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Import Dialog */}
          {showImportDialog && (
            <Suspense
              fallback={
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center">
                  <div className="bg-white rounded-2xl p-6 shadow-xl flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-slate-700 font-bold">Đang tải hộp thoại Import...</span>
                  </div>
                </div>
              }
            >
              <ImportDialog
                isOpen={showImportDialog}
                onClose={() => setShowImportDialog(false)}
                onImport={handleImportQuestions}
                currentQuestionCount={questions.length}
              />
            </Suspense>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
