import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  Tooltip,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  BookOpen,
  FolderOpen,
  Tag,
  HelpCircle,
  Users as UsersIcon,
  LogOut,
  Plus,
  Edit,
  Trash2,
  Search,
  Key,
  CheckCircle2,
  XCircle,
  Menu,
  UploadCloud,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { Subject, Chapter, Topic, Question, User } from '../types.js';

const DRAWER_WIDTH = 240;

interface AdminDashboardProps {
  onLogout: () => void;
}

type TabType = 'subjects' | 'chapters' | 'topics' | 'questions' | 'users';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const { token, user } = useAuth();
  const [currentTab, setCurrentTab] = useState<TabType>('subjects');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Notification State
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const showNotification = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Shared Data States
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Search and Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Loading States
  const [loading, setLoading] = useState(false);

  // Form Dialog States
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [currentId, setCurrentId] = useState<number | null>(null);

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; type: string; id: number | null }>({
    open: false,
    type: '',
    id: null,
  });

  // Password Reset State
  const [pwDialog, setPwDialog] = useState({ open: false, userId: null as number | null, newPassword: '' });

  // Excel Upload States
  const [questionAddMethod, setQuestionAddMethod] = useState<'manual' | 'excel'>('manual');
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [parsedExcelQuestions, setParsedExcelQuestions] = useState<any[]>([]);
  const [excelError, setExcelError] = useState<string | null>(null);

  // Entity Specific Form Values
  const [formSubject, setFormSubject] = useState({ name: '' });
  const [formChapter, setFormChapter] = useState({ name: '', subject_id: '' });
  const [formTopic, setFormTopic] = useState({ name: '', subject_id: '', chapter_id: '' });
  const [formQuestion, setFormQuestion] = useState({
    subject_id: '',
    chapter_id: '',
    topic_id: '',
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'A' as 'A' | 'B' | 'C' | 'D',
    explanation: '',
    correct_feedback: '',
    wrong_feedback: '',
    is_html: false,
  });
  const [formUser, setFormUser] = useState({
    name: '',
    username: '',
    password: '',
    role: 'user' as 'admin' | 'user',
    status: 'active' as 'active' | 'inactive',
  });

  // Fetch functions
  const fetchSubjects = async () => {
    try {
      const res = await fetch('/api/subjects', {
        headers: { 'X-Auth-Token': token || '' },
      });
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
      }
    } catch (err) {
      console.error('Error fetching subjects', err);
    }
  };

  const fetchChapters = async () => {
    try {
      const res = await fetch('/api/chapters', {
        headers: { 'X-Auth-Token': token || '' },
      });
      if (res.ok) {
        const data = await res.json();
        setChapters(data);
      }
    } catch (err) {
      console.error('Error fetching chapters', err);
    }
  };

  const fetchTopics = async () => {
    try {
      const res = await fetch('/api/topics', {
        headers: { 'X-Auth-Token': token || '' },
      });
      if (res.ok) {
        const data = await res.json();
        setTopics(data);
      }
    } catch (err) {
      console.error('Error fetching topics', err);
    }
  };

  const fetchQuestions = async () => {
    try {
      const res = await fetch('/api/questions', {
        headers: { 'X-Auth-Token': token || '' },
      });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data);
      }
    } catch (err) {
      console.error('Error fetching questions', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: { 'X-Auth-Token': token || '' },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Error fetching users', err);
    }
  };

  // Load all on start or tab change
  useEffect(() => {
    if (!token) return;
    setPage(0);
    setSearchQuery('');
    fetchSubjects();
    fetchChapters();
    fetchTopics();
    fetchQuestions();
    fetchUsers();
  }, [currentTab, token]);

  // Handle Tab changes
  const handleTabChange = (tab: TabType) => {
    setCurrentTab(tab);
    setMobileOpen(false);
  };

  // Dynamic dropdowns helper for dynamic filters in Chapters/Topics/Questions
  const filteredChaptersForSubject = (subjectId: string | number) => {
    return chapters.filter((c) => c.subject_id === parseInt(subjectId.toString()));
  };

  const filteredTopicsForChapter = (chapterId: string | number) => {
    return topics.filter((t) => t.chapter_id === parseInt(chapterId.toString()));
  };

  // --- CRUD HANDLERS ---

  // Handle Add Click (open modal, clear states)
  const handleAddClick = () => {
    setDialogMode('add');
    setCurrentId(null);

    // Reset Excel upload states
    setQuestionAddMethod('manual');
    setExcelFile(null);
    setParsedExcelQuestions([]);
    setExcelError(null);

    // Clear form states
    setFormSubject({ name: '' });
    setFormChapter({ name: '', subject_id: '' });
    setFormTopic({ name: '', subject_id: '', chapter_id: '' });
    setFormQuestion({
      subject_id: '',
      chapter_id: '',
      topic_id: '',
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_answer: 'A',
      explanation: '',
      correct_feedback: '',
      wrong_feedback: '',
      is_html: false,
    });
    setFormUser({
      name: '',
      username: '',
      password: '',
      role: 'user',
      status: 'active',
    });

    setOpenDialog(true);
  };

  // Download Excel template with correct columns
  const downloadExcelTemplate = () => {
    const templateData = [
      {
        "Question Text": "What is the discriminant of the quadratic equation ax^2 + bx + c = 0?",
        "Option A": "b^2 - 4ac",
        "Option B": "b^2 + 4ac",
        "Option C": "-b + sqrt(b^2 - 4ac)",
        "Option D": "-b - sqrt(b^2 - 4ac)",
        "Correct Answer": "A",
        "Explanation": "The discriminant is given by b^2 - 4ac.",
        "Is HTML": "No"
      },
      {
        "Question Text": "Which of the following equations represents Newton's second law of motion?",
        "Option A": "F = ma",
        "Option B": "p = mv",
        "Option C": "E = mc^2",
        "Option D": "v = u + at",
        "Correct Answer": "A",
        "Explanation": "Newton's second law states that Force equals mass times acceleration.",
        "Is HTML": "No"
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "QuestionsTemplate");
    XLSX.writeFile(workbook, "PrepQues_Questions_Template.xlsx");
    showNotification("Template downloaded! You can fill your questions in this template and upload.");
  };

  // Handle parsing Excel files
  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFile(file);
    setExcelError(null);
    setParsedExcelQuestions([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          setExcelError('The Excel file appears to be empty or has no sheets.');
          return;
        }

        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any>(worksheet);

        if (rows.length === 0) {
          setExcelError('No rows or data found in the Excel sheet.');
          return;
        }

        const mappedQuestions = rows.map((row: any, idx: number) => {
          const findValue = (keys: string[]) => {
            const foundKey = Object.keys(row).find(k => 
              keys.some(key => k.trim().toLowerCase() === key.toLowerCase())
            );
            return foundKey ? row[foundKey] : undefined;
          };

          const question_text = findValue(['question_text', 'question', 'question text', 'q_text']);
          const option_a = findValue(['option_a', 'option a', 'a', 'opt_a', 'option_1']);
          const option_b = findValue(['option_b', 'option b', 'b', 'opt_b', 'option_2']);
          const option_c = findValue(['option_c', 'option c', 'c', 'opt_c', 'option_3']);
          const option_d = findValue(['option_d', 'option d', 'd', 'opt_d', 'option_4']);
          const correct_answer = findValue(['correct_answer', 'correct answer', 'answer', 'correct', 'ans']);
          const explanation = findValue(['explanation', 'explanation / feedback', 'feedback', 'exp']);
          const is_html = findValue(['is_html', 'is html', 'html']);

          return {
            rowNum: idx + 2,
            question_text,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_answer,
            explanation,
            is_html,
          };
        });

        const errors: string[] = [];
        const validatedQuestions = [];

        for (const mq of mappedQuestions) {
          if (mq.question_text === undefined || mq.question_text === null || mq.question_text.toString().trim() === '') {
            errors.push(`Row ${mq.rowNum}: Question Text is missing.`);
            continue;
          }
          if (mq.option_a === undefined || mq.option_a === null || mq.option_a.toString().trim() === '') {
            errors.push(`Row ${mq.rowNum}: Option A is missing.`);
            continue;
          }
          if (mq.option_b === undefined || mq.option_b === null || mq.option_b.toString().trim() === '') {
            errors.push(`Row ${mq.rowNum}: Option B is missing.`);
            continue;
          }
          if (mq.option_c === undefined || mq.option_c === null || mq.option_c.toString().trim() === '') {
            errors.push(`Row ${mq.rowNum}: Option C is missing.`);
            continue;
          }
          if (mq.option_d === undefined || mq.option_d === null || mq.option_d.toString().trim() === '') {
            errors.push(`Row ${mq.rowNum}: Option D is missing.`);
            continue;
          }
          if (mq.correct_answer === undefined || mq.correct_answer === null || mq.correct_answer.toString().trim() === '') {
            errors.push(`Row ${mq.rowNum}: Correct Answer is missing.`);
            continue;
          }

          const cleanAns = mq.correct_answer.toString().trim().toUpperCase();
          if (!['A', 'B', 'C', 'D'].includes(cleanAns)) {
            errors.push(`Row ${mq.rowNum}: Correct Answer must be A, B, C, or D (got "${mq.correct_answer}").`);
            continue;
          }

          validatedQuestions.push({
            question_text: mq.question_text,
            option_a: mq.option_a,
            option_b: mq.option_b,
            option_c: mq.option_c,
            option_d: mq.option_d,
            correct_answer: cleanAns,
            explanation: mq.explanation || '',
            is_html: mq.is_html === true || mq.is_html === 'true' || mq.is_html === 1 || mq.is_html === '1' || mq.is_html === 'Y' || mq.is_html === 'y' || mq.is_html === 'Yes' || mq.is_html === 'yes' || mq.is_html === 'TRUE',
          });
        }

        if (errors.length > 0) {
          setExcelError(`Failed to parse Excel file:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n...and ${errors.length - 5} more errors.` : ''}`);
        } else {
          setParsedExcelQuestions(validatedQuestions);
          showNotification(`Successfully parsed ${validatedQuestions.length} questions from Excel sheet!`);
        }
      } catch (err: any) {
        console.error(err);
        setExcelError(`An error occurred while reading the Excel file: ${err.message || err}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Handle Edit Click
  const handleEditClick = (entity: any) => {
    setDialogMode('edit');
    setCurrentId(entity.id);

    if (currentTab === 'subjects') {
      setFormSubject({ name: entity.name });
    } else if (currentTab === 'chapters') {
      setFormChapter({ name: entity.name, subject_id: entity.subject_id.toString() });
    } else if (currentTab === 'topics') {
      const topicChapter = chapters.find((c) => c.id === entity.chapter_id);
      setFormTopic({
        name: entity.name,
        subject_id: topicChapter ? topicChapter.subject_id.toString() : '',
        chapter_id: entity.chapter_id.toString(),
      });
    } else if (currentTab === 'questions') {
      setFormQuestion({
        subject_id: entity.subject_id.toString(),
        chapter_id: entity.chapter_id.toString(),
        topic_id: entity.topic_id.toString(),
        question_text: entity.question_text,
        option_a: entity.option_a,
        option_b: entity.option_b,
        option_c: entity.option_c,
        option_d: entity.option_d,
        correct_answer: entity.correct_answer,
        explanation: entity.explanation || '',
        correct_feedback: entity.correct_feedback || '',
        wrong_feedback: entity.wrong_feedback || '',
        is_html: !!entity.is_html,
      });
    } else if (currentTab === 'users') {
      setFormUser({
        name: entity.name,
        username: entity.username,
        password: '', // Password is not edited here
        role: entity.role,
        status: entity.status,
      });
    }

    setOpenDialog(true);
  };

  // Handle Save
  const handleSave = async () => {
    let url = '';
    let method = 'POST';
    let bodyData: any = {};

    // Validate inputs
    if (currentTab === 'subjects') {
      if (!formSubject.name.trim()) return showNotification('Subject name is required', 'error');
      url = '/api/subjects';
      bodyData = { name: formSubject.name };
    } else if (currentTab === 'chapters') {
      if (!formChapter.name.trim()) return showNotification('Chapter name is required', 'error');
      if (!formChapter.subject_id) return showNotification('Subject selection is mandatory', 'error');
      url = '/api/chapters';
      bodyData = { name: formChapter.name, subject_id: parseInt(formChapter.subject_id) };
    } else if (currentTab === 'topics') {
      if (!formTopic.name.trim()) return showNotification('Topic name is required', 'error');
      if (!formTopic.chapter_id) return showNotification('Chapter selection is mandatory', 'error');
      url = '/api/topics';
      bodyData = { name: formTopic.name, chapter_id: parseInt(formTopic.chapter_id) };
    } else if (currentTab === 'questions') {
      if (dialogMode === 'add' && questionAddMethod === 'excel') {
        const { subject_id, chapter_id, topic_id } = formQuestion;
        if (!subject_id || !chapter_id || !topic_id) {
          return showNotification('Subject, Chapter, and Topic are mandatory selections', 'error');
        }
        if (parsedExcelQuestions.length === 0) {
          return showNotification('Please select and parse a valid Excel sheet first', 'error');
        }
        url = '/api/questions/bulk';
        bodyData = {
          subject_id: parseInt(subject_id),
          chapter_id: parseInt(chapter_id),
          topic_id: parseInt(topic_id),
          questions: parsedExcelQuestions,
        };
      } else {
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
        } = formQuestion;
        if (
          !subject_id ||
          !chapter_id ||
          !topic_id ||
          !question_text.trim() ||
          !option_a.trim() ||
          !option_b.trim() ||
          !option_c.trim() ||
          !option_d.trim()
        ) {
          return showNotification('All fields are required for a question', 'error');
        }
        url = '/api/questions';
        bodyData = {
          subject_id: parseInt(subject_id),
          chapter_id: parseInt(chapter_id),
          topic_id: parseInt(topic_id),
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
        };
      }
    } else if (currentTab === 'users') {
      const { name, username, password, role, status } = formUser;
      if (!name.trim() || !username.trim()) {
        return showNotification('Name and username are required', 'error');
      }
      if (dialogMode === 'add' && !password.trim()) {
        return showNotification('Password is required for a new user', 'error');
      }
      url = '/api/users';
      bodyData = { name, username, password, role, status };
    }

    if (dialogMode === 'edit' && currentId) {
      method = 'PUT';
      url = `${url}/${currentId}`;
    }

    setLoading(true);
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token || '',
        },
        body: JSON.stringify(bodyData),
      });

      let data: any = {};
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { error: text || `HTTP error ${response.status}: ${response.statusText}` };
      }

      if (!response.ok) {
        throw new Error(data.error || 'Operation failed');
      }

      showNotification(`${currentTab.slice(0, -1)} saved successfully!`);
      setOpenDialog(false);

      // Refresh corresponding state
      if (currentTab === 'subjects') fetchSubjects();
      else if (currentTab === 'chapters') fetchChapters();
      else if (currentTab === 'topics') fetchTopics();
      else if (currentTab === 'questions') fetchQuestions();
      else if (currentTab === 'users') fetchUsers();
    } catch (err: any) {
      showNotification(err.message || 'Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Open Delete Confirmation
  const handleDeleteClick = (type: string, id: number) => {
    setDeleteConfirm({ open: true, type, id });
  };

  // Perform Delete
  const handleConfirmDelete = async () => {
    const { type, id } = deleteConfirm;
    if (!id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/${type}/${id}`, {
        method: 'DELETE',
        headers: { 'X-Auth-Token': token || '' },
      });

      let data: any = {};
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { error: text || `HTTP error ${response.status}: ${response.statusText}` };
      }

      if (!response.ok) {
        throw new Error(data.error || 'Deletion failed');
      }

      showNotification(`${type.slice(0, -1)} deleted successfully!`);
      setDeleteConfirm({ open: false, type: '', id: null });

      // Refresh list
      if (type === 'subjects') {
        fetchSubjects();
        fetchChapters();
        fetchTopics();
        fetchQuestions();
      } else if (type === 'chapters') {
        fetchChapters();
        fetchTopics();
        fetchQuestions();
      } else if (type === 'topics') {
        fetchTopics();
        fetchQuestions();
      } else if (type === 'questions') {
        fetchQuestions();
      }
    } catch (err: any) {
      showNotification(err.message || 'Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Toggle User Status directly (Activate / Deactivate)
  const handleToggleUserStatus = async (userToToggle: User) => {
    const newStatus = userToToggle.status === 'active' ? 'inactive' : 'active';
    try {
      const response = await fetch(`/api/users/${userToToggle.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token || '',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        showNotification(`User is now ${newStatus}`);
        fetchUsers();
      } else {
        let errData: any = {};
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          errData = await response.json();
        } else {
          const text = await response.text();
          errData = { error: text || `HTTP error ${response.status}: ${response.statusText}` };
        }
        showNotification(errData.error || 'Failed to update user status', 'error');
      }
    } catch (err) {
      showNotification('Network error changing status', 'error');
    }
  };

  // Reset password handler
  const handleResetPassword = async () => {
    const { userId, newPassword } = pwDialog;
    if (!newPassword.trim()) {
      showNotification('Password cannot be empty', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token || '',
        },
        body: JSON.stringify({ password: newPassword }),
      });

      if (response.ok) {
        showNotification('User password has been reset successfully');
        setPwDialog({ open: false, userId: null, newPassword: '' });
      } else {
        let data: any = {};
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const text = await response.text();
          data = { error: text || `HTTP error ${response.status}: ${response.statusText}` };
        }
        showNotification(data.error || 'Failed to reset password', 'error');
      }
    } catch (err) {
      showNotification('Error resetting password', 'error');
    }
  };

  // Client Side Search and Filter Data
  const getFilteredData = () => {
    const query = searchQuery.toLowerCase();

    if (currentTab === 'subjects') {
      return subjects.filter((s) => s.name.toLowerCase().includes(query));
    } else if (currentTab === 'chapters') {
      return chapters.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.subject_name?.toLowerCase().includes(query)
      );
    } else if (currentTab === 'topics') {
      return topics.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.chapter_name?.toLowerCase().includes(query) ||
          t.subject_name?.toLowerCase().includes(query)
      );
    } else if (currentTab === 'questions') {
      return questions.filter(
        (q) =>
          q.question_text.toLowerCase().includes(query) ||
          q.option_a.toLowerCase().includes(query) ||
          q.option_b.toLowerCase().includes(query) ||
          q.option_c.toLowerCase().includes(query) ||
          q.option_d.toLowerCase().includes(query) ||
          q.subject_name?.toLowerCase().includes(query) ||
          q.chapter_name?.toLowerCase().includes(query) ||
          q.topic_name?.toLowerCase().includes(query)
      );
    } else if (currentTab === 'users') {
      return users.filter(
        (u) =>
          u.name.toLowerCase().includes(query) ||
          u.username.toLowerCase().includes(query) ||
          u.role.toLowerCase().includes(query) ||
          u.status.toLowerCase().includes(query)
      );
    }
    return [];
  };

  const filteredData = getFilteredData();
  const paginatedData = filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box sx={{ display: 'flex' }} id="admin-dashboard-root" className="min-h-screen">
      {/* App Bar */}
      <AppBar
        position="fixed"
        id="admin-appbar"
        sx={{
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { sm: `${DRAWER_WIDTH}px` },
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: 'none',
        }}
      >
        <Toolbar className="flex justify-between">
          <Box className="flex items-center gap-1">
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={() => setMobileOpen(!mobileOpen)}
              sx={{ mr: 1, display: { sm: 'none' }, color: '#475569' }}
            >
              <Menu size={20} />
            </IconButton>
            <Typography variant="h6" noWrap component="div" id="admin-title" className="text-slate-800 font-bold text-sm tracking-tight">
              PrepQues <span className="text-slate-400 font-normal px-2">/</span> <span className="text-slate-600 font-medium capitalize">{currentTab}</span>
            </Typography>
          </Box>
          <Box className="flex items-center gap-4">
            <Typography variant="body2" className="text-slate-500 text-xs font-medium hidden sm:inline">
              Logged in as: <strong className="text-slate-800">{user?.name}</strong> (Admin)
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              id="admin-logout-button"
              size="small"
              startIcon={<LogOut size={14} />}
              onClick={onLogout}
              className="border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 hover:bg-slate-50 text-xs py-1"
            >
              Sign Out
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Box component="nav" sx={{ width: { sm: DRAWER_WIDTH }, shrink: { sm: 0 } }}>
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, backgroundColor: '#0f172a', color: '#cbd5e1' },
          }}
        >
          <Box className="p-5 border-b border-slate-800 flex items-center gap-3">
            <Box className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-base shadow-sm">
              P
            </Box>
            <Typography variant="subtitle1" className="text-white font-semibold tracking-tight leading-none">
              PrepQues
            </Typography>
          </Box>
          <List className="px-2 py-4 space-y-1">
            {[
              { text: 'Subjects', icon: <BookOpen size={18} />, value: 'subjects' },
              { text: 'Chapters', icon: <FolderOpen size={18} />, value: 'chapters' },
              { text: 'Topics', icon: <Tag size={18} />, value: 'topics' },
              { text: 'Questions', icon: <HelpCircle size={18} />, value: 'questions' },
              { text: 'Users', icon: <UsersIcon size={18} />, value: 'users' },
            ].map((item) => (
              <ListItem key={item.text} disablePadding id={`sidebar-item-mobile-${item.value}`}>
                <ListItemButton
                  selected={currentTab === item.value}
                  onClick={() => handleTabChange(item.value as TabType)}
                  className="rounded-lg mb-1"
                  sx={{
                    py: 1.2,
                    px: 2,
                    '&.Mui-selected': {
                      backgroundColor: '#2563eb !important',
                      color: '#ffffff',
                      fontWeight: 600,
                      '& .MuiListItemIcon-root': { color: '#ffffff' },
                    },
                    '&:hover': {
                      backgroundColor: '#1e293b',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: currentTab === item.value ? '#ffffff' : '#94a3b8' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <span className={`text-[13.5px] ${currentTab === item.value ? 'font-semibold text-white' : 'font-medium text-slate-300'}`}>
                        {item.text}
                      </span>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Drawer>

        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          id="admin-sidebar"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, backgroundColor: '#0f172a', color: '#cbd5e1', borderRight: '1px solid #1e293b' },
          }}
          open
        >
          <Box className="p-5 border-b border-slate-800 flex items-center gap-3">
            <Box className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-base shadow-sm">
              P
            </Box>
            <Typography variant="subtitle1" className="text-white font-semibold tracking-tight leading-none">
              PrepQues
            </Typography>
          </Box>
          <List className="px-2 py-4 space-y-1">
            {[
              { text: 'Subjects', icon: <BookOpen size={18} />, value: 'subjects' },
              { text: 'Chapters', icon: <FolderOpen size={18} />, value: 'chapters' },
              { text: 'Topics', icon: <Tag size={18} />, value: 'topics' },
              { text: 'Questions', icon: <HelpCircle size={18} />, value: 'questions' },
              { text: 'Users', icon: <UsersIcon size={18} />, value: 'users' },
            ].map((item) => (
              <ListItem key={item.text} disablePadding id={`sidebar-item-${item.value}`}>
                <ListItemButton
                  selected={currentTab === item.value}
                  onClick={() => handleTabChange(item.value as TabType)}
                  className="rounded-lg mb-1"
                  sx={{
                    py: 1.2,
                    px: 2,
                    '&.Mui-selected': {
                      backgroundColor: '#2563eb !important',
                      color: '#ffffff',
                      fontWeight: 600,
                      '& .MuiListItemIcon-root': { color: '#ffffff' },
                    },
                    '&:hover': {
                      backgroundColor: '#1e293b',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: currentTab === item.value ? '#ffffff' : '#94a3b8' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <span className={`text-[13.5px] ${currentTab === item.value ? 'font-semibold text-white' : 'font-medium text-slate-300'}`}>
                        {item.text}
                      </span>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{ flexGrow: 1, p: { xs: 2, sm: 3, md: 4 }, width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` }, mt: '64px' }}
        className="bg-slate-50 min-h-[calc(100vh-64px)]"
      >
        <Box className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
          <Box>
            <Typography variant="h4" className="capitalize font-bold text-slate-900 tracking-tight text-2xl" id="current-view-header">
              {currentTab} Repository
            </Typography>
            <Typography variant="body2" className="text-slate-500 text-sm mt-0.5">
              {currentTab === 'subjects' && 'Manage the primary branches of your curriculum'}
              {currentTab === 'chapters' && 'Group revision questions into study chapters'}
              {currentTab === 'topics' && 'Define micro-topics for precise student targeting'}
              {currentTab === 'questions' && 'Manage and review your categorized question bank'}
              {currentTab === 'users' && 'Manage user accounts, roles, and platform access'}
            </Typography>
          </Box>

          <Box className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <TextField
              size="small"
              placeholder={`Search ${currentTab}...`}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              id="search-input"
              slotProps={{
                input: {
                  startAdornment: <Search size={16} className="text-slate-400 mr-2" />,
                },
              }}
              className="bg-white rounded-lg w-full sm:w-64"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
            />
            {/* Take Question off Users Add list (Admin adds manually) or normal management */}
            <Button
              variant="contained"
              id="add-item-button"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 shadow-sm transition-all rounded-lg normal-case"
              startIcon={<Plus size={16} />}
              onClick={handleAddClick}
            >
              New {currentTab.slice(0, -1)}
            </Button>
          </Box>
        </Box>

        {/* Data Presentation Table */}
        <TableContainer component={Paper} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col" id="data-table-container" sx={{ boxShadow: 'none' }}>
          <Table id="data-table" sx={{ minWidth: '100%', tableLayout: 'fixed' }}>
            <TableHead className="bg-slate-50 border-b border-slate-200" sx={{ '& .MuiTableCell-head': { fontWeight: 700, fontSize: '11px', color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase', py: 2 } }}>
              <TableRow>
                <TableCell className="font-bold text-slate-700" sx={{ width: { xs: 50, sm: 80 }, display: { xs: 'none', sm: 'table-cell' } }}>ID</TableCell>

                {currentTab === 'subjects' && (
                  <>
                    <TableCell className="font-bold text-slate-700">Name</TableCell>
                    <TableCell className="font-bold text-slate-700" sx={{ display: { xs: 'none', md: 'table-cell' } }}>Created Date</TableCell>
                  </>
                )}

                {currentTab === 'chapters' && (
                  <>
                    <TableCell className="font-bold text-slate-700">Chapter Name</TableCell>
                    <TableCell className="font-bold text-slate-700" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Subject Name</TableCell>
                    <TableCell className="font-bold text-slate-700" sx={{ display: { xs: 'none', md: 'table-cell' } }}>Created Date</TableCell>
                  </>
                )}

                {currentTab === 'topics' && (
                  <>
                    <TableCell className="font-bold text-slate-700">Topic Name</TableCell>
                    <TableCell className="font-bold text-slate-700" sx={{ display: { xs: 'none', md: 'table-cell' } }}>Chapter Name</TableCell>
                    <TableCell className="font-bold text-slate-700" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Subject Name</TableCell>
                    <TableCell className="font-bold text-slate-700" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Created Date</TableCell>
                  </>
                )}

                {currentTab === 'questions' && (
                  <>
                    <TableCell className="font-bold text-slate-700" sx={{ width: { xs: '65%', sm: '45%', md: '40%' } }}>Question Text</TableCell>
                    <TableCell className="font-bold text-slate-700" sx={{ display: { xs: 'none', md: 'table-cell' } }}>Subject / Chapter / Topic</TableCell>
                    <TableCell className="font-bold text-slate-700" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Options</TableCell>
                    <TableCell className="font-bold text-slate-700" align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Correct</TableCell>
                  </>
                )}

                {currentTab === 'users' && (
                  <>
                    <TableCell className="font-bold text-slate-700">Name</TableCell>
                    <TableCell className="font-bold text-slate-700" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Username</TableCell>
                    <TableCell className="font-bold text-slate-700" sx={{ display: { xs: 'none', md: 'table-cell' } }}>Role</TableCell>
                    <TableCell className="font-bold text-slate-700" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Status</TableCell>
                    <TableCell className="font-bold text-slate-700">Actions</TableCell>
                  </>
                )}

                {currentTab !== 'users' && <TableCell align="right" className="font-bold text-slate-700" style={{ width: 100 }}>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" className="py-10 text-slate-400">
                    No records found matching your request.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row) => (
                  <TableRow key={row.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="text-slate-500 font-mono text-xs" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{row.id}</TableCell>

                    {currentTab === 'subjects' && (
                      <>
                        <TableCell className="font-medium text-slate-900 break-words">{row.name}</TableCell>
                        <TableCell className="text-slate-500 text-sm" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                          {new Date(row.created_at).toLocaleDateString()}
                        </TableCell>
                      </>
                    )}

                    {currentTab === 'chapters' && (
                      <>
                        <TableCell className="font-medium text-slate-900 break-words">{row.name}</TableCell>
                        <TableCell className="text-slate-700 text-sm break-words" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{row.subject_name}</TableCell>
                        <TableCell className="text-slate-500 text-sm" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                          {new Date(row.created_at).toLocaleDateString()}
                        </TableCell>
                      </>
                    )}

                    {currentTab === 'topics' && (
                      <>
                        <TableCell className="font-medium text-slate-900 break-words">{row.name}</TableCell>
                        <TableCell className="text-slate-700 text-sm break-words" sx={{ display: { xs: 'none', md: 'table-cell' } }}>{row.chapter_name}</TableCell>
                        <TableCell className="text-slate-600 text-sm break-words" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{row.subject_name}</TableCell>
                        <TableCell className="text-slate-500 text-sm" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                          {new Date(row.created_at).toLocaleDateString()}
                        </TableCell>
                      </>
                    )}

                    {currentTab === 'questions' && (
                      <>
                        <TableCell className="text-slate-900 text-sm">
                          {row.is_html ? (
                            <Typography variant="body2" className="font-medium whitespace-normal line-clamp-3 break-words" component="div">
                              <span dangerouslySetInnerHTML={{ __html: row.question_text }} />
                            </Typography>
                          ) : (
                            <Typography variant="body2" className="font-medium whitespace-normal line-clamp-3 break-words" title={row.question_text}>
                              {row.question_text}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-500 text-xs" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                          <div className="font-bold text-slate-700 break-words">{row.subject_name}</div>
                          <div className="break-words">{row.chapter_name} &rarr; {row.topic_name}</div>
                        </TableCell>
                        <TableCell className="text-slate-500 text-xs" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                          <div className="break-words"><strong>A:</strong> {row.option_a}</div>
                          <div className="break-words"><strong>B:</strong> {row.option_b}</div>
                          <div className="break-words"><strong>C:</strong> {row.option_c}</div>
                          <div className="break-words"><strong>D:</strong> {row.option_d}</div>
                        </TableCell>
                        <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                          <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded font-bold text-sm">
                            {row.correct_answer}
                          </span>
                        </TableCell>
                      </>
                    )}

                    {currentTab === 'users' && (
                      <>
                        <TableCell className="font-medium text-slate-900 break-words">{row.name}</TableCell>
                        <TableCell className="text-slate-700 text-sm font-mono break-words" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{row.username}</TableCell>
                        <TableCell className="text-sm" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                          <span
                            className={`px-2 py-0.5 rounded text-xs capitalize ${
                              row.role === 'admin'
                                ? 'bg-indigo-100 text-indigo-800 font-bold'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {row.role}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                          <span
                            className={`px-2 py-0.5 rounded text-xs capitalize font-bold ${
                              row.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {row.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Box className="flex items-center gap-1">
                            <Tooltip title="Edit User Details">
                              <IconButton size="small" onClick={() => handleEditClick(row)}>
                                <Edit size={16} className="text-slate-600" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={row.status === 'active' ? 'Deactivate Account' : 'Activate Account'}>
                              <IconButton size="small" onClick={() => handleToggleUserStatus(row)}>
                                {row.status === 'active' ? (
                                  <XCircle size={16} className="text-rose-600" />
                                ) : (
                                  <CheckCircle2 size={16} className="text-emerald-600" />
                                )}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reset Password">
                              <IconButton
                                size="small"
                                onClick={() => setPwDialog({ open: true, userId: row.id, newPassword: '' })}
                              >
                                <Key size={16} className="text-slate-500" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </>
                    )}

                    {currentTab !== 'users' && (
                      <TableCell align="right">
                        <Box className="flex justify-end gap-1">
                          <IconButton size="small" onClick={() => handleEditClick(row)}>
                            <Edit size={16} className="text-slate-600" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDeleteClick(currentTab, row.id)}>
                            <Trash2 size={16} className="text-rose-600" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredData.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
            id="table-pagination"
          />
        </TableContainer>
      </Box>

      {/* CRUD Form Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth id="crud-dialog">
        <DialogTitle className="bg-slate-900 text-white font-bold">
          {dialogMode === 'add' ? 'Add New' : 'Edit'} {currentTab.slice(0, -1)}
        </DialogTitle>
        <DialogContent dividers className="py-6">
          {currentTab === 'subjects' && (
            <TextField
              autoFocus
              label="Subject Name"
              variant="outlined"
              fullWidth
              value={formSubject.name}
              onChange={(e) => setFormSubject({ name: e.target.value })}
              id="subject-name-field"
            />
          )}

          {currentTab === 'chapters' && (
            <Box className="flex flex-col gap-4">
              <FormControl fullWidth variant="outlined">
                <InputLabel id="subject-select-label">Subject</InputLabel>
                <Select
                  labelId="subject-select-label"
                  label="Subject"
                  value={formChapter.subject_id}
                  onChange={(e) => setFormChapter({ ...formChapter, subject_id: e.target.value })}
                  id="chapter-subject-select"
                >
                  {subjects.map((sub) => (
                    <MenuItem key={sub.id} value={sub.id.toString()}>
                      {sub.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Chapter Name"
                variant="outlined"
                fullWidth
                value={formChapter.name}
                onChange={(e) => setFormChapter({ ...formChapter, name: e.target.value })}
                id="chapter-name-field"
              />
            </Box>
          )}

          {currentTab === 'topics' && (
            <Box className="flex flex-col gap-4">
              <FormControl fullWidth variant="outlined">
                <InputLabel id="topic-subject-select-label">Subject</InputLabel>
                <Select
                  labelId="topic-subject-select-label"
                  label="Subject"
                  value={formTopic.subject_id}
                  onChange={(e) => setFormTopic({ ...formTopic, subject_id: e.target.value, chapter_id: '' })}
                  id="topic-subject-select"
                >
                  {subjects.map((sub) => (
                    <MenuItem key={sub.id} value={sub.id.toString()}>
                      {sub.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth variant="outlined" disabled={!formTopic.subject_id}>
                <InputLabel id="topic-chapter-select-label">Chapter</InputLabel>
                <Select
                  labelId="topic-chapter-select-label"
                  label="Chapter"
                  value={formTopic.chapter_id}
                  onChange={(e) => setFormTopic({ ...formTopic, chapter_id: e.target.value })}
                  id="topic-chapter-select"
                >
                  {filteredChaptersForSubject(formTopic.subject_id).map((chap) => (
                    <MenuItem key={chap.id} value={chap.id.toString()}>
                      {chap.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Topic Name"
                variant="outlined"
                fullWidth
                value={formTopic.name}
                onChange={(e) => setFormTopic({ ...formTopic, name: e.target.value })}
                id="topic-name-field"
              />
            </Box>
          )}

          {currentTab === 'questions' && (
            <Box className="flex flex-col gap-4">
              {dialogMode === 'add' && (
                <Box className="flex gap-4 mb-2 justify-center border-b border-slate-100 pb-4">
                  <Button
                    variant={questionAddMethod === 'manual' ? 'contained' : 'outlined'}
                    onClick={() => setQuestionAddMethod('manual')}
                    className={questionAddMethod === 'manual' ? 'bg-slate-800 text-white font-semibold' : 'border-slate-300 text-slate-700'}
                    size="small"
                  >
                    Add Manually
                  </Button>
                  <Button
                    variant={questionAddMethod === 'excel' ? 'contained' : 'outlined'}
                    onClick={() => setQuestionAddMethod('excel')}
                    className={questionAddMethod === 'excel' ? 'bg-slate-800 text-white font-semibold' : 'border-slate-300 text-slate-700'}
                    size="small"
                    startIcon={<FileSpreadsheet size={16} />}
                  >
                    Upload via Excel
                  </Button>
                </Box>
              )}

              {/* Dropdowns */}
              <FormControl fullWidth variant="outlined">
                <InputLabel id="q-subject-label">Subject</InputLabel>
                <Select
                  labelId="q-subject-label"
                  label="Subject"
                  value={formQuestion.subject_id}
                  onChange={(e) =>
                    setFormQuestion({
                      ...formQuestion,
                      subject_id: e.target.value,
                      chapter_id: '',
                      topic_id: '',
                    })
                  }
                  id="question-subject-select"
                >
                  {subjects.map((sub) => (
                    <MenuItem key={sub.id} value={sub.id.toString()}>
                      {sub.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth variant="outlined" disabled={!formQuestion.subject_id}>
                <InputLabel id="q-chapter-label">Chapter</InputLabel>
                <Select
                  labelId="q-chapter-label"
                  label="Chapter"
                  value={formQuestion.chapter_id}
                  onChange={(e) =>
                    setFormQuestion({
                      ...formQuestion,
                      chapter_id: e.target.value,
                      topic_id: '',
                    })
                  }
                  id="question-chapter-select"
                >
                  {filteredChaptersForSubject(formQuestion.subject_id).map((chap) => (
                    <MenuItem key={chap.id} value={chap.id.toString()}>
                      {chap.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth variant="outlined" disabled={!formQuestion.chapter_id}>
                <InputLabel id="q-topic-label">Topic</InputLabel>
                <Select
                  labelId="q-topic-label"
                  label="Topic"
                  value={formQuestion.topic_id}
                  onChange={(e) => setFormQuestion({ ...formQuestion, topic_id: e.target.value })}
                  id="question-topic-select"
                >
                  {filteredTopicsForChapter(formQuestion.chapter_id).map((top) => (
                    <MenuItem key={top.id} value={top.id.toString()}>
                      {top.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* If Excel Mode is selected */}
              {dialogMode === 'add' && questionAddMethod === 'excel' ? (
                <Box className="flex flex-col gap-4 mt-2 border-t border-slate-100 pt-4">
                  {/* Instructions on columns */}
                  <Paper className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <Typography variant="subtitle2" className="text-slate-800 font-bold mb-2 flex items-center gap-1.5 text-xs">
                      <FileSpreadsheet size={15} className="text-emerald-600" />
                      Excel / CSV Template Guidelines
                    </Typography>
                    <Typography variant="body2" className="text-slate-600 text-xs mb-3">
                      Please make sure your spreadsheet contains the following column headers. Capitalization and spacing are handled flexibly:
                    </Typography>
                    <div className="grid grid-cols-2 gap-2 text-[11px] mb-4 text-slate-700 bg-white p-2.5 rounded border border-slate-100 font-medium">
                      <div>• <strong>Question Text</strong> <span className="text-rose-500 font-bold">*</span></div>
                      <div>• <strong>Option A</strong> <span className="text-rose-500 font-bold">*</span></div>
                      <div>• <strong>Option B</strong> <span className="text-rose-500 font-bold">*</span></div>
                      <div>• <strong>Option C</strong> <span className="text-rose-500 font-bold">*</span></div>
                      <div>• <strong>Option D</strong> <span className="text-rose-500 font-bold">*</span></div>
                      <div>• <strong>Correct Answer</strong> (A, B, C, D) <span className="text-rose-500 font-bold">*</span></div>
                      <div>• <strong>Explanation</strong> (Optional)</div>
                      <div>• <strong>Is HTML</strong> (Optional, Yes/No)</div>
                    </div>

                    <Box className="flex justify-between items-center bg-slate-100 p-2 rounded border border-slate-200">
                      <span className="text-slate-500 text-[10px] font-mono">Template: xlsx, xls, csv</span>
                      <Button
                        variant="text"
                        size="small"
                        color="success"
                        startIcon={<Download size={14} />}
                        onClick={downloadExcelTemplate}
                        className="text-xs py-0.5 normal-case font-bold text-emerald-700"
                      >
                        Download Template
                      </Button>
                    </Box>
                  </Paper>

                  {/* Upload Field */}
                  <Box className="flex flex-col gap-2">
                    <Typography variant="body2" className="text-slate-700 font-semibold text-xs">
                      Upload Excel File
                    </Typography>
                    
                    {!formQuestion.subject_id || !formQuestion.chapter_id || !formQuestion.topic_id ? (
                      <Box className="p-6 border border-dashed border-slate-300 rounded-lg bg-slate-50 flex flex-col items-center justify-center text-center">
                        <UploadCloud size={32} className="text-slate-400 mb-2" />
                        <Typography variant="body2" className="text-slate-500 text-xs font-semibold">
                          First Select Subject, Chapter & Topic Above
                        </Typography>
                        <Typography variant="caption" className="text-slate-400 text-[10px]">
                          Once selected, you can upload the questions spreadsheet here.
                        </Typography>
                      </Box>
                    ) : (
                      <Box className="flex flex-col gap-3">
                        <label className="p-6 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-lg bg-slate-50 hover:bg-slate-100/50 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
                          <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            onChange={handleExcelFileChange}
                            className="hidden"
                          />
                          <UploadCloud size={32} className="text-blue-600 mb-2 animate-pulse" />
                          <Typography variant="body2" className="text-slate-700 text-xs font-bold">
                            {excelFile ? excelFile.name : "Click to browse or drag & drop"}
                          </Typography>
                          <Typography variant="caption" className="text-slate-400 text-[10px] mt-1">
                            Accepts .xlsx, .xls, or .csv up to 10MB
                          </Typography>
                        </label>

                        {excelError && (
                          <Alert severity="error" className="text-xs whitespace-pre-wrap">
                            {excelError}
                          </Alert>
                        )}

                        {parsedExcelQuestions.length > 0 && (
                          <Box className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex flex-col gap-2">
                            <Typography variant="body2" className="text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                              ✓ {parsedExcelQuestions.length} Questions parsed successfully!
                            </Typography>
                            <Box className="max-h-36 overflow-y-auto bg-white border border-emerald-100 rounded p-2 text-[11px] font-mono text-slate-600 divide-y divide-slate-100">
                              {parsedExcelQuestions.slice(0, 5).map((pq, pIdx) => (
                                <div key={pIdx} className="py-1">
                                  <div className="font-bold text-slate-800 truncate">Q{pIdx+1}: {pq.question_text}</div>
                                  <div className="text-slate-500">Correct: {pq.correct_answer} | Options: {pq.option_a}, {pq.option_b}...</div>
                                </div>
                              ))}
                              {parsedExcelQuestions.length > 5 && (
                                <div className="text-slate-400 pt-1 text-center font-sans">
                                  ...and {parsedExcelQuestions.length - 5} more questions.
                                </div>
                              )}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    )}
                  </Box>
                </Box>
              ) : (
                <>
                  {/* Text fields */}
                  <TextField
                    label="Question Text"
                    variant="outlined"
                    fullWidth
                    multiline
                    rows={3}
                    value={formQuestion.question_text}
                    onChange={(e) => setFormQuestion({ ...formQuestion, question_text: e.target.value })}
                    id="question-text-field"
                  />

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formQuestion.is_html}
                        onChange={(e) => setFormQuestion({ ...formQuestion, is_html: e.target.checked })}
                        id="question-is-html-checkbox"
                        color="primary"
                      />
                    }
                    label="Render Question Text as HTML (for mathematical exponents, powers, symbols, etc.)"
                    id="question-is-html-label"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField
                      label="Option A"
                      variant="outlined"
                      value={formQuestion.option_a}
                      onChange={(e) => setFormQuestion({ ...formQuestion, option_a: e.target.value })}
                      id="question-opt-a"
                    />
                    <TextField
                      label="Option B"
                      variant="outlined"
                      value={formQuestion.option_b}
                      onChange={(e) => setFormQuestion({ ...formQuestion, option_b: e.target.value })}
                      id="question-opt-b"
                    />
                    <TextField
                      label="Option C"
                      variant="outlined"
                      value={formQuestion.option_c}
                      onChange={(e) => setFormQuestion({ ...formQuestion, option_c: e.target.value })}
                      id="question-opt-c"
                    />
                    <TextField
                      label="Option D"
                      variant="outlined"
                      value={formQuestion.option_d}
                      onChange={(e) => setFormQuestion({ ...formQuestion, option_d: e.target.value })}
                      id="question-opt-d"
                    />
                  </div>

                  <FormControl fullWidth variant="outlined">
                    <InputLabel id="correct-answer-label">Correct Answer</InputLabel>
                    <Select
                      labelId="correct-answer-label"
                      label="Correct Answer"
                      value={formQuestion.correct_answer}
                      onChange={(e) =>
                        setFormQuestion({
                          ...formQuestion,
                          correct_answer: e.target.value as 'A' | 'B' | 'C' | 'D',
                        })
                      }
                      id="question-correct-select"
                    >
                      <MenuItem value="A">A</MenuItem>
                      <MenuItem value="B">B</MenuItem>
                      <MenuItem value="C">C</MenuItem>
                      <MenuItem value="D">D</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    label="Explanation / Feedback"
                    variant="outlined"
                    fullWidth
                    multiline
                    rows={4}
                    value={formQuestion.explanation}
                    onChange={(e) => setFormQuestion({ ...formQuestion, explanation: e.target.value })}
                    id="question-explanation-field"
                    placeholder="Explain why the correct option is correct. This is shown for both correct and incorrect answers."
                  />
                </>
              )}
            </Box>
          )}

          {currentTab === 'users' && (
            <Box className="flex flex-col gap-4">
              <TextField
                label="Full Name"
                variant="outlined"
                fullWidth
                value={formUser.name}
                onChange={(e) => setFormUser({ ...formUser, name: e.target.value })}
                id="user-name-field"
              />
              <TextField
                label="Username"
                variant="outlined"
                fullWidth
                disabled={dialogMode === 'edit'}
                value={formUser.username}
                onChange={(e) => setFormUser({ ...formUser, username: e.target.value })}
                id="user-username-field"
              />

              {dialogMode === 'add' && (
                <TextField
                  label="Password"
                  type="password"
                  variant="outlined"
                  fullWidth
                  value={formUser.password}
                  onChange={(e) => setFormUser({ ...formUser, password: e.target.value })}
                  id="user-password-field"
                />
              )}

              <FormControl fullWidth variant="outlined">
                <InputLabel id="user-role-label">Role</InputLabel>
                <Select
                  labelId="user-role-label"
                  label="Role"
                  value={formUser.role}
                  onChange={(e) => setFormUser({ ...formUser, role: e.target.value as 'admin' | 'user' })}
                  id="user-role-select"
                >
                  <MenuItem value="user">User</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>

              {dialogMode === 'edit' && (
                <FormControl fullWidth variant="outlined">
                  <InputLabel id="user-status-label">Status</InputLabel>
                  <Select
                    labelId="user-status-label"
                    label="Status"
                    value={formUser.status}
                    onChange={(e) => setFormUser({ ...formUser, status: e.target.value as 'active' | 'inactive' })}
                    id="user-status-select"
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={() => setOpenDialog(false)} color="inherit" id="cancel-crud-button">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            color="primary"
            variant="contained"
            disabled={loading}
            id="save-crud-button"
            className="bg-slate-800 hover:bg-slate-900"
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, type: '', id: null })}
        id="delete-confirm-dialog"
      >
        <DialogTitle className="font-bold">Confirm Deletion</DialogTitle>
        <DialogContent dividers>
          Are you sure you want to delete this {deleteConfirm.type.slice(0, -1)}?
          {deleteConfirm.type === 'subjects' && (
            <div className="text-rose-600 font-medium text-xs mt-2">
              Warning: This will permanently delete all related chapters, topics, and questions!
            </div>
          )}
          {deleteConfirm.type === 'chapters' && (
            <div className="text-rose-600 font-medium text-xs mt-2">
              Warning: This will permanently delete all related topics and questions!
            </div>
          )}
          {deleteConfirm.type === 'topics' && (
            <div className="text-rose-600 font-medium text-xs mt-2">
              Warning: This will permanently delete all related questions!
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm({ open: false, type: '', id: null })} color="inherit" id="cancel-delete-button">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" disabled={loading} id="confirm-delete-button">
            Delete Permanently
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={pwDialog.open} onClose={() => setPwDialog({ open: false, userId: null, newPassword: '' })} id="pw-reset-dialog">
        <DialogTitle className="font-bold">Reset User Password</DialogTitle>
        <DialogContent dividers className="py-4">
          <TextField
            autoFocus
            label="New Password"
            type="password"
            fullWidth
            variant="outlined"
            value={pwDialog.newPassword}
            onChange={(e) => setPwDialog({ ...pwDialog, newPassword: e.target.value })}
            id="new-password-field"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setPwDialog({ open: false, userId: null, newPassword: '' })}
            color="inherit"
            id="cancel-pw-reset"
          >
            Cancel
          </Button>
          <Button onClick={handleResetPassword} color="primary" variant="contained" id="confirm-pw-reset">
            Reset Password
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Toast */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        id="admin-toast"
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
