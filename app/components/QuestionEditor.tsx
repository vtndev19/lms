import React, { useState } from "react";
import type { Question, QuestionType } from "../lib/types";
import { QuestionRenderer } from "./QuestionRenderer";
import { Plus, Trash2, Eye, Check, X } from "lucide-react";

interface QuestionEditorProps {
  initialQuestion?: Partial<Question> & { answer?: any; explanation?: string };
  onSave: (question: Partial<Question>, answer: any, explanation: string) => void;
  onCancel: () => void;
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({
  initialQuestion,
  onSave,
  onCancel,
}) => {
  const [type, setType] = useState<QuestionType>(initialQuestion?.type || "single");
  const [text, setText] = useState<string>(initialQuestion?.text || "");
  const [points, setPoints] = useState<number>(initialQuestion?.points || 1);
  const [explanation, setExplanation] = useState<string>(initialQuestion?.explanation || "");
  const [showPreview, setShowPreview] = useState<boolean>(false);

  // Single / Multiple options: default 4
  const [options, setOptions] = useState<string[]>(() => {
    if (initialQuestion?.options && initialQuestion.options.length > 0) {
      return initialQuestion.options.map((o) => o.text);
    }
    return ["", "", "", ""];
  });

  // Single choice answer: "a", "b", "c", "d"
  const [singleAnswer, setSingleAnswer] = useState<string>(() => {
    return typeof initialQuestion?.answer === "string" ? initialQuestion.answer : "a";
  });

  // Multiple choice answers: ["a", "c"]
  const [multipleAnswers, setMultipleAnswers] = useState<string[]>(() => {
    return Array.isArray(initialQuestion?.answer) ? initialQuestion.answer : ["a"];
  });

  // TrueFalse answers: { a: true, b: false, c: true, d: false }
  const [trueFalseAnswers, setTrueFalseAnswers] = useState<Record<string, boolean>>(() => {
    if (initialQuestion?.answer && typeof initialQuestion.answer === "object") {
      return initialQuestion.answer;
    }
    return { a: true, b: false, c: true, d: true };
  });

  // Short answer: accepted strings
  const [shortAnswersStr, setShortAnswersStr] = useState<string>(() => {
    if (initialQuestion?.answer?.accepted) {
      return initialQuestion.answer.accepted.join("; ");
    }
    return "";
  });
  const [shortIsNumeric, setShortIsNumeric] = useState<boolean>(() => {
    return Boolean(initialQuestion?.answer?.numeric);
  });
  const [shortTolerance, setShortTolerance] = useState<number>(() => {
    return Number(initialQuestion?.answer?.tolerance) || 0;
  });

  const letters = ["a", "b", "c", "d", "e", "f"];

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, ""]);
    }
  };

  const handleRemoveOption = (idx: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== idx));
    }
  };

  const handleOptionChange = (idx: number, val: string) => {
    const updated = [...options];
    updated[idx] = val;
    setOptions(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      alert("Vui lòng nhập nội dung câu hỏi!");
      return;
    }

    let finalAnswer: any;
    let finalOptions: any[] = [];

    if (type === "single") {
      finalOptions = options.map((opt, idx) => ({
        id: letters[idx],
        text: opt,
      }));
      finalAnswer = singleAnswer;
    } else if (type === "multiple") {
      finalOptions = options.map((opt, idx) => ({
        id: letters[idx],
        text: opt,
      }));
      finalAnswer = multipleAnswers;
    } else if (type === "truefalse") {
      finalOptions = ["a", "b", "c", "d"].map((letter, idx) => ({
        id: letter,
        text: options[idx] || `Ý ${letter}`,
      }));
      finalAnswer = trueFalseAnswers;
    } else if (type === "short") {
      const accepted = shortAnswersStr.split(";").map((s) => s.trim()).filter(Boolean);
      if (accepted.length === 0) {
        alert("Vui lòng nhập ít nhất 1 đáp án chấp nhận cho câu hỏi ngắn!");
        return;
      }
      finalAnswer = {
        accepted,
        numeric: shortIsNumeric,
        tolerance: shortTolerance,
      };
    }

    onSave(
      {
        type,
        text,
        points: Number(points) > 0 ? Number(points) : 1,
        options: finalOptions,
      },
      finalAnswer,
      explanation
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-indigo-200 shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
        <h3 className="font-bold text-slate-900 text-base">
          {initialQuestion?.id ? "Chỉnh sửa câu hỏi" : "Thêm câu hỏi mới"}
        </h3>
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
            showPreview
              ? "bg-indigo-50 border-indigo-200 text-indigo-700"
              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          {showPreview ? "Ẩn xem trước" : "Xem trước"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Chọn dạng câu hỏi & Điểm */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Dạng câu hỏi</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "single", label: "1 Đáp án" },
                { id: "multiple", label: "Nhiều đáp án" },
                { id: "truefalse", label: "Đúng / Sai" },
                { id: "short", label: "Điền từ/số" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id as QuestionType)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    type === t.id
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Điểm số</label>
            <input
              type="number"
              step="0.25"
              min="0.25"
              value={points}
              onChange={(e) => setPoints(parseFloat(e.target.value) || 1)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Nội dung câu hỏi */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Nội dung câu hỏi (hỗ trợ công thức Toán dạng $x^2 + y^2 = r^2$)
          </label>
          <textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Nhập nội dung câu hỏi..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* PHƯƠNG ÁN & ĐÁP ÁN: SINGLE & MULTIPLE */}
        {["single", "multiple"].includes(type) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                Các phương án lựa chọn & Chọn đáp án đúng:
              </label>
              {options.length < 6 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm phương án
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {options.map((optText, idx) => {
                const letter = letters[idx];
                const isSelected =
                  type === "single" ? singleAnswer === letter : multipleAnswers.includes(letter);

                return (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (type === "single") {
                          setSingleAnswer(letter);
                        } else {
                          const updated = isSelected
                            ? multipleAnswers.filter((a) => a !== letter)
                            : [...multipleAnswers, letter];
                          setMultipleAnswers(updated);
                        }
                      }}
                      className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-xs uppercase shrink-0 transition-all ${
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-slate-100 text-slate-600 border-slate-200 hover:border-emerald-300"
                      }`}
                      title="Bấm để đánh dấu đây là đáp án đúng"
                    >
                      {letter}
                    </button>
                    <input
                      type="text"
                      value={optText}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`Nội dung phương án ${letter.toUpperCase()}...`}
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PHƯƠNG ÁN & ĐÁP ÁN: TRUE / FALSE */}
        {type === "truefalse" && (
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 block">
              4 Ý phát biểu (a, b, c, d) & Chọn Đúng/Sai cho từng ý:
            </label>
            {["a", "b", "c", "d"].map((letter, idx) => (
              <div key={letter} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-sm text-slate-800 uppercase w-5">{letter})</span>
                <input
                  type="text"
                  value={options[idx] || ""}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  placeholder={`Phát biểu ý ${letter}...`}
                  className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setTrueFalseAnswers({ ...trueFalseAnswers, [letter]: true })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                      trueFalseAnswers[letter] === true
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    Đúng
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrueFalseAnswers({ ...trueFalseAnswers, [letter]: false })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                      trueFalseAnswers[letter] === false
                        ? "bg-rose-600 text-white border-rose-600"
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    Sai
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PHƯƠNG ÁN & ĐÁP ÁN: SHORT ANSWER */}
        {type === "short" && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Các đáp án chấp nhận (ngăn cách bởi dấu chấm phẩy ;)
              </label>
              <input
                type="text"
                value={shortAnswersStr}
                onChange={(e) => setShortAnswersStr(e.target.value)}
                placeholder="Ví dụ: 12; 12.0; mười hai"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shortIsNumeric}
                  onChange={(e) => setShortIsNumeric(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                So sánh dạng số học
              </label>
              {shortIsNumeric && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Sai số cho phép:</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={shortTolerance}
                    onChange={(e) => setShortTolerance(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 rounded-lg border border-slate-300 text-xs text-center"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Giải thích / Lời giải */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Lời giải / Giải thích chi tiết (hiển thị sau khi học sinh nộp bài)
          </label>
          <input
            type="text"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Giải thích vì sao chọn đáp án này..."
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* Preview trực tiếp */}
        {showPreview && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Xem trước hiển thị:</span>
            <QuestionRenderer
              index={0}
              mode="preview"
              question={{
                id: "preview",
                order: 1,
                type,
                text: text || "(Chưa có nội dung)",
                points,
                options: options.map((t, i) => ({ id: letters[i], text: t })),
              }}
              correctAnswer={
                type === "single"
                  ? singleAnswer
                  : type === "multiple"
                  ? multipleAnswers
                  : type === "truefalse"
                  ? trueFalseAnswers
                  : shortAnswersStr
              }
              explanation={explanation}
            />
          </div>
        )}

        {/* Nút hành động */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 transition-all"
          >
            <Check className="w-3.5 h-3.5" /> Lưu câu hỏi
          </button>
        </div>
      </form>
    </div>
  );
};
