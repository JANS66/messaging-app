import rateLimit from "express-rate-limit";

export const rateLimiter = (type = "strict") => {
  const configs = {
    strict: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10,
      message: {
        status: "fail",
        message: "Too many attempts. Please try again later.",
      },
    },
    search: {
      windowMs: 60 * 1000, // 1 minute
      max: 30, // 30 requests per minute
      message: {
        status: "fail",
        message: "Too many search requests. Please slow down.",
      },
    },
  };

  const config = configs[type] || configs.strict;

  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: config.message,
  });
};
