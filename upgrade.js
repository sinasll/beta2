// upgrade.js

// 1️⃣ Tell Telegram we’re ready
Telegram.WebApp.ready();

// 2️⃣ Grab UI elements and user ID
const WebApp     = Telegram.WebApp;
const upgradeBtn = document.getElementById("upgradeButton");
const powerEl    = document.getElementById("power");

// Only safe to read after ready()
const userId = WebApp.initDataUnsafe?.user?.id;
if (!userId) {
  console.error("Telegram user ID unavailable");
  WebApp.showAlert("Error: unable to read your user ID. Please reopen the Mini App.");
  upgradeBtn.disabled = true;
}

// Helper: call your Appwrite function
async function callUpgradeFunction(payload) {
  const response = await fetch(
    "https://fra.cloud.appwrite.io/v1/functions/680e403b001ed82fa62a/executions",
    {
      method: "POST",
      headers: {
        "Content-Type":       "application/json",
        "X-Appwrite-Project": "6800cf6c0038c2026f07"
        // If needed, add your function key:
        // "X-Appwrite-Key": "<YOUR_FUNCTION_KEY>"
      },
      body: JSON.stringify(payload)
    }
  );
  return response.json();
}

// 3️⃣ Click handler: get invoice → open Stars UI → grant power
upgradeBtn.addEventListener("click", async () => {
  try {
    // a) Request an invoice link
    const invRes = await callUpgradeFunction({
      action:      "get_invoice",
      amountStars: 100
    });
    if (!invRes.invoiceLink) {
      throw new Error(invRes.message || "Failed to get invoice link");
    }

    // b) Open native Stars checkout
    WebApp.openInvoice(invRes.invoiceLink, async status => {
      if (status === "paid") {
        // c) Notify the function to grant power
        const purchaseRes = await callUpgradeFunction({
          action:     "purchase_power",
          telegramId: userId,
          starsPaid:  100
        });

        if (purchaseRes.new_power == null) {
          throw new Error(purchaseRes.message || "Upgrade failed");
        }

        // d) Update UI
        powerEl.innerText = purchaseRes.new_power.toFixed(1);
        WebApp.showAlert("✅ Power upgraded by +" + (purchaseRes.new_power - (invRes.previous_power||0)).toFixed(1) + "×!");
      }
    });
  } catch (err) {
    console.error("Upgrade error:", err);
    WebApp.showAlert("❌ Failed to upgrade power. Try again later.");
  }
});
