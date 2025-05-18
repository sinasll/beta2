// upgrade.js

// 1️⃣ Initialize Web App
Telegram.WebApp.ready();
const WebApp = Telegram.WebApp;

// 2️⃣ Cache DOM Elements
const elements = {
  upgradeBtn: document.getElementById("upgradeButton"),
  powerEl: document.getElementById("power"),
  loadingIndicator: document.getElementById("loading")
};

// 3️⃣ Validate User Session
let userId;
try {
  userId = WebApp.initDataUnsafe?.user?.id;
  if (!userId) throw new Error("User session invalid");
} catch (error) {
  console.error("Auth Error:", error);
  WebApp.showAlert("⚠️ Please restart the app to authenticate");
  elements.upgradeBtn.disabled = true;
  return;
}

// 4️⃣ API Communication Layer
async function callBackend(action, payload = {}) {
  try {
    elements.loadingIndicator.style.display = 'block';
    
    const response = await fetch(
      "https://fra.cloud.appwrite.io/v1/functions/680e403b001ed82fa62a/executions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Appwrite-Project": "6800cf6c0038c2026f07"
        },
        body: JSON.stringify({
          action,
          userId,  // Always include user ID
          ...payload
        })
      }
    );

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || `Action ${action} failed`);
    }

    return data;
  } catch (error) {
    console.error(`API Error (${action}):`, error);
    WebApp.showAlert(`🚨 ${error.message}`);
    throw error;
  } finally {
    elements.loadingIndicator.style.display = 'none';
  }
}

// 5️⃣ Purchase Flow Controller
async function handleUpgrade() {
  try {
    WebApp.MainButton.showProgress(true);
    
    // Phase 1: Get Invoice
    const { invoiceLink } = await callBackend('get_invoice');
    if (!invoiceLink) throw new Error("No payment link received");

    // Phase 2: Handle Payment
    WebApp.openInvoice(invoiceLink, async (status) => {
      if (status === 'paid') {
        // Phase 3: Confirm Purchase
        const result = await callBackend('purchase_power', {
          starsPaid: 100
        });

        // Phase 4: Update UI
        elements.powerEl.textContent = result.current.toFixed(1);
        WebApp.showAlert(`
          ✅ Success! 
          New power: ${result.current.toFixed(1)}×
          (+${result.boost.toFixed(1)} boost)
        `);
      }
    });
  } catch (error) {
    console.error("Purchase Flow Error:", error);
  } finally {
    WebApp.MainButton.showProgress(false);
  }
}

// 6️⃣ Initial Setup
function initialize() {
  // Load initial power value
  callBackend('get_power')
    .then(data => {
      elements.powerEl.textContent = data.power.toFixed(1);
    })
    .catch(() => {
      elements.powerEl.textContent = '1.0';
    });

  // Event Binding
  elements.upgradeBtn.addEventListener('click', handleUpgrade);
  elements.upgradeBtn.disabled = false;
}

// 🚀 Start Application
initialize();