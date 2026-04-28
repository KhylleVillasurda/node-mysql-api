import { Request, Response, NextFunction } from "express";
import Joi from "joi";

export function validateRequest(
  req: Request,
  next: NextFunction,
  schema: Joi.ObjectSchema
): void {
  const options = {
    abortEarly: false, // include all errors
    allowUnknown: true, // ignore unknown props
    stripUnknown: true, // remove unknown props
  };

  const { error, value } = schema.validate(req.body, options);

  if (error) {
    const errorMessage = error.details
      .map((detail) => detail.message)
      .join(", ");
    next(`Validation error: ${errorMessage}`);
  } else {
    req.body = value;
    next();
  }
}
