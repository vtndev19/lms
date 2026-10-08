import React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import type { Question, QuestionResultDetail } from "../lib/types";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface QuestionRendererProps {
  question: Question;
  index: number;
  mode?: "answering" | "review" | "preview";
  value?: any; // Học sinh chọn
  onChange?: (val: any) => void;
  resultDetail?: QuestionResultDetail; // Khi review
  correctAnswer?: any; // Khi xem trước của GV
  explanation?: string;
}

// Hàm render văn bản có hỗ trợ LaTeX KaTeX dạng $...$ hoặc $$...$$
export const FormattedMathText: React.FC<{ text: string; className?: string }> = ({ text, className = "" }) => {
  if (!text) return null;

  // Tách văn bản theo $...$
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith("$$") && part.endsWith("$$")) {
          const math = part.slice(2, -2);
          try {
            const html = katex.renderToString(math, { displayMode: true, throwOnError: false });
            return <span key={i} dangerouslySetInnerHTML={{ __html: html }} className="my-2 block overflow-x-auto" />;
          } catch {
            return <code key={i} className="font-mono text-indigo-600 bg-slate-100 px-1 py-0.5 rounded">{part}</code>;
          }
        } else if (part.startsWith("$") && part.endsWith("$")) {
          const math = part.slice(1, -1);
          try {
            const html = katex.renderToString(math, { displayMode: false, throwOnError: false });
            return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
          } catch {
            return <code key={i} className="font-mono text-indigo-600 bg-slate-100 px-1 py-0.5 rounded">{part}</code>;
          }
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  index,
  mode = "answering",
  value,
  onChange,
  resultDetail,
  correctAnswer,
  explanation,
}) => {
  const isAnswering = mode === "answering";
  const isReview = mode === "review";

  const handleSingleSelect = (optionId: string) => {
    if (!isAnswering || !onChange) return;
    onChange(optionId);
  };

  const handleMultipleSelect = (optionId: string) => {
    if (!isAnswering || !onChange) return;
    const current: string[] = Array.isArray(value) ? [...value] : [];
    const exists = current.includes(optionId);
    const updated = exists ? current.filter((id) => id !== optionId) : [...current, optionId];
    onChange(updated);
  };

  const handleTrueFalseToggle = (letter: string, boolVal: boolean) => {
    if (!isAnswering || !onChange) return;
    const current = { ...(value || {}) };
    current[letter] = boolVal;
    onChange(current);
  };

  const handleShortChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAnswering || !onChange) return;
    onChange(e.target.value);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 transition-all hover:border-slate-300">
      {/* Header câu hỏi */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-sm border border-indigo-200/50">
            {index + 1}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {question.type === "single" && "Trắc nghiệm 1 đáp án"}
            {question.type === "multiple" && "Chọn nhiều đáp án"}
            {question.type === "truefalse" && "Đúng / Sai (4 ý)"}
            {question.type === "short" && "Điền câu trả lời ngắn"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isReview && resultDetail && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                resultDetail.earned > 0
                  ? resultDetail.earned === question.points
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {resultDetail.earned > 0 ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              {resultDetail.earned}/{question.points} điểm
            </span>
          )}
          {!isReview && (
            <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
              {question.points} điểm
            </span>
          )}
        </div>
      </div>

      {/* Nội dung câu hỏi */}
      <div className="text-slate-800 text-base leading-relaxed font-medium mb-5">
        <FormattedMathText text={question.text} />
      </div>

      {/* Ảnh minh họa nếu có */}
      {question.imageUrl && (
        <div className="mb-5 max-w-lg overflow-hidden rounded-xl border border-slate-200">
          <img
            src={question.imageUrl}
            alt="Minh họa"
            loading="lazy"
            decoding="async"
            className="w-full h-auto object-cover"
          />
        </div>
      )}

      {/* DẠNG 1: SINGLE CHOICE */}
      {question.type === "single" && (
        <div className="space-y-2.5">
          {question.options.map((opt) => {
            const isSelected = value === opt.id;
            const correctOpt = isReview ? resultDetail?.correct : correctAnswer;
            const isCorrect = correctOpt === opt.id;

            let borderClass = "border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50";
            let bgClass = "bg-white";

            if (isAnswering) {
              if (isSelected) {
                borderClass = "border-indigo-600 ring-2 ring-indigo-500/20";
                bgClass = "bg-indigo-50/50";
              }
            } else if (isReview) {
              if (isCorrect) {
                borderClass = "border-emerald-500 bg-emerald-50/60";
              } else if (isSelected && !isCorrect) {
                borderClass = "border-rose-400 bg-rose-50/60";
              }
            }

            return (
              <label
                key={opt.id}
                onClick={() => handleSingleSelect(opt.id)}
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${borderClass} ${bgClass}`}
              >
                <div className="pt-0.5">
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>
                <div className="flex-1 text-sm text-slate-800 leading-normal">
                  <span className="font-semibold text-slate-900 mr-2 uppercase">{opt.id}.</span>
                  <FormattedMathText text={opt.text} />
                </div>
                {isReview && isCorrect && (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Đúng
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}

      {/* DẠNG 2: MULTIPLE CHOICE */}
      {question.type === "multiple" && (
        <div className="space-y-2.5">
          {question.options.map((opt) => {
            const selectedList = Array.isArray(value) ? value : [];
            const isSelected = selectedList.includes(opt.id);
            const correctList: string[] = isReview
              ? Array.isArray(resultDetail?.correct) ? resultDetail?.correct : []
              : Array.isArray(correctAnswer) ? correctAnswer : [];
            const isCorrect = correctList.includes(opt.id);

            let borderClass = "border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50";
            let bgClass = "bg-white";

            if (isAnswering) {
              if (isSelected) {
                borderClass = "border-indigo-600 ring-2 ring-indigo-500/20";
                bgClass = "bg-indigo-50/50";
              }
            } else if (isReview) {
              if (isCorrect) {
                borderClass = "border-emerald-500 bg-emerald-50/60";
              } else if (isSelected && !isCorrect) {
                borderClass = "border-rose-400 bg-rose-50/60";
              }
            }

            return (
              <label
                key={opt.id}
                onClick={() => handleMultipleSelect(opt.id)}
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${borderClass} ${bgClass}`}
              >
                <div className="pt-0.5">
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>
                <div className="flex-1 text-sm text-slate-800 leading-normal">
                  <span className="font-semibold text-slate-900 mr-2 uppercase">{opt.id}.</span>
                  <FormattedMathText text={opt.text} />
                </div>
                {isReview && isCorrect && (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Đáp án đúng
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}

      {/* DẠNG 3: TRUE / FALSE (4 Ý) */}
      {question.type === "truefalse" && (
        <div className="space-y-3">
          {question.options.map((opt) => {
            const letter = opt.id;
            const currentVal = value ? value[letter] : null;
            const correctMap = isReview ? resultDetail?.correct : correctAnswer;
            const expectedVal = correctMap ? correctMap[letter] : null;

            return (
              <div
                key={letter}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/60"
              >
                <div className="flex-1 text-sm text-slate-800 leading-normal">
                  <span className="font-bold text-slate-900 mr-2 uppercase">{letter})</span>
                  <FormattedMathText text={opt.text} />
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {/* Nút Đúng */}
                  <button
                    type="button"
                    disabled={!isAnswering}
                    onClick={() => handleTrueFalseToggle(letter, true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      currentVal === true
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    Đúng
                  </button>

                  {/* Nút Sai */}
                  <button
                    type="button"
                    disabled={!isAnswering}
                    onClick={() => handleTrueFalseToggle(letter, false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      currentVal === false
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    Sai
                  </button>

                  {/* Khi review hiển thị kết quả ý đó */}
                  {isReview && expectedVal !== null && expectedVal !== undefined && (
                    <span
                      className={`text-xs px-2 py-1 rounded-md font-semibold ${
                        currentVal === expectedVal
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      Đáp án: {expectedVal ? "Đúng" : "Sai"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DẠNG 4: SHORT ANSWER */}
      {question.type === "short" && (
        <div className="space-y-3">
          <div className="relative max-w-md">
            <input
              type="text"
              disabled={!isAnswering}
              value={value || ""}
              onChange={handleShortChange}
              placeholder="Nhập câu trả lời của bạn..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm font-medium disabled:bg-slate-50"
            />
          </div>

          {isReview && resultDetail?.correct && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <span className="font-semibold text-slate-900">Các đáp án được chấp nhận: </span>
              {Array.isArray((resultDetail.correct as any).accepted)
                ? (resultDetail.correct as any).accepted.join("; ")
                : String(resultDetail.correct)}
            </div>
          )}
        </div>
      )}

      {/* GIẢI THÍCH (Review mode hoặc Teacher view) */}
      {(isReview || mode === "preview") && (resultDetail?.explanation || explanation) && (
        <div className="mt-4 p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-950 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-indigo-900 block mb-0.5">Lời giải & Giải thích:</span>
            <FormattedMathText text={resultDetail?.explanation || explanation || ""} />
          </div>
        </div>
      )}
    </div>
  );
};
