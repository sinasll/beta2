import { Client, Functions } from "https://esm.sh/appwrite@13.0.0";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6800cf6c0038c2026f07");

const functions = new Functions(client);
const FUNCTION_ID = "680e403b001ed82fa62a";

document.querySelectorAll('.upgrade-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const btnData = btn.dataset;
    const payload = {
      title: btnData.title,
      description: btnData.description || `${btnData.multiplier}x Boost`,
      cost: Number(btnData.stars),
      multiplier: Number(btnData.multiplier)
    };

    const originalState = {
      disabled: btn.disabled,
      text: btn.textContent
    };
    
    btn.disabled = true;
    btn.textContent = 'Processing...';

    try {
      const execution = await functions.createExecution(
        FUNCTION_ID,
        JSON.stringify(payload)
      );

      // Validate response structure
      if (typeof execution.response !== 'string') {
        throw new Error('Invalid server response format');
      }

      const result = JSON.parse(execution.response);
      
      if (!result?.success) {
        throw new Error(result?.message || 'Payment processing failed');
      }

      window.Telegram.WebApp.openInvoice(result.invoiceLink, status => {
        if (status === 'paid') {
          btn.textContent = '✓ Activated';
          btn.classList.add('active');
        } else {
          btn.disabled = originalState.disabled;
          btn.textContent = originalState.text;
        }
      });

    } catch (error) {
      console.error('Payment Error:', {
        error,
        rawResponse: execution?.response
      });
      
      window.Telegram.WebApp.showAlert(
        error.message || 'Payment processing failed'
      );
      
      btn.disabled = originalState.disabled;
      btn.textContent = originalState.text;
    }
  });
});