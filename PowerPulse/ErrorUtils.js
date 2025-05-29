// ErrorUtils.js
// A utility module for handling errors in React Native

let globalErrorHandler = null;

const ErrorUtils = {
  setGlobalHandler: (callback) => {
    globalErrorHandler = callback;
  },

  getGlobalHandler: () => {
    return globalErrorHandler;
  },

  reportError: (error) => {
    if (globalErrorHandler) {
      globalErrorHandler(error);
    } else {
      console.error('Unhandled error:', error);
    }
  }
};

export default ErrorUtils; 