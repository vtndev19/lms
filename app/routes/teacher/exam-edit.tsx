import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router";
import { Navbar } from "../../components/Navbar";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import { getExamById, saveExam, getClasses } from "../../lib/db";
import type { Exam, ClassRoom, ExamStatus, ShowAnswersPolicy } from "../../lib/types";
import { ArrowLeft, Save, HelpCircle, Layers } from "lucide-react";

export default function TeacherExamEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const isNew = !id || id === "new";

  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classIds, setClassIds] = useState<string[]>([]);
  const [status, setStatus] = useState<ExamStatus>("draft");
  const [durationMin, setDurationMin] = useState<number | null>(15);
  const [maxAttempts, setMaxAttempts] = useState<number>(1);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [showAnswers, setShowAnswers] = useState<ShowAnswersPolicy>("afterSubmit");

  useEffect(() => {
    async function init() {
      if (!userProfile?.uid) return;
      const cList = await getClasses(userProfile.uid);
      setClasses(cList);

      if (!isNew && id) {
        const found = await getExamById(id);
        if (found) {
          setTitle(found.title);
          setDescription(found.description);
          setClassIds(found.classIds || []);
          setStatus(found.status);
          setDurationMin(found.durationMin);
          setMaxAttempts(found.maxAttempts || 1);
          setShuffleQuestions(Boolean(found.shuffleQuestions));
          setShuffleOptions(Boolean(found.shuffleOptions));
          setShowAnswers(found.showAnswers || "afterSubmit");
        }
      } else if (cList.length > 0) {
        // Mặc định chọn lớp đầu tiên
        setClassIds([cList[0].id]);
      }
      setLoading(false);
    }
    init();
  }, [id, isNew, userProfile?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Vui lòng nhập tiêu đề đề thi!");
      return;
    }
    if (!userProfile?.uid) {
      alert("Vui lòng đăng nhập tài khoản giáo viên!");
      return;
    }

    setSaving(true);
    try {
      const saved = await saveExam({
        id: isNew ? undefined : id,
        title: title.trim(),
        description: description.trim(),
        ownerId: userProfile.uid,
        classIds,
        status,
        durationMin: durationMin ? Number(durationMin) : null,
        maxAttempts: Number(maxAttempts) || 1,
        shuffleQuestions,
        shuffleOptions,
        showAnswers,
      });

      if (isNew) {
        // Tạo xong chuyển ngay đến trang soạn câu hỏi
        navigate(`/t/exams/${saved.id}/questions`);
      } else {
        navigate("/t/exams");
      }
    } catch (err: any) {
      alert("Lỗi lưu đề thi: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleClass = (cid: string) => {
    if (classIds.includes(cid)) {
      setClassIds(classIds.filter((c) => c !== cid));
    } else {
      setClassIds([...classIds, cid]);
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

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <Link
              to="/t/exams"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại danh sách đề
            </Link>

            {!isNew && (
              <Link
                to={`/t/exams/${id}/questions`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs transition-colors"
              >
                <HelpCircle className="w-4 h-4" /> Soạn câu hỏi cho đề này
              </Link>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
            <h1 className="text-xl font-black text-slate-900 mb-1">
              {isNew ? "Tạo Đề Trắc Nghiệm Mới" : "Cấu Hình Đề Thi"}
            </h1>
            <p className="text-xs text-slate-500 mb-6">
              Thiết lập các thông số về thời gian, đối tượng giao bài và chính sách xem đáp án
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Tiêu đề & Mô tả */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tiêu đề đề thi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ví dụ: Kiểm tra 15 phút Tin học Đại số Boole..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mô tả hoặc hướng dẫn làm bài
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Nhập hướng dẫn, yêu cầu dành cho học sinh trước khi bắt đầu..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Lớp được giao */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Giao cho các lớp học phần
                </label>
                {classes.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
                    Chưa có lớp nào. Hãy vào mục "Lớp học" để tạo lớp trước!
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {classes.map((cls) => {
                      const selected = classIds.includes(cls.id);
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => handleToggleClass(cls.id)}
                          className={`p-3 rounded-2xl border text-left transition-all ${
                            selected
                              ? "bg-indigo-50 border-indigo-500 text-indigo-900 shadow-xs"
                              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          <span className="font-bold text-xs block">{cls.name}</span>
                          <span className="text-[10px] text-slate-400">
                            Mã: {cls.joinCode}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Cấu hình thời gian & Lần làm */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-2xl bg-slate-50/70 border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Thời lượng (phút)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={durationMin || ""}
                    onChange={(e) =>
                      setDurationMin(e.target.value ? parseInt(e.target.value) : null)
                    }
                    placeholder="Bỏ trống nếu không giới hạn"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Để trống nếu không giới hạn
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Số lần làm tối đa
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Mặc định: 1 lần
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Trạng thái đề thi
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ExamStatus)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="draft">Bản nháp (HS chưa thấy)</option>
                    <option value="published">Đã xuất bản (HS được làm)</option>
                    <option value="closed">Đã đóng (Không nhận bài mới)</option>
                  </select>
                </div>
              </div>

              {/* Xáo trộn & Chính sách xem đáp án */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Chính sách hiển thị đáp án đúng & lời giải
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: "afterSubmit", label: "Ngay sau khi nộp bài" },
                      { id: "afterClose", label: "Chỉ sau khi đóng đề thi" },
                      { id: "never", label: "Không bao giờ xem đáp án" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setShowAnswers(p.id as ShowAnswersPolicy)}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all text-center ${
                          showAnswers === p.id
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                            : "bg-white text-slate-600 border-slate-200"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-2">
                  <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shuffleQuestions}
                      onChange={(e) => setShuffleQuestions(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    Xáo trộn thứ tự câu hỏi cho từng học sinh
                  </label>

                  <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shuffleOptions}
                      onChange={(e) => setShuffleOptions(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    Xáo trộn thứ tự các phương án lựa chọn
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => navigate("/t/exams")}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Đang lưu..." : isNew ? "Tiếp tục soạn câu hỏi" : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
