import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/auth/login.tsx"),
  route("register", "routes/auth/register.tsx"),

  // Tuyến đường Giáo viên (Teacher)
  route("t", "routes/teacher/dashboard.tsx"),
  route("t/classes", "routes/teacher/classes.tsx"),
  route("t/students", "routes/teacher/students.tsx"),
  route("t/exams", "routes/teacher/exams.tsx"),
  route("t/exams/new", "routes/teacher/exam-create.tsx"),
  route("t/exams/:id", "routes/teacher/exam-edit.tsx"),
  route("t/exams/:id/questions", "routes/teacher/exam-questions.tsx"),
  route("t/exams/:id/files", "routes/teacher/exam-files.tsx"),
  route("t/exams/:id/results", "routes/teacher/exam-results.tsx"),

  // Tuyến đường Học sinh (Student)
  route("s", "routes/student/dashboard.tsx"),
  route("s/join", "routes/student/join.tsx"),
  route("s/exams/:id", "routes/student/exam-detail.tsx"),
  route("s/attempts/:id", "routes/student/take-exam.tsx"),
  route("s/attempts/:id/result", "routes/student/exam-result.tsx"),
] satisfies RouteConfig;
