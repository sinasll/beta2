 // Initialize Telegram Web App first
 const tg = window.Telegram.WebApp;
 
  tg.ready();
  tg.expand();
  tg.isVerticalSwipesEnabled = false;

 // Payment Handler
 document.querySelectorAll('.upgrade-btn').forEach(button => {
  button.addEventListener('click', async () => {
      const stars = parseInt(button.dataset.stars);
      const user = WebApp.initDataUnsafe.user;
      
      try {
          const response = await fetch('http://680e403dcabf3d90bb9c.fra.appwrite.run/', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${WebApp.initData}`
              },
              body: JSON.stringify({
                  userId: user.id,
                  stars: stars,
                  username: user.username
              })
          });

          const data = await response.json();
          
          if (data.invoiceLink) {
              WebApp.openInvoice(data.invoiceLink, status => {
                  if (status === 'paid') {
                      WebApp.showPopup({
                          title: "Success!",
                          message: `Boost activated!`,
                          buttons: [{ type: "ok" }]
                      });
                  }
              });
          }
      } catch (error) {
          WebApp.showPopup({
              title: "Error",
              message: "Payment failed",
              buttons: [{ type: "cancel" }]
          });
      }
  });
});