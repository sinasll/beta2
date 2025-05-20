import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

const functions = new Functions(client);
const FUNCTION_ID = "6800d0a4001cb28a32f5";

// DOM Elements
const minedEl = document.getElementById('mined');
const balanceEl = document.getElementById('balance');
const usernameEl = document.getElementById('username');
const powerEl = document.getElementById('power');
const mineBtn = document.getElementById('mineButton');
const totalMinersEl = document.getElementById('totalminers');
const countdownEl = document.getElementById('countdown');
const codeInput = document.getElementById('codeInput');
const copyBtn = document.getElementById('copyButton');
const submitBtn = document.getElementById('submitButton');
const dailyCodeEl = document.getElementById('dailyCode');
const subsOfCodeEl = document.getElementById('subsOfCode');
const sendBtn = document.getElementById('sendButton');
const referralCountEl = document.getElementById('referral-count');
const referralEarningsEl = document.getElementById('referral-earnings');
const shareBtn = document.getElementById('shareButton');
const totalOfCodeEl = document.getElementById('totalOfCode');
const ursubsEl = document.getElementById('ursubs');
const referralCodeEl = document.getElementById('referralCode');
const totalReferralsEl = document.getElementById('totalReferrals');
const copyReferralBtn = document.getElementById('copyReferralButton');
const inviteBtn = document.getElementById('inviteButton');
const usedReferralCodeEl = document.getElementById('used-referral-code');
const friendsContainerEl = document.getElementById('friendsContainer');

// Task Elements
const taskItems = document.querySelectorAll('.task-item');

// State
let userData = {
  isMining: false,
  balance: 0,
  totalMined: 0,
  miningPower: 1.0,
  nextReset: null,
  dailyCode: '',
  submittedCodes: [],
  codeSubmissionsToday: 0,
  totalCodeSubmissions: 0,
  totalSubmittedCodes: 0,
  referrals: 0,
  referralEarnings: 0,
  ownReferralCode: '',
  totalInvites: 0,
  usedReferralCode: '',
  referralLinksClicked: 0,
  tasksCompleted: {}
};

let mineInterval = null;
let resetTimer = null;
let dotInterval = null;
let dotCount = 0;

// Helpers
function formatNumber(num, decimals = 3) {
  if (isNaN(num)) return '0' + '0'.repeat(decimals);
  const parts = Number(num).toFixed(decimals).split('.');
  const wholePart = parts[0];
  const decimalPart = parts[1] || '';
  const formattedWhole = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return formattedWhole + (decimalPart ? '.' + decimalPart : '');
}

function getDefaultResetTime() {
  const now = new Date();
  const resetTime = new Date(now);
  resetTime.setUTCHours(12, 0, 0, 0);
  if (now >= resetTime) resetTime.setUTCDate(resetTime.getUTCDate() + 1);
  return resetTime.toISOString();
}

function isAfterResetTime() {
  if (!userData.nextReset) return false;
  return new Date() >= new Date(userData.nextReset);
}

function saveMiningState() {
  localStorage.setItem('isMining', JSON.stringify(userData.isMining));
  localStorage.setItem('nextReset', userData.nextReset);
  localStorage.setItem('submittedCodes', JSON.stringify(userData.submittedCodes));
  localStorage.setItem('codeSubmissionsToday', userData.codeSubmissionsToday.toString());
  localStorage.setItem('totalCodeSubmissions', userData.totalCodeSubmissions.toString());
}

function loadMiningState() {
  const storedReset = localStorage.getItem('nextReset');
  const storedIsMining = localStorage.getItem('isMining') === 'true';
  const storedCodes = JSON.parse(localStorage.getItem('submittedCodes') || '[]');
  const storedSubmissions = parseInt(localStorage.getItem('codeSubmissionsToday') || '0');
  const storedTotalSubs = parseInt(localStorage.getItem('totalCodeSubmissions') || '0');

  if (storedReset && new Date() < new Date(storedReset)) {
    userData.isMining = storedIsMining;
    userData.nextReset = storedReset;
    userData.submittedCodes = storedCodes;
    userData.codeSubmissionsToday = storedSubmissions;
    userData.totalCodeSubmissions = storedTotalSubs;
  } else {
    localStorage.removeItem('isMining');
    localStorage.removeItem('nextReset');
    localStorage.removeItem('submittedCodes');
    localStorage.removeItem('codeSubmissionsToday');
    userData.isMining = false;
    userData.submittedCodes = [];
    userData.codeSubmissionsToday = 0;
  }
}

function initializeUser() {
  const tg = window.Telegram?.WebApp;
  let referralCode = '';
  if (tg?.initDataUnsafe?.start_param) {
    referralCode = tg.initDataUnsafe.start_param;
  } else {
    const params = new URLSearchParams(window.location.search);
    referralCode = params.get('startapp') || params.get('ref') || '';
  }

  if (tg?.initDataUnsafe?.user) {
    const user = tg.initDataUnsafe.user;
    return {
      username: user.username || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      telegramId: user.id.toString(),
      referralCode
    };
  }

  let username = localStorage.getItem('guestUsername');
  if (!username) {
    username = 'guest_' + Math.random().toString(36).substring(2, 7);
    localStorage.setItem('guestUsername', username);
  }
  return { username, telegramId: '', referralCode };
}

// UI Updates
function updateButtonUI() {
  if (userData.isMining) {
    startDotAnimation();
  } else {
    stopDotAnimation();
  }
}

function startDotAnimation() {
  if (dotInterval) return;
  mineBtn.disabled = true;
  dotInterval = setInterval(() => {
    dotCount = (dotCount % 3) + 1;
    mineBtn.textContent = `Mining ${'.'.repeat(dotCount).split('').join(' ')}`;
  }, 500);
}

function stopDotAnimation() {
  clearInterval(dotInterval);
  dotInterval = null;
  dotCount = 0;
  mineBtn.textContent = 'Start Mining';
  mineBtn.disabled = false;
}

function updateStatsUI() {
  balanceEl.textContent = formatNumber(userData.balance);
  minedEl.textContent = formatNumber(userData.totalMined);
  powerEl.textContent = formatNumber(userData.miningPower, 1);
  dailyCodeEl.textContent = userData.dailyCode;
  subsOfCodeEl.textContent = `${formatNumber(userData.codeSubmissionsToday,0)}/10`;
  totalOfCodeEl.textContent = formatNumber(userData.totalCodeSubmissions,0);
  ursubsEl.textContent = formatNumber(userData.totalSubmittedCodes,0);
  referralCountEl.textContent = formatNumber(userData.referrals,0);
  referralEarningsEl.textContent = formatNumber(userData.referralEarnings);
  referralCodeEl.textContent = userData.ownReferralCode;
  totalReferralsEl.textContent = formatNumber(userData.totalInvites,0);
  usedReferralCodeEl.textContent = userData.usedReferralCode || 'None';
  refreshTasksState();
}

function refreshTasksState() {
  taskItems.forEach(li => {
    const task = li.dataset.task;
    const done = !!userData.tasksCompleted[task];
    let prereq = true;
    
    if(task.startsWith('code')) {
      const required = parseInt(task.replace(/\D/g, ''));
      if(task === 'code100' || task === 'code200' || task === 'code300') {
        prereq = userData.totalCodeSubmissions >= required;
      } else {
        prereq = userData.totalSubmittedCodes >= required;
      }
    }
    
    const btn = li.querySelector('.complete-task');
    btn.disabled = done || !prereq;
    btn.textContent = done ? 'Done' : 'Claim';
  });
}

// Mining Logic
async function mineCoins() {
  if (isAfterResetTime()) { stopMining(); return; }
  try {
    const payload = initializeUser();
    const exec = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(exec.responseBody || '{}');
    if (data.error || !data.updated?.active_session) { stopMining(); return; }
    
    userData.balance = data.updated.balance;
    userData.totalMined = data.total_mined;
    userData.miningPower = data.updated.mining_power;
    userData.nextReset = data.next_reset || userData.nextReset;
    userData.codeSubmissionsToday = data.updated.code_submissions_today;
    userData.totalCodeSubmissions = data.total_code_submissions;
    userData.totalSubmittedCodes = data.updated.total_submitted_codes;
    userData.referrals = data.referrals;
    userData.referralEarnings = data.referral_earnings;
    
    saveMiningState();
    updateStatsUI();
  } catch (err) {
    console.error('Mining failed:', err);
    stopMining();
  }
}

async function startMining() {
  if (userData.isMining || isAfterResetTime()) return;
  try {
    userData.isMining = true;
    saveMiningState();
    updateButtonUI();

    const payload = { ...initializeUser(), action: 'start_mining' };
    const exec = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(exec.responseBody || '{}');

    if (data.error || !data.started) {
      stopMining();
      return;
    }

    userData.nextReset = data.next_reset;
    userData.codeSubmissionsToday = data.code_submissions_today;
    userData.totalCodeSubmissions = data.total_code_submissions;
    saveMiningState();

    await mineCoins();
    mineInterval = setInterval(mineCoins, 60000);
    scheduleResetTimer();
  } catch (err) {
    console.error('Start mining failed:', err);
    stopMining();
  }
}

function stopMining() {
  clearInterval(mineInterval);
  clearTimeout(resetTimer);
  mineInterval = resetTimer = null;
  userData.isMining = false;
  saveMiningState();
  updateButtonUI();
  updateStatsUI();
}

// Other Features
function scheduleResetTimer() {
  clearTimeout(resetTimer);
  const now = Date.now();
  const then = new Date(userData.nextReset).getTime();
  const delay = then - now;
  if (delay > 0) {
    resetTimer = setTimeout(() => stopMining(), delay);
  }
}

function updateCountdown() {
  if (!userData.nextReset || !countdownEl) return;
  const now = new Date();
  const nextReset = new Date(userData.nextReset);
  const diff = nextReset - now;
  if (diff <= 0) {
    countdownEl.textContent = 'Reset time!';
    if (userData.isMining) stopMining();
    return;
  }
  const h = Math.floor(diff / (1000*60*60));
  const m = Math.floor((diff/(1000*60))%60);
  const s = Math.floor((diff/1000)%60);
  countdownEl.textContent = `Daily reset in ${formatNumber(h,0)}h ${formatNumber(m,0)}m ${formatNumber(s,0)}s`;
}

async function handleTaskClick(task) {
  try {
    const payload = { ...initializeUser(), action:'complete_task', task };
    const exec = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(exec.responseBody || '{}');
    if (data.success) {
      userData.balance = data.balance;
      userData.miningPower = data.mining_power;
      userData.tasksCompleted = data.tasks_completed || userData.tasksCompleted;
      refreshTasksState();
      updateStatsUI();
    } else alert(data.message||'Task failed');
  } catch(e) { console.error(e); alert(e.message||'Error'); }
}

async function fetchUserData() {
  try {
    const payload = initializeUser();
    usernameEl.textContent = payload.username;
    const exec = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(exec.responseBody||'{}');
    if (!data.error) {
      userData.isMining = data.active_session || false;
      userData.balance = data.balance || 0;
      userData.totalMined = data.total_mined||0;
      userData.miningPower = data.mining_power||1.0;
      userData.nextReset = data.next_reset||getDefaultResetTime();
      userData.dailyCode = data.daily_code||'';
      userData.submittedCodes = data.submitted_codes||[];
      userData.codeSubmissionsToday = data.code_submissions_today||0;
      userData.totalCodeSubmissions = data.total_code_submissions||0;
      userData.totalSubmittedCodes = data.total_submitted_codes||0;
      userData.referrals = data.referrals||0;
      userData.referralEarnings = data.referral_earnings||0;
      userData.ownReferralCode = data.own_referral_code||'';
      userData.totalInvites = data.total_invites||0;
      userData.usedReferralCode = data.used_referral_code||'';
      userData.referralLinksClicked = data.referral_links_clicked||0;
      userData.tasksCompleted = data.tasks_completed||{};
      totalMinersEl.textContent = formatNumber(data.total_miners,0);
      saveMiningState();
      updateButtonUI();
      updateStatsUI();
    }
    return data;
  } catch(e) { console.error('Fetch error:',e); return null; }
}

async function fetchReferredFriends() {
  const payload = { ...initializeUser(), action:'get_referred_friends' };
  const exec = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
  const friends = JSON.parse(exec.responseBody||'[]');
  totalReferralsEl.textContent = formatNumber(friends.length,0);
  friendsContainerEl.innerHTML = '';
  friends.forEach(f => {
    const row = document.createElement('div');
    row.className = 'friend-row stats-row';
    row.innerHTML = `<div>${f.username}</div><div>${formatNumber(f.balance)} $BLACK</div>`;
    friendsContainerEl.appendChild(row);
  });
}

// Initialization
function setupTabs() {
  document.querySelectorAll('.tab-list li a').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('.tab-content').forEach(tab=>tab.classList.remove('active'));
      document.querySelectorAll('.tab-list li a').forEach(a=>a.classList.remove('active'));
      const id = link.getAttribute('data-tab');
      document.getElementById(id).classList.add('active');
      link.classList.add('active');
    });
  });
}

function setupEventListeners() {
  mineBtn.addEventListener('click', async ()=>{
    if (!userData.isMining && !isAfterResetTime()) {
      await startMining();
    } else if (isAfterResetTime()) {
      await fetchUserData();
    }
  });

  copyBtn.addEventListener('click', async ()=>{
    try {
      await navigator.clipboard.writeText(dailyCodeEl.textContent);
      copyBtn.textContent='Copied';
      setTimeout(()=>copyBtn.textContent='Copy',2000);
    } catch {}
  });

  submitBtn.addEventListener('click', async ()=>{
    const code = codeInput.value.trim();
    if (!code) return alert('Please enter a code to submit');
    try {
      const payload = {...initializeUser(), action:'submit_code', code};
      const exec = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
      const data = JSON.parse(exec.responseBody||'{}');
      if (data.success) {
        userData.balance = data.balance;
        userData.submittedCodes.push(code);
        userData.codeSubmissionsToday = data.owner_submissions;
        userData.totalCodeSubmissions = data.total_code_submissions;
        saveMiningState();
        updateStatsUI();
        codeInput.value = '';
      } else alert(data.message||'Code submission failed');
    } catch(e) {
      console.error('Code submit failed:',e);
      alert(e.message||'Failed to submit code.');
    }
  });

  taskItems.forEach(li => li.querySelector('.complete-task').addEventListener('click', ()=>handleTaskClick(li.dataset.task)));

  copyReferralBtn.addEventListener('click', async ()=>{
    const link = `https://t.me/blackinbetabot?startapp=${userData.ownReferralCode}`;
    try {
      await navigator.clipboard.writeText(link);
      alert('Referral link copied!');
    } catch {
      prompt('Copy this link manually:', link);
    }
  });
}

async function init() {
  const tg = window.Telegram?.WebApp;
  if (tg) { tg.expand(); tg.ready(); }
  setupTabs();
  setupEventListeners();
  loadMiningState();
  try {
    await fetchUserData();
    await fetchReferredFriends();
    if (userData.isMining && !isAfterResetTime()) {
      await startMining();
    }
  } catch (e) {
    console.error('Initialization error:', e);
  }
  setInterval(updateCountdown, 1000);
  setInterval(async () => {
    await fetchUserData();
    updateStatsUI();
  }, 300000);
  setInterval(updateCountdown, 1000);
}

document.addEventListener('DOMContentLoaded', init);