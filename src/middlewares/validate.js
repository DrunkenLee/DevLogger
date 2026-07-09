import { ZodError } from 'zod';

const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`
      );
      return res.status(400).json({
        success: false,
        message: `Validation error: ${issues.join(', ')}`,
      });
    }

    next(error);
  }
};

export default validate;
