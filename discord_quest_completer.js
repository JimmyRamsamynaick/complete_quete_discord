/**
 * Discord Quest Completer Script
 * 
 * Ce script permet d'automatiser la progression des quêtes Discord.
 * Fonctionne sur le client Desktop (recommandé) et Navigateur (vidéos uniquement).
 * 
 * Auteur: Jimmy
 */

class DiscordQuestCompleter {
    constructor(options = {}) {
        this.safeMode = options.safeMode || false;
        this.modules = {};
        this.activeQuest = null;
        this.intervals = [];
        this.originalMethods = new Map();
        this.isDesktop = typeof DiscordNative !== 'undefined';
        this.supportedTasks = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = `[QuestCompleter ${timestamp}]`;
        switch (type) {
            case 'success': console.log(`%c${prefix} ✅ ${message}`, 'color: #43b581; font-weight: bold;'); break;
            case 'error': console.error(`${prefix} ❌ ${message}`); break;
            case 'warn': console.warn(`${prefix} ⚠️ ${message}`); break;
            default: console.log(`${prefix} ℹ️ ${message}`); break;
        }
    }

    /**
     * Récupère dynamiquement les modules Webpack de Discord.
     */
    getModules() {
        try {
            const wpRequire = window.webpackChunkdiscord_app.push([[Symbol()], {}, (r) => r]);
            window.webpackChunkdiscord_app.pop();

            const modules = Object.values(wpRequire.c);

            this.modules.QuestsStore = modules.find(x => x?.exports?.A?.__proto__?.getQuest)?.exports?.A;
            this.modules.RunningGameStore = modules.find(x => x?.exports?.Ay?.getRunningGames)?.exports?.Ay;
            this.modules.ApplicationStreamingStore = modules.find(x => x?.exports?.A?.__proto__?.getStreamerActiveStreamMetadata)?.exports?.A;
            this.modules.FluxDispatcher = modules.find(x => x?.exports?.h?.__proto__?.flushWaitQueue)?.exports?.h;
            this.modules.API = modules.find(x => x?.exports?.Bo?.get)?.exports?.Bo;

            // Vérification de la présence des modules critiques
            const missing = Object.entries(this.modules)
                .filter(([_, mod]) => !mod)
                .map(([name]) => name);

            if (missing.length > 0) {
                throw new Error(`Modules manquants : ${missing.join(', ')}`);
            }

            this.log("Tous les modules Discord ont été récupérés avec succès.", "success");
            return true;
        } catch (error) {
            this.log(`Erreur lors de la récupération des modules: ${error.message}`, "error");
            return false;
        }
    }

    /**
     * Filtre et récupère les quêtes actives éligibles.
     */
    getActiveQuests() {
        if (!this.modules.QuestsStore) return [];

        const allQuests = Array.from(this.modules.QuestsStore.quests.values());
        const now = Date.now();

        return allQuests.filter(quest => {
            const status = quest.userStatus;
            const config = quest.config;
            const taskConfig = config.taskConfig ?? config.taskConfigV2;
            
            const isEnrolled = !!status?.enrolledAt;
            const isCompleted = !!status?.completedAt;
            const isExpired = new Date(config.expiresAt).getTime() < now;
            const hasSupportedTask = Object.keys(taskConfig.tasks).some(task => this.supportedTasks.includes(task));

            return isEnrolled && !isCompleted && !isExpired && hasSupportedTask;
        });
    }

    /**
     * Point d'entrée principal du script.
     */
    async runQuestCompleter() {
        this.log("Démarrage du Quest Completer...");

        if (!this.getModules()) return;

        const activeQuests = this.getActiveQuests();
        if (activeQuests.length === 0) {
            this.log("Aucune quête active ou éligible trouvée.", "warn");
            return;
        }

        this.log(`${activeQuests.length} quête(s) trouvée(s). Lancement en simultané.`);

        // On utilise Promise.allSettled pour lancer toutes les quêtes en parallèle
        // sans qu'une erreur sur l'une n'arrête les autres.
        await Promise.allSettled(activeQuests.map(quest => this.completeQuest(quest)));

        this.log("Toutes les quêtes ont été traitées.", "success");
    }

    /**
     * Traite une quête spécifique selon son type.
     */
    async completeQuest(quest) {
        const questName = quest.config.messages.questName;
        const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
        const taskName = this.supportedTasks.find(t => taskConfig.tasks[t]);
        
        if (!taskName) {
            this.log(`Type de tâche non supporté pour ${questName}`, "warn");
            return;
        }

        this.log(`Traitement de la quête: ${questName} (Type: ${taskName})`);

        if (this.safeMode) {
            this.log(`Mode SAFE activé: Simulation ignorée pour ${questName}`, "warn");
            return;
        }

        switch (taskName) {
            case "WATCH_VIDEO":
            case "WATCH_VIDEO_ON_MOBILE":
                await this.handleVideoQuest(quest, taskName);
                break;
            case "PLAY_ON_DESKTOP":
                if (!this.isDesktop) {
                    this.log(`La quête "${questName}" nécessite le client Desktop.`, "error");
                    return;
                }
                await this.handleGameQuest(quest, taskName);
                break;
            case "PLAY_ACTIVITY":
                await this.handleActivityQuest(quest, taskName);
                break;
            case "STREAM_ON_DESKTOP":
                if (!this.isDesktop) {
                    this.log(`La quête "${questName}" nécessite le client Desktop pour le stream.`, "error");
                    return;
                }
                await this.handleStreamQuest(quest, taskName);
                break;
            default:
                this.log(`Logique non implémentée pour ${taskName}`, "warn");
        }
    }

    patchMethod(obj, name, replacement) {
        if (!this.originalMethods.has(obj)) {
            this.originalMethods.set(obj, {});
        }
        const methods = this.originalMethods.get(obj);
        if (!methods[name]) {
            methods[name] = obj[name];
        }
        obj[name] = replacement;
    }

    /**
     * Gère les quêtes de type vidéo.
     */
    async handleVideoQuest(quest, taskName) {
        const questName = quest.config.messages.questName;
        const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
        const secondsNeeded = taskConfig.tasks[taskName].target;
        let secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0;
        const enrolledAt = new Date(quest.userStatus.enrolledAt).getTime();

        this.log(`Progression vidéo pour ${questName}: ${secondsDone}/${secondsNeeded}s`);

        const speed = 7; // secondes par intervalle
        const interval = 1; // intervalle en secondes

        return new Promise(async (resolve) => {
            const updateProgress = async () => {
                const maxAllowed = Math.floor((Date.now() - enrolledAt) / 1000) + 10;
                const timestamp = secondsDone + speed;

                if (maxAllowed >= timestamp) {
                    try {
                        const res = await this.modules.API.post({
                            url: `/quests/${quest.id}/video-progress`,
                            body: { timestamp: Math.min(secondsNeeded, timestamp + Math.random()) }
                        });

                        secondsDone = Math.min(secondsNeeded, timestamp);
                        this.log(`Progression: ${Math.floor(secondsDone)}/${secondsNeeded}s`);

                        if (res.body.completed_at || secondsDone >= secondsNeeded) {
                            this.log(`Quête vidéo terminée: ${questName}`, "success");
                            resolve();
                            return true;
                        }
                    } catch (e) {
                        this.log(`Erreur progression vidéo: ${e.message}`, "error");
                    }
                }
                return false;
            };

            const intervalId = setInterval(async () => {
                if (await updateProgress()) {
                    clearInterval(intervalId);
                }
            }, interval * 1000);
            this.intervals.push(intervalId);
        });
    }

    /**
     * Gère les quêtes de type jeu.
     */
    async handleGameQuest(quest, taskName) {
        const applicationId = quest.config.application.id;
        const applicationName = quest.config.application.name;
        const questName = quest.config.messages.questName;
        const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
        const secondsNeeded = taskConfig.tasks[taskName].target;
        const pid = Math.floor(Math.random() * 30000) + 1000;

        this.log(`Simulation du jeu "${applicationName}" pour la quête "${questName}"`);

        // Récupération des infos de l'application via l'API interne
        let appData;
        try {
            const res = await this.modules.API.get({ url: `/applications/public?application_ids=${applicationId}` });
            appData = res.body[0];
        } catch (e) {
            this.log(`Impossible de récupérer les infos de l'app: ${e.message}`, "error");
            appData = { name: applicationName };
        }

        const exeName = appData.executables?.find(x => x.os === "win32")?.name?.replace(">", "") ?? 
                        appData.name.replace(/[\/\\:*?"<>|]/g, "");

        const fakeGame = {
            cmdLine: `C:\\Program Files\\${appData.name}\\${exeName}`,
            exeName,
            exePath: `c:/program files/${appData.name.toLowerCase()}/${exeName}`,
            hidden: false,
            isLauncher: false,
            id: applicationId,
            name: appData.name,
            pid: pid,
            pidPath: [pid],
            processName: appData.name,
            start: Date.now(),
        };

        const realGames = this.modules.RunningGameStore.getRunningGames();
        const fakeGames = [fakeGame, ...realGames];

        this.patchMethod(this.modules.RunningGameStore, 'getRunningGames', () => fakeGames);
        this.patchMethod(this.modules.RunningGameStore, 'getGameForPID', (p) => fakeGames.find(x => x.pid === p));

        this.modules.FluxDispatcher.dispatch({
            type: "RUNNING_GAMES_CHANGE",
            removed: [],
            added: [fakeGame],
            games: fakeGames
        });

        return new Promise((resolve) => {
            const intervalId = setInterval(() => {
                const updatedQuest = this.modules.QuestsStore.getQuest(quest.id);
                const progress = updatedQuest.config.configVersion === 1 ? 
                                 updatedQuest.userStatus.streamProgressSeconds : 
                                 Math.floor(updatedQuest.userStatus.progress[taskName]?.value || 0);

                this.log(`Progression jeu: ${progress}/${secondsNeeded}s`);

                if (progress >= secondsNeeded) {
                    this.log(`Quête de jeu terminée: ${questName}`, "success");
                    this.cleanup(); // Restaure les méthodes
                    clearInterval(intervalId);
                    resolve();
                }
            }, 10000);
            this.intervals.push(intervalId);
        });
    }

    /**
     * Gère les quêtes de type stream.
     */
    async handleStreamQuest(quest, taskName) {
        const questName = quest.config.messages.questName;
        const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
        const secondsNeeded = taskConfig.tasks[taskName].target;

        this.log(`Simulation de stream pour la quête "${questName}"`);

        // On réutilise la logique de spoofing de jeu car un stream nécessite un jeu actif
        await this.handleGameQuest(quest, "PLAY_ON_DESKTOP");

        this.patchMethod(this.modules.ApplicationStreamingStore, 'getStreamerActiveStreamMetadata', () => ({
            id: quest.config.application.id,
            pid: 1234, // PID fictif
            sourceName: null
        }));

        this.modules.FluxDispatcher.dispatch({
            type: "STREAM_START",
            streamType: "voice",
            guildId: null,
            channelId: null,
            appContext: "desktop"
        });

        this.log("Stream simulé lancé.");
    }

    /**
     * Gère les quêtes de type activité (heartbeat).
     */
    async handleActivityQuest(quest, taskName) {
        const questName = quest.config.messages.questName;
        const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
        const secondsNeeded = taskConfig.tasks[taskName].target;

        this.log(`Simulation d'activité pour la quête "${questName}" via heartbeats.`);

        return new Promise((resolve) => {
            const intervalId = setInterval(async () => {
                try {
                    const res = await this.modules.API.post({
                        url: `/quests/${quest.id}/heartbeat`,
                    });

                    const updatedQuest = this.modules.QuestsStore.getQuest(quest.id);
                    const progress = Math.floor(updatedQuest.userStatus.progress[taskName]?.value || 0);

                    this.log(`Progression activité: ${progress}/${secondsNeeded}s`);

                    if (res.body.completed_at || progress >= secondsNeeded) {
                        this.log(`Quête d'activité terminée: ${questName}`, "success");
                        clearInterval(intervalId);
                        resolve();
                    }
                } catch (e) {
                    this.log(`Erreur heartbeat activité: ${e.message}`, "error");
                }
            }, 30000); // Heartbeat toutes les 30s
            this.intervals.push(intervalId);
        });
    }

    cleanup() {
        this.log("Nettoyage en cours...");
        this.intervals.forEach(clearInterval);
        this.intervals = [];

        // Restauration des méthodes originales
        for (const [obj, methods] of this.originalMethods) {
            for (const [name, original] of Object.entries(methods)) {
                obj[name] = original;
            }
        }
        this.originalMethods.clear();
        this.log("Nettoyage terminé.", "success");
    }
}

/**
 * Fonction globale pour lancer le script facilement
 */
function runQuestCompleter(options = {}) {
    const completer = new DiscordQuestCompleter(options);
    completer.runQuestCompleter().catch(err => {
        console.error("[QuestCompleter] Erreur fatale:", err);
    });
    return completer; // Permet d'appeler .cleanup() manuellement si besoin
}

console.log("%c[QuestCompleter] Script chargé. Tapez `runQuestCompleter()` pour démarrer.", "color: #5865F2; font-size: 14px; font-weight: bold;");

/**
 * --- Bonus: Structure pour Vencord Plugin (optionnel) ---
 * 
 * export default {
 *     name: "QuestCompleter",
 *     description: "Complète les quêtes Discord automatiquement.",
 *     authors: [{ name: "Jimmy", id: "000000000000000000" }],
 *     onStart() {
 *         this.completer = new DiscordQuestCompleter();
 *         this.completer.runQuestCompleter();
 *     },
 *     onStop() {
 *         if (this.completer) this.completer.cleanup();
 *     }
 * };
 */
