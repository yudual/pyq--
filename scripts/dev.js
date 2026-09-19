#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

// 检查并自动清理端口占用
function checkAndFreePort(port) {
  try {
    const stdout = execSync(`lsof -ti tcp:${port}`, { encoding: 'utf-8' }).trim();
    if (stdout) {
      const pids = stdout.split('\n').filter(Boolean);
      console.log(`${colors.yellow}检测到端口 ${port} 被进程 [${pids.join(', ')}] 占用，正在释放...${colors.reset}`);
      for (const pid of pids) {
        try {
          process.kill(Number(pid), 'SIGKILL');
        } catch {}
      }
    }
  } catch {
    // 端口未被占用
  }
}

checkAndFreePort(3000);
checkAndFreePort(4000);

console.log(`${colors.bold}${colors.green}========================================${colors.reset}`);
console.log(`${colors.bold}${colors.green}  🚀 正在启动 YuBlog 博客系统全栈服务  ${colors.reset}`);
console.log(`${colors.bold}${colors.green}========================================${colors.reset}\n`);

let backendProcess = null;
let frontendProcess = null;
let isShuttingDown = false;

function prefixOutput(stream, prefix, color) {
  let buffer = '';
  stream.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (line.trim()) {
        console.log(`${color}${prefix}${colors.reset} ${line}`);
      }
    }
  });
}

function startBackend() {
  backendProcess = spawn('npm', ['run', 'dev'], {
    cwd: backendDir,
    stdio: ['inherit', 'pipe', 'pipe'],
    detached: true,
  });

  prefixOutput(backendProcess.stdout, '[Backend]', colors.cyan);
  prefixOutput(backendProcess.stderr, '[Backend]', colors.red);

  backendProcess.on('exit', (code, signal) => {
    if (!isShuttingDown) {
      console.log(`${colors.yellow}[Backend] 进程退出 (code: ${code}, signal: ${signal})${colors.reset}`);
    }
  });
}

function startFrontend() {
  frontendProcess = spawn('npm', ['run', 'dev'], {
    cwd: frontendDir,
    stdio: ['inherit', 'pipe', 'pipe'],
    detached: true,
  });

  prefixOutput(frontendProcess.stdout, '[Frontend]', colors.magenta);
  prefixOutput(frontendProcess.stderr, '[Frontend]', colors.yellow);

  frontendProcess.on('exit', (code, signal) => {
    if (!isShuttingDown) {
      console.log(`${colors.yellow}[Frontend] 进程退出 (code: ${code}, signal: ${signal})${colors.reset}`);
    }
  });
}

function killProcessGroup(proc) {
  if (!proc || !proc.pid) return;
  try {
    process.kill(-proc.pid, 'SIGTERM');
  } catch {
    try {
      proc.kill('SIGTERM');
    } catch {}
  }
}

function cleanup() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n${colors.bold}${colors.yellow}正在关闭前后端服务...${colors.reset}`);
  killProcessGroup(backendProcess);
  killProcessGroup(frontendProcess);
  setTimeout(() => {
    try {
      if (backendProcess && backendProcess.pid) process.kill(-backendProcess.pid, 'SIGKILL');
      if (frontendProcess && frontendProcess.pid) process.kill(-frontendProcess.pid, 'SIGKILL');
    } catch {}
    process.exit(0);
  }, 400);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('SIGHUP', cleanup);

startBackend();
startFrontend();

console.log(`${colors.dim}服务启动中，稍后可在浏览器访问：${colors.reset}`);
console.log(`  ${colors.bold}• 前台首页:${colors.reset}   http://localhost:3000`);
console.log(`  ${colors.bold}• 后台管理:${colors.reset}   http://localhost:3000/admin`);
console.log(`  ${colors.bold}• 后端接口:${colors.reset}   http://localhost:4000/api/health`);
console.log(`\n${colors.dim}按 Ctrl+C 可停止所有服务${colors.reset}\n`);
