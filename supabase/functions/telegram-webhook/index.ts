import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)

serve(async (req) => {
    try {
        const body = await req.json()

        // 1. Cliques em Botões
        if (body.callback_query) {
            const cb = body.callback_query
            const chatId = cb.message.chat.id
            const [action, amount, type, status, dateStr, description, itemName] = cb.data.split('|')

            const { data: profile } = await supabase.from('profiles').select('id').eq('telegram_chat_id', chatId.toString()).single()
            if (profile) {
                const finalTitle = action === 'card' ? `${description} (${itemName})` : `${description} [${itemName}]`
                const category = action === 'card' ? 'Cartão' : (action === 'income' ? 'Receitas' : 'Geral')

                await supabase.from('transactions').insert({
                    user_id: profile.id,
                    title: finalTitle,
                    amount: parseFloat(amount),
                    type: action === 'card' ? 'card' : type,
                    category,
                    date: dateStr,
                    status
                })
                await reply(chatId, `✅ <b>Confirmado:</b> ${finalTitle}\n💰 R$ ${parseFloat(amount).toFixed(2)}`)
            }
            return new Response("ok")
        }

        const { message } = body
        if (!message || !message.text) return new Response("ok")

        const chatId = message.chat.id
        const text = message.text.toLowerCase()

        if (text === '/start' || text === 'ajuda' || text === 'ajuda') {
            await reply(chatId, `🤖 <b>SmartOrganizer</b>\nEnvie: <code>Almoço 35</code>\nUse: <code>cartão</code>, <code>pendente</code>, <code>dia 10</code>.`)
            return new Response("ok")
        }

        const { data: profile } = await supabase.from('profiles').select('*').eq('telegram_chat_id', chatId.toString()).single()
        if (!profile) return new Response("ok")

        const amountMatch = message.text.match(/(\d+([.,]\d{1,2})?)/)
        if (!amountMatch) return new Response("ok")

        const amount = parseFloat(amountMatch[0].replace(',', '.'))
        let description = message.text.replace(amountMatch[0], '').trim()
        let type = 'expense'
        let status = text.match(/pendente|agendar|depois/) ? 'pending' : 'paid'
        let date = new Date()

        const dateMatch = text.match(/dia (\d{1,2})/)
        if (dateMatch) date.setDate(parseInt(dateMatch[1]))

        if (text.includes('cartao') || text.includes('cartão') || text.includes('credito')) type = 'card'
        else if (text.includes('transferencia') || text.includes('transferir')) type = 'transfer'
        else if (text.includes('pix') || text.includes('recebi') || text.includes('venda')) type = 'income'

        const userCards = profile.user_cards || []
        const userAccs = profile.user_accounts || []

        // Lógica de Seleção
        if (type === 'card' && userCards.length > 1) {
            const buttons = userCards.map(c => [{ text: c.name, callback_data: `card|${amount}|card|${status}|${date.toISOString()}|${description}|${c.name}` }])
            await reply(chatId, `💳 <b>Qual cartão?</b>`, { inline_keyboard: buttons })
            return new Response("ok")
        }

        if ((type === 'transfer' || type === 'income') && userAccs.length > 1) {
            const buttons = userAccs.map(a => [{ text: a.name, callback_data: `${type}|${amount}|${type}|${status}|${date.toISOString()}|${description}|${a.name}` }])
            await reply(chatId, `🏦 <b>Qual conta?</b>`, { inline_keyboard: buttons })
            return new Response("ok")
        }

        // Caso tenha apenas 1 ou nenhum mapeado (usa padrão ou o único)
        const itemName = type === 'card' ? (userCards[0]?.name || 'Crédito') : (userAccs[0]?.name || '')
        const finalTitle = type === 'card' ? `${description} (${itemName})` : (itemName ? `${description} [${itemName}]` : description)

        await supabase.from('transactions').insert({
            user_id: profile.id,
            title: finalTitle,
            amount,
            type,
            category: type === 'card' ? 'Cartão' : (type === 'income' ? 'Receitas' : 'Geral'),
            date: date.toISOString(),
            status
        })
        await reply(chatId, `✅ <b>Registrado!</b>\n📝 ${finalTitle}\n💰 R$ ${amount.toFixed(2)}`)

    } catch (e) { console.error(e) }
    return new Response("ok")
})

async function reply(chatId, text, markup = null) {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', reply_markup: markup })
    })
}
