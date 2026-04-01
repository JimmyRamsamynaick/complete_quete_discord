const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocket } = require('ws');

const DISCORD_DEBUG_PORT = 9222;
const SCRIPT_PATH = path.join(__dirname, 'discord_quest_completer.js');

async function getDebuggerUrl() {
    return new Promise((resolve, reject) => {
        http.get(`http://localhost:${DISCORD_DEBUG_PORT}/json`, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const targets = JSON.parse(data);
                    // On cherche la fenêtre principale (pas les workers ou les popups)
                    const mainTarget = targets.find(t => t.type === 'page' && t.title.includes('Discord'));
                    if (mainTarget && mainTarget.webSocketDebuggerUrl) {
                        resolve(mainTarget.webSocketDebuggerUrl);
                    } else {
                        reject(new Error("Impossible de trouver la fenêtre principale de Discord."));
                    }
                } catch (e) {
                    reject(new Error("Format JSON invalide reçu de Discord."));
                }
            });
        }).on('error', (err) => {
            reject(new Error(`Discord n'est pas lancé avec le port de debug (${DISCORD_DEBUG_PORT}).`));
        });
    });
}

async function injectScript(url) {
    const ws = new WebSocket(url);

    ws.on('open', () => {
        console.log("Connecté à Discord via le port de debug !");
        
        const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8');
        const payload = {
            id: 1,
            method: 'Runtime.evaluate',
            params: {
                expression: `${scriptContent}\nrunQuestCompleter();`,
                userGesture: true,
                awaitPromise: true
            }
        };

        ws.send(JSON.stringify(payload));
    });

    ws.on('message', (data) => {
        const response = JSON.parse(data);
        if (response.id === 1) {
            if (response.error) {
                console.error("Erreur lors de l'injection :", response.error);
            } else {
                console.log("Script injecté avec succès !");
                console.log("Consultez la fenêtre Discord pour voir les logs de progression.");
            }
            ws.close();
        }
    });

    ws.on('error', (err) => {
        console.error("Erreur WebSocket :", err.message);
    });
}

(async () => {
    try {
        console.log("Recherche de Discord...");
        const url = await getDebuggerUrl();
        console.log(`Debug URL trouvée : ${url}`);
        await injectScript(url);
    } catch (err) {
        console.error("\n[!] Erreur :", err.message);
        console.log("\n--- Procédure pour corriger ---");
        console.log("1. Fermez complètement Discord.");
        console.log("2. Relancez Discord avec le flag de debug via votre terminal :");
        console.log(`   & "$env:LOCALAPPDATA\\Discord\\Update.exe" --processStart Discord.exe --a="--remote-debugging-port=${DISCORD_DEBUG_PORT}"`);
        console.log("3. Attendez que Discord soit ouvert, puis relancez ce launcher.");
    }
})();
