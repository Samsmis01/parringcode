const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const app = express();
app.use(express.json());

// Stockage des sessions actives
const activeSessions = new Map();

app.post('/api/generate-pairing', async (req, res) => {
    const { phone } = req.body;
    const deviceName = "Ubuntu Server";
    const pairingCode = generateCode();

    const client = new Client({
        authStrategy: new LocalAuth({ clientId: pairingCode }),
        puppeteer: { 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        },
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
        }
    });

    client.on('authenticated', (session) => {
        // Envoi de la confirmation avec la clé
        client.sendMessage(
            `${phone}@c.us`,
            `✅ Appareil connecté : ${deviceName}\n\n` +
            `Clé de session :\n${JSON.stringify(session, null, 2)}\n\n` +
            `Conservez cette clé pour une reconnexion rapide.`
        );
        
        // Stockage temporaire (à remplacer par une DB en production)
        activeSessions.set(pairingCode, { 
            status: 'connected',
            lastActive: new Date().toLocaleString('fr-FR'),
            deviceName
        });
    });

    await client.initialize();
    
    res.json({
        pairingCode,
        deviceName,
        expiresIn: 300 // 5 minutes
    });
});

function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({length: 5}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

app.get('/api/session-status/:code', (req, res) => {
    const session = activeSessions.get(req.params.code);
    res.json(session || { status: 'invalid' });
});

app.listen(3000, () => console.log('Serveur prêt sur le port 3000'))
