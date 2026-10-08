import { parseBank } from "./quiz.ts";

const sample = {
  "schemaVersion": 2,
  "title": "The science of learning",
  "questions": [
    {
      "section": "Memory & practice",
      "question": "Which study technique asks you to recall information without looking at your notes?",
      "answers": {
        "A": "Highlighting key sentences",
        "B": "Active recall",
        "C": "Rereading a chapter",
        "D": "Copying your notes"
      },
      "correct_answers": [
        "B"
      ],
      "explanation": "B is correct. Active recall means retrieving information from memory. Closing your notes and answering a question gives you a chance to practice retrieval and find gaps in your understanding."
    },
    {
      "section": "Memory & practice",
      "question": "What does spaced practice mean?",
      "answers": {
        "A": "Studying everything in one long session",
        "B": "Leaving blank spaces in your notes",
        "C": "Spreading study sessions over time",
        "D": "Studying in a different room each time"
      },
      "correct_answers": [
        "C"
      ],
      "explanation": "C is correct. Spaced practice distributes learning across separate sessions instead of concentrating it into a single sitting."
    },
    {
      "section": "Memory & practice",
      "question": "Which activities involve retrieving information from memory? Select all that apply.",
      "answers": {
        "A": "Answering a practice question with your notes closed",
        "B": "Reading a highlighted paragraph again",
        "C": "Explaining a concept from memory",
        "D": "Looking at a flashcard answer before trying"
      },
      "correct_answers": [
        "A",
        "C"
      ],
      "explanation": "A and C require you to retrieve information. Reading a paragraph or looking at an answer supplies the information instead. For this question, both correct choices must be selected."
    },
    {
      "section": "Building understanding",
      "question": "You get a practice question wrong. What is the most useful next step?",
      "answers": {
        "A": "Read the explanation and identify the gap in your understanding",
        "B": "Memorize only the letter of the correct choice",
        "C": "Avoid the topic in future sessions",
        "D": "Assume the next question will be easier"
      },
      "correct_answers": [
        "A"
      ],
      "explanation": "A is correct. Reviewing why an answer is correct helps you understand the concept and decide what to practice next. A choice's letter alone tells you nothing about the underlying idea."
    },
    {
      "section": "Building understanding",
      "question": "Which description best matches interleaving?",
      "answers": {
        "A": "Practicing only one problem type until the session ends",
        "B": "Switching between study and social media",
        "C": "Reading without taking breaks",
        "D": "Mixing related problem types within a practice session"
      },
      "correct_answers": [
        "D"
      ],
      "explanation": "D is correct. Interleaving mixes related topics or problem types, giving you practice in deciding which approach a problem needs."
    },
    {
      "section": "Building understanding",
      "question": "What is the main purpose of a practice quiz?",
      "answers": {
        "A": "To guarantee a perfect exam score",
        "B": "To replace every other learning activity",
        "C": "To practice retrieval and reveal what needs more attention",
        "D": "To finish as quickly as possible"
      },
      "correct_answers": [
        "C"
      ],
      "explanation": "C is correct. A practice quiz offers a chance to retrieve what you know and identify what to revisit. A score is useful feedback, not a guarantee of future performance."
    }
  ]
};

const parsed = parseBank(JSON.stringify(sample));
if (!parsed.bank) throw new Error(parsed.errors.join(" "));
export const sampleBank = parsed.bank;
