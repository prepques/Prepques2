import React, { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Tabs,
  Tab,
  Container,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  Snackbar,
  Alert,
  TextField,
} from '@mui/material';
import {
  Play,
  History,
  User as UserIcon,
  LogOut,
  Clock,
  BookOpen,
  Award,
  ChevronRight,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { Subject, Chapter, Topic, Question, Test } from '../types.js';
import { TestScreen } from './TestScreen.js';
import { ResultScreen } from './ResultScreen.js';

interface UserDashboardProps {
  onLogout: () => void;
}

type TabValue = 'take_test' | 'previous_results' | 'profile';

export const UserDashboard: React.FC<UserDashboardProps> = ({ onLogout }) => {
  const { token, user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabValue>('take_test');

  // Profile Edit States
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileName(user.name);
    }
  }, [user]);

  // Notification Banner
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const showNotification = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Static filters metadata
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  // Selection states
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [selectedChapterIds, setSelectedChapterIds] = useState<number[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>([]);

  // Test config settings
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [questionCountType, setQuestionCountType] = useState<'preset' | 'all' | 'custom'>('preset');
  const [customQuestionCount, setCustomQuestionCount] = useState<string>('15');
  const [timePerQuestion, setTimePerQuestion] = useState<number>(60);
  const [questionOrder, setQuestionOrder] = useState<'Random' | 'Sequential'>('Random');

  // Dynamic available questions count state
  const [availableQuestionsCount, setAvailableQuestionsCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  useEffect(() => {
    const fetchAvailableCount = async () => {
      setLoadingCount(true);
      try {
        const response = await fetch('/api/tests/questions/count', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': token || '',
          },
          body: JSON.stringify({
            subject_ids: selectedSubjectIds,
            chapter_ids: selectedChapterIds,
            topic_ids: selectedTopicIds,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          setAvailableQuestionsCount(data.count);
        }
      } catch (err) {
        console.error('Failed to fetch available count', err);
      } finally {
        setLoadingCount(false);
      }
    };

    fetchAvailableCount();
  }, [selectedSubjectIds, selectedChapterIds, selectedTopicIds, token]);

  // Test Execution states
  const [activeTestQuestions, setActiveTestQuestions] = useState<Question[] | null>(null);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Past results histories
  const [testHistory, setTestHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Expanded previous test detail
  const [selectedHistoryTest, setSelectedHistoryTest] = useState<any | null>(null);

  // Fetch initial subjects, chapters, topics
  const fetchFilterMetaData = async () => {
    try {
      const headers = { 'X-Auth-Token': token || '' };

      const [resS, resC, resT] = await Promise.all([
        fetch('/api/subjects', { headers }),
        fetch('/api/chapters', { headers }),
        fetch('/api/topics', { headers }),
      ]);

      if (resS.ok) setSubjects(await resS.json());
      if (resC.ok) setChapters(await resC.json());
      if (resT.ok) setTopics(await resT.json());
    } catch (err) {
      console.error('Error fetching filter metadata:', err);
    }
  };

  // Fetch test history
  const fetchTestHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/tests/history', {
        headers: { 'X-Auth-Token': token || '' },
      });
      if (res.ok) {
        const data = await res.json();
        setTestHistory(data);
      }
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchFilterMetaData();
    fetchTestHistory();
  }, [token]);

  // Dynamic Dependency filters
  const getFilteredChapters = () => {
    if (selectedSubjectIds.length === 0) {
      return chapters;
    }
    return chapters.filter((c) => selectedSubjectIds.includes(c.subject_id));
  };

  const getFilteredTopics = () => {
    const validChapters = getFilteredChapters();
    const validChapterIds = validChapters.map((c) => c.id);

    let baseTopics = topics.filter((t) => validChapterIds.includes(t.chapter_id));

    if (selectedChapterIds.length > 0) {
      baseTopics = baseTopics.filter((t) => selectedChapterIds.includes(t.chapter_id));
    }
    return baseTopics;
  };

  // Reset dependent selections on parent selection changes
  const handleSubjectChange = (subjectIds: number[]) => {
    setSelectedSubjectIds(subjectIds);

    // Clear chapters that are no longer valid
    const validChapters = chapters.filter((c) => subjectIds.includes(c.subject_id));
    const validChapterIds = validChapters.map((c) => c.id);
    const newSelectedChapterIds = selectedChapterIds.filter((cid) => validChapterIds.includes(cid));
    setSelectedChapterIds(newSelectedChapterIds);

    // Clear topics that are no longer valid
    const validTopics = topics.filter((t) => validChapterIds.includes(t.chapter_id));
    const validTopicIds = validTopics.map((t) => t.id);
    setSelectedTopicIds(selectedTopicIds.filter((tid) => validTopicIds.includes(tid)));
  };

  const handleChapterChange = (chapterIds: number[]) => {
    setSelectedChapterIds(chapterIds);

    // Clear topics that are no longer valid
    const validTopics = topics.filter((t) => chapterIds.includes(t.chapter_id));
    const validTopicIds = validTopics.map((t) => t.id);
    setSelectedTopicIds(selectedTopicIds.filter((tid) => validTopicIds.includes(tid)));
  };

  // Fetch questions and start test
  const handleStartTest = async () => {
    setLoadingQuestions(true);
    try {
      const response = await fetch('/api/tests/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token || '',
        },
        body: JSON.stringify({
          subject_ids: selectedSubjectIds,
          chapter_ids: selectedChapterIds,
          topic_ids: selectedTopicIds,
          limit: questionCount,
          order: questionOrder,
        }),
      });

      let questionsList: any = [];
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        questionsList = await response.json();
      } else {
        const text = await response.text();
        questionsList = { error: text || `HTTP error ${response.status}: ${response.statusText}` };
      }

      if (!response.ok) {
        throw new Error(questionsList.error || 'Failed to fetch test questions');
      }

      if (questionsList.length === 0) {
        showNotification('No questions match your filter criteria. Adjust filters and try again.', 'error');
        return;
      }

      // Map subject and chapter names for quick view in TestScreen
      const mappedQuestions = questionsList.map((q: Question) => {
        const sub = subjects.find((s) => s.id === q.subject_id);
        const chap = chapters.find((c) => c.id === q.chapter_id);
        const top = topics.find((t) => t.id === q.topic_id);
        return {
          ...q,
          subject_name: sub ? sub.name : 'Mathematics',
          chapter_name: chap ? chap.name : 'Algebra',
          topic_name: top ? top.name : '',
        };
      });

      setActiveTestQuestions(mappedQuestions);
      setSubmissionResult(null);
    } catch (err: any) {
      showNotification(err.message || 'Error starting revision', 'error');
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Submit test and get scored payload
  const handleFinishTest = async (testPayload: any) => {
    try {
      const response = await fetch('/api/tests/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token || '',
        },
        body: JSON.stringify(testPayload),
      });

      let submission: any = {};
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        submission = await response.json();
      } else {
        const text = await response.text();
        submission = { error: text || `HTTP error ${response.status}: ${response.statusText}` };
      }

      if (!response.ok) {
        throw new Error(submission.error || 'Failed to submit test results');
      }

      setSubmissionResult(submission);
      fetchTestHistory(); // Reload background history
    } catch (err: any) {
      showNotification(err.message || 'Error scoring test results', 'error');
    }
  };

  // Formats time for results view
  const formatSeconds = (totalSecs: number) => {
    if (totalSecs < 60) return `${totalSecs}s`;
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs}s`;
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      showNotification('Name cannot be empty', 'error');
      return;
    }
    if (profilePassword) {
      if (profilePassword.length < 4) {
        showNotification('Password must be at least 4 characters long', 'error');
        return;
      }
      if (profilePassword !== profileConfirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
      }
    }

    setUpdatingProfile(true);
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token || '',
        },
        body: JSON.stringify({
          name: profileName,
          password: profilePassword || undefined,
        }),
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
        showNotification(data.error || 'Failed to update profile', 'error');
      } else {
        showNotification('Profile updated successfully', 'success');
        updateUser(data.user);
        setProfilePassword('');
        setProfileConfirmPassword('');
      }
    } catch (err) {
      showNotification('An error occurred. Please try again.', 'error');
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Reset state to configure a new test
  const handleResetTest = () => {
    setActiveTestQuestions(null);
    setSubmissionResult(null);
  };

  return (
    <Box id="user-dashboard-root" className="min-h-screen bg-slate-50 flex flex-col">
      {/* User App Bar */}
      <AppBar position="static" id="user-appbar" className="bg-white text-slate-900 border-b border-slate-200" sx={{ boxShadow: 'none' }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters className="flex justify-between">
            <Typography variant="h6" className="font-bold flex items-center gap-2 text-slate-900" id="user-appbar-title">
              <Box className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-base shadow-sm">
                P
              </Box>
              <span className="font-semibold tracking-tight text-lg text-slate-900">PrepQues</span>
            </Typography>

            <Box className="flex items-center gap-4">
              <Typography variant="body2" className="text-slate-500 hidden sm:inline text-xs font-medium">
                Welcome, <strong className="text-slate-800">{user?.name}</strong>
              </Typography>
              <Button
                variant="outlined"
                color="primary"
                id="user-logout-button"
                size="small"
                startIcon={<LogOut size={14} />}
                onClick={onLogout}
                className="border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 hover:bg-slate-50 text-xs py-1"
              >
                Sign Out
              </Button>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {activeTestQuestions && !submissionResult ? (
        <TestScreen
          questions={activeTestQuestions}
          timePerQuestion={timePerQuestion}
          onCancel={() => setActiveTestQuestions(null)}
          onFinish={handleFinishTest}
        />
      ) : activeTestQuestions && submissionResult ? (
        <ResultScreen
          questions={activeTestQuestions}
          submission={submissionResult}
          onRestart={handleStartTest}
          onGoHome={handleResetTest}
        />
      ) : (
        <>
          {/* Tabs Navigation */}
          <Box className="bg-white border-b border-slate-200">
            <Container maxWidth="lg">
              <Tabs
                value={activeTab}
                onChange={(e, val) => {
                  setActiveTab(val);
                  setSelectedHistoryTest(null); // Clear history focus when changing tabs
                }}
                id="user-dashboard-tabs"
                textColor="primary"
                indicatorColor="secondary"
                variant="fullWidth"
              >
            <Tab
              value="take_test"
              label="Take Test"
              icon={<Play size={16} />}
              iconPosition="start"
              className="py-4 font-semibold"
              id="tab-take-test"
            />
            <Tab
              value="previous_results"
              label="Previous Results"
              icon={<History size={16} />}
              iconPosition="start"
              className="py-4 font-semibold"
              id="tab-previous-results"
            />
            <Tab
              value="profile"
              label="My Profile"
              icon={<UserIcon size={16} />}
              iconPosition="start"
              className="py-4 font-semibold"
              id="tab-profile"
            />
          </Tabs>
        </Container>
      </Box>

      {/* Main Container */}
      <Container maxWidth="lg" className="flex-grow py-8" id="user-main-container">
        {/* VIEW 1: TAKE TEST CONFIGURATION SCREEN */}
        {activeTab === 'take_test' && (
          <Box id="view-take-test-config">
            <Card className="shadow border border-slate-200">
              <Box className="p-6 bg-slate-900 text-white flex items-center gap-3">
                <Box className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/10">
                  <Play size={20} />
                </Box>
                <div>
                  <Typography variant="h5" className="font-bold text-lg tracking-tight">
                    Configure Revision Session
                  </Typography>
                  <Typography variant="caption" className="text-slate-400 font-medium">
                    Customize your session by selecting subjects, chapters, and topics
                  </Typography>
                </div>
              </Box>

              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row gap-8">
                  {/* LEFT: Revision Filters */}
                  <div className="w-full md:w-7/12">
                    <Typography variant="subtitle1" className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <BookOpen size={18} className="text-slate-500" />
                      1. Target Scope Filters
                    </Typography>

                    <Box className="flex flex-col gap-5">
                      {/* Subject Multi Select */}
                      <FormControl fullWidth variant="outlined">
                        <InputLabel id="select-subjects-label">Subject Filters</InputLabel>
                        <Select
                          labelId="select-subjects-label"
                          id="select-subjects"
                          multiple
                          value={selectedSubjectIds}
                          onChange={(e) => handleSubjectChange(e.target.value as number[])}
                          input={<OutlinedInput label="Subject Filters" />}
                          renderValue={(selected) =>
                            selected
                              .map((id) => subjects.find((s) => s.id === id)?.name)
                              .filter(Boolean)
                              .join(', ')
                          }
                        >
                          <MenuItem disabled value="">
                            <em>Select one or more subjects</em>
                          </MenuItem>
                          {subjects.map((sub) => (
                            <MenuItem key={sub.id} value={sub.id}>
                              <Checkbox checked={selectedSubjectIds.indexOf(sub.id) > -1} />
                              <ListItemText primary={sub.name} />
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      {/* Chapter Multi Select */}
                      <FormControl fullWidth variant="outlined">
                        <InputLabel id="select-chapters-label">Chapter Filters</InputLabel>
                        <Select
                          labelId="select-chapters-label"
                          id="select-chapters"
                          multiple
                          value={selectedChapterIds}
                          onChange={(e) => handleChapterChange(e.target.value as number[])}
                          input={<OutlinedInput label="Chapter Filters" />}
                          renderValue={(selected) =>
                            selected
                              .map((id) => chapters.find((c) => c.id === id)?.name)
                              .filter(Boolean)
                              .join(', ')
                          }
                        >
                          {getFilteredChapters().length === 0 ? (
                            <MenuItem disabled>No chapters available. Pick a subject first.</MenuItem>
                          ) : (
                            getFilteredChapters().map((chap) => (
                              <MenuItem key={chap.id} value={chap.id}>
                                <Checkbox checked={selectedChapterIds.indexOf(chap.id) > -1} />
                                <ListItemText primary={chap.name} />
                              </MenuItem>
                            ))
                          )}
                        </Select>
                      </FormControl>

                      {/* Topic Multi Select */}
                      <FormControl fullWidth variant="outlined">
                        <InputLabel id="select-topics-label">Topic Filters</InputLabel>
                        <Select
                          labelId="select-topics-label"
                          id="select-topics"
                          multiple
                          value={selectedTopicIds}
                          onChange={(e) => setSelectedTopicIds(e.target.value as number[])}
                          input={<OutlinedInput label="Topic Filters" />}
                          renderValue={(selected) =>
                            selected
                              .map((id) => topics.find((t) => t.id === id)?.name)
                              .filter(Boolean)
                              .join(', ')
                          }
                        >
                          {getFilteredTopics().length === 0 ? (
                            <MenuItem disabled>No topics available. Pick subjects/chapters first.</MenuItem>
                          ) : (
                            getFilteredTopics().map((top) => (
                              <MenuItem key={top.id} value={top.id}>
                                <Checkbox checked={selectedTopicIds.indexOf(top.id) > -1} />
                                <ListItemText primary={top.name} />
                              </MenuItem>
                            ))
                          )}
                        </Select>
                      </FormControl>
                    </Box>
                  </div>

                  {/* RIGHT: Test Settings */}
                  <div className="w-full md:w-5/12">
                    <Typography variant="subtitle1" className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Clock size={18} className="text-slate-500" />
                      2. Session Parameters
                    </Typography>

                    <Box className="flex flex-col gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
                      {/* Number Of Questions */}
                      <Box className="flex flex-col gap-3">
                        <FormControl fullWidth variant="outlined" size="small">
                          <InputLabel id="question-count-type-label">Count Mode</InputLabel>
                          <Select
                            labelId="question-count-type-label"
                            value={questionCountType}
                            onChange={(e) => {
                              const type = e.target.value as 'preset' | 'all' | 'custom';
                              setQuestionCountType(type);
                              if (type === 'preset') {
                                setQuestionCount(10);
                              } else if (type === 'all') {
                                setQuestionCount(-1);
                              } else {
                                setQuestionCount(15);
                                setCustomQuestionCount('15');
                              }
                            }}
                            label="Count Mode"
                          >
                            <MenuItem value="preset">Preset Quantities</MenuItem>
                            <MenuItem value="all">All Available Questions</MenuItem>
                            <MenuItem value="custom">Custom Quantity</MenuItem>
                          </Select>
                        </FormControl>

                        {questionCountType === 'preset' && (
                          <FormControl fullWidth variant="outlined" size="small">
                            <InputLabel id="question-count-label">Select Number Of Questions</InputLabel>
                            <Select
                              labelId="question-count-label"
                              value={questionCount === -1 ? 10 : questionCount}
                              onChange={(e) => setQuestionCount(e.target.value as number)}
                              label="Select Number Of Questions"
                            >
                              <MenuItem value={10}>10 Questions</MenuItem>
                              <MenuItem value={20}>20 Questions</MenuItem>
                              <MenuItem value={50}>50 Questions</MenuItem>
                              <MenuItem value={100}>100 Questions</MenuItem>
                            </Select>
                          </FormControl>
                        )}

                        {questionCountType === 'custom' && (
                          <TextField
                            label="Enter Positive Integer"
                            type="number"
                            size="small"
                            variant="outlined"
                            fullWidth
                            value={customQuestionCount}
                            onChange={(e) => {
                              const val = e.target.value;
                              // Match positive integers only
                              if (val === '' || (/^\d+$/.test(val) && parseInt(val) > 0)) {
                                setCustomQuestionCount(val);
                                if (val !== '') {
                                  setQuestionCount(parseInt(val));
                                }
                              }
                            }}
                            error={customQuestionCount === ''}
                            helperText={customQuestionCount === '' ? 'Required (positive integer)' : ''}
                            id="custom-question-count-field"
                          />
                        )}

                        {/* Available questions count display */}
                        <Box className="mt-1 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg flex justify-between items-center text-xs">
                          <span className="text-blue-700 font-semibold">Questions available in pool:</span>
                          <span className="text-blue-900 font-mono font-bold bg-white px-2 py-0.5 rounded shadow-sm border border-blue-100">
                            {loadingCount ? '...' : (availableQuestionsCount !== null ? availableQuestionsCount : '0')}
                          </span>
                        </Box>
                      </Box>

                      {/* Time Per Question */}
                      <FormControl fullWidth variant="outlined" size="small">
                        <InputLabel id="time-limit-label">Time Limit Per Question</InputLabel>
                        <Select
                          labelId="time-limit-label"
                          value={timePerQuestion}
                          onChange={(e) => setTimePerQuestion(e.target.value as number)}
                          label="Time Limit Per Question"
                        >
                          <MenuItem value={30}>30 seconds</MenuItem>
                          <MenuItem value={60}>60 seconds</MenuItem>
                          <MenuItem value={90}>90 seconds</MenuItem>
                          <MenuItem value={120}>120 seconds</MenuItem>
                        </Select>
                      </FormControl>

                      {/* Question Order */}
                      <FormControl component="fieldset">
                        <FormLabel component="legend" className="font-semibold text-xs text-slate-500 uppercase tracking-wider mb-2">
                          Question Order
                        </FormLabel>
                        <RadioGroup
                          row
                          value={questionOrder}
                          onChange={(e) => setQuestionOrder(e.target.value as any)}
                        >
                          <FormControlLabel value="Random" control={<Radio size="small" />} label="Randomized" />
                          <FormControlLabel value="Sequential" control={<Radio size="small" />} label="Sequential" />
                        </RadioGroup>
                      </FormControl>
                    </Box>
                  </div>
                </div>

                <Divider className="my-8" />

                {/* Start Session Action */}
                <Box className="flex justify-end">
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    id="start-revision-button"
                    className="bg-blue-600 hover:bg-blue-700 py-3 px-8 font-semibold text-white shadow-sm flex gap-2 rounded-lg normal-case"
                    onClick={handleStartTest}
                    disabled={loadingQuestions}
                  >
                    {loadingQuestions ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      <>
                        Start Revision Session
                        <ChevronRight size={18} />
                      </>
                    )}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* VIEW 2: PREVIOUS RESULTS LIST */}
        {activeTab === 'previous_results' && (
          <Box id="view-previous-results">
            {selectedHistoryTest ? (
              // Secondary View: Expand detailed scorecard from past results
              <Box id="history-details-card">
                <Box className="mb-4">
                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={() => setSelectedHistoryTest(null)}
                    id="history-back-button"
                    className="border-slate-300 text-slate-700 hover:bg-slate-100"
                  >
                    &larr; Back to History List
                  </Button>
                </Box>
                <ResultScreen
                  questions={selectedHistoryTest.answers.map((ans: any, idx: number) => ({
                    id: ans.question_id,
                    question_text: ans.question_text || `Question Reference #${ans.question_id}`,
                    option_a: 'Option A Content',
                    option_b: 'Option B Content',
                    option_c: 'Option C Content',
                    option_d: 'Option D Content',
                    correct_answer: 'A', // Dummy correct mapping since it is a static scorecard
                    subject_id: 1,
                    chapter_id: 1,
                    topic_id: 1,
                    created_at: '',
                  }))}
                  submission={{
                    test: selectedHistoryTest,
                    answers: selectedHistoryTest.answers,
                  }}
                  onRestart={() => {
                    // Quick restart based on same settings if available
                    setSelectedHistoryTest(null);
                    setActiveTab('take_test');
                  }}
                  onGoHome={() => setSelectedHistoryTest(null)}
                />
              </Box>
            ) : (
              // Primary View: Historical Revision Sessions Table
              <Card className="shadow border border-slate-200">
                <Box className="p-6 bg-slate-900 text-white flex items-center gap-3">
                  <History className="text-indigo-400" />
                  <div>
                    <Typography variant="h5" className="font-bold">
                      Previous Scorecards
                    </Typography>
                    <Typography variant="caption" className="text-slate-400">
                      Check your performance analytics across all previous sessions
                    </Typography>
                  </div>
                </Box>
                <CardContent className="p-0">
                  {loadingHistory ? (
                    <Box className="flex justify-center p-12">
                      <CircularProgress />
                    </Box>
                  ) : testHistory.length === 0 ? (
                    <Box className="p-12 text-center text-slate-400">
                      You haven't completed any revision tests yet. Use the "Take Test" tab to begin.
                    </Box>
                  ) : (
                    <TableContainer component={Paper} className="shadow-none rounded-none border-0" id="history-table-container">
                      <Table id="history-table">
                        <TableHead className="bg-slate-50">
                          <TableRow>
                            <TableCell className="font-bold text-slate-700">Test Date</TableCell>
                            <TableCell className="font-bold text-slate-700" align="center">Total Questions</TableCell>
                            <TableCell className="font-bold text-slate-700" align="center">Correct Answers</TableCell>
                            <TableCell className="font-bold text-slate-700" align="center">Wrong Answers</TableCell>
                            <TableCell className="font-bold text-slate-700" align="center">Accuracy</TableCell>
                            <TableCell className="font-bold text-slate-700" align="center">Time Spent</TableCell>
                            <TableCell className="font-bold text-slate-700" align="right">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {testHistory.map((testItem) => {
                            const correct = testItem.score;
                            const total = testItem.total_questions;
                            const wrong = total - correct;
                            const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
                            const totalSecs = testItem.answers?.reduce((acc: number, curr: any) => acc + (curr.time_taken || 0), 0) || 0;

                            return (
                              <TableRow key={testItem.id} className="hover:bg-slate-50 transition-colors">
                                <TableCell className="font-medium text-slate-900">
                                  {new Date(testItem.start_time).toLocaleString()}
                                </TableCell>
                                <TableCell align="center" className="text-slate-800 font-bold">{total}</TableCell>
                                <TableCell align="center" className="text-emerald-600 font-bold">{correct}</TableCell>
                                <TableCell align="center" className="text-rose-600 font-bold">{wrong}</TableCell>
                                <TableCell align="center">
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs font-bold ${
                                      accuracy >= 80 ? 'bg-emerald-100 text-emerald-800' : accuracy >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {accuracy}%
                                  </span>
                                </TableCell>
                                <TableCell align="center" className="text-slate-600 font-medium">
                                  {formatSeconds(totalSecs)}
                                </TableCell>
                                <TableCell align="right">
                                  <Button
                                    variant="outlined"
                                    color="secondary"
                                    size="small"
                                    onClick={() => setSelectedHistoryTest(testItem)}
                                    id={`view-history-detail-${testItem.id}`}
                                  >
                                    Review Details
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            )}
          </Box>
        )}

        {/* VIEW 3: PROFILE SCREEN */}
        {activeTab === 'profile' && (
          <Box id="view-profile">
            <Card className="shadow border border-slate-200 max-w-2xl mx-auto">
              <Box className="p-8 bg-gradient-to-r from-slate-900 to-slate-850 text-white flex items-center gap-4">
                <Box className="bg-blue-600 text-white p-4 rounded-full flex items-center justify-center">
                  <UserIcon size={36} />
                </Box>
                <div>
                  <Typography variant="h5" className="font-bold">
                    {user?.name}
                  </Typography>
                  <Typography variant="caption" className="text-slate-400 block font-mono">
                    Username: @{user?.username}
                  </Typography>
                </div>
              </Box>

              <CardContent className="p-8 flex flex-col gap-6">
                <Typography variant="h6" className="text-slate-800 font-bold mb-1">
                  Edit Personal Profile Information
                </Typography>
                
                <form onSubmit={handleUpdateProfile} className="flex flex-col gap-5">
                  <TextField
                    label="Full Name"
                    variant="outlined"
                    fullWidth
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    id="profile-name-input"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextField
                      label="New Password"
                      type="password"
                      variant="outlined"
                      fullWidth
                      value={profilePassword}
                      onChange={(e) => setProfilePassword(e.target.value)}
                      id="profile-password-input"
                      placeholder="Leave blank to keep current"
                      helperText="Minimum 4 characters"
                    />
                    <TextField
                      label="Confirm New Password"
                      type="password"
                      variant="outlined"
                      fullWidth
                      value={profileConfirmPassword}
                      onChange={(e) => setProfileConfirmPassword(e.target.value)}
                      id="profile-confirm-password-input"
                      placeholder="Leave blank to keep current"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={updatingProfile}
                    className="bg-blue-600 hover:bg-blue-700 font-semibold py-2.5 mt-2 text-white"
                    id="profile-save-button"
                  >
                    {updatingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                  </Button>
                </form>

                <Divider className="my-2" />

                <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                  <div>
                    <Typography variant="subtitle2" className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                      System Account Role
                    </Typography>
                    <Typography variant="body2" className="text-slate-800 font-medium capitalize">
                      {user?.role === 'admin' ? 'System Administrator' : 'Standard Revision User'}
                    </Typography>
                  </div>

                  <div>
                    <Typography variant="subtitle2" className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                      Account Status
                    </Typography>
                    <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded text-xs font-bold uppercase inline-block">
                      Active &amp; Verified
                    </span>
                  </div>
                </div>

                <Divider className="my-2" />

                <Button
                  variant="outlined"
                  color="error"
                  onClick={onLogout}
                  className="border-rose-200 hover:border-rose-300 text-rose-600 hover:text-rose-800 hover:bg-rose-50 font-bold py-2.5"
                  id="profile-logout-button"
                  startIcon={<LogOut size={16} />}
                  fullWidth
                >
                  Sign Out of PrepQues
                </Button>
              </CardContent>
            </Card>
          </Box>
        )}
      </Container>
    </>
  )}

      {/* Snackbar Alert */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        id="user-toast"
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
