import { ApiError } from "../utils/helpers.js";

export const requireRoles = (...roles) => (req, _res, next) => {
  if (!req.user) {
    next(new ApiError(401, "Authentication required."));
    return;
  }

  if (!roles.includes(req.user.role)) {
    next(new ApiError(403, "You do not have permission for this action."));
    return;
  }

  next();
};
