// upgrade.js - Final Corrected Version

// 1️⃣ Initialize Web App safely
try {
  Telegram.WebApp.ready();
  Telegram.WebApp.expand();
} catch (error) {
  console.error("Telegram WebApp init failed:", error);
}

// 2️⃣ Cache DOM elements with null checks
const elements = {
  upgradeBtn: document.getElementById("upgradeButton"),
  powerEl: document.getElementById("power"),
  loadingIndicator: document.getElementById("loading"),
  errorDisplay: document.getElementById("error-message")
};

// Verify critical elements exist
if (!elements.upgradeBtn || !elements.powerEl) {
  console.error("Critical DOM elements missing");
  if (elements.errorDisplay) {
    elements.errorDisplay.textContent = "App configuration error";
  }
}

// 3️⃣ User session management
function initializeUserSession() {
  try {
    const userId = Telegram.WebApp.initDataUnsafe?.user?.id;
    if (!userId) {
      throw new Error("User not authenticated");
    }
    return userId;
  } catch (error) {
    console.error("Session error:", error);
    if (elements.errorDisplay) {
      elements.errorDisplay.textContent = "Please reopen the app from Telegram";
    }
    if (elements.upgradeBtn) {
      elements.upgradeBtn.disabled = true;
    }
    return null;
  }
}

const userId = initializeUserSession();

// 4️⃣ Enhanced API client
async function callBackend(action, payload = {}) {
  if (!elements.loadingIndicator) {
    console.warn("Loading indicator missing");
  } else {
    elements.loadingIndicator.style.display = 'block';
  }

  try {
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
          userId,
          ...payload
        })
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (data?.error) {
      throw new Error(data.message || "Backend error");
    }

    return data;
  } catch (error) {
    console.error(`${action} failed:`, error);
    Telegram.WebApp.showAlert(`⚠️ ${error.message}`);
    throw error;
  } finally {
    if (elements.loadingIndicator) {
      elements.loadingIndicator.style.display = 'none';
    }
  }
}

// 5️⃣ Purchase flow with state management
async function handleUpgrade() {
  if (!userId) {
    Telegram.WebApp.showAlert("Please authenticate first");
    return;
  }

  try {
    Telegram.WebApp.MainButton.showProgress(true);
    
    // Phase 1: Invoice creation
    const { invoiceLink } = await callBackend('get_invoice');
    if (!invoiceLink) throw new Error("Payment system unavailable");

    // Phase 2: Payment processing
    Telegram.WebApp.openInvoice(invoiceLink, async (status) => {
      if (status === 'paid') {
        // Phase 3: Power upgrade
        const result = await callBackend('purchase_power', {
          starsPaid: 100
        });

        // Phase 4: UI update
        if (elements.powerEl) {
          elements.powerEl.textContent = result.current.toFixed(1);
        }
        Telegram.WebApp.showAlert(`
          Upgrade successful!
          New power: ${result.current.toFixed(1)}×
        `);
      } else if (status === 'failed') {
        Telegram.WebApp.showAlert("Payment failed. Please try again");
      }
    });
  } catch (error) {
    console.error("Upgrade failed:", error);
  } finally {
    Telegram.WebApp.MainButton.showProgress(false);
  }
}

// 6️⃣ Initialization
function initializeApp() {
  // Load initial power value
  if (userId) {
    callBackend('get_power')
      .then(data => {
        if (elements.powerEl && data?.power) {
          elements.powerEl.textContent = data.power.toFixed(1);
        }
      })
      .catch(() => {
        if (elements.powerEl) {
          elements.powerEl.textContent = '1.0';
        }
      });
  }

  // Set up event listeners
  if (elements.upgradeBtn) {
    elements.upgradeBtn.addEventListener('click', handleUpgrade);
    elements.upgradeBtn.disabled = !userId;
  }
}

// Start the application
document.addEventListener('DOMContentLoaded', initializeApp);