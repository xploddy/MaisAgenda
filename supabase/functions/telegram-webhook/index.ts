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
        const lowText = text.toLowerCase()

        // 0. Ajuda / Comandos
        if (lowText === '/start' || lowText === '/help' || lowText === 'ajuda' || lowText === 'comandos') {
            const helpMsg = `🤖 <b>Comandos do SmartOrganizer</b>\n\n` +
                `Para registrar, envie: <code>Descrição Valor</code>\n` +
                `Ex: <code>Almoço 35.50</code>\n\n` +
                `💡 <b>Recursos Avançados:</b>\n` +
                `• <b>Datas:</b> <code>dia 15</code> ou <code>20/05</code>\n` +
                `• <b>Status:</b> <code>pendente</code> ou <code>agendar</code>\n` +
                `• <b>Tipo:</b> <code>venda</code>, <code>pix</code>, <code>cartão</code>, <code>transferência</code>\n` +
                `• <b>Categorias:</b> <code>Lazer: Cinema 40</code>\n` +
                `• <b>Contas/Cartões:</b> Cite o nome da conta ou cartão no texto.\n\n` +
                `📌 <b>Exemplos:</b>\n` +
                `<i>"Gasolina 100 dia 10 Bradesco"</i>\n` +
                `<i>"Recebi 1500 pix Itaú"</i>\n` +
                `<i>"Jantar 80 cartão Nubank pendente"</i>`
            await reply(chatId, helpMsg)
            return new Response("ok")
        }

        // 1. Encontrar o usuário e suas preferências
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, nickname, default_account_id')
            .eq('telegram_chat_id', chatId.toString())
            .single()

        if (profileError || !profile) {
            await reply(chatId, "⚠️ Usuário não vinculado. Vá no App > Perfil > Telegram e vincule seu Chat ID: " + chatId)
            return new Response("ok")
        }

        // 2. Lógica de Parsing
        const amountMatch = text.match(/(\d+([.,]\d{1,2})?)/)
        if (!amountMatch) {
            await reply(chatId, `Olá ${profile.nickname}! Envie algo como: "Café 5.50" ou digite <b>ajuda</b>.`)
            return new Response("ok")
        }

        const amount = parseFloat(amountMatch[0].replace(',', '.'))
        let description = text.replace(amountMatch[0], '').trim()
        let category = 'Geral'
        let type = 'expense'
        let status = 'paid'
        let date = new Date()
        let targetAccount = null
        let targetCard = null

        // --- Detecção de Data ---
        const dateMatch = lowText.match(/dia (\d{1,2})/) || lowText.match(/(\d{1,2})\/(\d{1,2})/)
        if (dateMatch) {
            if (dateMatch[0].includes('dia')) {
                const day = parseInt(dateMatch[1])
                date.setDate(day)
                description = description.replace(dateMatch[0], '').trim()
            } else {
                const day = parseInt(dateMatch[1])
                const month = parseInt(dateMatch[2]) - 1
                date.setDate(day)
                date.setMonth(month)
                description = description.replace(dateMatch[0], '').trim()
            }
        }

        // --- Detecção de Tipo ---
        if (lowText.includes('transferencia') || lowText.includes('transferência') || lowText.includes('transferir')) {
            type = 'transfer'
            category = 'Transferência'
        } else if (lowText.includes('cartao') || lowText.includes('cartão') || lowText.includes('credito') || lowText.includes('crédito')) {
            type = 'card'
            category = 'Cartão'
        } else if (lowText.includes('recebi') || lowText.includes('ganhei') || lowText.includes('pix') || lowText.includes('venda') || lowText.includes('entrada') || lowText.includes('salário')) {
            type = 'income'
            category = 'Receitas'
        }

        // --- Detecção de Status ---
        if (lowText.includes('pendente') || lowText.includes('agendar') || lowText.includes('pagar depois') || lowText.includes('depois')) {
            status = 'pending'
        }

        // --- Detecção de Contas e Cartões ( nomes citados ) ---
        // Pegamos as contas e cartões do LocalStorage (via JSON no README/contexto, mas aqui precisamos do BD ou inferir)
        // Como não temos os nomes das contas aqui, vamos buscar no título/texto as palavras que o usuário digitou
        // No App, o formato é "Título [Conta]" ou "Título (Cartão)"

        // Vamos tentar extrair nomes próprios (capitalizados ou palavras específicas)
        // Por agora, vamos remover as palavras de comando para limpar a descrição
        const keywordsToRemove = /pendente|agendar|pagar depois|depois|transferencia|transferência|transferir|cartao|cartão|credito|crédito|recebi|ganhei|pix|venda|entrada|salário|dia \d{1,2}|\d{1,2}\/\d{1,2}/gi
        let cleanDesc = description.replace(keywordsToRemove, '').trim()

        // Se o usuário especificou categoria via ":"
        if (cleanDesc.includes(':')) {
            const parts = cleanDesc.split(':')
            category = parts[0].trim()
            cleanDesc = parts[1].trim()
        }

        // Tentar detectar se sobrou algum nome de banco/cartão (heurística simples)
        // Se houver palavras sozinhas como "Nubank", "Itaú", "Inter", etc.
        const banks = ['nubank', 'itaú', 'itau', 'inter', 'bradesco', 'santander', 'caixa', 'carteira', 'dinheiro']
        let foundRef = ""
        banks.forEach(b => {
            if (lowText.includes(b)) foundRef = b.charAt(0).toUpperCase() + b.slice(1)
        })

        // Formatação final do Título no padrão do App
        let finalTitle = cleanDesc || "Lançamento via Telegram"
        if (type === 'card' && foundRef) {
            finalTitle += ` (${foundRef})`
        } else if (foundRef) {
            finalTitle += ` [${foundRef}]`
        }

        // Smart Category Detection (se ainda for Geral)
        if (category === 'Geral') {
            if (lowText.includes('almoço') || lowText.includes('jantar') || lowText.includes('ifood') || lowText.includes('comer') || lowText.includes('restaurante')) {
                category = 'Alimentação'
            } else if (lowText.includes('uber') || lowText.includes('gasolina') || lowText.includes('combustivel') || lowText.includes('ônibus')) {
                category = 'Transporte'
            } else if (lowText.includes('mercado') || lowText.includes('feira') || lowText.includes('compra')) {
                category = 'Mercado'
            } else if (lowText.includes('internet') || lowText.includes('luz') || lowText.includes('água') || lowText.includes('aluguel')) {
                category = 'Moradia'
            }
        }

        // 3. Inserir no Banco de Dados
        const { error: insertError } = await supabase.from('transactions').insert({
            user_id: profile.id,
            title: finalTitle,
            amount: amount,
            type: type,
            category: category,
            date: date.toISOString(),
            status: status
        })

        if (insertError) {
            await reply(chatId, "❌ Erro ao salvar: " + insertError.message)
        } else {
            const typeEmoji = type === 'income' ? '🟢' : type === 'transfer' ? '🔵' : type === 'card' ? '💳' : '🔴'
            await reply(chatId,
                `${typeEmoji} <b>Sucesso!</b>\n\n` +
                `📝 ${finalTitle}\n` +
                `💰 R$ ${amount.toFixed(2)}\n` +
                `📂 ${category}\n` +
                `📅 ${date.toLocaleDateString('pt-BR')}\n` +
                `📌 ${status === 'paid' ? 'Liquidado' : 'Pendente'}`
            )
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
