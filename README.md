# Neon Player

Reprodutor de música **offline**: sem login, sem anúncios, sem streaming, sem servidor.
Arquivos e metadados ficam apenas no aparelho (IndexedDB + localStorage).

## O que funciona hoje (web / preview)
- Importar arquivos de áudio locais (mp3, m4a, aac, ogg/opus, wav, flac — conforme suporte do WebView).
- Leitura local de ID3v2 (título, artista, álbum, capa); fallback pelo nome "Artista - Título".
- Biblioteca, busca, favoritos, playlists locais, fila, aleatório, repetir (off/todas/uma), volume.
- Tratamento de arquivo inválido / não suportado / removido sem travar (pula para a próxima).
- Media Session API (metadados e botões de mídia) como **melhoria progressiva**.

## ⚠️ Reprodução em segundo plano — NÃO concluída
A Media Session API e o `<audio>` do WebView **não garantem** que a música continue com a
tela apagada ou o app minimizado. O Android pode suspender o WebView a qualquer momento.
Reprodução confiável em segundo plano **exige código nativo, que ainda não foi implementado
nem compilado neste ambiente**.

## Android (APK) — integração nativa necessária
1. `bun add @capacitor/core @capacitor/cli @capacitor/android` → `bunx cap add android`
   (o build web precisa ser gerado como SPA estática em `webDir`).
2. **Plugin nativo de reprodução** (Kotlin) usando **Media3 / ExoPlayer**:
   - `MediaSessionService` (foreground service) com `foregroundServiceType="mediaPlayback"`.
   - Notificação `MediaStyle` (gerada pelo Media3 `MediaNotification`) com play/pausa/anterior/próxima,
     visível também na tela bloqueada.
   - O JS envia a fila (URIs `content://` ou caminhos copiados para o armazenamento do app) e comandos;
     o serviço é a fonte de verdade da reprodução e emite eventos (posição, faixa, estado) de volta.
   - Nesse modo o `<audio>` do frontend deve ser desligado (a camada `src/lib/player.tsx` é o ponto de troca).
3. **Áudio focus**: `AudioAttributes(USAGE_MEDIA, CONTENT_TYPE_MUSIC)` com `handleAudioFocus=true`
   (pausa em ligações, abaixa volume em notificações).
4. **Interrupções**: `ACTION_AUDIO_BECOMING_NOISY` (fone desconectado → pausar) via
   `setHandleAudioBecomingNoisy(true)`; tratar erros do player sem derrubar o serviço.
5. **Manifest / permissões (Android 13–15)**:
   - `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK` (API 34+), `WAKE_LOCK`.
   - `POST_NOTIFICATIONS` (API 33+, pedir em tempo de execução).
   - `READ_MEDIA_AUDIO` (API 33+) ou `READ_EXTERNAL_STORAGE` (≤ API 32) se for ler a MediaStore;
     alternativa sem permissão: seletor do sistema (SAF) + `takePersistableUriPermission`.
   - Declarar o serviço com `android:exported="true"` e intent-filter `androidx.media3.session.MediaSessionService`.
6. Desativar otimização de bateria não é necessário com foreground service correto.

Até esses itens serem implementados e testados em aparelho real, **não considere a reprodução em
segundo plano confiável**.