import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

const functions = new Functions(client);
const FUNCTION_ID = "680e403b001ed82fa62a";

document.addEventListener('DOMContentLoaded', () => {
  // ─── 1) Telegram WebApp init ───────────────────────────────
  const tg = window.Telegram.WebApp;
  tg.expand();

  // We'll use the unsafe parsed initData here; your backend will HMAC-verify it
  const initData = tg.initDataUnsafe;
  if (!initData || !initData.user) {
    alert('🚫 Please open this mini-app inside Telegram.');
    document.body.innerHTML = '<h2>Please access via Telegram</h2>';
    return;
  }

  // ─── 2) Appwrite runner URL ────────────────────────────────
  // Replace with your real function runner domain (Console → Functions → Domains)
  const RUNNER = 'https://680e403b001ed82fa62a.fra.appwrite.run';

  // ─── 3) Helper to call your backend via fetch ───────────────
  async function callBackend(action, stars, multiplier) {
    const resp = await fetch(RUNNER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, stars, multiplier, initData })
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  }

  // ─── 4) Wire up each “Activate” button ──────────────────────
  document.querySelectorAll('.upgrade-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const stars      = parseInt(btn.dataset.stars, 10);
      const multiplier = parseFloat(btn.dataset.multiplier);

      if (isNaN(stars) || isNaN(multiplier)) {
        return alert('Invalid upgrade configuration');
      }

      btn.disabled = true;
      btn.textContent = 'Preparing…';

      try {
        // a) Ask backend to create a Telegram Stars invoice link
        const { success, invoiceLink, message } = await callBackend('createInvoice', stars, multiplier);
        if (!success) {
          throw new Error(message || 'Invoice creation failed');
        }

        // b) Open Telegram's native invoice UI
        tg.openInvoice(invoiceLink, async paymentStatus => {
          if (paymentStatus === 'paid') {
            // c) On success, finalize the purchase (update power in DB)
            try {
              const { success: ok, newPower, message: msg } =
                await callBackend('purchase', stars, multiplier);

              if (!ok) {
                return alert(`Upgrade failed: ${msg}`);
              }

              // update your UI
              document.getElementById('power').textContent = newPower;
              alert(`🎉 Mining power upgraded to ×${newPower}`);
              btn.textContent = `×${multiplier} Power (⭐${stars}) ✓`;
              btn.disabled = true;
            } catch (e) {
              console.error('Finalize purchase error', e);
              alert('Error finalizing purchase');
              btn.disabled = false;
              btn.textContent = `×${multiplier} Power (⭐${stars})`;
            }
          } else {
            // user canceled or failed
            alert(`Payment ${paymentStatus}`);
            btn.disabled = false;
            btn.textContent = `×${multiplier} Power (⭐${stars})`;
          }
        });
      } catch (err) {
        console.error('Upgrade error', err);
        alert(err.message);
        btn.disabled = false;
        btn.textContent = `×${multiplier} Power (⭐${stars})`;
      }
    });
  });
});
