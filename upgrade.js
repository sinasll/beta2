// upgrade.js
document.addEventListener("DOMContentLoaded", () => {
  // 1) Telegram WebApp init
  const tg = window.Telegram.WebApp;
  tg.expand();

  const initData = tg.initDataUnsafe;
  if (!initData?.user) {
    alert("🚫 Please open this mini-app inside Telegram.");
    document.body.innerHTML = "<h2>Please access via Telegram</h2>";
    return;
  }

  // 2) Your Function’s domain (Functions → Domains in the Console)
  const RUNNER = "https://680e403b001ed82fa62a.fra.appwrite.run";

  // 3) Helper: single-step domain invocation
  async function callBackend(action, stars, multiplier) {
    const resp = await fetch(RUNNER, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, stars, multiplier, initData }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`HTTP ${resp.status}: ${text}`);
    }
    return resp.json();
  }

  // 4) Wire up each “Activate” button
  document.querySelectorAll(".upgrade-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const stars      = Number(btn.dataset.stars);
      const multiplier = Number(btn.dataset.multiplier);

      if (isNaN(stars) || isNaN(multiplier)) {
        return alert("Invalid upgrade configuration");
      }

      btn.disabled = true;
      const originalText = btn.textContent;
      btn.textContent = "Preparing…";

      try {
        // a) Create the Stars invoice
        const { success, invoiceLink, message } =
          await callBackend("createInvoice", stars, multiplier);
        if (!success) throw new Error(message || "Invoice creation failed");

        // b) Open Telegram’s native Stars payment UI
        tg.openInvoice(invoiceLink, async (paymentStatus) => {
          if (paymentStatus === "paid") {
            // c) On success, finalize purchase & update power
            try {
              const { success: ok, newPower, message: msg } =
                await callBackend("purchase", stars, multiplier);
              if (!ok) throw new Error(msg || "Purchase finalization failed");

              document.getElementById("power").textContent = newPower;
              alert(`🎉 Mining power upgraded to ×${newPower}`);
              btn.textContent = `×${multiplier} Power (⭐${stars}) ✓`;
              btn.disabled = true;
            } catch (e) {
              console.error(e);
              alert(e.message);
              btn.disabled = false;
              btn.textContent = originalText;
            }
          } else {
            // user cancelled or failed
            alert(`Payment status: ${paymentStatus}`);
            btn.disabled = false;
            btn.textContent = originalText;
          }
        });
      } catch (err) {
        console.error(err);
        alert(err.message);
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  });
});
