import type { QuestionImportItem } from "./types";

export interface ParseResult {
  valid: boolean;
  questions: QuestionImportItem[];
  errors: Array<{ index: number; message: string }>;
}

export function parseQuestionsJson(jsonText: string): ParseResult {
  const errors: Array<{ index: number; message: string }> = [];
  const questions: QuestionImportItem[] = [];

  let data: any;
  try {
    data = JSON.parse(jsonText);
  } catch (err: any) {
    return {
      valid: false,
      questions: [],
      errors: [{ index: 0, message: "File JSON không hợp lệ (sai cú pháp): " + err.message }],
    };
  }

  const list = Array.isArray(data) ? data : data.questions;
  if (!Array.isArray(list)) {
    return {
      valid: false,
      questions: [],
      errors: [{ index: 0, message: "Cấu trúc JSON cần có mảng 'questions' hoặc là mảng các câu hỏi" }],
    };
  }

  list.forEach((item: any, idx: number) => {
    const itemNum = idx + 1;
    if (!item.type || !["single", "multiple", "truefalse", "short"].includes(item.type)) {
      errors.push({
        index: itemNum,
        message: `Câu ${itemNum}: Dạng câu '${item.type}' không hợp lệ (cho phép: single, multiple, truefalse, short)`,
      });
      return;
    }

    if (!item.text || String(item.text).trim() === "") {
      errors.push({ index: itemNum, message: `Câu ${itemNum}: Nội dung câu hỏi không được để trống` });
      return;
    }

    // Kiểm tra theo loại câu
    if (["single", "multiple"].includes(item.type)) {
      if (!Array.isArray(item.options) || item.options.length < 2 || item.options.length > 6) {
        errors.push({
          index: itemNum,
          message: `Câu ${itemNum}: Phải có từ 2 đến 6 phương án lựa chọn`,
        });
        return;
      }
      if (!item.answer) {
        errors.push({ index: itemNum, message: `Câu ${itemNum}: Chưa có đáp án đúng` });
        return;
      }
    } else if (item.type === "truefalse") {
      if (!Array.isArray(item.options) || item.options.length !== 4) {
        errors.push({
          index: itemNum,
          message: `Câu ${itemNum}: Dạng Đúng/Sai yêu cầu đúng 4 ý phát biểu`,
        });
        return;
      }
    } else if (item.type === "short") {
      if (!item.answer) {
        errors.push({ index: itemNum, message: `Câu ${itemNum}: Chưa có đáp án chấp nhận` });
        return;
      }
    }

    questions.push({
      type: item.type,
      text: String(item.text).trim(),
      options: item.options ? item.options.map((o: any) => String(o)) : [],
      answer: item.answer,
      points: Number(item.points) > 0 ? Number(item.points) : 1,
      explanation: item.explanation || "",
      numeric: Boolean(item.numeric),
      tolerance: Number(item.tolerance) || 0,
      imageUrl: item.imageUrl || null,
    });
  });

  return {
    valid: errors.length === 0,
    questions,
    errors,
  };
}
