// Initialize Telegram Web App
const tg = window.Telegram.WebApp;

// Configure Web App
tg.ready();
tg.expand();
tg.isVerticalSwipesEnabled = false;

// Payment Handler
document.querySelectorAll('.upgrade-btn').forEach(button => {
    button.addEventListener('click', async () => {
        const stars = parseInt(button.dataset.stars);
        const user = tg.initDataUnsafe?.user;
        
        if (!user?.id) {
            tg.showPopup({
                title: "Error",
                message: "User authentication failed",
                buttons: [{ type: "destructive", text: "Close" }]
            });
            return;
        }

        try {
            const response = await fetch('https://680e403dcabf3d90bb9c.fra.appwrite.run/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tg.initData || ''}`,
                    'X-Telegram-Init-Data': tg.initData || ''
                },
                body: JSON.stringify({
                    userId: user.id,
                    stars: stars,
                    username: user.username || 'unknown'
                    // Removed process.env check
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.invoiceLink) {
                tg.openInvoice(data.invoiceLink, status => {
                    if (status === 'paid') {
                        tg.showPopup({
                            title: "Success!",
                            message: `Boost activated!`,
                            buttons: [{ type: "ok" }]
                        });
                    }
                });
            } else {
                throw new Error(data.error || "Invalid response from server");
            }
        } catch (error) {
            console.error('Payment error:', error);
            tg.showPopup({
                title: "Error",
                message: error.message || "Payment processing failed",
                buttons: [{ type: "cancel" }]
            });
        }
    });
});
