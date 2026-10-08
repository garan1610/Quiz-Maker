import { parseBank } from "./quiz";

export const publicQuiz = {
  id: "ho-chi-minh-v1",
  title: "Tư tưởng Hồ Chí Minh",
  jsonUrl: "/question-bank/Recall_Tu_tuong_Ho_Chi_Minh.json",
  sourceUrl: "/question-bank/Đáp án chi tiết đề thi thử giữa kỳ môn tư tưởng Hồ Chí Minh.docx",
  sourceName: "Đáp án chi tiết đề thi thử giữa kỳ môn tư tưởng Hồ Chí Minh.docx",
  questionCount: 200,
};

export async function loadPublicQuiz() {
  const response = await fetch(publicQuiz.jsonUrl);
  if (!response.ok) throw new Error("The public quiz could not be loaded. Please try again.");
  const parsed = parseBank(await response.text());
  if (!parsed.bank) throw new Error("The public quiz file is invalid. Please contact the site owner.");
  return parsed.bank;
}
