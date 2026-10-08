import type { QuestionImportItem } from "./types";
import type { ParseResult } from "./parseJson";

export async function parseQuestionsExcel(arrayBuffer: ArrayBuffer): Promise<ParseResult> {
  const XLSX = await import("xlsx");
  const errors: Array<{ index: number; message: string }> = [];
  const questions: QuestionImportItem[] = [];

  let workbook: any;
  try {
    workbook = XLSX.read(arrayBuffer, { type: "array" });
  } catch (err: any) {
    return {
      valid: false,
      questions: [],
      errors: [{ index: 0, message: "Không thể đọc file Excel: " + err.message }],
    };
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return {
      valid: false,
      questions: [],
      errors: [{ index: 0, message: "File Excel không có trang tính (sheet) nào" }],
    };
  }

  const worksheet = workbook.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  if (rows.length === 0) {
    return {
      valid: false,
      questions: [],
      errors: [{ index: 0, message: "File Excel trống hoặc không có dòng dữ liệu nào sau dòng tiêu đề" }],
    };
  }

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // Dòng 1 là header

    // Chuẩn hóa tên cột
    const getCol = (names: string[]) => {
      for (const key of Object.keys(row)) {
        const cleanKey = key.trim().toLowerCase();
        if (names.some((n) => n.toLowerCase() === cleanKey)) {
          return String(row[key]).trim();
        }
      }
      return "";
    };

    const rawType = getCol(["Loai", "Type", "Loại"]).toLowerCase();
    const rawText = getCol(["CauHoi", "Question", "Câu hỏi", "Cau Hoi"]);
    const rawAnswer = getCol(["DapAn", "Answer", "Đáp án", "Dap An"]);
    const rawPoints = getCol(["Diem", "Points", "Điểm"]);
    const rawExp = getCol(["GiaiThich", "Explanation", "Giải thích", "Giai Thich"]);
    const rawImage = getCol(["Anh", "Image", "Ảnh"]);

    if (!rawType && !rawText) {
      // Dòng trống
      return;
    }

    if (!["single", "multiple", "truefalse", "short"].includes(rawType)) {
      errors.push({
        index: rowNum,
        message: `Dòng ${rowNum}: Cột 'Loai' '${rawType}' không hợp lệ (single, multiple, truefalse, short)`,
      });
      return;
    }

    if (!rawText) {
      errors.push({ index: rowNum, message: `Dòng ${rowNum}: Nội dung câu hỏi không được để trống` });
      return;
    }

    const points = parseFloat(rawPoints) > 0 ? parseFloat(rawPoints) : 1;

    if (rawType === "single") {
      const optA = getCol(["A"]);
      const optB = getCol(["B"]);
      const optC = getCol(["C"]);
      const optD = getCol(["D"]);
      const optE = getCol(["E"]);
      const optF = getCol(["F"]);

      const opts = [optA, optB, optC, optD, optE, optF].filter((o) => o !== "");
      if (opts.length < 2) {
        errors.push({ index: rowNum, message: `Dòng ${rowNum}: Cần ít nhất 2 phương án (cột A, B...)` });
        return;
      }
      if (!rawAnswer) {
        errors.push({ index: rowNum, message: `Dòng ${rowNum}: Chưa có đáp án (A, B, C...)` });
        return;
      }

      questions.push({
        type: "single",
        text: rawText,
        options: opts,
        answer: rawAnswer.toLowerCase(),
        points,
        explanation: rawExp,
        imageUrl: rawImage || null,
      });
    } else if (rawType === "multiple") {
      const optA = getCol(["A"]);
      const optB = getCol(["B"]);
      const optC = getCol(["C"]);
      const optD = getCol(["D"]);
      const optE = getCol(["E"]);
      const optF = getCol(["F"]);

      const opts = [optA, optB, optC, optD, optE, optF].filter((o) => o !== "");
      if (opts.length < 2) {
        errors.push({ index: rowNum, message: `Dòng ${rowNum}: Cần ít nhất 2 phương án` });
        return;
      }

      const answers = rawAnswer.split(",").map((a) => a.trim().toLowerCase()).filter(Boolean);
      if (answers.length === 0) {
        errors.push({ index: rowNum, message: `Dòng ${rowNum}: Cần ít nhất 1 đáp án đúng (ví dụ: A,C)` });
        return;
      }

      questions.push({
        type: "multiple",
        text: rawText,
        options: opts,
        answer: answers,
        points,
        explanation: rawExp,
        imageUrl: rawImage || null,
      });
    } else if (rawType === "truefalse") {
      const optA = getCol(["A"]);
      const optB = getCol(["B"]);
      const optC = getCol(["C"]);
      const optD = getCol(["D"]);

      const opts = [optA, optB, optC, optD];
      if (opts.some((o) => o === "")) {
        errors.push({ index: rowNum, message: `Dòng ${rowNum}: Cần đủ 4 ý a, b, c, d trong cột A, B, C, D` });
        return;
      }

      // Format: D,S,D,D hoặc T,F,T,T hoặc 1,0,1,1
      const ansParts = rawAnswer.split(",").map((p) => p.trim().toUpperCase());
      if (ansParts.length !== 4) {
        errors.push({
          index: rowNum,
          message: `Dòng ${rowNum}: Đáp án Đúng/Sai cần đủ 4 giá trị phân cách bởi dấu phẩy (ví dụ: D,S,D,D)`,
        });
        return;
      }

      const boolAnswers = ansParts.map((p) => p === "D" || p === "Đ" || p === "T" || p === "TRUE" || p === "1");

      questions.push({
        type: "truefalse",
        text: rawText,
        options: opts,
        answer: boolAnswers,
        points,
        explanation: rawExp,
        imageUrl: rawImage || null,
      });
    } else if (rawType === "short") {
      // Đáp án phân cách bằng dấu ;
      const accepted = rawAnswer.split(";").map((a) => a.trim()).filter(Boolean);
      if (accepted.length === 0) {
        errors.push({ index: rowNum, message: `Dòng ${rowNum}: Cần ít nhất 1 đáp án được chấp nhận` });
        return;
      }

      // Tự động phát hiện nếu tất cả accepted đều là số
      const isNumeric = accepted.every((a) => !isNaN(parseFloat(a)));

      questions.push({
        type: "short",
        text: rawText,
        options: [],
        answer: accepted,
        numeric: isNumeric,
        points,
        explanation: rawExp,
        imageUrl: rawImage || null,
      });
    }
  });

  return {
    valid: errors.length === 0,
    questions,
    errors,
  };
}
