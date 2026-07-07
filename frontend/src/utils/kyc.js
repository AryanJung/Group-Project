export const needsKycVerification = (user, isAdmin = false) =>
  Boolean(user?.token) && !isAdmin && !user?.kycVerified;
