import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { User, Subject, Chapter, Topic, Question, Test, TestAnswer } from './types.js';

const DB_FILE = path.join(process.cwd(), 'db.json');

export interface DBStructure {
  users: User[];
  subjects: Subject[];
  chapters: Chapter[];
  topics: Topic[];
  questions: Question[];
  tests: Test[];
  test_answers: TestAnswer[];
}

const initialData = (): DBStructure => {
  const salt = bcrypt.genSaltSync(10);
  const adminPassword = bcrypt.hashSync('admin123', salt);
  const userPassword = bcrypt.hashSync('user123', salt);

  const now = new Date().toISOString();

  const users: User[] = [
    {
      id: 1,
      name: 'System Administrator',
      username: 'admin',
      password: adminPassword,
      role: 'admin',
      status: 'active',
      created_at: now,
    },
    {
      id: 2,
      name: 'John Doe User',
      username: 'user',
      password: userPassword,
      role: 'user',
      status: 'active',
      created_at: now,
    },
  ];

  const subjects: Subject[] = [
    { id: 1, name: 'Mathematics', created_at: now },
    { id: 2, name: 'Science', created_at: now },
    { id: 3, name: 'History', created_at: now },
  ];

  const chapters: Chapter[] = [
    { id: 1, subject_id: 1, name: 'Algebra', created_at: now },
    { id: 2, subject_id: 1, name: 'Calculus', created_at: now },
    { id: 3, subject_id: 2, name: 'Physics', created_at: now },
    { id: 4, subject_id: 2, name: 'Chemistry', created_at: now },
    { id: 5, subject_id: 3, name: 'World War II', created_at: now },
  ];

  const topics: Topic[] = [
    { id: 1, chapter_id: 1, name: 'Quadratic Equations', created_at: now },
    { id: 2, chapter_id: 1, name: 'Linear Equations', created_at: now },
    { id: 3, chapter_id: 2, name: 'Limits & Continuity', created_at: now },
    { id: 4, chapter_id: 3, name: 'Mechanics', created_at: now },
    { id: 5, chapter_id: 4, name: 'Periodic Table', created_at: now },
    { id: 6, chapter_id: 5, name: 'Major Events', created_at: now },
  ];

  const questions: Question[] = [
    // Mathematics -> Algebra -> Quadratic Equations
    {
      id: 1,
      subject_id: 1,
      chapter_id: 1,
      topic_id: 1,
      question_text: 'What is the discriminant of the quadratic equation ax^2 + bx + c = 0?',
      option_a: 'b^2 - 4ac',
      option_b: 'b^2 + 4ac',
      option_c: '-b + sqrt(b^2 - 4ac)',
      option_d: '-b - sqrt(b^2 - 4ac)',
      correct_answer: 'A',
      created_at: now,
    },
    {
      id: 2,
      subject_id: 1,
      chapter_id: 1,
      topic_id: 1,
      question_text: 'If the discriminant of a quadratic equation is negative, the roots are:',
      option_a: 'Real and equal',
      option_b: 'Real and distinct',
      option_c: 'Complex or imaginary',
      option_d: 'Rational',
      correct_answer: 'C',
      created_at: now,
    },
    // Mathematics -> Algebra -> Linear Equations
    {
      id: 3,
      subject_id: 1,
      chapter_id: 1,
      topic_id: 2,
      question_text: 'What is the slope of the line given by the equation 2y - 4x = 8?',
      option_a: '2',
      option_b: '-2',
      option_c: '4',
      option_d: '0.5',
      correct_answer: 'A',
      created_at: now,
    },
    // Mathematics -> Calculus -> Limits
    {
      id: 4,
      subject_id: 1,
      chapter_id: 2,
      topic_id: 3,
      question_text: 'What is the limit of sin(x)/x as x approaches 0?',
      option_a: '0',
      option_b: '1',
      option_c: 'Infinity',
      option_d: 'Undefined',
      correct_answer: 'B',
      created_at: now,
    },
    // Science -> Physics -> Mechanics
    {
      id: 5,
      subject_id: 2,
      chapter_id: 3,
      topic_id: 4,
      question_text: "Which of the following equations represents Newton's second law of motion?",
      option_a: 'F = ma',
      option_b: 'p = mv',
      option_c: 'E = mc^2',
      option_d: 'v = u + at',
      correct_answer: 'A',
      created_at: now,
    },
    {
      id: 6,
      subject_id: 2,
      chapter_id: 3,
      topic_id: 4,
      question_text: "What is the approximate acceleration due to gravity on Earth's surface?",
      option_a: '9.8 m/s^2',
      option_b: '8.9 m/s^2',
      option_c: '1.6 m/s^2',
      option_d: '11.2 m/s^2',
      correct_answer: 'A',
      created_at: now,
    },
    // Science -> Chemistry -> Periodic Table
    {
      id: 7,
      subject_id: 2,
      chapter_id: 4,
      topic_id: 5,
      question_text: 'What is the chemical symbol for Gold?',
      option_a: 'Gd',
      option_b: 'Go',
      option_c: 'Au',
      option_d: 'Ag',
      correct_answer: 'C',
      created_at: now,
    },
    {
      id: 8,
      subject_id: 2,
      chapter_id: 4,
      topic_id: 5,
      question_text: 'Which gas is the most abundant in the Earth\'s atmosphere?',
      option_a: 'Oxygen',
      option_b: 'Carbon dioxide',
      option_c: 'Nitrogen',
      option_d: 'Hydrogen',
      correct_answer: 'C',
      created_at: now,
    },
    // History -> World War II -> Major Events
    {
      id: 9,
      subject_id: 3,
      chapter_id: 5,
      topic_id: 6,
      question_text: 'In which year did World War II end?',
      option_a: '1918',
      option_b: '1939',
      option_c: '1945',
      option_d: '1950',
      correct_answer: 'C',
      created_at: now,
    },
    {
      id: 10,
      subject_id: 3,
      chapter_id: 5,
      topic_id: 6,
      question_text: 'Which country was NOT part of the Axis Powers?',
      option_a: 'Germany',
      option_b: 'Italy',
      option_c: 'Japan',
      option_d: 'Soviet Union',
      correct_answer: 'D',
      created_at: now,
    },
  ];

  return {
    users,
    subjects,
    chapters,
    topics,
    questions,
    tests: [],
    test_answers: [],
  };
};

export function getDB(): DBStructure {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const data = initialData();
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
      return data;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading database file, using initial data:', err);
    return initialData();
  }
}

export function saveDB(data: DBStructure): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing database file:', err);
  }
}
