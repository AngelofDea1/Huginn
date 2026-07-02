const ts = () => new Date().toISOString().slice(11, 23);

export const log = {
  info:  (...a) => console.log(`\x1b[36m[${ts()}] INFO \x1b[0m`, ...a),
  warn:  (...a) => console.log(`\x1b[33m[${ts()}] WARN \x1b[0m`, ...a),
  error: (...a) => console.log(`\x1b[31m[${ts()}] ERROR\x1b[0m`, ...a),
  event: (...a) => console.log(`\x1b[32m[${ts()}] EVENT\x1b[0m`, ...a),
};
