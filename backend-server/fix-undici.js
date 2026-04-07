// Polyfill for File global object to fix undici compatibility in Node.js v18
if (typeof global !== 'undefined' && typeof global.File === 'undefined') {
  // Create a minimal File polyfill
  global.File = class File extends Blob {
    constructor(fileBits, fileName, options = {}) {
      super(fileBits, options);
      this.name = fileName;
      this.lastModified = options.lastModified || Date.now();
    }
  };
}

// Also polyfill FormData if needed
if (typeof global !== 'undefined' && typeof global.FormData === 'undefined') {
  global.FormData = require('form-data');
}
