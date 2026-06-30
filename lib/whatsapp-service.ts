/**
 * WhatsApp Service Client
 * -----------------------
 * This library communicates with the local whatsapp-bridge.js
 */

export async function sendWhatsAppVoucher(phoneNumber: string, voucherCode: string, planName: string) {
    try {
        const message = `✨ *STARLINKNET.WIFI VOUCHER* ✨\n\n` +
                        `🎫 *Your Code:* ${voucherCode}\n` +
                        `🚀 *Plan:* ${planName}\n\n` +
                        `Connect to Wi-Fi and enter your code to start browsing. Thank you for your payment!`;

        // Call the local bridge server running on port 4000
        const response = await fetch('http://localhost:4000/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber, message })
        });

        if (response.ok) {
            console.log(`[WhatsApp] Voucher sent to ${phoneNumber} successfully.`);
            return true;
        }
        return false;
    } catch (error) {
        console.warn("[WhatsApp] Bridge not running or message failed to send.");
        return false;
    }
}
