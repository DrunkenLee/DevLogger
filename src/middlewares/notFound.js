import ApiError from '../utils/ApiError.js';

const notFound = (req, _res, next) => {
  next(new ApiError(404, `Not Found - ${req.originalUrl}`));
};

export default notFound;
