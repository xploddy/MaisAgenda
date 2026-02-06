import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

Deno.serve(async (req) => {
    const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")?.trim()
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")?.trim()
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
    const SUPABASE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ROLE!)

    if (!BOT_TOKEN) return new Response("Missing Token", { status: 500 })

    try {
        const body = await req.json()
        console.log("📨 INCOMING:", JSON.stringify(body))

        if (body.callback_query) {
            return await handleCallback(body.callback_query, supabase, BOT_TOKEN)
        }

        const message = body.message
        if (!message || !message.text) return new Response("ok")

        const chatId = message.chat.id
        const text = message.text.trim()
        const lowText = text.toLowerCase()

        // HELP COMMAND
        if (lowText.includes('ajuda') || lowText.includes('help') || lowText.startsWith('/start') || lowText === 'oi') {
            await clearSession(chatId, supabase)
            await reply(chatId, `🤖 <b>Assistente SmartOrganizer com IA</b>\n\nAgora entendo linguagem natural! Exemplos:\n• <code>Paguei 50 no mercado ontem</code>\n• <code>Recebi 1000 de salário</code>\n• <code>Comprei pizza 35 no cartão</code>\n\nFale naturalmente! 🧠`, BOT_TOKEN)
            return new Response("ok")
        }

        // GET PROFILE
        const { data: profile } = await supabase.from('profiles').select('*').eq('telegram_chat_id', chatId.toString()).single()
        if (!profile) {
            await reply(chatId, `⚠️ Vincule Chat ID <code>${chatId}</code> no App.`, BOT_TOKEN)
            return new Response("ok")
        }

        // CHECK SESSION
        const { data: session } = await supabase.from('bot_sessions').select('*').eq('chat_id', chatId.toString()).single()

        // WIZARD MODE (for button flows)
        if (session) {
            console.log("🔄 WIZARD:", session.state, "DATA:", JSON.stringify(session.data))
            return await handleWizard(chatId, text, session, profile, supabase, BOT_TOKEN)
        }

        // AI INTERPRETATION
        console.log("🧠 Using AI to interpret:", text)
        const interpretation = await interpretWithAI(text, GEMINI_API_KEY)
        console.log("🎯 AI Result:", JSON.stringify(interpretation))

        if (!interpretation || !interpretation.amount) {
            // AI couldn't understand, offer options
            await reply(chatId, `🤔 Não entendi bem. O que é <b>"${text}"</b>?`, BOT_TOKEN, {
                inline_keyboard: [
                    [{ text: "📝 Tarefa", callback_data: `create_task|${text}` }],
                    [{ text: "📅 Evento", callback_data: `create_event|${text}` }],
                    [{ text: "💰 Gasto", callback_data: `wizard_set_desc|${text}` }]
                ]
            })
            return new Response("ok")
        }

        // Process with AI interpretation
        return await processTransaction(chatId, profile, interpretation, supabase, BOT_TOKEN)

    } catch (e) {
        console.error("❌ ERROR:", e)
    }
    return new Response("ok")
})

/**
 * AI Interpretation using Google Gemini
 */
async function interpretWithAI(text: string, apiKey: string | undefined) {
    console.log("🔍 AI Function called")
    console.log("🔑 Has API Key:", !!apiKey)

    if (!apiKey) {
        console.warn("⚠️ No GEMINI_API_KEY")
        return null
    }

    const today = new Date().toISOString().split('T')[0]

    const systemPrompt = `Você é um assistente financeiro. Interprete a mensagem e retorne JSON.

IMPORTANTE: Responda APENAS com JSON válido, sem explicações.

Formato obrigatório:
{
  "description": "string",
  "amount": number,
  "type": "expense" | "income" | "card",
  "category": "Alimentação" | "Mercado" | "Transporte" | "Moradia" | "Assinaturas" | "Receitas" | "Geral",
  "status": "paid" | "pending",
  "date": "YYYY-MM-DD"
}

Regras:
- Data de hoje: ${today}
- "ontem" = subtrair 1 dia
- "cartão" ou "crédito" → type = "card"
- "recebi" → type = "income"
- Caso contrário → type = "expense"
- Se não mencionar status → "paid"

Mensagem: "${text}"`

    try {
        console.log("📡 Calling Gemini API...")

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

        const requestBody = {
            contents: [{
                parts: [{ text: systemPrompt }]
            }],
            generationConfig: {
                temperature: 0.1,
                responseMimeType: "application/json"
            }
        }

        console.log("📤 Request body:", JSON.stringify(requestBody).substring(0, 200))

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        })

        console.log("📊 Response status:", response.status)

        const responseText = await response.text()
        console.log("📥 Response text (first 500 chars):", responseText.substring(0, 500))

        if (!response.ok) {
            console.error("❌ Gemini API error:", responseText)
            return null
        }

        const data = JSON.parse(responseText)
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text

        console.log("📝 AI extracted text:", aiText)

        if (!aiText) {
            console.error("❌ No text in response. Full data:", JSON.stringify(data))
            return null
        }

        const parsed = JSON.parse(aiText)
        console.log("✅ Parsed result:", JSON.stringify(parsed))

        return parsed
    } catch (e: any) {
        console.error("❌ AI error:", e.message)
        console.error("❌ Stack:", e.stack)
        return null
    }
}

// WIZARD MODE
async function handleWizard(chatId: any, text: string, session: any, profile: any, supabase: any, token: string) {
    const state = session.state
    let data = { ...(session.data || {}) }

    console.log(`🧙 STATE=${state}, DATA:`, JSON.stringify(data), `INPUT="${text}"`)

    if (state === 'awaiting_description') {
        data.description = text
        console.log("📝 Description added, full data:", JSON.stringify(data))

        const { data: mapping } = await supabase.from('user_mappings')
            .select('*')
            .eq('user_id', profile.id)
            .ilike('keyword', text)
            .single()

        if (mapping?.category && mapping?.type) {
            console.log("🎯 Mapping found:", mapping)
            data.category = mapping.category
            data.type = mapping.type
            return await processTransaction(chatId, profile, data, supabase, token)
        }

        await updateSession(chatId, profile.id, 'awaiting_type', data, supabase)
        await reply(chatId, `<b>${text}</b> - Despesa ou Receita?`, token, {
            inline_keyboard: [
                [{ text: "🔴 Despesa", callback_data: "wiz_type|expense" }],
                [{ text: "🟢 Receita", callback_data: "wiz_type|income" }],
                [{ text: "💳 Cartão", callback_data: "wiz_type|card" }]
            ]
        })
        return new Response("ok")
    }

    else if (state === 'awaiting_amount') {
        const amtMatch = text.match(/(\d+([.,]\d{1,2})?)/)
        if (!amtMatch) {
            await reply(chatId, `❌ Número, por favor. Ex: <code>50</code>`, token)
            return new Response("ok")
        }
        data.amount = parseFloat(amtMatch[0].replace(',', '.'))
        console.log("💰 Amount added, full data:", JSON.stringify(data))
        return await processTransaction(chatId, profile, data, supabase, token)
    }

    return new Response("ok")
}

// CALLBACK HANDLER
async function handleCallback(cb: any, supabase: any, token: string) {
    const chatId = cb.message.chat.id
    const [action, ...params] = cb.data.split('|')

    console.log("🔘 CALLBACK:", action, "PARAMS:", params)

    const { data: p } = await supabase.from('profiles').select('*').eq('telegram_chat_id', chatId.toString()).single()
    if (!p) return new Response("ok")

    if (action === 'wizard_set_desc') {
        const desc = params.join('|')
        await startSession(chatId, p.id, 'awaiting_amount', { description: desc }, supabase)
        await reply(chatId, `💰 Valor de <b>${desc}</b>?`, token)
    }

    else if (action === 'wiz_type') {
        const type = params[0]
        const { data: session } = await supabase.from('bot_sessions').select('*').eq('chat_id', chatId.toString()).single()
        if (session) {
            let data = { ...(session.data || {}) }
            data.type = type
            console.log("✅ Type:", type, "Full data:", JSON.stringify(data))
            return await processTransaction(chatId, p, data, supabase, token)
        }
    }

    else if (action === 'create_task') {
        const title = params.join('|')
        await supabase.from('tasks').insert({ user_id: p.id, title, completed: false })
        await reply(chatId, `✅ Tarefa <b>"${title}"</b> criada!`, token)
        await clearSession(chatId, supabase)
    }

    else if (action === 'create_event') {
        const title = params.join('|')
        const dateStr = new Date().toISOString().split('T')[0]
        await supabase.from('calendar_events').insert({
            user_id: p.id, title, start_time: `${dateStr}T09:00:00`, end_time: `${dateStr}T10:00:00`, all_day: false, type: 'personal'
        })
        await reply(chatId, `📅 Evento <b>"${title}"</b> agendado!`, token)
        await clearSession(chatId, supabase)
    }

    else if (action === 'item_sel') {
        console.log("🎯 ITEM SELECTED, params:", params)
        const itemType = params[0]
        const itemName = params.slice(1).join('|').trim() // sanitize

        // RECUPERA OU CRIA SESSÃO
        let { data: session } = await supabase.from('bot_sessions').select('*').eq('chat_id', chatId.toString()).single()
        if (!session) {
            console.log("⚠️ Nenhuma sessão existente, criando temporária...")
            await startSession(chatId, p.id, 'awaiting_item', {}, supabase)
            const { data: newSession } = await supabase.from('bot_sessions').select('*').eq('chat_id', chatId.toString()).single()
            session = newSession
        }

        const sessionData = session.data || {}
        console.log("📦 Session data for finalization:", JSON.stringify(sessionData))

        return await finalizeTransaction(chatId, p, sessionData, itemType, itemName, supabase, token)
    }

    return new Response("ok")
}

// PROCESS TRANSACTION
async function processTransaction(chatId: any, profile: any, data: any, supabase: any, token: string) {
    console.log("⚙️ PROCESS:", JSON.stringify(data))

    const type = data.type || 'expense'
    const amount = data.amount
    const description = data.description
    const category = data.category || 'Geral'
    const status = data.status || 'paid'
    const date = data.date || new Date().toISOString()

    const cards = profile.user_cards || []
    const accs = profile.user_accounts || []

    console.log(`💳 ${cards.length} cards, 🏦 ${accs.length} accounts, type=${type}`)

    // MULTI-CARTÕES
    if (type === 'card' && cards.length > 1) {
        await startSession(chatId, profile.id, 'awaiting_item', { ...data, category, status, date }, supabase)
        const btns = cards.map((c: any) => [{ text: c.name, callback_data: `item_sel|card|${c.name.trim()}` }])
        await reply(chatId, `💳 Qual cartão?`, token, { inline_keyboard: btns })
        return new Response("ok")
    }

    // MULTI-ACCOUNTS
    if (['income', 'expense'].includes(type) && accs.length > 1) {
        console.log("🏦 Asking for account selection...")
        await startSession(chatId, profile.id, 'awaiting_item', { ...data, category, status, date }, supabase)
        const btns = accs.map((a: any) => [{ text: a.name, callback_data: `item_sel|acc|${a.name.trim()}` }])
        await reply(chatId, `🏦 Qual conta?`, token, { inline_keyboard: btns })
        return new Response("ok")
    }

    // SINGLE OR DEFAULT
    console.log("✅ Single item, finalizing...")
    const itemType = type === 'card' ? 'card' : 'acc'
    const itemName = type === 'card' ? (cards[0]?.name || 'Crédito') : (accs[0]?.name || 'Padrão')
    return await finalizeTransaction(chatId, profile, { ...data, category, status, date }, itemType, itemName, supabase, token)
}

// FINALIZE TRANSACTION
async function finalizeTransaction(chatId: any, profile: any, data: any, itemType: string, itemName: string, supabase: any, token: string) {
    console.log("💾 FINALIZE:", JSON.stringify(data), `item=${itemType}:${itemName}`)

    const { amount, description, category, type: rawType, status, date } = data
    const type = rawType || (itemType === 'card' ? 'card' : 'expense')
    const finalTitle = itemType === 'card' ? `${description} (${itemName})` : `${description} [${itemName}]`

    // Update balances only if paid
    if (status === 'paid') {
        if (itemType === 'card') {
            const updated = (profile.user_cards || []).map((c: any) =>
                c.name === itemName ? { ...c, value: (parseFloat(c.value) - amount).toString() } : c
            )
            await supabase.from('profiles').update({ user_cards: updated }).eq('id', profile.id)
        } else {
            const updated = (profile.user_accounts || []).map((a: any) =>
                a.name === itemName ? { ...a, value: (parseFloat(a.value) + (type === 'income' ? amount : -amount)).toString() } : a
            )
            await supabase.from('profiles').update({ user_accounts: updated }).eq('id', profile.id)
        }
    }

    // Save transaction
    const { error: txError } = await supabase.from('transactions').insert({
        user_id: profile.id,
        title: finalTitle,
        amount,
        type: type === 'card' ? 'expense' : type,
        category,
        date: date || new Date().toISOString(),
        status
    })

    if (txError) {
        console.error("❌ Transaction insert error:", txError)
        await reply(chatId, `❌ Erro ao salvar: ${txError.message}`, token)
        return new Response("ok")
    }

    // Learn mapping
    await supabase.from('user_mappings').upsert({
        user_id: profile.id,
        keyword: description.toLowerCase(),
        category,
        type
    }, { onConflict: 'user_id,keyword' })

    console.log("✅ Transaction saved successfully!")
    const statusEmoji = status === 'paid' ? '✅' : '⏳'
    await reply(chatId, `${statusEmoji} <b>Salvo!</b>\n\n📝 ${finalTitle}\n💰 R$ ${amount.toFixed(2)}\n📂 ${category}\n📅 ${new Date(date).toLocaleDateString('pt-BR')}`, token)
    await clearSession(chatId, supabase)
    return new Response("ok")
}

// SESSION HELPERS
async function startSession(chatId: any, userId: string, state: string, data: any, supabase: any) {
    console.log("🆕 START:", state, "DATA:", JSON.stringify(data))
    await supabase.from('bot_sessions').upsert({
        chat_id: String(chatId),
        user_id: userId,
        state,
        data,
        updated_at: new Date().toISOString()
    }, { onConflict: 'chat_id' })
}

async function updateSession(chatId: any, userId: string, state: string, data: any, supabase: any) {
    console.log("🔄 UPDATE:", state, "DATA:", JSON.stringify(data))
    await supabase.from('bot_sessions').upsert({
        chat_id: String(chatId),
        user_id: userId,
        state,
        data,
        updated_at: new Date().toISOString()
    }, { onConflict: 'chat_id' })
}

async function clearSession(chatId: any, supabase: any) {
    await supabase.from('bot_sessions').delete().eq('chat_id', String(chatId))
}

// REPLY HELPER
async function reply(chatId: any, text: string, token: string, options?: any) {
    const payload = { chat_id: chatId, text, parse_mode: 'HTML', ...options }
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
}
