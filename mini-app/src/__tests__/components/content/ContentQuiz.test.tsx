import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { framerMotionMock } from '@/test/mocks/framer-motion';

vi.mock('framer-motion', () => framerMotionMock);

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  X: (props: any) => <span data-testid="x-icon" {...props} />,
  Trophy: (props: any) => <span data-testid="trophy-icon" {...props} />,
  RotateCcw: (props: any) => <span data-testid="retry-icon" {...props} />,
  Share2: (props: any) => <span data-testid="share-icon" {...props} />,
  Loader2: (props: any) => <span data-testid="loader-icon" {...props} />,
  AlertCircle: (props: any) => <span data-testid="alert-icon" {...props} />,
}));

// Mock FocusTrap
vi.mock('@/components/FocusTrap', () => ({
  FocusTrap: ({ children, onEscape }: any) => (
    <div data-testid="focus-trap" onKeyDown={(e: any) => e.key === 'Escape' && onEscape?.()}>
      {children}
    </div>
  ),
}));

// Mock Confetti
vi.mock('@/components/celebrations/Confetti', () => ({
  Confetti: ({ show }: any) => show ? <div data-testid="confetti" /> : null,
}));

// Mock useTelegram
const mockHaptic = { impact: vi.fn(), notification: vi.fn() };
vi.mock('@/hooks/useTelegram', () => ({
  useTelegram: () => ({ haptic: mockHaptic }),
}));

// Mock content API
const mockFetchQuiz = vi.fn();
const mockSubmitQuiz = vi.fn();
vi.mock('@/api/content', () => ({
  fetchQuiz: (...args: any[]) => mockFetchQuiz(...args),
  submitQuiz: (...args: any[]) => mockSubmitQuiz(...args),
}));

import { ContentQuiz } from '@/components/content/ContentQuiz';
import type { QuizQuestion, QuizResult } from '@/api/content';

const sampleQuestions: QuizQuestion[] = [
  { id: 1, article_id: 10, question: 'What is a budget?', options: ['A plan', 'A debt', 'A tax', 'A loan'], xp_reward: 10 },
  { id: 2, article_id: 10, question: 'What is saving?', options: ['Spending', 'Investing', 'Keeping money', 'Lending'], xp_reward: 10 },
  { id: 3, article_id: 10, question: 'What is interest?', options: ['Fee', 'Cost of borrowing', 'Tax', 'Gift'], xp_reward: 10 },
];

const sampleResult: QuizResult = {
  score: 100,
  total: 3,
  correct: 3,
  xp_earned: 30,
  correct_answers: [0, 2, 1],
};

const lowScoreResult: QuizResult = {
  score: 33,
  total: 3,
  correct: 1,
  xp_earned: 10,
  correct_answers: [0, 2, 1],
};

const defaultProps = {
  articleId: 10,
  articleTitle: 'Budget Basics',
  telegramId: 12345,
  onClose: vi.fn(),
  onComplete: vi.fn(),
};

function renderQuiz(overrides = {}) {
  return render(<ContentQuiz {...defaultProps} {...overrides} />);
}

// Helper: answer all questions and reach results
async function answerAllQuestions() {
  // Answer Q1
  await waitFor(() => screen.getByText('A plan'));
  fireEvent.click(screen.getByText('A plan'));
  // Wait for 400ms timeout + next question
  await waitFor(() => screen.getByText('What is saving?'), { timeout: 2000 });

  // Answer Q2
  fireEvent.click(screen.getByText('Keeping money'));
  await waitFor(() => screen.getByText('What is interest?'), { timeout: 2000 });

  // Answer Q3 (last triggers submit)
  fireEvent.click(screen.getByText('Cost of borrowing'));
}

describe('ContentQuiz', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchQuiz.mockResolvedValue(sampleQuestions);
    mockSubmitQuiz.mockResolvedValue(sampleResult);
  });

  it('shows loading state initially', () => {
    mockFetchQuiz.mockImplementation(() => new Promise(() => {}));
    renderQuiz();
    expect(screen.getByText(/Loading quiz/)).toBeInTheDocument();
  });

  it('displays article title in header', async () => {
    renderQuiz();
    await waitFor(() => {
      expect(screen.getByText('Budget Basics')).toBeInTheDocument();
    });
  });

  it('shows close button', async () => {
    renderQuiz();
    await waitFor(() => {
      expect(screen.getByLabelText('Close quiz')).toBeInTheDocument();
    });
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    renderQuiz({ onClose });
    await waitFor(() => screen.getByLabelText('Close quiz'));
    fireEvent.click(screen.getByLabelText('Close quiz'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders first question after loading', async () => {
    renderQuiz();
    await waitFor(() => {
      expect(screen.getByText('What is a budget?')).toBeInTheDocument();
    });
  });

  it('displays question number counter', async () => {
    renderQuiz();
    await waitFor(() => {
      expect(screen.getByText(/Question 1 of 3/)).toBeInTheDocument();
    });
  });

  it('displays answer options with letters', async () => {
    renderQuiz();
    await waitFor(() => {
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('C')).toBeInTheDocument();
      expect(screen.getByText('D')).toBeInTheDocument();
    });
  });

  it('displays option text', async () => {
    renderQuiz();
    await waitFor(() => {
      expect(screen.getByText('A plan')).toBeInTheDocument();
      expect(screen.getByText('A debt')).toBeInTheDocument();
    });
  });

  it('shows XP reward for current question', async () => {
    renderQuiz();
    await waitFor(() => {
      expect(screen.getByText('+10 XP')).toBeInTheDocument();
    });
  });

  it('advances to next question after selecting an answer', async () => {
    renderQuiz();
    await waitFor(() => screen.getByText('A plan'));
    fireEvent.click(screen.getByText('A plan'));

    await waitFor(() => {
      expect(screen.getByText('What is saving?')).toBeInTheDocument();
      expect(screen.getByText(/Question 2 of 3/)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('submits quiz after answering last question', async () => {
    renderQuiz();
    await answerAllQuestions();

    await waitFor(() => {
      expect(mockSubmitQuiz).toHaveBeenCalledWith(10, 12345, expect.any(Array));
    }, { timeout: 3000 });
  });

  it('shows results screen with score after submission', async () => {
    renderQuiz();
    await answerAllQuestions();

    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('Perfect score!')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows XP earned on results screen', async () => {
    renderQuiz();
    await answerAllQuestions();

    await waitFor(() => {
      expect(screen.getByText('+30 XP earned!')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('calls onComplete callback with result', async () => {
    const onComplete = vi.fn();
    renderQuiz({ onComplete });
    await answerAllQuestions();

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(sampleResult);
    }, { timeout: 3000 });
  });

  it('shows confetti on high score', async () => {
    renderQuiz();
    await answerAllQuestions();

    await waitFor(() => {
      expect(screen.getByTestId('confetti')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows retry button on low score', async () => {
    mockSubmitQuiz.mockResolvedValue(lowScoreResult);
    renderQuiz();
    await answerAllQuestions();

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows Share Score button on results', async () => {
    renderQuiz();
    await answerAllQuestions();

    await waitFor(() => {
      expect(screen.getByText('Share Score')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows error state when quiz load fails', async () => {
    mockFetchQuiz.mockRejectedValue(new Error('Network error'));
    renderQuiz();

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('shows error for empty quiz', async () => {
    mockFetchQuiz.mockResolvedValue([]);
    renderQuiz();

    await waitFor(() => {
      expect(screen.getByText('No quiz available for this article.')).toBeInTheDocument();
    });
  });

  it('fires haptic on answer selection', async () => {
    renderQuiz();
    await waitFor(() => screen.getByText('A plan'));
    fireEvent.click(screen.getByText('A plan'));
    expect(mockHaptic.impact).toHaveBeenCalledWith('medium');
  });

  it('shows correct/incorrect breakdown on results', async () => {
    renderQuiz();
    await answerAllQuestions();

    await waitFor(() => {
      expect(screen.getByText('3 of 3 correct')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('disables option buttons during feedback phase', async () => {
    renderQuiz();
    await waitFor(() => screen.getByText('A plan'));
    fireEvent.click(screen.getByText('A plan'));
    // During feedback phase, buttons should be disabled
    const buttons = screen.getAllByRole('button');
    const optionButtons = buttons.filter(b => b.textContent?.includes('A plan') || b.textContent?.includes('A debt'));
    optionButtons.forEach(b => expect(b).toBeDisabled());
  });
});
