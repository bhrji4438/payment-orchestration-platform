export const formatDate = (date: Date | string | number): string => {
  const d = new Date(date);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
};

export const isExpired = (expiryDate: Date | string | number): boolean => {
  return new Date() > new Date(expiryDate);
};

export const addSeconds = (date: Date, seconds: number): Date => {
  return new Date(date.getTime() + seconds * 1000);
};
