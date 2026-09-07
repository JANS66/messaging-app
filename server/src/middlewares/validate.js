import { ZodError } from "zod";

export const validate = (schema) => async (req, res, next) => {
  try {
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Mutate properties in place instead of reassigning the read only objects
    if (parsed.body) {
      for (const key of Object.keys(req.body)) delete req.body[key];
      Object.assign(req.body, parsed.body);
    }
    if (parsed.query) {
      for (const key of Object.keys(req.query)) delete req.query[key];
      Object.assign(req.query, parsed.query);
    }
    if (parsed.params) {
      for (const key of Object.keys(req.params)) delete req.params[key];
      Object.assign(req.params, parsed.params);
    }

    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        status: "fail",
        message: "Validation Error",
        errors: error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
    }
    next(error);
  }
};
