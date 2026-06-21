/**
 * Sends a WhatsApp notification using Green API.
 */

async function sendWhatsAppMessage(chatId: string, messageText: string) {
  const instanceId = process.env.GREEN_API_INSTANCE_ID;
  const apiToken = process.env.GREEN_API_TOKEN;

  if (!instanceId || !apiToken) {
    console.warn("[WhatsApp] Missing Green API credentials.");
    return;
  }

  let url = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${apiToken}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: chatId,
        message: messageText
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error("[WhatsApp] Gateway rejection log:", errData);
    } else {
      console.log(`[WhatsApp] Message sent successfully to ${chatId}.`);
    }
  } catch (error) {
    console.error("[WhatsApp] Failed to connect to the external WhatsApp server:", error);
  }
}

export async function sendPersonalAdminAlert(amount: number, customerPhone: string, voucherCode: string) {
  const personalNumber = process.env.MY_PERSONAL_WHATSAPP_NUMBER;
  if (!personalNumber) return;

  const chatId = `${personalNumber}@c.us`;
  const messageText = `⚡ *STARLINKNET.WIFI INCOMING PAYMENT* ⚡\n\n` +
                      `💰 *Amount:* KSh ${amount}\n` +
                      `📱 *From:* ${customerPhone}\n` +
                      `🔑 *Voucher Pin:* ${voucherCode}\n\n` +
                      `🟢 _System operating normally. Session pushed to router._`;

  await sendWhatsAppMessage(chatId, messageText);
}

export async function sendVoucherToCustomer(customerPhone: string, voucherCode: string, packageName: string, amount: number) {
  // Normalize phone number (e.g., 0712345678 -> 254712345678)
  let normalized = customerPhone.replace(/\D/g, '');
  if (normalized.startsWith('0')) {
    normalized = '254' + normalized.substring(1);
  } else if (normalized.startsWith('7')) {
      normalized = '254' + normalized;
  }

  const chatId = `${normalized}@c.us`;
  const messageText = `👋 *Hello! Welcome to STARLINKNET.WIFI*\n\n` +
                      `Thank you for your payment of *KSh ${amount}* for the *${packageName}* package.\n\n` +
                      `🔑 Your Voucher Pin is: *${voucherCode}*\n\n` +
                      `🚀 *How to connect:*\n` +
                      `1. Connect to our Wi-Fi\n` +
                      `2. Enter the pin above in the portal\n` +
                      `3. Enjoy high-speed internet!\n\n` +
                      `Need help? Contact support at ${process.env.SUPPORT_PHONE || 'our office'}.`;

  await sendWhatsAppMessage(chatId, messageText);
}

export async function sendBulkBroadcast(phones: string[], message: string) {
    for (const phone of phones) {
        let normalized = phone.replace(/\D/g, '');
        if (normalized.startsWith('0')) normalized = '254' + normalized.substring(1);
        const chatId = `${normalized}@c.us`;
        await sendWhatsAppMessage(chatId, message);
    }
}
