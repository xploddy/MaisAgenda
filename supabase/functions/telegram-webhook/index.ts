import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
    try {
        const { message } = await req.json()
        if (!message || !message.text) return new Response("ok")

        const chatId = message.chat.id
        const text = message.text

        // 1. Encontrar o usuário pelo Telegram Chat ID
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, nickname')
            .eq('telegram_chat_id', chatId.toString())
            .single()

        if (profileError || !profile) {
            await reply(chatId, "⚠️ Usuário não vinculado. Vá no App > Perfil > Telegram e vincule seu Chat ID: " + chatId)
            return new Response("ok")
        }

        // 2. Lógica de Parsing (Ex: "Almoço 35.50")
        // Regex para achar números (valor)
        const amountMatch = text.match(/(\d+([.,]\d{1,2})?)/)
        if (!amountMatch) {
            await reply(chatId, `Olá ${profile.nickname}! Envie algo como: "Café 5.50" ou "Mercado 100"`)
            return new Response("ok")
        }

        const amount = parseFloat(amountMatch[0].replace(',', '.'))
        let description = text.replace(amountMatch[0], '').trim()
        let category = 'Geral'

        // Tentar extrair categoria se houver ":" (Ex: "Saúde: Remédio 20")
        if (description.includes(':')) {
            const parts = description.split(':')
            category = parts[0].trim()
            description = parts[1].trim()
        }

        if (!description) description = "Lançamento via Telegram"

        // 3. Inserir no Banco de Dados
        const { error: insertError } = await supabase.from('transactions').insert({
            user_id: profile.id,
            title: description,
            amount: amount,
            type: 'expense',
            category: category,
            date: new Date().toISOString(),
            status: 'paid'
        })

        if (insertError) {
            await reply(chatId, "❌ Erro ao salvar no banco: " + insertError.message)
        } else {
            await reply(chatId, `✅ <b>Registrado com sucesso!</b>\n\n📝 ${description}\n💰 R$ ${amount.toFixed(2)}\n📂 ${category}`)
        }

    } catch (e) {
        console.error(e)
    }
    return new Response("ok")
})

async function reply(chatId: number, text: string) {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
    })
}
