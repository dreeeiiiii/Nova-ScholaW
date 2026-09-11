import config from '../config/env.js';

const errorHandler = (err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const inDev = config.nodeEnv !== 'production';

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    status,
    message: status < 500 || inDev ? err.message : 'Internal server error',
  });
};

export default errorHandler;