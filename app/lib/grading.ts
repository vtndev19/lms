import type { Question, AnswerKey, QuestionResultDetail } from "./types";

export const TRUE_FALSE_DEFAULT_RATIOS: Record<number, number> = {
  0: 0,
  1: 0.1,
  2: 0.25,
  3: 0.5,
  4: 1.0,
};

export function normalizeShortAnswer(raw: any): string {
  if (raw === null || raw === undefined) return "";
  return String(raw).trim().toLowerCase().replace(/,/g, ".");
}

export function gradeSingleChoice(correct: string, studentAnswer: any, points: number): number {
  if (!studentAnswer) return 0;
  return String(studentAnswer).trim().toLowerCase() === String(correct).trim().toLowerCase() ? points : 0;
}

export function gradeMultipleChoice(correct: string[], studentAnswer: any, points: number): number {
  if (!Array.isArray(studentAnswer) || studentAnswer.length === 0) return 0;
  const correctSet = new Set(correct.map((c) => String(c).trim().toLowerCase()));
  const studentSet = new Set(studentAnswer.map((a) => String(a).trim().toLowerCase()));

  if (correctSet.size !== studentSet.size) return 0;
  for (const val of correctSet) {
    if (!studentSet.has(val)) return 0;
  }
  return points;
}

export function gradeTrueFalse(
  correct: Record<string, boolean>,
  studentAnswer: any,
  points: number
): number {
  if (!studentAnswer || typeof studentAnswer !== "object") return 0;
  let matchCount = 0;
  for (const k of ["a", "b", "c", "d"]) {
    const expected = correct[k];
    const actual = studentAnswer[k];
    if (expected !== undefined && actual !== undefined && actual !== null) {
      if (Boolean(actual) === Boolean(expected)) {
        matchCount++;
      }
    }
  }
  const ratio = TRUE_FALSE_DEFAULT_RATIOS[matchCount] ?? 0;
  return Math.round(ratio * points * 100) / 100;
}

export function gradeShortAnswer(
  config: { accepted: string[]; numeric?: boolean; tolerance?: number },
  studentAnswer: any,
  points: number
): number {
  const normalized = normalizeShortAnswer(studentAnswer);
  if (!normalized) return 0;

  if (config.numeric) {
    const studentNum = parseFloat(normalized);
    if (isNaN(studentNum)) return 0;
    const tolerance = config.tolerance ?? 0;

    for (const acc of config.accepted) {
      const accNum = parseFloat(normalizeShortAnswer(acc));
      if (!isNaN(accNum)) {
        if (Math.abs(studentNum - accNum) <= tolerance) {
          return points;
        }
      }
    }
    return 0;
  }

  for (const acc of config.accepted) {
    if (normalizeShortAnswer(acc) === normalized) {
      return points;
    }
  }
  return 0;
}

export function evaluateAttempt(
  questions: Question[],
  answerKeys: Record<string, AnswerKey>,
  answers: Record<string, any>,
  showAnswers: boolean = true
): { score: number; maxScore: number; detail: Record<string, QuestionResultDetail> } {
  let totalScore = 0;
  let totalMaxScore = 0;
  const detail: Record<string, QuestionResultDetail> = {};

  questions.forEach((q) => {
    const key = answerKeys[q.id];
    const studentAns = answers[q.id];
    const points = q.points || 1;
    totalMaxScore += points;

    let earned = 0;
    if (key) {
      switch (q.type) {
        case "single":
          earned = gradeSingleChoice(key.correct as string, studentAns, points);
          break;
        case "multiple":
          earned = gradeMultipleChoice(key.correct as string[], studentAns, points);
          break;
        case "truefalse":
          earned = gradeTrueFalse(key.correct as Record<string, boolean>, studentAns, points);
          break;
        case "short":
          earned = gradeShortAnswer(key.correct as any, studentAns, points);
          break;
      }
    }

    totalScore += earned;

    detail[q.id] = {
      earned,
      ...(showAnswers && key
        ? {
            correct: key.correct,
            explanation: key.explanation || "",
          }
        : {}),
    };
  });

  return {
    score: Math.round(totalScore * 100) / 100,
    maxScore: Math.round(totalMaxScore * 100) / 100,
    detail,
  };
}
