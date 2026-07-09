import config from '../config/index.js';
import ApiError from '../utils/ApiError.js';

const AUTH_TIMEOUT_MS = 5000;

const authentication = async (req, _res, next) => {
  try {
    let token = req.headers.authentication || req.headers.authorization;

    if (token && token.startsWith('Bearer ')) {
      token = token.slice(7);
    }

    if (!token) {
      throw new ApiError(401, 'Unauthorized');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);

    let result;
    try {
      const response = await fetch(config.lmsDecodeUrl, {
        method: 'GET',
        headers: {
          access_token: token,
        },
        signal: controller.signal,
      });

      result = await response.json();
    } finally {
      clearTimeout(timeout);
    }

    const userId = result?.user?.log_NIK;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    req.user = {
      user_id: userId || '',
      nama_user: result?.user?.Nama || '',
      inisial_user: result?.user?.Inisial_Name || '',
      jabatan_user: result?.user?.emp_JobLevelID || '',
      joblevel_id_user: Number(result?.user?.emp_JobLevelID) || 0,
      bagian_user: result?.user?.emp_DeptID || '',
      delegated_to: result?.delegatedTo?.log_NIK || result?.user?.log_NIK || '',
    };

    next();
  } catch (error) {
    next(error);
  }
};

export default authentication;
