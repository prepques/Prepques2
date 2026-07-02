export interface User {
  id: number;
  name: string;
  username: string;
  password?: string; // Optional for security when sending to client
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Subject {
  id: number;
  name: string;
  created_at: string;
}

export interface Chapter {
  id: number;
  subject_id: number;
  name: string;
  created_at: string;
  subject_name?: string; // Joined field
}

export interface Topic {
  id: number;
  chapter_id: number;
  name: string;
  created_at: string;
  chapter_name?: string; // Joined field
  subject_id?: number; // Joined field
  subject_name?: string; // Joined field
}

export interface Question {
  id: number;
  subject_id: number;
  chapter_id: number;
  topic_id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  created_at: string;
  subject_name?: string; // Joined field
  chapter_name?: string; // Joined field
  topic_name?: string; // Joined field
  explanation?: string;
  correct_feedback?: string;
  wrong_feedback?: string;
  is_html?: boolean;
}

export interface Test {
  id: number;
  user_id: number;
  start_time: string;
  end_time: string;
  total_questions: number;
  score: number;
  user_name?: string; // Joined field
  answers?: TestAnswer[];
}

export interface TestAnswer {
  id: number;
  test_id: number;
  question_id: number;
  selected_answer: 'A' | 'B' | 'C' | 'D' | '';
  is_correct: boolean;
  time_taken: number; // in seconds
  question_text?: string;
}
