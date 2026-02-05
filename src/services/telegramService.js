export const sendTelegramMessage = async (text) => {
    const botToken = localStorage.getItem('telegram_bot_token');
    const chatId = localStorage.getItem('telegram_chat_id');

    if (!botToken || !chatId) return { success: false, error: 'Telegram não configurado' };

    try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML'
            })
        });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        console.error('Erro ao enviar para Telegram:', error);
        return { success: false, error };
    }
};
