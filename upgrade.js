import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

const functions = new Functions(client);
const FUNCTION_ID = "680e403b001ed82fa62a";

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Telegram Web App
  const webApp = window.Telegram.WebApp;
  webApp.expand();
  webApp.enableClosingConfirmation();

  // Handle upgrade button clicks
  document.querySelectorAll('.upgrade-btn').forEach(button => {
    button.addEventListener('click', async (e) => {
      const stars = e.target.dataset.stars;
      const multiplier = e.target.dataset.multiplier;
      
      try {
        // Show loading state
        e.target.innerHTML = '<div class="spinner"></div>';
        e.target.disabled = true;

        // Call Appwrite function to generate invoice
        const response = await callAppwriteFunction(stars, multiplier);
        
        if (response.invoiceLink) {
          webApp.openInvoice(response.invoiceLink, status => {
            if (status === 'paid') {
              showSuccessMessage(multiplier);
              updateMiningPower(multiplier);
            } else {
              showErrorMessage();
            }
          });
        }
      } catch (err) {
        showErrorMessage();
      } finally {
        // Reset button state
        e.target.innerHTML = 'Activate';
        e.target.disabled = false;
      }
    });
  });

  async function callAppwriteFunction(stars, multiplier) {
    const response = await fetch('http://680e403dcabf3d90bb9c.fra.appwrite.run/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer <APPWRITE_API_KEY>'
      },
      body: JSON.stringify({
        stars,
        multiplier,
        userId: window.Telegram.WebApp.initDataUnsafe.user?.id
      })
    });
    
    if (!response.ok) throw new Error('Failed to create invoice');
    return response.json();
  }

  function showSuccessMessage(multiplier) {
    window.Telegram.WebApp.showAlert(`✅ Success! ${multiplier}x mining power activated!`);
  }

  function showErrorMessage() {
    window.Telegram.WebApp.showAlert('❌ Payment failed. Please try again.');
  }

  function updateMiningPower(multiplier) {
    // Call your backend to update user's mining power
    // This would be another Appwrite function or API call
  }
});