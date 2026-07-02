import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  LinearProgress,
  Alert,
  Divider,
} from '@mui/material';
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Question, TestAnswer } from '../types.js';

interface TestScreenProps {
  questions: Question[];
  timePerQuestion: number; // in seconds (30, 60, 90, 120)
  onFinish: (results: {
    start_time: string;
    end_time: string;
    total_questions: number;
    answers: { question_id: number; selected_answer: 'A' | 'B' | 'C' | 'D' | ''; time_taken: number }[];
  }) => void;
  onCancel: () => void;
}

export const TestScreen: React.FC<TestScreenProps> = ({
  questions,
  timePerQuestion,
  onFinish,
  onCancel,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Keep track of user selected answer for each question
  // State maps question index to chosen option
  const [answers, setAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D' | ''>>({});

  // Cumulative time taken per question (index -> seconds spent)
  const [questionTimes, setQuestionTimes] = useState<Record<number, number>>({});

  // Countdown timers per question (index -> remaining seconds)
  const [timers, setTimers] = useState<Record<number, number>>({});

  const startTimeRef = useRef<string>(new Date().toISOString());

  // Current question references
  const currentQuestion = questions[currentIndex];

  // Initialize answers, timers, and questionTimes
  useEffect(() => {
    const initialAnswers: Record<number, 'A' | 'B' | 'C' | 'D' | ''> = {};
    const initialTimers: Record<number, number> = {};
    const initialTimes: Record<number, number> = {};

    questions.forEach((_, idx) => {
      initialAnswers[idx] = '';
      initialTimers[idx] = timePerQuestion;
      initialTimes[idx] = 0;
    });

    setAnswers(initialAnswers);
    setTimers(initialTimers);
    setQuestionTimes(initialTimes);
    startTimeRef.current = new Date().toISOString();
  }, [questions, timePerQuestion]);

  // Main tick interval to update elapsed time & remaining timer for the ACTIVE question
  useEffect(() => {
    if (questions.length === 0) return;

    const interval = setInterval(() => {
      // 1. Increment cumulative time spent on current question
      setQuestionTimes((prev) => ({
        ...prev,
        [currentIndex]: (prev[currentIndex] || 0) + 1,
      }));

      // 2. Decrement countdown timer for current question (allow it to go to 0 or negative/stop at 0)
      setTimers((prev) => {
        const currentTimer = prev[currentIndex] === undefined ? timePerQuestion : prev[currentIndex];
        return {
          ...prev,
          [currentIndex]: Math.max(0, currentTimer - 1),
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentIndex, questions, timePerQuestion]);

  if (questions.length === 0) {
    return (
      <Box className="p-8 text-center" id="test-empty-container">
        <Typography color="error">No questions selected. Please adjust your filters and try again.</Typography>
        <Button onClick={onCancel} className="mt-4" variant="outlined" id="test-cancel-empty-btn">
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  const currentTimerValue = timers[currentIndex] !== undefined ? timers[currentIndex] : timePerQuestion;
  const isTimeLimitExceeded = currentTimerValue === 0;

  const isQuestionAnswered = answers[currentIndex] !== '' || isTimeLimitExceeded;

  const handleOptionSelect = (option: 'A' | 'B' | 'C' | 'D') => {
    if (isQuestionAnswered) return;
    setAnswers((prev) => ({
      ...prev,
      [currentIndex]: option,
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    const endTime = new Date().toISOString();

    // Format answers array as requested by the submit endpoint
    const formattedAnswers = questions.map((q, idx) => ({
      question_id: q.id,
      selected_answer: (answers[idx] || '') as 'A' | 'B' | 'C' | 'D' | '',
      time_taken: questionTimes[idx] || 0,
    }));

    onFinish({
      start_time: startTimeRef.current,
      end_time: endTime,
      total_questions: questions.length,
      answers: formattedAnswers,
    });
  };

  // Progress Calculation
  const progressPercent = ((currentIndex + 1) / questions.length) * 100;

  // Answer status summary
  const answeredCount = Object.values(answers).filter((a) => a !== '').length;

  return (
    <div className="max-w-4xl mx-auto my-8 p-4" id="test-screen-root">
      {/* Header with Title and Overall Status */}
      <Card className="mb-4 border border-slate-200">
        <CardContent className="flex flex-col sm:flex-row justify-between items-center gap-4 py-4 bg-slate-900 text-white">
          <div>
            <Typography variant="h6" className="font-bold">
              Revision Active
            </Typography>
            <Typography variant="caption" className="text-slate-400">
              Answered: <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> questions
            </Typography>
          </div>
          <Box className="flex items-center gap-4">
            <Box className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              <Clock size={16} className={isTimeLimitExceeded ? 'text-amber-400' : 'text-slate-300'} />
              <Typography variant="body2" className={`font-mono font-bold ${isTimeLimitExceeded ? 'text-amber-400' : 'text-white'}`}>
                {isTimeLimitExceeded ? 'Time Limit Exceeded' : `Time Remaining: ${currentTimerValue}s`}
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={onCancel}
              id="exit-test-button"
            >
              Exit Revision
            </Button>
          </Box>
        </CardContent>
        {/* Progress Indicator */}
        <LinearProgress variant="determinate" value={progressPercent} sx={{ height: 6, backgroundColor: '#cbd5e1' }} />
      </Card>

      {/* Main Question Card */}
      <Card className="mb-6 border border-slate-200 shadow-sm" id="active-question-card">
        <CardContent className="p-8">
          {/* Question Breadcrumb Info */}
          <Box className="flex justify-between items-center mb-6">
            <Typography variant="caption" className="bg-slate-100 text-slate-700 px-3 py-1 rounded font-bold font-mono">
              QUESTION {currentIndex + 1} OF {questions.length}
            </Typography>
            <Typography variant="caption" className="text-slate-500 font-medium">
              Subject: {currentQuestion?.subject_name} &bull; Chapter: {currentQuestion?.chapter_name}
            </Typography>
          </Box>

          {/* Alert if Timer reached zero */}
          {isTimeLimitExceeded && (
            <Alert
              severity="warning"
              icon={<AlertTriangle size={18} />}
              className="mb-6 font-semibold"
              id="time-limit-exceeded-alert"
            >
              Time Limit Exceeded for this question! You can still submit your answer, but the elapsed time will be logged.
            </Alert>
          )}

          {/* Question Statement */}
          {currentQuestion?.is_html ? (
            <Typography variant="h5" className="font-bold text-slate-800 mb-8" id="question-text" component="div">
              <span dangerouslySetInnerHTML={{ __html: currentQuestion.question_text }} />
            </Typography>
          ) : (
            <Typography variant="h5" className="font-bold text-slate-800 mb-8" id="question-text">
              {currentQuestion?.question_text}
            </Typography>
          )}

          <Divider className="mb-6" />

          {/* MCQ Options Radio Group */}
          <FormControl component="fieldset" className="w-full">
            <RadioGroup
              value={answers[currentIndex] || ''}
              onChange={(e) => handleOptionSelect(e.target.value as any)}
              className="flex flex-col gap-4"
              id="options-radio-group"
            >
              {[
                { label: 'Option A', val: 'A', text: currentQuestion?.option_a },
                { label: 'Option B', val: 'B', text: currentQuestion?.option_b },
                { label: 'Option C', val: 'C', text: currentQuestion?.option_c },
                { label: 'Option D', val: 'D', text: currentQuestion?.option_d },
              ].map((opt) => {
                const isSelected = answers[currentIndex] === opt.val;
                const isCorrect = opt.val === currentQuestion?.correct_answer;
                const hasBeenAnswered = answers[currentIndex] !== '';

                let boxClass = 'border-slate-200 hover:border-slate-400 hover:bg-slate-50';
                if (hasBeenAnswered) {
                  if (isCorrect) {
                    boxClass = 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-sm';
                  } else if (isSelected) {
                    boxClass = 'border-rose-500 bg-rose-50 text-rose-950 shadow-sm';
                  } else {
                    boxClass = 'border-slate-100 opacity-60 bg-slate-50/50';
                  }
                } else if (isSelected) {
                  boxClass = 'border-blue-600 bg-blue-50/45 hover:bg-blue-50 shadow-sm';
                }

                return (
                  <Box
                    key={opt.val}
                    onClick={() => handleOptionSelect(opt.val as any)}
                    className={`border rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all ${boxClass}`}
                    id={`option-box-${opt.val}`}
                    sx={{ pointerEvents: hasBeenAnswered ? 'none' : 'auto' }}
                  >
                    <Radio
                      checked={isSelected}
                      disabled={hasBeenAnswered}
                      value={opt.val}
                      id={`radio-button-${opt.val}`}
                      sx={{ 
                        color: '#94a3b8', 
                        '&.Mui-checked': { 
                          color: hasBeenAnswered 
                            ? (isCorrect ? '#10b981' : '#f43f5e')
                            : '#2563eb' 
                        } 
                      }}
                    />
                    <Box className="flex flex-col flex-grow">
                      <Typography variant="caption" className={`font-bold font-mono ${hasBeenAnswered ? (isCorrect ? 'text-emerald-700' : (isSelected ? 'text-rose-700' : 'text-slate-400')) : 'text-slate-400'}`}>
                        {opt.label} 
                        {hasBeenAnswered && isCorrect && ' — Correct Selection ✓'} 
                        {hasBeenAnswered && isSelected && !isCorrect && ' — Incorrect Selection ✗'}
                      </Typography>
                      <Typography variant="body1" className="text-slate-800 font-medium">
                        {opt.text}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </RadioGroup>
          </FormControl>

          {/* Immediate feedback & Explanation section */}
          {answers[currentIndex] !== '' && (
            <Box className="mt-8 p-5 bg-slate-50 border border-slate-200 rounded-xl" id="question-explanation-panel">
              <Box className="flex items-center gap-2 mb-3">
                <span className={`w-2.5 h-2.5 rounded-full ${answers[currentIndex] === currentQuestion?.correct_answer ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <Typography variant="subtitle2" className="font-bold text-slate-800">
                  {answers[currentIndex] === currentQuestion?.correct_answer ? 'Correct answer!' : 'Incorrect answer.'}
                </Typography>
              </Box>

              {answers[currentIndex] !== currentQuestion?.correct_answer && (
                <Typography variant="body2" className="text-slate-600 mb-2 font-medium">
                  The correct answer is <strong className="text-emerald-700">Option {currentQuestion?.correct_answer}</strong>.
                </Typography>
              )}

              {currentQuestion?.explanation ? (
                <>
                  <Divider className="my-3 text-slate-200" />
                  <Typography variant="subtitle2" className="font-bold text-slate-800 mb-1">
                    Explanation:
                  </Typography>
                  <Typography variant="body2" className="text-slate-700 leading-relaxed font-normal">
                    {currentQuestion.explanation}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" className="text-slate-500 leading-relaxed font-normal italic">
                  {answers[currentIndex] === currentQuestion?.correct_answer 
                    ? 'Well done! You chose the correct option.' 
                    : 'Try reviewing this topic next time.'}
                </Typography>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Navigation and Submission Area */}
      <Box className="flex justify-between items-center gap-4">
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<ChevronLeft size={18} />}
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="px-6 border-slate-300 text-slate-700 hover:bg-slate-100"
          id="prev-question-button"
        >
          Previous
        </Button>

        {currentIndex === questions.length - 1 ? (
          <Button
            variant="contained"
            color="success"
            className="bg-emerald-600 hover:bg-emerald-700 font-bold px-8 text-white flex gap-1.5"
            onClick={handleSubmit}
            id="submit-test-button"
            startIcon={<CheckCircle2 size={18} />}
          >
            Submit Revision
          </Button>
        ) : (
          <Button
            variant="contained"
            color="primary"
            className="bg-slate-800 hover:bg-slate-900 px-6"
            endIcon={<ChevronRight size={18} />}
            onClick={handleNext}
            id="next-question-button"
          >
            Next Question
          </Button>
        )}
      </Box>

      {/* Mini status grid of questions */}
      <Box className="mt-8 bg-slate-50 border border-slate-200 p-4 rounded-lg">
        <Typography variant="caption" className="font-bold text-slate-500 mb-2 block uppercase font-mono">
          Question Matrix Index
        </Typography>
        <Box className="flex flex-wrap gap-2">
          {questions.map((_, idx) => {
            const isCurrent = idx === currentIndex;
            const isAnswered = answers[idx] !== '';
            let btnClass = 'bg-white text-slate-600 border border-slate-200';
            if (isCurrent) {
              btnClass = 'bg-slate-800 text-white font-bold ring-2 ring-slate-400';
            } else if (isAnswered) {
              btnClass = 'bg-indigo-100 text-indigo-800 font-semibold border border-indigo-200';
            }

            return (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-9 h-9 rounded text-xs transition-all ${btnClass}`}
                id={`matrix-cell-${idx}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </Box>
      </Box>
    </div>
  );
};
