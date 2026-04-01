# 🚀 Discord Quest Completer (Arrière-plan & Automatisé)

[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)]()
[![Platform](https://img.shields.io/badge/platform-Discord_Desktop-5865F2.svg)]()

Un outil puissant et automatisé pour compléter vos quêtes Discord en arrière-plan sans interrompre votre navigation.

---

## ✨ Fonctionnalités

- **⚡ Multi-tâches Simultanées** : Complète toutes les quêtes détectées (vidéos, jeux, streams) en même temps.
- **🛡️ Injection Terminal** : Plus besoin de `Ctrl+Shift+I`, injection directe via le port de debug remote.
- **🤫 Discrétion Totale** : Fonctionne en arrière-plan. Vous pouvez changer de serveur ou chatter pendant que le script travaille.
- **🔄 Auto-Enroll** : Accepte automatiquement les quêtes éligibles que vous n'avez pas encore activées.
- **🛠️ Support Complet** :
  - **WATCH_VIDEO** : Simulation de progression vidéo intelligente.
  - **PLAY_ON_DESKTOP** : Spoofing de jeu avec simulation de processus Windows.
  - **STREAM_ON_DESKTOP** : Simulation de stream pour les quêtes de partage d'écran.
  - **PLAY_ACTIVITY** : Envoi de heartbeats pour les activités intégrées.

---

## 🚀 Installation & Utilisation

### 1. Pré-requis
- **Node.js** installé sur votre machine.
- Le client **Discord Desktop** officiel (Windows) ou **Discord Canary** (recommandé).

> [!TIP]
> **Recommandation Discord Canary** : Pour une expérience optimale, je recommande d'utiliser **Discord Canary**. Cette version de Discord gère nativement le raccourci `Ctrl + Shift + I` pour accéder aux DevTools sans aucune configuration complexe supplémentaire.

### 2. Installation
```bash
git clone git@github.com:JimmyRamsamynaick/complete_quete_discord.git
cd complete_quete_discord
npm install
```

### 3. Lancement (Mode Terminal recommandé)

#### Étape A : Relancer Discord en mode Debug
Fermez complètement Discord (via la barre des tâches) et lancez cette commande dans votre terminal :
```powershell
& "$env:LOCALAPPDATA\Discord\Update.exe" --processStart Discord.exe --a="--remote-debugging-port=9222"
```

#### Étape B : Lancer l'injection
Une fois Discord ouvert, lancez simplement le launcher :
```bash
node launcher.js
```

---

## 🛠️ Utilisation via Console DevTools (Alternative)

Si vous ne souhaitez pas utiliser le terminal :
1. Activez les DevTools dans votre `settings.json` Discord.
2. Copiez le contenu de `discord_quest_completer.js`.
3. Collez-le dans la console Discord (`Ctrl+Shift+I`).
4. Tapez `runQuestCompleter()`.

---

## 🛡️ Sécurité & Confidentialité

- **Aucun Token Requis** : Le script utilise les modules internes de l'application déjà connectée.
- **Zéro Requête Externe** : Toutes les communications se font exclusivement avec les API officielles de Discord.
- **Auto-Cleanup** : Le script restaure les fonctions originales de Discord une fois les quêtes terminées.

---

## 📝 Auteur

**Jimmy Ramsamynaick**
- GitHub : [@JimmyRamsamynaick](https://github.com/JimmyRamsamynaick)
- Email : [jimmyramsamynaick@gmail.com](mailto:jimmyramsamynaick@gmail.com)

---

## ⚖️ Licence

Ce projet est sous licence MIT. Utilisation à des fins éducatives uniquement.
