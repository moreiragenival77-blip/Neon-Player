# GF Play

Reprodutor de música **offline**: sem login, sem anúncios, sem streaming e sem servidor.
A biblioteca e os metadados ficam no aparelho.

## Recursos
- Importação de arquivos locais (MP3, M4A, AAC, OGG/Opus, WAV, FLAC — conforme suporte do dispositivo).
- Leitura local de metadados e capas.
- Biblioteca, busca, favoritos, playlists, fila, aleatório, repetição e volume.
- Interface web com reprodutor HTMLAudio como fallback.
- No Android nativo, integração com `capacitor-plugin-playlist`, Media3/ExoPlayer e serviço de mídia em primeiro plano.
- Cópia das músicas importadas para o armazenamento interno do app, para que o serviço nativo possa reproduzi-las sem depender do WebView.
- Metadados e controles de mídia fornecidos pelo serviço nativo para notificação e tela bloqueada.

## Android (APK)
O workflow **Android APK** em GitHub Actions:
1. Instala as dependências.
2. Compila a versão web.
3. Gera o projeto Android do Capacitor.
4. Sincroniza os plugins nativos.
5. Compila um APK de depuração.
6. Publica o APK como artefato chamado `neon-player-debug-apk`.

Depois que a execução terminar, o APK poderá ser baixado na seção **Artifacts** da execução do workflow.

## Estado de validação
A integração nativa já está conectada ao código do player, mas ainda precisa passar pela compilação Android e por testes em um aparelho real. A compilação web, isoladamente, não comprova reprodução com a tela apagada.

Verificar no aparelho:
- reprodução com a tela bloqueada e com outro app em primeiro plano;
- controles de play/pausa e faixa anterior/próxima na notificação e na tela bloqueada;
- importação e reprodução de músicas offline após fechar e abrir o app;
- pausa por interrupções de áudio e retomada correta.

## Créditos
**GF GAMEDEV**
