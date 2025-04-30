// Initialize Telegram Web App first
const tg = window.Telegram.WebApp;

// Initialize Web App
tg.ready();
tg.expand();
tg.isVerticalSwipesEnabled = false;

// Payment Handler
const API_ENDPOINT = 'https://680e403dcabf3d90bb9c.fra.appwrite.run/';

document.querySelectorAll('.upgrade-btn').forEach(button => {
    button.addEventListener('click', async () => {
        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tg.initData}`
                },
                body: JSON.stringify({
                    userId: user.id,
                    stars: stars,
                    username: user.username
                })
            });

            const data = await response.json();
            
            if (data.invoiceLink) {
                tg.openInvoice(data.invoiceLink, status => { // Changed WebApp to tg
                    if (status === 'paid') {
                        tg.showPopup({ // Changed WebApp to tg
                            title: "Success!",
                            message: `Boost activated!`,
                            buttons: [{ type: "ok" }]
                        });
                    }
                });
            }
        } catch (error) {
            tg.showPopup({ // Changed WebApp to tg
                title: "Error",
                message: "Payment failed",
                buttons: [{ type: "cancel" }]
            });
        }
    });
});