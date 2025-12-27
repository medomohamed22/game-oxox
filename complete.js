const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    console.log("=== COMPLETE FUNCTION CALLED ===");
    
    if (event.httpMethod !== 'POST') return { statusCode: 405 };
    
    let payload;
    try {
        payload = JSON.parse(event.body || '{}');
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ status: 'error', message: 'Invalid JSON' }) };
    }
    
    const { paymentId, txid, campaign_id, amount, username } = payload;
    
    if (!paymentId || !txid) return { statusCode: 400, body: JSON.stringify({ status: 'error', message: 'Missing data' }) };
    
    const apiKey = process.env.PI_API_KEY;
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!apiKey || !databaseUrl) return { statusCode: 500, body: JSON.stringify({ status: 'error', message: 'Config error' }) };
    
    try {
        const piResponse = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
            method: 'POST',
            headers: { 'Authorization': `Key ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ txid })
        });
        
        if (!piResponse.ok) {
            const errText = await piResponse.text();
            return { statusCode: 500, body: JSON.stringify({ status: 'error', message: errText }) };
        }
        
        console.log("Pi COMPLETION SUCCESS");
        
        const supabase = createClient(databaseUrl, '');
        
        const { data, error } = await supabase
            .from('donations')
            .insert({
                payment_id: paymentId,
                txid: txid,
                campaign_id: campaign_id,
                amount: amount || null,
                username: username || null,
                timestamp: new Date().toISOString(),
                status: 'completed'
            });
        
        if (error) throw error;
        
        console.log("Donation saved:", data);
        
        return { statusCode: 200, body: JSON.stringify({ status: 'success' }) };
    } catch (err) {
        console.error("Error:", err);
        return { statusCode: 500, body: JSON.stringify({ status: 'error', message: err.message }) };
    }
};
