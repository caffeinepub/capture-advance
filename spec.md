# Capture Advance

## Current State
App ao vivo com análise Gemini de S/R a cada ciclo (30s/20s finais). O LiveVideoPreview já exibe linhas de suporte/resistência via canvas overlay. Não há intervalo dedicado para S/R, nem botão de atualização manual.

## Requested Changes (Diff)

### Add
- Botão refresh S/R no header do LiveVideoPreview
- Função analyzeSROnly no App.tsx (prompt Gemini focado só em S/R)
- Intervalo dedicado de 10 segundos para S/R quando liveStream ativo
- Props onRefreshSR e isRefreshingSR em LiveVideoPreview e SignalPanel

### Modify
- App.tsx: iniciar/parar intervalo S/R junto com liveStream
- SignalPanel.tsx: aceitar e repassar onRefreshSR
- ScreenCapture.tsx: adicionar botão refresh no header do LiveVideoPreview

### Remove
- Nada

## Implementation Plan
1. ScreenCapture.tsx: adicionar props onRefreshSR e isRefreshingSR; botao de refresh no header
2. SignalPanel.tsx: prop onRefreshSR repassado para LiveVideoPreview
3. App.tsx: analyzeSROnly, estado isRefreshingSR, intervalo 10s para SR, handler handleRefreshSR, passar props
