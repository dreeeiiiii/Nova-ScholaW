import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';

const AmbientBlobs = () => {
  const prefersReduced = useReducedMotion();
  const dur = prefersReduced ? 0 : 22;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <motion.div
        className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px]"
        animate={
          prefersReduced
            ? {}
            : { x: [0, 120, -60, 80, 0], y: [0, -80, 60, -40, 0] }
        }
        transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-secondary/20 blur-[120px]"
        animate={
          prefersReduced
            ? {}
            : { x: [0, -100, 80, -40, 0], y: [0, 60, -80, 40, 0] }
        }
        transition={{ duration: dur + 3, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
};

const Login = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';
  const prefersReduced = useReducedMotion();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to log in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
  };

  const item = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-base p-4 sm:p-6">
      <AmbientBlobs />

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 24 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <Link to="/" className="inline-block">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-clay bg-primary font-heading text-lg font-extrabold text-white shadow-clay">
              NSH
            </div>
          </Link>
          <h1 className="font-heading text-2xl font-extrabold text-text-main sm:text-3xl">
            Nova Schola Hub
          </h1>
          <p className="mt-2 text-sm text-text-muted">Sign in to your account</p>
        </div>

        <motion.form
          onSubmit={handleSubmit}
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="clay-card rounded-clay p-6 sm:p-8"
          noValidate
        >
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="mb-4 rounded-clay-sm bg-danger/15 px-4 py-3 text-sm font-medium text-danger"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div variants={item}>
            <label htmlFor="email" className="block text-sm font-semibold text-text-main">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@my.nst.edu.ph"
              className="clay-input mt-1.5 block w-full px-4 py-2.5 text-sm text-text-main placeholder-text-muted"
            />
          </motion.div>

          <motion.div variants={item} className="mt-4">
            <label htmlFor="password" className="block text-sm font-semibold text-text-main">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="clay-input mt-1.5 block w-full px-4 py-2.5 text-sm text-text-main placeholder-text-muted"
            />
          </motion.div>

          <motion.div variants={item} className="mt-6">
            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="clay-btn w-full rounded-clay-pill bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-clay disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </motion.button>
          </motion.div>

          <motion.div variants={item} className="mt-5 space-y-2 text-center">
            <p className="text-sm text-text-muted">
              <Link
                to="/"
                className="font-semibold text-primary transition-colors hover:text-primary/80"
              >
                ← Back to home
              </Link>
            </p>
            <p className="text-sm text-text-muted">
              <Link
                to="/gallery"
                className="font-semibold text-primary transition-colors hover:text-primary/80"
              >
                View public gallery →
              </Link>
            </p>
          </motion.div>
        </motion.form>
      </motion.div>
    </div>
  );
};

export default Login;
