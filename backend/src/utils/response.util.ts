export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code?: string;
    details?: any;
  };
}

export const sendSuccess = <T>(
  data: T,
  message: string = 'Success'
): ApiResponse<T> => {
  return {
    success: true,
    message,
    data,
  };
};

export const sendError = (
  message: string,
  code?: string,
  details?: any
): ApiResponse => {
  return {
    success: false,
    message,
    error: {
      code,
      details,
    },
  };
};