import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)

Deno.serve(async (req) => {
    try {
        const body = await req.json()

        // 1. Cliques em Botões (Seleção de Cartão/Conta)
        if (body.callback_query) {
            const cb = body.callback_query; const chatId = cb.message.chat.id
            const [action, amount, type, status, dateStr, description, itemName] = cb.data.split('|')
            const { data: profile } = await supabase.from('profiles').select('id').eq('telegram_chat_id', chatId.toString()).single()
            if (profile) {
                const finalTitle = action === 'card' ? `${description} (${itemName})` : `${description} [${itemName}]`
                const category = action === 'card' ? 'Cartão' : (action === 'income' ? 'Receitas' : 'Geral')
                await supabase.from('transactions').insert({
                    user_id: profile.id, title: finalTitle, amount: parseFloat(amount),
                    type: action === 'card' ? 'card' : type, category, date: dateStr, status
                })
                await reply(chatId, `✅ <b>Registrado com Sucesso!</b>\n📝 ${finalTitle}\n💰 R$ ${parseFloat(amount).toFixed(2)}`)
            }
            return new Response("ok")
        }

        const { message } = body
        if (!message || !message.text) return new Response("ok")
        const chatId = message.chat.id; const text = message.text
        const lowText = text.toLowerCase()

        // 2. Busca Perfil
        const { data: p } = await supabase.from('profiles').select('*').eq('telegram_chat_id', chatId.toString()).single()
        if (!p) {
            await reply(chatId, "⚠️ Usuário não vinculado. Chat ID: " + chatId)
            return new Response("ok")
        }

        // 3. Parsing de Valor
        const amtMatch = text.match(/(\d+([.,]\d{1,2})?)/)
        if (!amtMatch) return new Response("ok")

        const amount = parseFloat(amtMatch[0].replace(',', '.')); let desc = text.replace(amtMatch[0], '').trim()
        let type = 'expense'; let status = lowText.match(/pendente|agendar|depois/) ? 'pending' : 'paid'; let date = new Date()
        let category = 'Geral'

        // Inteligência de Categorias
        if (lowText.match(/almoço|jantar|ifood|restaurante/)) category = 'Alimentação'
        else if (lowText.match(/mercado|feira|super/)) category = 'Mercado'
        else if (lowText.match(/gasolina|uber|combustivel/)) category = 'Transporte'
        else if (lowText.match(/luz|agua|aluguel|internet/)) category = 'Moradia'
        else if (lowText.match(/pix|recebi|venda/)) { type = 'income'; category = 'Receitas' }

        if (lowText.match(/cartao|cartão|credito/)) type = 'card'
        else if (lowText.match(/transferencia|transferir/)) type = 'transfer'

        const cards = p.user_cards || []; const accs = p.user_accounts || []

        // 4. Lógica de Múltiplos Itens
        if (type === 'card' && cards.length > 1) {
            const btns = cards.map(c => [{ text: c.name, callback_data: `card|${amount}|card|${status}|${date.toISOString()}|${desc}|${c.name}` }])
            await reply(chatId, `💳 <b>Qual cartão?</b>`, { inline_keyboard: btns }); return new Response("ok")
        }
        if (['transfer', 'income'].includes(type) && accs.length > 1) {
            const btns = accs.map(a => [{ text: a.name, callback_data: `${type}|${amount}|${type}|${status}|${date.toISOString()}|${desc}|${a.name}` }])
            await reply(chatId, `🏦 <b>Qual conta?</b>`, { inline_keyboard: btns }); return new Response("ok")
        }

        const name = type === 'card' ? (cards[0]?.name || 'Crédito') : (accs[0]?.name || '')
        const finalTitle = type === 'card' ? `${desc} (${name})` : (name ? `${desc} [${name}]` : desc)

        await supabase.from('transactions').insert({
            user_id: p.id, title: finalTitle, amount, type,
            category, date: date.toISOString(), status
        })
        await reply(chatId, `✅ <b>Registrado!</b>\n📝 ${finalTitle}\n💰 R$ ${amount.toFixed(2)}\n📂 ${category}`)

    } catch (e) {
        console.error("Função falhou:", e)
    }
    return new Response("ok")
})

async function reply(chatId, text, markup = null) {
    if (!BOT_TOKEN) return;
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', reply_markup: markup })
    })
}
