const APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = '6800cf6c0038c2026f07';
const UPGRADE_FN_ID = '680e403b001ed82fa62a';

// Get Telegram user ID
let telegramId = '';
try {
  telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() || '';
} catch (e) {
  console.error('Telegram init error', e);
}

if (!telegramId) {
  alert('🚫 Please open this WebApp inside Telegram.');
  document.body.innerHTML = '<h2>Please access via Telegram</h2>';
}

// DOM Elements
const powerElement = document.getElementById('power');

// Initialize Appwrite
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(PROJECT_ID);

const functions = new Functions(client);

// Utility functions
const updateMiningPower = (multiplier) => {
  powerElement.textContent = multiplier.toFixed(2);
};

const disableButton = (button) => {
  button.disabled = true;
  button.innerHTML += ' ✓';
};

const handlePurchase = async (multiplier, cost, button) => {
  try {
    button.disabled = true;
    button.textContent = 'Processing...';

    const execution = await functions.createExecution(
      UPGRADE_FN_ID,
      JSON.stringify({
        action: 'purchase_upgrade',
        telegramId,
        multiplier,
        cost
      })
    );

    const result = await waitForExecution(execution.$id);
    const response = JSON.parse(result.response || '{}');

    if (response.success) {
      updateMiningPower(response.mining_power);
      disableButton(button);
      alert(`✅ Upgrade purchased!\nNew balance: ${response.balance} $BLACK`);
    } else {
      alert(`❌ Error: ${response.message || 'Purchase failed'}`);
    }
  } catch (error) {
    console.error('Purchase error:', error);
    alert(`❌ Error: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = `+${multiplier}x Power (${cost} $BLACK)`;
  }
};

const waitForExecution = async (executionId, maxAttempts = 10, interval = 500) => {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await functions.getExecution(UPGRADE_FN_ID, executionId);
    if (status.status === 'completed') return status;
    if (status.status === 'failed') throw new Error('Function execution failed');
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error('Function execution timed out');
};

// Event listeners
document.querySelectorAll('.purchase-button').forEach(button => {
  button.addEventListener('click', () => {
    const multiplier = parseFloat(button.dataset.multiplier);
    const cost = parseInt(button.dataset.cost, 10);
    
    if (isNaN(multiplier) || isNaN(cost)) {
      alert('Invalid upgrade values');
      return;
    }

    handlePurchase(multiplier, cost, button);
  });
});