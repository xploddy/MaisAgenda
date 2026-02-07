import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

Deno.serve(async (req) => {
    const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")?.trim()
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
    const SUPABASE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ROLE!)

    if (!BOT_TOKEN) return new Response("Missing Token", { status: 500 })

    try {
        const body = await req.json()
        if (!body.message?.text) return new Response("ok")

        const chatId = body.message.chat.id
        const textRaw = body.message.text.trim()

        // HELP
        if (["/start", "ajuda", "help", "oi"].some(w => textRaw.toLowerCase().includes(w))) {
            await reply(chatId,
                `🤖 <b>SmartOrganizer</b>\n\n` +
                `Exemplos:\n` +
                `• mercado 20 conta bb\n` +
                `• gasolina 50 cartão itau\n` +
                `• recebi 1000 nubank\n` +
                `• farmácia 30 bradesco pendente`,
                BOT_TOKEN
            )
            return new Response("ok")
        }

        // PROFILE
        const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("telegram_chat_id", chatId.toString())
            .single()

        if (!profile) {
            await reply(chatId, `⚠️ Vincule o chat no app.`, BOT_TOKEN)
            return new Response("ok")
        }

        const accounts = profile.user_accounts || []
        const cards = profile.user_cards || []

        console.log("🏦 CONTAS:", accounts)
        console.log("💳 CARTÕES:", cards)

        const parsed = parseMessage(textRaw, accounts, cards)

        if (parsed.error) {
            await reply(chatId, `❌ ${parsed.error}`, BOT_TOKEN)
            return new Response("ok")
        }

        await finalizeTransaction(chatId, profile, parsed, supabase, BOT_TOKEN)

    } catch (e) {
        console.error("❌ ERROR:", e)
    }

    return new Response("ok")
})

/* =========================
   PARSER V7
========================= */

function normalizeName(n: string) {
    return n.toLowerCase().replace("cartão", "").trim()
}

function findBestMatch(text: string, items: any[]) {
    const t = text.toLowerCase()
    let best: string | null = null
    let score = 0
    for (const item of items) {
        const name = normalizeName(item.name)
        if (new RegExp(`\\b${name}\\b`).test(t)) return item.name
        if (t.includes(name) && name.length > score) {
            best = item.name
            score = name.length
        }
    }
    return best
}

function extractAmount(text: string) {
    const m = text.match(/(\d+([.,]\d{1,2})?)/)
    if (!m) return null
    return Number(m[0].replace(",", "."))
}

function detectCategory(desc: string) {
    const c = desc.toLowerCase()
    if (c.match(/mercado|supermercado|padaria|pão|comida|pizza|restaurante|lanche|bebida|cafe|café/)) return "Alimentação"
    if (c.match(/gasolina|uber|99pop|ônibus|metro|transporte|combustível|táxi/)) return "Transporte"
    if (c.match(/aluguel|condominio|iptu|luz|água|gás|energia|internet|telefone|celular|net/)) return "Moradia"
    if (c.match(/netflix|spotify|prime video|hbo max|assinatura|club|app/)) return "Assinaturas"
    if (c.match(/farmacia|remédio|drogaria|saúde|medicamento|consulta|hospital|dentista|clínica/)) return "Saúde"
    if (c.match(/curso|educação|livro|escola|faculdade|material escolar|aula/)) return "Educação"
    if (c.match(/cinema|lazer|teatro|show|evento|viagem|hotel|ingresso|bar|restaurante/)) return "Lazer"
    if (c.match(/roupa|calçado|sapato|vestuário|presente|brinquedo|eletrônico|celular|notebook/)) return "Compras"
    if (c.match(/imposto|taxa|cartão|boleto|mensalidade|financeiro/)) return "Contas"
    if (c.match(/salário|recebi|ganhei|freela|bônus|comissão|renda/)) return "Receitas"
    return "Geral"
}

function parseMessage(textRaw: string, accounts: any[], cards: any[]) {
    const text = textRaw.toLowerCase()
    const amount = extractAmount(text)
    if (!amount) return { error: "Não foi possível identificar o valor." }

    const isPending = text.includes("pendente")
    let type: "income" | "expense" | "transfer" = "expense"
    if (text.match(/\b(recebi|ganhei|vendi)\b/)) type = "income"
    if (text.match(/\btransferi|transferência|transferencia\b/)) type = "transfer"

    let card = findBestMatch(text, cards)
    let account = card ? undefined : findBestMatch(text, accounts)

    let description = textRaw
        .replace(/(\d+([.,]\d{1,2})?)/, "")
        .replace(/\b(cartão|credito|debito|pix|conta|pendente|pago)\b/gi, "")
        .replace(/\b(recebi|ganhei|vendi|comprei|paguei|transferi)\b/gi, "")
        .trim()

    if (!description) description = "Sem descrição"

    let category = detectCategory(description)

    // Monta título compatível com frontend
    let title = description
    if (card) {
        type = "expense"
        title = `${description} (${card})`
        category = "Cartão de Crédito"
    } else if (account) {
        title = `${description} [${account}]`
    } else if (type === "transfer") {
        title = `${description}: ${account || "Origem"} -> ${card || "Destino"}`
    }

    return {
        description,
        amount,
        type,
        category,
        title,
        status: isPending ? "pending" : "paid",
        account,
        card,
        date: new Date().toISOString()
    }
}

/* =========================
   FINALIZE TRANSACTION
========================= */

async function finalizeTransaction(chatId: any, profile: any, d: any, supabase: any, token: string) {
    // 1. Inserir transação
    await supabase.from("transactions").insert({
        user_id: profile.id,
        title: d.title,
        amount: d.amount,
        type: d.type,
        category: d.category,
        date: d.date,
        status: d.status
    })

    // 2. Atualizar Saldos se estiver pago
    if (d.status === "paid") {
        let accounts = [...(profile.user_accounts || [])]
        let cards = [...(profile.user_cards || [])]
        let updated = false

        if (d.card) {
            cards = cards.map(c => {
                if (c.name === d.card) {
                    updated = true
                    return { ...c, value: (Number(c.value || 0) - d.amount).toString() }
                }
                return c
            })
        } else if (d.account) {
            accounts = accounts.map(a => {
                if (a.name === d.account) {
                    updated = true
                    const current = Number(a.value || 0)
                    const newValue = d.type === "income" ? current + d.amount : current - d.amount
                    return { ...a, value: newValue.toString() }
                }
                return a
            })
        }

        if (updated) {
            await supabase.from("profiles").update({
                user_accounts: accounts,
                user_cards: cards
            }).eq("id", profile.id)
        }
    }

    const emoji = d.status === "paid" ? "✅" : "⏳"
    await reply(chatId,
        `${emoji} <b>Lançamento salvo!</b>\n\n` +
        `📝 ${d.title}\n` +
        `💰 R$ ${d.amount.toFixed(2)}\n` +
        `📂 ${d.category}\n` +
        `📌 ${d.type === "income" ? "Receita" : "Despesa"}\n` +
        `📅 ${new Date(d.date).toLocaleDateString("pt-BR")}`,
        token
    )
}

/* =========================
   REPLY
========================= */

async function reply(chatId: any, text: string, token: string) {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" })
    })
}
