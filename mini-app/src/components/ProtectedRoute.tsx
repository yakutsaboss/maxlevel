import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LazyPageWrapper } from '@/components/LazyPageWrapper';

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

interface ProtectedRouteProps {
  needsOnboarding: boolean;
  lazy?: boolean;
  children: React.ReactNode;
}

export function ProtectedRoute({ needsOnboarding, lazy, children }: ProtectedRouteProps) {
  if (needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  const content = <PageWrapper>{children}</PageWrapper>;

  if (lazy) {
    return <LazyPageWrapper>{content}</LazyPageWrapper>;
  }

  return content;
}
