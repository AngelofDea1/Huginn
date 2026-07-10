const ts = () => new Date().toISOString().slice(11, 23);

export const logBuffer = [];

function pushLog(level, ...args) {
  const line = `[${ts()}] ${level}: ${args.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' ')}`;
  logBuffer.push(line);
  if (logBuffer.length > 2000) {
    logBuffer.shift();
  }
}

export const log = {
  info:  (...a) => { console.log(`\x1b[36m[${ts()}] INFO \x1b[0m`, ...a); pushLog('INFO', ...a); },
  warn:  (...a) => { console.log(`\x1b[33m[${ts()}] WARN \x1b[0m`, ...a); pushLog('WARN', ...a); },
  error: (...a) => { console.log(`\x1b[31m[${ts()}] ERROR\x1b[0m`, ...a); pushLog('ERROR', ...a); },
  event: (...a) => { console.log(`\x1b[32m[${ts()}] EVENT\x1b[0m`, ...a); pushLog('EVENT', ...a); },
};
