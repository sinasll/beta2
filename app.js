import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

const functions = new Functions(client);
const FUNCTION_ID = "6800d0a4001cb28a32f5";

// DOM Elements
const [
  minedEl, balanceEl, usernameEl, powerEl, mineBtn, totalMinersEl,
  countdownEl, codeInput, copyBtn, submitBtn, dailyCodeEl, subsOfCodeEl,
  sendBtn, referralCountEl, referralEarningsEl, shareBtn, totalOfCodeEl,
  usersubsEl, referralCodeEl, totalReferralsEl, copyReferralBtn,
  inviteBtn, usedReferralCodeEl, friendsContainerEl
] = [
  'mined', 'balance', 'username', 'power', 'mineButton', 'totalminers',
  'countdown', 'codeInput', 'copyButton', 'submitButton', 'dailyCode',
  'subsOfCode', 'sendButton', 'referral-count', 'referral-earnings',
  'shareButton', 'totalOfCode', 'usersubs', 'referralCode', 'totalReferrals',
  'copyReferralButton', 'inviteButton', 'used-referral-code', 'friendsContainer'
].map(id => document.getElementById(id));

// Task Elements
const taskItems = document.querySelectorAll('.task-item');

// State
let userData = {
  isMining: false, balance: 0, totalMined: 0, miningPower: 1.0,
  nextReset: null, dailyCode: '', submittedCodes: [], codeSubmissionsToday: 0,
  referrals: 0, referralEarnings: 0, totalCodeSubmissions: 0,
  totalCodesSubmitted: 0, ownReferralCode: '', totalInvites: 0,
  usedReferralCode: '', referralLinksClicked: 0, tasksCompleted: {}
};

let mineInterval = null, dotInterval = null, dotCount = 0;

// Helper Functions
function showToast(message, type = 'success', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  container.innerHTML = '';
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.addEventListener('animationend', () => toast.remove());
    toast.classList.add('fade');
  }, duration);
}

function formatNumber(num, decimals = 3) {
  if (isNaN(num)) return '0' + '0'.repeat(decimals);
  const [whole, decimal] = Number(num).toFixed(decimals).split('.');
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (decimal ? `.${decimal}` : '');
}

function getDefaultResetTime() {
  const resetTime = new Date();
  resetTime.setUTCHours(12, 0, 0, 0);
  if (new Date() >= resetTime) resetTime.setUTCDate(resetTime.getUTCDate() + 1);
  return resetTime.toISOString();
}

function isAfterResetTime() {
  return userData.nextReset && new Date() >= new Date(userData.nextReset);
}

function saveMiningState() {
  localStorage.setItem('isMining', userData.isMining);
  localStorage.setItem('nextReset', userData.nextReset);
  localStorage.setItem('submittedCodes', JSON.stringify(userData.submittedCodes));
  localStorage.setItem('codeSubmissionsToday', userData.codeSubmissionsToday.toString());
  localStorage.setItem('totalCodeSubmissions', userData.totalCodeSubmissions.toString());
}

function loadMiningState() {
  const storedReset = localStorage.getItem('nextReset');
  
  if (storedReset && new Date() < new Date(storedReset)) {
    userData.isMining = localStorage.getItem('isMining') === 'true';
    userData.nextReset = storedReset;
    userData.submittedCodes = JSON.parse(localStorage.getItem('submittedCodes') || '[]');
    userData.codeSubmissionsToday = parseInt(localStorage.getItem('codeSubmissionsToday') || 0);
    userData.totalCodeSubmissions = parseInt(localStorage.getItem('totalCodeSubmissions') || 0);
  } else {
    ['isMining', 'nextReset', 'submittedCodes', 'codeSubmissionsToday', 'totalCodeSubmissions']
      .forEach(key => localStorage.removeItem(key));
    userData.isMining = false;
    userData.submittedCodes = [];
    userData.codeSubmissionsToday = 0;
  }
}

// UI Functions
function startDotAnimation() {
  if (dotInterval) return;
  const dotsContainer = mineBtn.querySelector('.dots-container');
  
  dotInterval = setInterval(() => {
    dotCount = (dotCount % 3) + 1;
    dotsContainer.textContent = '.'.repeat(dotCount);
  }, 500);
  
  mineBtn.querySelector('.mining-text').textContent = 'Mining';
}

function stopDotAnimation() {
  clearInterval(dotInterval);
  dotInterval = null;
  dotCount = 0;
  mineBtn.querySelector('.mining-text').textContent = 'Start Mining';
  mineBtn.querySelector('.dots-container').textContent = '';
}

function updateUI() {
  try {
    if (balanceEl) balanceEl.textContent = formatNumber(userData.balance);
    if (minedEl) minedEl.textContent = formatNumber(userData.totalMined);
    if (powerEl) powerEl.textContent = formatNumber(userData.miningPower, 1);
    
    if (mineBtn) {
      mineBtn.disabled = userData.isMining || isAfterResetTime();
      userData.isMining ? startDotAnimation() : stopDotAnimation();
    }
    
    if (dailyCodeEl) dailyCodeEl.textContent = userData.dailyCode;
    if (subsOfCodeEl) subsOfCodeEl.textContent = `${formatNumber(userData.codeSubmissionsToday, 0)}/10`;
    if (totalOfCodeEl) totalOfCodeEl.textContent = formatNumber(userData.totalCodeSubmissions, 0);
    if (usersubsEl) usersubsEl.textContent = formatNumber(userData.totalCodesSubmitted, 0);
    if (referralCountEl) referralCountEl.textContent = formatNumber(userData.referrals, 0);
    if (referralEarningsEl) referralEarningsEl.textContent = formatNumber(userData.referralEarnings);
    if (referralCodeEl) referralCodeEl.textContent = userData.ownReferralCode;
    if (totalReferralsEl) totalReferralsEl.textContent = formatNumber(userData.totalInvites, 0);
    if (usedReferralCodeEl) usedReferralCodeEl.textContent = userData.usedReferralCode || 'None';
    
    refreshTasksState();
  } catch (error) {
    console.error('UI update error:', error);
  }
}

function updateCountdown() {
  if (!userData.nextReset || !countdownEl) return;
  const timeUntilReset = new Date(userData.nextReset) - new Date();
  
  if (timeUntilReset <= 0) {
    countdownEl.textContent = 'Reset time!';
    if (userData.isMining) stopMining();
    return;
  }
  
  const hours = Math.floor(timeUntilReset / 3.6e6);
  const minutes = Math.floor((timeUntilReset % 3.6e6) / 6e4);
  const seconds = Math.floor((timeUntilReset % 6e4) / 1000);
  
  countdownEl.textContent = `Daily reset in ${formatNumber(hours, 0)}h ${formatNumber(minutes, 0)}m ${formatNumber(seconds, 0)}s`;
}

// Data Functions
function initializeUser() {
  const tg = window.Telegram?.WebApp;
  let referralCode = '';
  
  if (tg?.initDataUnsafe?.start_param) {
    referralCode = tg.initDataUnsafe.start_param;
  } else {
    const urlParams = new URLSearchParams(window.location.search);
    referralCode = urlParams.get('startapp') || urlParams.get('ref') || '';
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

async function fetchUserData() {
  try {
    const payload = initializeUser();
    if (usernameEl) usernameEl.textContent = payload.username;
    
    const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(execution.responseBody || '{}');
    
    if (data.error) {
      console.error('Backend error:', data.message);
      return data;
    }
    
    Object.assign(userData, {
      isMining: data.active_session || false,
      balance: data.balance || 0,
      totalMined: data.total_mined || 0,
      miningPower: data.mining_power || 1.0,
      nextReset: data.next_reset || getDefaultResetTime(),
      dailyCode: data.daily_code || '',
      submittedCodes: data.submitted_codes || [],
      codeSubmissionsToday: data.code_submissions_today || 0,
      referrals: data.referrals || 0,
      referralEarnings: data.referral_earnings || 0,
      totalCodeSubmissions: data.total_code_submissions || 0,
      totalCodesSubmitted: data.total_codes_submitted || 0,
      ownReferralCode: data.own_referral_code || '',
      totalInvites: data.total_invites || 0,
      usedReferralCode: data.used_referral_code || '',
      referralLinksClicked: data.referral_links_clicked || 0,
      tasksCompleted: data.tasks_completed || {}
    });
    
    if (data.total_miners && totalMinersEl) {
      totalMinersEl.textContent = formatNumber(data.total_miners, 0);
    }
    
    saveMiningState();
    updateUI();
    return data;
  } catch (err) {
    console.error('Failed to fetch user data:', err);
    return null;
  }
}

async function mineCoins() {
  if (isAfterResetTime()) {
    stopMining();
    return;
  }
  
  try {
    const payload = initializeUser();
    const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(execution.responseBody || '{}');
    
    if (data.error || !data.updated?.active_session) {
      console.error('Mining error:', data.message);
      stopMining();
      return;
    }
    
    Object.assign(userData, {
      balance: data.updated.balance,
      totalMined: data.total_mined,
      miningPower: data.updated.mining_power,
      nextReset: data.next_reset || userData.nextReset,
      codeSubmissionsToday: data.updated.code_submissions_today || userData.codeSubmissionsToday,
      referrals: data.referrals || userData.referrals,
      referralEarnings: data.referral_earnings || userData.referralEarnings,
      totalCodeSubmissions: data.total_code_submissions || userData.totalCodeSubmissions,
      totalCodesSubmitted: data.total_codes_submitted || userData.totalCodesSubmitted
    });
    
    updateUI();
  } catch (err) {
    console.error('Mining failed:', err);
    stopMining();
  }
}

async function startMining() {
  if (userData.isMining || isAfterResetTime()) return;
  
  try {
    const payload = { ...initializeUser(), action: 'start_mining' };
    const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(execution.responseBody || '{}');
    
    if (data.error || !data.started) {
      showToast(data.message || 'Failed to start mining', 'error');
      return;
    }
    
    userData.isMining = true;
    userData.nextReset = data.next_reset || userData.nextReset;
    userData.codeSubmissionsToday = data.code_submissions_today || 0;
    userData.totalCodeSubmissions = data.total_code_submissions || userData.totalCodeSubmissions;
    
    saveMiningState();
    updateUI();
    
    await mineCoins();
    mineInterval = setInterval(mineCoins, 60000);
  } catch (err) {
    console.error('Start mining failed:', err);
    stopMining();
  }
}

function stopMining() {
  clearInterval(mineInterval);
  mineInterval = null;
  userData.isMining = false;
  saveMiningState();
  updateUI();
}

// Task Handling
function refreshTasksState() {
  taskItems.forEach(li => {
    const task = li.dataset.task;
    const prereqMet = 
      task === 'code10' ? userData.totalCodesSubmitted >= 10 :
      task === 'code20' ? userData.totalCodesSubmitted >= 20 :
      task === 'code30' ? userData.totalCodesSubmitted >= 30 :
      task === 'code100' ? userData.totalCodeSubmissions >= 100 :
      task === 'code200' ? userData.totalCodeSubmissions >= 200 :
      task === 'code300' ? userData.totalCodeSubmissions >= 300 : true;
    
    const done = !!userData.tasksCompleted[task];
    const btn = li.querySelector('.complete-task');
    btn.disabled = done || !prereqMet;
    btn.textContent = done ? 'Claimed' : 'Claim';
  });
}

async function handleTaskClick(task) {
  try {
    const payload = { ...initializeUser(), action: 'complete_task', task };
    const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
    const data = JSON.parse(execution.responseBody || '{}');
    
    if (data.success) {
      userData.balance = data.balance;
      userData.miningPower = data.mining_power;
      userData.tasksCompleted = data.tasks_completed || userData.tasksCompleted;
      refreshTasksState();
      updateUI();
    } else {
      showToast(data.message || 'Task failed', 'error');
    }
  } catch (err) {
    console.error('Task error:', err);
    showToast(err.message || 'Error completing task', 'error');
  }
}

// Referral System
async function fetchReferredFriends() {
  const payload = { ...initializeUser(), action: 'get_referred_friends' };
  const exec = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
  const friends = JSON.parse(exec.responseBody || '[]');
  populateFriends(friends);
}

function populateFriends(friends) {
  if (!friendsContainerEl) return;
  
  totalReferralsEl.textContent = formatNumber(friends.length, 0);
  friendsContainerEl.innerHTML = '';
  
  friends.forEach(f => {
    const row = document.createElement('div');
    row.className = 'friend-row stats-row';
    row.innerHTML = `<div>${f.username}</div><div>${formatNumber(f.balance)} $BLACK</div>`;
    friendsContainerEl.appendChild(row);
  });
}

// Event Setup
function setupTabs() {
  const tabLinks = document.querySelectorAll('.tab-list li a');
  
  tabLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('.tab-content, .tab-list li a').forEach(el => 
        el.classList.remove('active')
      );
      
      const tabId = link.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
      link.classList.add('active');
    });
  });
}

function setupEventListeners() {
  // Task Buttons
  taskItems.forEach(li => {
    const btn = li.querySelector('.complete-task');
    const link = li.querySelector('.task-desc a');
    
    if (link) {
      btn.disabled = false;
      btn.addEventListener('click', () => {
        window.open(link.href, '_blank');
        handleTaskClick(li.dataset.task);
      });
    } else {
      btn.addEventListener('click', () => handleTaskClick(li.dataset.task));
    }
  });

  // Mining Button
  if (mineBtn) mineBtn.addEventListener('click', async () => {
    if (!userData.isMining && !isAfterResetTime()) {
      await startMining();
      mineBtn.disabled = true;
    } else if (isAfterResetTime()) {
      showToast('Mining reset — please start again!', 'error');
      await fetchUserData();
    }
  });
  
  // Code Submission
  if (submitBtn && codeInput) {
    const dismissKeyboard = () => codeInput.blur();
    
    submitBtn.addEventListener('click', async () => {
      const submittedCode = codeInput.value.trim();
      if (!submittedCode) return showToast('Please enter a code to submit', 'error');
      
      try {
        const payload = { ...initializeUser(), action: 'submit_code', code: submittedCode };
        const execution = await functions.createExecution(FUNCTION_ID, JSON.stringify(payload));
        const data = JSON.parse(execution.responseBody || '{}');
        
        if (data.success) {
          userData.balance = data.balance;
          userData.submittedCodes.push(submittedCode);
          userData.codeSubmissionsToday = data.owner_submissions || userData.codeSubmissionsToday;
          userData.totalCodeSubmissions = data.total_code_submissions || userData.totalCodeSubmissions;
          userData.totalCodesSubmitted = data.total_codes_submitted || userData.totalCodesSubmitted;
          
          saveMiningState();
          updateUI();
          showToast('Code submitted successfully!');
          codeInput.value = '';
          dismissKeyboard();
        } else {
          showToast(data.message || 'Code submission failed', 'error');
        }
      } catch (err) {
        console.error('Code submission failed:', err);
        showToast('Failed to submit code', 'error');
      }
    });
    
    codeInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        dismissKeyboard();
        submitBtn.click();
      }
    });
    
    document.addEventListener('touchstart', e => {
      if (!codeInput.contains(e.target)) dismissKeyboard();
    });
    
    document.addEventListener('mousedown', e => {
      if (!codeInput.contains(e.target)) dismissKeyboard();
    });
  }
  
  // Buttons
  if (copyBtn) copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(dailyCodeEl.textContent);
    copyBtn.textContent = 'Copied';
    setTimeout(() => copyBtn.textContent = 'Copy', 2000);
  });
  
  if (sendBtn) {
  sendBtn.addEventListener('click', async () => {
    // 1) Grab today's code and your referral code:
    const dailyCode    = dailyCodeEl.textContent.trim();  // e.g. "D6477XJD22"
    const referralCode = userData.ownReferralCode;        // e.g. "ABC123"

    // 2) Construct the MarkdownV2 message.
    //    We wrap the code in backticks (`…`) so Telegram knows it’s inline‑code.
    const shareTextMarkdown = [
      "Use my $BLACK code today",
      "`" + dailyCode + "`"
    ].join("\n");
    // → "Use my $BLACK code today\n`D6477XJD22`"

    // 3) URL‑encode that string:
    const encodedText = encodeURIComponent(shareTextMarkdown);

    // 4) Build the Telegram share link.
    //    The “url=” part is your bot’s start link with referral, and “&text=” is the MarkdownV2 text.
    const shareUrl =
      "https://t.me/share/url?" +
      "url="  + encodeURIComponent(`https://t.me/theblacktgbot?startapp=${referralCode}`) +
      "&text=" + encodedText;

    // 5) Open it in Telegram (via WebApp) or fall back to copying:
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(shareUrl);
    } else {
      navigator.clipboard.writeText(shareTextMarkdown);
      alert("MarkdownV2 text copied to clipboard!");
    }

    sendBtn.textContent = 'Sending';
    setTimeout(() => sendBtn.textContent = 'Send', 2000);
  });
}
  
  if (copyReferralBtn) copyReferralBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(`https://t.me/blacktestvbot?startapp=${userData.ownReferralCode}`);
    copyReferralBtn.textContent = 'Copied';
    setTimeout(() => copyReferralBtn.textContent = 'Copy', 2000);
  });
  
  if (inviteBtn) inviteBtn.addEventListener('click', () => {
    const shareUrl = `https://t.me/blacktestvbot?startapp=${userData.ownReferralCode}`;
    const message = `\nstart mining $BLACK today with one button!`;
    
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(message)}`
      );
    } else {
      window.open(`tg://msg?text=${encodeURIComponent(message)}`, '_blank');
    }
  });
}

// Initialization
async function init() {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.expand();
    tg.ready();
    tg.enableClosingConfirmation();
  }
  
  setupTabs();
  setupEventListeners();
  loadMiningState();
  
  try {
    await fetchUserData();
    await fetchReferredFriends();
  } catch (error) {
    console.error('Initialization error:', error);
  }
  
  setInterval(updateCountdown, 1000);
  setInterval(async () => {
    await fetchUserData();
    updateUI();
  }, 300000);
}

// Override alerts
window.originalAlert = window.alert;
window.alert = msg => showToast(msg, 'error');
window.tgAlert = msg => showToast(msg, 'error');

document.addEventListener('DOMContentLoaded', init);