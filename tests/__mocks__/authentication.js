const mockAuthentication = (req, _res, next) => {
  req.user = {
    user_id: 'TESTUSER',
    nama_user: 'Test User',
    inisial_user: 'TU',
    jabatan_user: 'DEV',
    joblevel_id_user: 1,
    bagian_user: 'IT',
    delegated_to: 'TESTUSER',
  };
  next();
};

export default mockAuthentication;
