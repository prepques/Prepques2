import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  ChevronDown,
  RefreshCw,
  Home,
  AlertTriangle,
} from 'lucide-react';
import { Question } from '../types.js';

interface ResultScreenProps {
  questions: Question[];
  submission: {
    test: {
      id: number;
      user_id: number;
      start_time: string;
      end_time: string;
      total_questions: number;
      score: number;
    };
    answers: {
      id: number;
      test_id: number;
      question_id: number;
      selected_answer: 'A' | 'B' | 'C' | 'D' | '';
      is_correct: boolean;
      time_taken: number;
    }[];
  };
  onRestart: () => void;
  onGoHome: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  questions,
  submission,
  onRestart,
  onGoHome,
}) => {
  const { test, answers } = submission;

  const totalQuestions = test.total_questions;
  const correctCount = test.score;
  const wrongCount = totalQuestions - correctCount;
  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // Calculate times
  const totalTimeTaken = answers.reduce((acc, curr) => acc + curr.time_taken, 0);
  const avgTimePerQuestion = totalQuestions > 0 ? Math.round(totalTimeTaken / totalQuestions) : 0;

  // Format seconds to human-readable (e.g., 2m 14s)
  const formatTime = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}m ${remainingSecs}s`;
  };

  return (
    <div className="max-w-4xl mx-auto my-8 p-4" id="result-screen-root">
      {/* Visual Celebration Card */}
      <Card className="mb-6 overflow-hidden border border-slate-200 shadow-lg">
        <Box className="p-8 bg-gradient-to-r from-slate-900 to-blue-950 text-white text-center flex flex-col items-center">
          <Award size={64} className="text-yellow-400 mb-4 animate-bounce" />
          <Typography variant="h4" className="font-bold mb-1">
            Revision Session Completed
          </Typography>
          <Typography variant="body1" className="text-slate-300">
            Great job reinforcing your knowledge. Here are your revision analytics.
          </Typography>
        </Box>

        <CardContent className="p-8">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-8" id="metrics-grid">
            <div className="w-full">
              <Box className="border border-slate-200 rounded-xl p-4 text-center bg-slate-50/50">
                <Typography variant="caption" className="font-bold text-slate-400 block mb-1">
                  TOTAL QUESTIONS
                </Typography>
                <Typography variant="h4" className="font-extrabold text-slate-800">
                  {totalQuestions}
                </Typography>
              </Box>
            </div>

            <div className="w-full">
              <Box className="border border-slate-200 rounded-xl p-4 text-center bg-emerald-50/20 border-emerald-100">
                <Typography variant="caption" className="font-bold text-emerald-600 block mb-1">
                  CORRECT ANSWERS
                </Typography>
                <Typography variant="h4" className="font-extrabold text-emerald-600 flex justify-center items-center gap-1">
                  <CheckCircle2 size={24} />
                  {correctCount}
                </Typography>
              </Box>
            </div>

            <div className="w-full">
              <Box className="border border-slate-200 rounded-xl p-4 text-center bg-rose-50/20 border-rose-100">
                <Typography variant="caption" className="font-bold text-rose-600 block mb-1">
                  WRONG ANSWERS
                </Typography>
                <Typography variant="h4" className="font-extrabold text-rose-600 flex justify-center items-center gap-1">
                  <XCircle size={24} />
                  {wrongCount}
                </Typography>
              </Box>
            </div>

            <div className="w-full">
              <Box className="border border-slate-200 rounded-xl p-4 text-center bg-slate-50/50">
                <Typography variant="caption" className="font-bold text-slate-400 block mb-1">
                  ACCURACY RATE
                </Typography>
                <Typography
                  variant="h4"
                  className={`font-extrabold ${
                    accuracy >= 80 ? 'text-emerald-600' : accuracy >= 50 ? 'text-amber-500' : 'text-rose-500'
                  }`}
                >
                  {accuracy}%
                </Typography>
              </Box>
            </div>

            <div className="w-full">
              <Box className="border border-slate-200 rounded-xl p-4 text-center bg-slate-50/50">
                <Typography variant="caption" className="font-bold text-slate-400 block mb-1">
                  TOTAL TIME SPENT
                </Typography>
                <Typography variant="h4" className="font-extrabold text-slate-800 flex justify-center items-center gap-1">
                  <Clock size={20} className="text-slate-500" />
                  {formatTime(totalTimeTaken)}
                </Typography>
              </Box>
            </div>

            <div className="w-full">
              <Box className="border border-slate-200 rounded-xl p-4 text-center bg-slate-50/50">
                <Typography variant="caption" className="font-bold text-slate-400 block mb-1">
                  AVG TIME / QUESTION
                </Typography>
                <Typography variant="h4" className="font-extrabold text-slate-800">
                  {avgTimePerQuestion}s
                </Typography>
              </Box>
            </div>
          </div>

          {/* Action Buttons */}
          <Box className="flex flex-col sm:flex-row justify-center gap-4 mb-10" id="result-actions">
            <Button
              variant="contained"
              size="large"
              color="primary"
              className="bg-slate-800 hover:bg-slate-900 font-bold px-8 flex gap-2"
              onClick={onRestart}
              id="restart-revision-button"
            >
              <RefreshCw size={18} />
              Revise Again
            </Button>
            <Button
              variant="outlined"
              size="large"
              color="inherit"
              className="border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold px-8 flex gap-2"
              onClick={onGoHome}
              id="results-gohome-button"
            >
              <Home size={18} />
              Return to Dashboard
            </Button>
          </Box>

          <Divider className="mb-8" />

          {/* Detailed Question Review Accordions */}
          <Typography variant="h6" className="font-bold text-slate-800 mb-4" id="review-section-title">
            Detailed Question Review
          </Typography>

          <Box className="flex flex-col gap-3" id="review-accordions-container">
            {questions.map((q, idx) => {
              const ansRecord = answers.find((ans) => ans.question_id === q.id);
              const selectedOpt = ansRecord ? ansRecord.selected_answer : '';
              const isCorrect = ansRecord ? ansRecord.is_correct : false;
              const questionTime = ansRecord ? ansRecord.time_taken : 0;

              return (
                <Accordion
                  key={q.id}
                  className="border border-slate-200 shadow-none before:hidden rounded-lg overflow-hidden"
                  id={`review-accordion-${idx}`}
                >
                  <AccordionSummary
                    expandIcon={<ChevronDown size={18} />}
                    className={`px-4 py-1.5 ${
                      isCorrect ? 'bg-emerald-50/30 hover:bg-emerald-50/55' : 'bg-rose-50/20 hover:bg-rose-50/40'
                    }`}
                  >
                    <Box className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full pr-4 gap-2">
                      <Box className="flex items-start sm:items-center gap-3">
                        {isCorrect ? (
                          <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5 sm:mt-0" size={20} />
                        ) : (
                          <XCircle className="text-rose-500 shrink-0 mt-0.5 sm:mt-0" size={20} />
                        )}
                        {q.is_html ? (
                          <Typography variant="body2" className="font-semibold text-slate-800 break-words" component="div">
                            {idx + 1}. <span dangerouslySetInnerHTML={{ __html: q.question_text }} className="inline-block" />
                          </Typography>
                        ) : (
                          <Typography variant="body2" className="font-semibold text-slate-800 break-words">
                            {idx + 1}. {q.question_text}
                          </Typography>
                        )}
                      </Box>
                      <Box className="flex items-center gap-2 shrink-0 pl-8 sm:pl-0">
                        <Typography variant="caption" className="bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-medium">
                          Time: {questionTime}s
                        </Typography>
                        <span
                          className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                            isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isCorrect ? 'Correct' : selectedOpt === '' ? 'Unanswered' : 'Wrong'}
                        </span>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails className="p-6 bg-white border-t border-slate-100">
                    {q.is_html ? (
                      <Typography variant="body1" className="font-bold text-slate-800 mb-4" component="div">
                        <span dangerouslySetInnerHTML={{ __html: q.question_text }} />
                      </Typography>
                    ) : (
                      <Typography variant="body1" className="font-bold text-slate-800 mb-4">
                        {q.question_text}
                      </Typography>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      {[
                        { val: 'A', text: q.option_a },
                        { val: 'B', text: q.option_b },
                        { val: 'C', text: q.option_c },
                        { val: 'D', text: q.option_d },
                      ].map((opt) => {
                        const isSelected = selectedOpt === opt.val;
                        const isCorrectOpt = q.correct_answer === opt.val;

                        let borderClass = 'border-slate-200';
                        let bgClass = 'bg-white';
                        let badgeText = '';

                        if (isCorrectOpt) {
                          borderClass = 'border-emerald-500';
                          bgClass = 'bg-emerald-50/30';
                          badgeText = '✓ Correct Answer';
                        } else if (isSelected && !isCorrectOpt) {
                          borderClass = 'border-rose-400';
                          bgClass = 'bg-rose-50/20';
                          badgeText = '✗ Your Selection';
                        }

                        return (
                          <div key={opt.val} className="w-full">
                            <Box className={`border rounded-lg p-3.5 flex justify-between items-center ${borderClass} ${bgClass}`}>
                              <div>
                                <Typography variant="caption" className="font-bold text-slate-400 font-mono">
                                  OPTION {opt.val}
                                </Typography>
                                <Typography variant="body2" className="font-medium text-slate-800">
                                  {opt.text}
                                </Typography>
                              </div>
                              {badgeText && (
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                    isCorrectOpt ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {badgeText}
                                </span>
                              )}
                            </Box>
                          </div>
                        );
                      })}
                    </div>

                    <Box className="flex justify-between items-center text-xs text-slate-400 mt-2 font-medium">
                      <span>Subject: {q.subject_name}</span>
                      <span>Chapter: {q.chapter_name} &bull; Topic: {q.topic_name}</span>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>
        </CardContent>
      </Card>
    </div>
  );
};
