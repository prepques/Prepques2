import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { getDB, saveDB } from './src/db.js';
import { User, Subject, Chapter, Topic, Question, Test, TestAnswer } from './src/types.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_revision_system';

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[REQ] ${req.method} ${req.url} - Status: ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Auth Middleware
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: 'admin' | 'user';
  };
}

const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const customHeader = req.headers['x-auth-token'];
  
  let token: string | undefined;
  
  if (customHeader) {
    token = typeof customHeader === 'string' ? customHeader : customHeader[0];
  } else if (authHeader) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }
    req.user = decoded as { id: number; username: string; role: 'admin' | 'user' };
    next();
  });
};

const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin permissions required' });
    return;
  }
  next();
};

// --- AUTHENTICATION APIS ---

// Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const db = getDB();
  const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (!user) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  if (user.status !== 'active') {
    res.status(403).json({ error: 'User account is deactivated' });
    return;
  }

  const isMatch = bcrypt.compareSync(password, user.password || '');
  if (!isMatch) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      status: user.status,
    },
  });
});

// Get current user info
app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const db = getDB();
  const user = db.users.find(u => u.id === req.user?.id);

  if (!user) {
    res.status(404).json({ error: 'User profile not found' });
    return;
  }

  res.json({
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      status: user.status,
    },
  });
});

// Update current user profile
app.put('/api/auth/profile', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { name, password } = req.body;
  if (!name || name.trim() === '') {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const db = getDB();
  const index = db.users.findIndex(u => u.id === req.user?.id);

  if (index === -1) {
    res.status(404).json({ error: 'User profile not found' });
    return;
  }

  db.users[index].name = name.trim();

  if (password && password.trim() !== '') {
    const salt = bcrypt.genSaltSync(10);
    db.users[index].password = bcrypt.hashSync(password, salt);
  }

  saveDB(db);

  res.json({
    user: {
      id: db.users[index].id,
      name: db.users[index].name,
      username: db.users[index].username,
      role: db.users[index].role,
      status: db.users[index].status,
    },
    message: 'Profile updated successfully',
  });
});


// --- SUBJECTS CRUD APIS ---

// Get all subjects
app.get('/api/subjects', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const query = (req.query.q || '').toString().toLowerCase();

  let results = db.subjects;
  if (query) {
    results = results.filter(s => s.name.toLowerCase().includes(query));
  }

  res.json(results);
});

// Add subject
app.post('/api/subjects', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    res.status(400).json({ error: 'Subject name is required' });
    return;
  }

  const db = getDB();
  const exists = db.subjects.some(s => s.name.toLowerCase() === name.trim().toLowerCase());
  if (exists) {
    res.status(400).json({ error: 'Subject with this name already exists' });
    return;
  }

  const newSubject: Subject = {
    id: db.subjects.length > 0 ? Math.max(...db.subjects.map(s => s.id)) + 1 : 1,
    name: name.trim(),
    created_at: new Date().toISOString(),
  };

  db.subjects.push(newSubject);
  saveDB(db);

  res.status(201).json(newSubject);
});

// Edit subject
app.put('/api/subjects/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { name } = req.body;

  if (!name || name.trim() === '') {
    res.status(400).json({ error: 'Subject name is required' });
    return;
  }

  const db = getDB();
  const index = db.subjects.findIndex(s => s.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Subject not found' });
    return;
  }

  const exists = db.subjects.some(s => s.id !== id && s.name.toLowerCase() === name.trim().toLowerCase());
  if (exists) {
    res.status(400).json({ error: 'Subject with this name already exists' });
    return;
  }

  db.subjects[index].name = name.trim();
  saveDB(db);

  res.json(db.subjects[index]);
});

// Delete subject (cascades or prevents?)
app.delete('/api/subjects/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const db = getDB();

  const index = db.subjects.findIndex(s => s.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Subject not found' });
    return;
  }

  // Delete subject, and cascade delete chapters, topics, questions
  db.subjects = db.subjects.filter(s => s.id !== id);
  const chapterIds = db.chapters.filter(c => c.subject_id === id).map(c => c.id);
  db.chapters = db.chapters.filter(c => c.subject_id !== id);
  db.topics = db.topics.filter(t => !chapterIds.includes(t.chapter_id));
  db.questions = db.questions.filter(q => q.subject_id !== id);

  saveDB(db);
  res.json({ success: true, message: 'Subject and all related chapters, topics, and questions deleted' });
});


// --- CHAPTERS CRUD APIS ---

// Get all chapters
app.get('/api/chapters', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const subjectId = req.query.subject_id ? parseInt(req.query.subject_id as string) : null;

  let results = db.chapters.map(c => {
    const subject = db.subjects.find(s => s.id === c.subject_id);
    return {
      ...c,
      subject_name: subject ? subject.name : 'Unknown Subject',
    };
  });

  if (subjectId) {
    results = results.filter(c => c.subject_id === subjectId);
  }

  res.json(results);
});

// Add chapter
app.post('/api/chapters', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { name, subject_id } = req.body;

  if (!name || name.trim() === '') {
    res.status(400).json({ error: 'Chapter name is required' });
    return;
  }
  if (!subject_id) {
    res.status(400).json({ error: 'Subject selection is mandatory' });
    return;
  }

  const db = getDB();
  const subExists = db.subjects.some(s => s.id === parseInt(subject_id));
  if (!subExists) {
    res.status(400).json({ error: 'Selected subject does not exist' });
    return;
  }

  const exists = db.chapters.some(
    c => c.subject_id === parseInt(subject_id) && c.name.toLowerCase() === name.trim().toLowerCase()
  );
  if (exists) {
    res.status(400).json({ error: 'Chapter with this name already exists in this subject' });
    return;
  }

  const newChapter: Chapter = {
    id: db.chapters.length > 0 ? Math.max(...db.chapters.map(c => c.id)) + 1 : 1,
    subject_id: parseInt(subject_id),
    name: name.trim(),
    created_at: new Date().toISOString(),
  };

  db.chapters.push(newChapter);
  saveDB(db);

  res.status(201).json(newChapter);
});

// Edit chapter
app.put('/api/chapters/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { name, subject_id } = req.body;

  if (!name || name.trim() === '') {
    res.status(400).json({ error: 'Chapter name is required' });
    return;
  }
  if (!subject_id) {
    res.status(400).json({ error: 'Subject is mandatory' });
    return;
  }

  const db = getDB();
  const index = db.chapters.findIndex(c => c.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Chapter not found' });
    return;
  }

  const exists = db.chapters.some(
    c => c.id !== id && c.subject_id === parseInt(subject_id) && c.name.toLowerCase() === name.trim().toLowerCase()
  );
  if (exists) {
    res.status(400).json({ error: 'Chapter with this name already exists in this subject' });
    return;
  }

  db.chapters[index].name = name.trim();
  db.chapters[index].subject_id = parseInt(subject_id);
  saveDB(db);

  res.json(db.chapters[index]);
});

// Delete chapter
app.delete('/api/chapters/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const db = getDB();

  const index = db.chapters.findIndex(c => c.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Chapter not found' });
    return;
  }

  // Cascade delete topics and questions for this chapter
  db.chapters = db.chapters.filter(c => c.id !== id);
  db.topics = db.topics.filter(t => t.chapter_id !== id);
  db.questions = db.questions.filter(q => q.chapter_id !== id);

  saveDB(db);
  res.json({ success: true, message: 'Chapter and all related topics and questions deleted' });
});


// --- TOPICS CRUD APIS ---

// Get all topics
app.get('/api/topics', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const chapterId = req.query.chapter_id ? parseInt(req.query.chapter_id as string) : null;

  let results = db.topics.map(t => {
    const chapter = db.chapters.find(c => c.id === t.chapter_id);
    const subject = chapter ? db.subjects.find(s => s.id === chapter.subject_id) : null;
    return {
      ...t,
      chapter_name: chapter ? chapter.name : 'Unknown Chapter',
      subject_id: chapter ? chapter.subject_id : undefined,
      subject_name: subject ? subject.name : 'Unknown Subject',
    };
  });

  if (chapterId) {
    results = results.filter(t => t.chapter_id === chapterId);
  }

  res.json(results);
});

// Add topic
app.post('/api/topics', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { name, chapter_id } = req.body;

  if (!name || name.trim() === '') {
    res.status(400).json({ error: 'Topic name is required' });
    return;
  }
  if (!chapter_id) {
    res.status(400).json({ error: 'Chapter selection is mandatory' });
    return;
  }

  const db = getDB();
  const chapExists = db.chapters.some(c => c.id === parseInt(chapter_id));
  if (!chapExists) {
    res.status(400).json({ error: 'Selected chapter does not exist' });
    return;
  }

  const exists = db.topics.some(
    t => t.chapter_id === parseInt(chapter_id) && t.name.toLowerCase() === name.trim().toLowerCase()
  );
  if (exists) {
    res.status(400).json({ error: 'Topic with this name already exists in this chapter' });
    return;
  }

  const newTopic: Topic = {
    id: db.topics.length > 0 ? Math.max(...db.topics.map(t => t.id)) + 1 : 1,
    chapter_id: parseInt(chapter_id),
    name: name.trim(),
    created_at: new Date().toISOString(),
  };

  db.topics.push(newTopic);
  saveDB(db);

  res.status(201).json(newTopic);
});

// Edit topic
app.put('/api/topics/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { name, chapter_id } = req.body;

  if (!name || name.trim() === '') {
    res.status(400).json({ error: 'Topic name is required' });
    return;
  }
  if (!chapter_id) {
    res.status(400).json({ error: 'Chapter is mandatory' });
    return;
  }

  const db = getDB();
  const index = db.topics.findIndex(t => t.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Topic not found' });
    return;
  }

  const exists = db.topics.some(
    t => t.id !== id && t.chapter_id === parseInt(chapter_id) && t.name.toLowerCase() === name.trim().toLowerCase()
  );
  if (exists) {
    res.status(400).json({ error: 'Topic with this name already exists in this chapter' });
    return;
  }

  db.topics[index].name = name.trim();
  db.topics[index].chapter_id = parseInt(chapter_id);
  saveDB(db);

  res.json(db.topics[index]);
});

// Delete topic
app.delete('/api/topics/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const db = getDB();

  const index = db.topics.findIndex(t => t.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Topic not found' });
    return;
  }

  // Cascade delete questions in this topic
  db.topics = db.topics.filter(t => t.id !== id);
  db.questions = db.questions.filter(q => q.topic_id !== id);

  saveDB(db);
  res.json({ success: true, message: 'Topic and related questions deleted' });
});


// --- QUESTIONS CRUD APIS ---

// Get all questions
app.get('/api/questions', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const { subject_id, chapter_id, topic_id, q } = req.query;

  let results = db.questions.map(question => {
    const subject = db.subjects.find(s => s.id === question.subject_id);
    const chapter = db.chapters.find(c => c.id === question.chapter_id);
    const topic = db.topics.find(t => t.id === question.topic_id);
    return {
      ...question,
      subject_name: subject ? subject.name : 'Unknown Subject',
      chapter_name: chapter ? chapter.name : 'Unknown Chapter',
      topic_name: topic ? topic.name : 'Unknown Topic',
    };
  });

  if (subject_id) {
    results = results.filter(question => question.subject_id === parseInt(subject_id as string));
  }
  if (chapter_id) {
    results = results.filter(question => question.chapter_id === parseInt(chapter_id as string));
  }
  if (topic_id) {
    results = results.filter(question => question.topic_id === parseInt(topic_id as string));
  }

  const query = (q || '').toString().toLowerCase();
  if (query) {
    results = results.filter(question =>
      question.question_text.toLowerCase().includes(query) ||
      question.option_a.toLowerCase().includes(query) ||
      question.option_b.toLowerCase().includes(query) ||
      question.option_c.toLowerCase().includes(query) ||
      question.option_d.toLowerCase().includes(query)
    );
  }

  res.json(results);
});

// Add question
app.post('/api/questions', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const {
    subject_id,
    chapter_id,
    topic_id,
    question_text,
    option_a,
    option_b,
    option_c,
    option_d,
    correct_answer,
    explanation,
    correct_feedback,
    wrong_feedback,
    is_html,
  } = req.body;

  if (
    !subject_id ||
    !chapter_id ||
    !topic_id ||
    !question_text ||
    !option_a ||
    !option_b ||
    !option_c ||
    !option_d ||
    !correct_answer
  ) {
    res.status(400).json({ error: 'All fields are required to add a question' });
    return;
  }

  if (!['A', 'B', 'C', 'D'].includes(correct_answer)) {
    res.status(400).json({ error: 'Correct Answer must be A, B, C, or D' });
    return;
  }

  const db = getDB();
  const newQuestion: Question = {
    id: db.questions.length > 0 ? Math.max(...db.questions.map(q => q.id)) + 1 : 1,
    subject_id: parseInt(subject_id),
    chapter_id: parseInt(chapter_id),
    topic_id: parseInt(topic_id),
    question_text: question_text.trim(),
    option_a: option_a.trim(),
    option_b: option_b.trim(),
    option_c: option_c.trim(),
    option_d: option_d.trim(),
    correct_answer: correct_answer as 'A' | 'B' | 'C' | 'D',
    created_at: new Date().toISOString(),
    explanation: explanation ? explanation.trim() : '',
    correct_feedback: correct_feedback ? correct_feedback.trim() : '',
    wrong_feedback: wrong_feedback ? wrong_feedback.trim() : '',
    is_html: is_html ? true : false,
  };

  db.questions.push(newQuestion);
  saveDB(db);

  res.status(201).json(newQuestion);
});

// Bulk add questions (from Excel)
app.post('/api/questions/bulk', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { subject_id, chapter_id, topic_id, questions } = req.body;

  if (!subject_id || !chapter_id || !topic_id) {
    res.status(400).json({ error: 'Subject, chapter, and topic are mandatory' });
    return;
  }

  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    res.status(400).json({ error: 'No questions provided for upload' });
    return;
  }

  const db = getDB();
  const subExists = db.subjects.some(s => s.id === parseInt(subject_id));
  const chapExists = db.chapters.some(c => c.id === parseInt(chapter_id));
  const topExists = db.topics.some(t => t.id === parseInt(topic_id));

  if (!subExists || !chapExists || !topExists) {
    res.status(400).json({ error: 'Selected subject, chapter, or topic does not exist' });
    return;
  }

  const newQuestions: Question[] = [];
  let currentMaxId = db.questions.length > 0 ? Math.max(...db.questions.map(q => q.id)) : 0;
  const now = new Date().toISOString();

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const {
      question_text,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_answer,
      explanation,
      is_html,
    } = q;

    if (
      question_text === undefined || question_text === null || question_text.toString().trim() === '' ||
      option_a === undefined || option_a === null || option_a.toString().trim() === '' ||
      option_b === undefined || option_b === null || option_b.toString().trim() === '' ||
      option_c === undefined || option_c === null || option_c.toString().trim() === '' ||
      option_d === undefined || option_d === null || option_d.toString().trim() === '' ||
      correct_answer === undefined || correct_answer === null || correct_answer.toString().trim() === ''
    ) {
      res.status(400).json({ error: `Question at row ${i + 1} has missing required fields. Ensure Question Text, Option A, B, C, D, and Correct Answer are all filled.` });
      return;
    }

    const cleanAnswer = correct_answer.toString().trim().toUpperCase();
    if (!['A', 'B', 'C', 'D'].includes(cleanAnswer)) {
      res.status(400).json({ error: `Question at row ${i + 1} has an invalid Correct Answer: "${correct_answer}". It must be A, B, C, or D.` });
      return;
    }

    currentMaxId++;
    newQuestions.push({
      id: currentMaxId,
      subject_id: parseInt(subject_id),
      chapter_id: parseInt(chapter_id),
      topic_id: parseInt(topic_id),
      question_text: question_text.toString().trim(),
      option_a: option_a.toString().trim(),
      option_b: option_b.toString().trim(),
      option_c: option_c.toString().trim(),
      option_d: option_d.toString().trim(),
      correct_answer: cleanAnswer as 'A' | 'B' | 'C' | 'D',
      explanation: explanation ? explanation.toString().trim() : '',
      correct_feedback: '',
      wrong_feedback: '',
      is_html: is_html === true || is_html === 'true' || is_html === 1 || is_html === '1' || is_html === 'Y' || is_html === 'y' || is_html === 'Yes' || is_html === 'yes' || is_html === 'TRUE',
      created_at: now,
    });
  }

  db.questions.push(...newQuestions);
  saveDB(db);

  res.status(201).json({ success: true, count: newQuestions.length });
});

// Edit question
app.put('/api/questions/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const {
    subject_id,
    chapter_id,
    topic_id,
    question_text,
    option_a,
    option_b,
    option_c,
    option_d,
    correct_answer,
    explanation,
    correct_feedback,
    wrong_feedback,
    is_html,
  } = req.body;

  if (
    !subject_id ||
    !chapter_id ||
    !topic_id ||
    !question_text ||
    !option_a ||
    !option_b ||
    !option_c ||
    !option_d ||
    !correct_answer
  ) {
    res.status(400).json({ error: 'All fields are required to update a question' });
    return;
  }

  if (!['A', 'B', 'C', 'D'].includes(correct_answer)) {
    res.status(400).json({ error: 'Correct Answer must be A, B, C, or D' });
    return;
  }

  const db = getDB();
  const index = db.questions.findIndex(q => q.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Question not found' });
    return;
  }

  db.questions[index] = {
    ...db.questions[index],
    subject_id: parseInt(subject_id),
    chapter_id: parseInt(chapter_id),
    topic_id: parseInt(topic_id),
    question_text: question_text.trim(),
    option_a: option_a.trim(),
    option_b: option_b.trim(),
    option_c: option_c.trim(),
    option_d: option_d.trim(),
    correct_answer: correct_answer as 'A' | 'B' | 'C' | 'D',
    explanation: explanation ? explanation.trim() : '',
    correct_feedback: correct_feedback ? correct_feedback.trim() : '',
    wrong_feedback: wrong_feedback ? wrong_feedback.trim() : '',
    is_html: is_html ? true : false,
  };

  saveDB(db);
  res.json(db.questions[index]);
});

// Delete question
app.delete('/api/questions/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const db = getDB();

  const index = db.questions.findIndex(q => q.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Question not found' });
    return;
  }

  db.questions = db.questions.filter(q => q.id !== id);
  saveDB(db);

  res.json({ success: true, message: 'Question deleted' });
});


// --- USER MANAGEMENT APIS ---

// Get all users (Admin only)
app.get('/api/users', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  // Don't send user password hashes
  const usersClean = db.users.map(u => {
    const { password, ...rest } = u;
    return rest;
  });
  res.json(usersClean);
});

// Add user
app.post('/api/users', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { name, username, password, role } = req.body;

  if (!name || !username || !password || !role) {
    res.status(400).json({ error: 'Name, username, password, and role are required' });
    return;
  }

  if (!['admin', 'user'].includes(role)) {
    res.status(400).json({ error: 'Role must be admin or user' });
    return;
  }

  const db = getDB();
  const exists = db.users.some(u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (exists) {
    res.status(400).json({ error: 'Username is already taken' });
    return;
  }

  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(password, salt);

  const newUser: User = {
    id: db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1,
    name: name.trim(),
    username: username.trim().toLowerCase(),
    password: hashedPassword,
    role: role as 'admin' | 'user',
    status: 'active',
    created_at: new Date().toISOString(),
  };

  db.users.push(newUser);
  saveDB(db);

  const { password: _, ...userWithoutPassword } = newUser;
  res.status(201).json(userWithoutPassword);
});

// Edit user
app.put('/api/users/:id', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { name, role, status } = req.body;

  const db = getDB();
  const index = db.users.findIndex(u => u.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (name) db.users[index].name = name.trim();
  if (role && ['admin', 'user'].includes(role)) db.users[index].role = role as 'admin' | 'user';
  if (status && ['active', 'inactive'].includes(status)) db.users[index].status = status as 'active' | 'inactive';

  saveDB(db);

  const { password: _, ...userWithoutPassword } = db.users[index];
  res.json(userWithoutPassword);
});

// Reset password
app.put('/api/users/:id/reset-password', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { password } = req.body;

  if (!password || password.trim() === '') {
    res.status(400).json({ error: 'New password is required' });
    return;
  }

  const db = getDB();
  const index = db.users.findIndex(u => u.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const salt = bcrypt.genSaltSync(10);
  db.users[index].password = bcrypt.hashSync(password, salt);
  saveDB(db);

  res.json({ success: true, message: 'Password reset successfully' });
});


// --- TESTING & RESULTS APIS ---

// Fetch questions for taking a test with options filter
app.post('/api/tests/questions', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { subject_ids, chapter_ids, topic_ids, limit, order } = req.body;

  const db = getDB();
  let filtered = db.questions;

  if (subject_ids && subject_ids.length > 0) {
    filtered = filtered.filter(q => subject_ids.includes(q.subject_id));
  }
  if (chapter_ids && chapter_ids.length > 0) {
    filtered = filtered.filter(q => chapter_ids.includes(q.chapter_id));
  }
  if (topic_ids && topic_ids.length > 0) {
    filtered = filtered.filter(q => topic_ids.includes(q.topic_id));
  }

  // Choose order
  if (order === 'Random') {
    // Shuffling
    filtered = [...filtered].sort(() => Math.random() - 0.5);
  } else {
    // Sequential by ID
    filtered = [...filtered].sort((a, b) => a.id - b.id);
  }

  // Apply question limit
  let finalLimit = limit ? parseInt(limit.toString()) : 10;
  if (finalLimit === -1 || limit === 'all') {
    finalLimit = filtered.length;
  }
  const sliced = filtered.slice(0, finalLimit);

  res.json(sliced);
});

// Fetch count of questions matching filters
app.post('/api/tests/questions/count', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { subject_ids, chapter_ids, topic_ids } = req.body;

  const db = getDB();
  let filtered = db.questions;

  if (subject_ids && subject_ids.length > 0) {
    filtered = filtered.filter(q => subject_ids.includes(q.subject_id));
  }
  if (chapter_ids && chapter_ids.length > 0) {
    filtered = filtered.filter(q => chapter_ids.includes(q.chapter_id));
  }
  if (topic_ids && topic_ids.length > 0) {
    filtered = filtered.filter(q => topic_ids.includes(q.topic_id));
  }

  res.json({ count: filtered.length });
});

// Submit test results
app.post('/api/tests/submit', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { start_time, end_time, total_questions, answers } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    res.status(400).json({ error: 'User ID missing from token' });
    return;
  }

  if (!answers || !Array.isArray(answers)) {
    res.status(400).json({ error: 'Answers must be submitted as an array' });
    return;
  }

  const db = getDB();

  // Score answers and calculate test score
  let score = 0;
  const scoredAnswers: TestAnswer[] = answers.map((ans, idx) => {
    const question = db.questions.find(q => q.id === ans.question_id);
    const isCorrect = question ? question.correct_answer === ans.selected_answer : false;
    if (isCorrect) score++;

    return {
      id: db.test_answers.length > 0 ? Math.max(...db.test_answers.map(ta => ta.id)) + 1 + idx : 1 + idx,
      test_id: 0, // Set after saving the test
      question_id: ans.question_id,
      selected_answer: ans.selected_answer as 'A' | 'B' | 'C' | 'D' | '',
      is_correct: isCorrect,
      time_taken: ans.time_taken || 0,
    };
  });

  // Create test record
  const newTest: Test = {
    id: db.tests.length > 0 ? Math.max(...db.tests.map(t => t.id)) + 1 : 1,
    user_id: userId,
    start_time: start_time || new Date().toISOString(),
    end_time: end_time || new Date().toISOString(),
    total_questions: total_questions || answers.length,
    score,
  };

  // Map answers to test ID and push
  scoredAnswers.forEach(sa => {
    sa.test_id = newTest.id;
    db.test_answers.push(sa);
  });

  db.tests.push(newTest);
  saveDB(db);

  res.status(201).json({
    test: newTest,
    answers: scoredAnswers,
  });
});

// Fetch user test history
app.get('/api/tests/history', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const db = getDB();

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Fetch tests for the authenticated user, or all tests if Admin (but history is described under User Dashboard)
  const isAll = req.user?.role === 'admin' && req.query.all === 'true';
  const userTests = isAll 
    ? db.tests 
    : db.tests.filter(t => t.user_id === userId);

  // Map tests to include answers and question details for result analysis
  const testsWithDetails = userTests.map(test => {
    const answers = db.test_answers
      .filter(ta => ta.test_id === test.id)
      .map(ta => {
        const q = db.questions.find(quest => quest.id === ta.question_id);
        return {
          ...ta,
          question_text: q ? q.question_text : 'Deleted Question',
        };
      });

    const user = db.users.find(u => u.id === test.user_id);

    return {
      ...test,
      user_name: user ? user.name : 'Unknown User',
      answers,
    };
  });

  // Sort descending by test ID (most recent first)
  testsWithDetails.sort((a, b) => b.id - a.id);

  res.json(testsWithDetails);
});


// --- VITE AND PUBLIC SERVING MIDDLEWARE ---

async function startServer() {
  // Mount Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
