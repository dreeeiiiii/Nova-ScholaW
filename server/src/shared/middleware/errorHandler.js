const errorHandler = (err, req, res, _next) => {
  if (err.code === '23514' || err.code === '23503' || err.code === '22001') {
    return res.status(400).json({ message: 'Invalid data or conflicting academic relationships. Review the selected department and assignments.' });
  }
  const status = err.status || err.statusCode || 500;

  if (status >= 500) {
    console.error('[request] Internal server error');
  }

  res.status(status).json({
    status,
    message: status < 500 ? err.message : 'Internal server error',
  });
};

export default errorHandler;
