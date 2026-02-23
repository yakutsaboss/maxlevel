import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Translation } from 'react-i18next';
import { motion } from 'framer-motion';
import { logger } from '@/utils/logger';

interface Props {
  pageName: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error(`PageErrorBoundary [${this.props.pageName}]:`, {
      error,
      componentStack: info.componentStack,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Translation>
          {(t) => (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="flex items-center justify-center min-h-[60vh] bg-telegram-bg px-4"
            >
              <div
                className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center max-w-sm w-full"
                role="alert"
              >
                <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-amber-800 mb-1">
                  {t('errors.somethingWentWrong')}
                </h3>
                <p className="text-sm text-amber-600 mb-4">
                  {this.props.pageName} {t('errors.unexpectedError').toLowerCase()}
                </p>
                <button
                  onClick={this.handleRetry}
                  aria-label={t('errors.tryAgain')}
                  className="inline-flex items-center gap-2 bg-amber-500 text-white px-5 py-2.5 rounded-xl font-medium active:scale-95 transition-transform"
                >
                  <RefreshCw className="w-4 h-4" aria-hidden="true" />
                  {t('errors.tryAgain')}
                </button>
              </div>
            </motion.div>
          )}
        </Translation>
      );
    }

    return this.props.children;
  }
}
