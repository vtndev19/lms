import React, { useState } from "react";
import { parseQuestionsJson, type ParseResult } from "../lib/parseJson";
import { parseQuestionsExcel } from "../lib/parseExcel";
import { downloadQuestionTemplateExcel } from "../lib/exportExcel";
import type { QuestionImportItem } from "../lib/types";
import { QuestionRenderer } from "./QuestionRenderer";
import {
  Upload,
  FileSpreadsheet,
  FileCode,
  AlertTriangle,
  CheckCircle2,
  X,
  Download,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (questions: QuestionImportItem[], mode: "append" | "replace") => Promise<void>;
  currentQuestionCount: number;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({
  isOpen,
  onClose,
  onImport,
  currentQuestionCount,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState<string>("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleDownloadExcelTemplate = async () => {
    const sampleData = [
      {
        Loai: "single",
        CauHoi: "Ngôn ngữ nào sau đây là ngôn ngữ biên dịch?",
        A: "Python",
        B: "C++",
        C: "HTML",
        D: "SQL",
        E: "",
        F: "",
        DapAn: "B",
        Diem: 1,
        GiaiThich: "C++ được biên dịch trước khi chạy.",
        Anh: "",
      },
      {
        Loai: "multiple",
        CauHoi: "Chọn các kiểu dữ liệu số nguyên trong C++:",
        A: "int",
        B: "float",
        C: "long long",
        D: "double",
        E: "",
        F: "",
        DapAn: "A,C",
        Diem: 1,
        GiaiThich: "int và long long là số nguyên.",
        Anh: "",
      },
      {
        Loai: "truefalse",
        CauHoi: "Xét đoạn chương trình tính diện tích $S = \\pi r^2$. Đúng hay sai?",
        A: "Bán kính r phải dương",
        B: "Số pi xấp xỉ 3.14",
        C: "Diện tích S có thể âm",
        D: "r=1 thì S xấp xỉ 3.14",
        E: "",
        F: "",
        DapAn: "D,D,S,D",
        Diem: 2,
        GiaiThich: "S không thể âm.",
        Anh: "",
      },
      {
        Loai: "short",
        CauHoi: "Kết quả của biểu thức 7 / 2 trong C++ là?",
        A: "",
        B: "",
        C: "",
        D: "",
        E: "",
        F: "",
        DapAn: "3;3.0",
        Diem: 1,
        GiaiThich: "Phép chia nguyên cho kết quả 3.",
        Anh: "",
      },
    ];

    await downloadQuestionTemplateExcel(sampleData);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "json") {
      const text = await file.text();
      const res = parseQuestionsJson(text);
      setParseResult(res);
      setStep(2);
    } else if (extension === "xlsx" || extension === "xls") {
      const buffer = await file.arrayBuffer();
      const res = await parseQuestionsExcel(buffer);
      setParseResult(res);
      setStep(2);
    } else {
      alert("Chỉ hỗ trợ file .json hoặc .xlsx / .xls");
    }
  };

  const handleConfirmImport = async () => {
    if (!parseResult || !parseResult.valid || parseResult.questions.length === 0) return;

    setSubmitting(true);
    try {
      await onImport(parseResult.questions, importMode);
      onClose();
      // Reset
      setStep(1);
      setParseResult(null);
      setFileName("");
    } catch (err: any) {
      alert("Lỗi khi import: " + (err.message || "Không xác định"));
    } finally {
      setSubmitting(false);
    }
  };

  const totalPoints =
    parseResult?.questions.reduce((acc, q) => acc + (q.points || 1), 0) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Import câu hỏi từ file</h2>
              <p className="text-xs text-slate-500">
                Bước {step}/3: {step === 1 ? "Chọn file" : step === 2 ? "Kiểm tra & Xem trước" : "Xác nhận lưu"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* BƯỚC 1: CHỌN FILE */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Dropzone */}
              <label className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group">
                <input
                  type="file"
                  accept=".json,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7" />
                </div>
                <span className="font-bold text-slate-800 text-sm mb-1">
                  Nhấp để tải lên hoặc kéo thả file vào đây
                </span>
                <span className="text-xs text-slate-400 mb-4">
                  Hỗ trợ file JSON (.json) hoặc Excel (.xlsx, .xls)
                </span>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-600">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel (.xlsx)
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-600">
                    <FileCode className="w-3.5 h-3.5 text-amber-600" /> JSON (.json)
                  </span>
                </div>
              </label>

              {/* Tải file mẫu */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <span className="text-xs font-bold text-slate-700 block mb-2.5">
                  Tải file mẫu định dạng chuẩn:
                </span>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={handleDownloadExcelTemplate}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 rounded-xl text-xs font-bold text-slate-700 shadow-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    File mẫu Excel (.xlsx)
                  </button>
                  <a
                    href="/templates/mau_cauhoi.json"
                    download="mau_cauhoi.json"
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-amber-500 hover:text-amber-700 rounded-xl text-xs font-bold text-slate-700 shadow-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-600" />
                    File mẫu JSON (.json)
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* BƯỚC 2: KIỂM TRA & XEM TRƯỚC */}
          {step === 2 && parseResult && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <span>File: <strong className="text-slate-900">{fileName}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  <RotateCcw className="w-3 h-3" /> Chọn file khác
                </button>
              </div>

              {/* Thông báo lỗi nếu có */}
              {!parseResult.valid ? (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900">
                  <div className="flex items-center gap-2 mb-2 font-bold text-sm text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Phát hiện {parseResult.errors.length} lỗi trong file:
                  </div>
                  <ul className="space-y-1 text-xs text-rose-700 list-disc list-inside max-h-48 overflow-y-auto">
                    {parseResult.errors.map((err, i) => (
                      <li key={i}>{err.message}</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[11px] text-rose-600 italic">
                    Vui lòng chỉnh sửa lại file theo đúng định dạng mẫu và tải lên lại.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Tóm tắt thành công */}
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <div>
                        <span className="font-bold text-sm block">File hợp lệ 100%!</span>
                        <span className="text-xs text-emerald-700">
                          Sẵn sàng import {parseResult.questions.length} câu hỏi (Tổng {totalPoints} điểm)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Danh sách preview các câu */}
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {parseResult.questions.map((q, idx) => (
                      <QuestionRenderer
                        key={idx}
                        index={idx}
                        mode="preview"
                        question={{
                          id: `preview-${idx}`,
                          order: idx + 1,
                          type: q.type,
                          text: q.text,
                          imageUrl: q.imageUrl,
                          points: q.points || 1,
                          options: (q.options || []).map((t, oIdx) => ({
                            id: ["a", "b", "c", "d", "e", "f"][oIdx] || `opt_${oIdx}`,
                            text: t,
                          })),
                        }}
                        correctAnswer={q.answer}
                        explanation={q.explanation}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BƯỚC 3: XÁC NHẬN CHẾ ĐỘ */}
          {step === 3 && parseResult && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                <h4 className="font-bold text-sm text-indigo-950 mb-1">Xác nhận chế độ Import</h4>
                <p className="text-xs text-indigo-700">
                  Đề hiện tại đang có <strong>{currentQuestionCount}</strong> câu hỏi. Chọn cách thức áp dụng danh sách mới gồm <strong>{parseResult.questions.length}</strong> câu:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label
                  onClick={() => setImportMode("append")}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    importMode === "append"
                      ? "border-indigo-600 bg-indigo-50/40 shadow-xs"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === "append"}
                      onChange={() => setImportMode("append")}
                      className="text-indigo-600"
                    />
                    <span className="font-bold text-sm text-slate-900">Thêm vào cuối (Khuyến nghị)</span>
                  </div>
                  <p className="text-xs text-slate-500 pl-5">
                    Giữ nguyên {currentQuestionCount} câu hiện có, nối thêm {parseResult.questions.length} câu mới vào sau.
                  </p>
                </label>

                <label
                  onClick={() => setImportMode("replace")}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    importMode === "replace"
                      ? "border-rose-500 bg-rose-50/40 shadow-xs"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === "replace"}
                      onChange={() => setImportMode("replace")}
                      className="text-rose-600"
                    />
                    <span className="font-bold text-sm text-rose-900">Ghi đè toàn bộ</span>
                  </div>
                  <p className="text-xs text-slate-500 pl-5">
                    Xóa toàn bộ câu hỏi cũ của đề thi này và thay thế bằng danh sách mới.
                  </p>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl"
          >
            Hủy bỏ
          </button>

          <div className="flex items-center gap-2">
            {step === 2 && parseResult?.valid && (
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 transition-all"
              >
                Tiếp tục bước 3 <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 3 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Quay lại
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmImport}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-100 transition-all disabled:opacity-50"
                >
                  {submitting ? "Đang xử lý..." : "Xác nhận Import"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
