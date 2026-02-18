import { Component, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Translation } from 'react-i18next';
import { logger } from '@/utils/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error('ErrorBoundary caught:', { error, componentStack: info.componentStack });
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Translation>
          {(t) => (
            <div className="flex items-center justify-center min-h-screen bg-telegram-bg px-4">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-sm w-full" role="alert">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-red-700 mb-1">{t('errors.somethingWentWrong')}</h3>
                <p className="text-sm text-red-500 mb-4">{t('errors.unexpectedError')}</p>
                <button
                  onClick={this.handleRetry}
                  aria-label="Retry loading"
                  className="inline-flex items-center gap-2 bg-red-500 text-white px-5 py-2.5 rounded-xl font-medium active:scale-95 transition-transform"
                >
                  <RefreshCw className="w-4 h-4" aria-hidden="true" />{t('errors.tryAgain')}
                </button>
              </div>
            </div>
          )}
        </Translation>
      );
    }

    return this.props.children;
  }
}
