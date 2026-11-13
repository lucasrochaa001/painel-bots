# painel-bots

Painel de status dos bots do Lucas. Um único serviço Node 20 + TypeScript (só `node:http`, sem framework),
pronto para o Railway. Recebe atualizações em `POST /ingest` e mostra o painel em `GET /`, tudo protegido por chave.

## Variáveis

| Variável | Obrigatória | Uso |
| --- | --- | --- |
| `PAINEL_TOKEN` | sim (mín. 32 caracteres) | Chave de acesso. Sem ela o serviço não sobe. |
| `DATA_DIR` | não | Pasta do `state.json` (no Railway: o volume, ex. `/data`). Sem ela, só memória. |
| `NOTION_TOKEN` | não | Token da integração do Notion, só para o ORGANOGRAMA. Lido apenas pelo servidor: nunca vai ao navegador nem ao log. Sem ele o organograma usa o snapshot embutido. A database precisa estar compartilhada com a integração. |
| `PORT` | não (padrão 3000) | O Railway define sozinho. |

## Rotas

- `POST /ingest`: só `Authorization: Bearer <PAINEL_TOKEN>` (cookie não vale), `Content-Type: application/json`, corpo até 64 KB. Retorna 401 sem chave, 400 com o erro do campo, 413 se for grande demais.
- `GET /`: tela de login (nenhum dado) ou o painel. O login grava um cookie `HttpOnly; Secure; SameSite=Strict` com um HMAC da chave, nunca a chave. Também aceita Bearer.
- `GET /api/state`: estado em JSON, protegido. O painel atualiza a cada 10 s e só redesenha quando algo mudou.
- `GET /api/organograma`: hierarquia do Notion (database Agentes, campo "Reporta a"), protegida como `/api/state`. O servidor consulta o Notion no máximo a cada 10 min (memória + `DATA_DIR/organograma-cache.json`). Se o Notion falhar, serve o último cache (`fonte: "cache"`); sem cache e sem token, serve `src/organograma-fallback.json` (`fonte: "snapshot"`). A rota continua disponível. A aba ORGANOGRAMA do painel não lê essa rota: ela usa o ingest `org` (abaixo) e, sem ele, agrupa os bots por andar.
- `POST /avatar?bot=<nome>` (ou header `X-Bot: <nome em encodeURIComponent>`): foto do boneco. Só Bearer, `Content-Type: image/png`, até 512 KB (reduza para ~256 px antes). 401/415/400/413 nos erros. Gravada em `DATA_DIR/avatars/<sha256 do nome>.png`.
- `GET /avatar/<nome>`: a foto, protegida por cookie ou Bearer (sem login → 401). Nada é público.
- `GET /fonts/<orbitron|inter|jetbrains-mono>.woff2`: fontes do visual ANA servidas pelo próprio serviço (a CSP continua sem origem externa: só `font-src 'self'`). Público, sem dado nenhum; qualquer outro nome → 404. Arquivos em `assets/fonts/` (licença OFL).
- `GET /health`: público, retorna só `{"ok":true}`.

O painel (tema escuro e dourado) tem as abas MAPA (escritório isométrico: quem trabalha, espera ou está com erro senta numa mesa; quem descansa fica na copa), LISTA (todos os bots, quem espera por você primeiro) e ORGANOGRAMA (quem reporta a quem, com o mesmo boneco e a mesma cor de status do mapa; clicar num bot seleciona e mostra "No organograma" na coluna da direita). A marca do topo (emblema, nome, subtítulo) vem do ingest `brand`; sem ela o painel mostra "Painel / Status dos bots". O organograma vem do ingest `org`; sem hierarquia, a aba agrupa por andar e avisa. A coluna da esquerda traz "Precisa de você", "Com erro", "Parado há +12h", "Andares" e "Atividade". Uma passagem de bastão (`handoff`) vira uma linha animada por ~8 s (via elevador quando muda de andar).

O painel separa os bots por time ("andares"). Quem não tem time fica em "Sem time". Sem `floors`, os andares vão em ordem alfabética; com `floors`, seguem a lista, os times fora dela vêm depois e "Sem time" fica por último.
Cada bot guarda os últimos 10 passos (`recent`) e o estado guarda um feed global dos últimos 50 (`feed`), mostrados em "Passos recentes" e "Atividade". Um status igual ao anterior só atualiza o horário. Horários aparecem em America/Recife.
Quando existe `roster`, só os bots da lista aparecem.

## Privacidade

O log registra só método, rota e status. Corpo, `step` e token nunca vão para o log.
Todas as respostas levam `Cache-Control: no-store`, `X-Robots-Tag: noindex` e uma CSP com nonce.
Não há CORS. O `/login` bloqueia o IP por 15 min depois de 10 erros.

## Chave no box (caminho proposto, ainda não criado)

`/home/box/.secrets/painel-bots-token`, com permissão 600. Para criar no dia do deploy:
`mkdir -p /home/box/.secrets && (umask 077; openssl rand -hex 32 > /home/box/.secrets/painel-bots-token)`.

## Exemplos (um por tipo)

```bash
URL=https://SEU-DOMINIO.up.railway.app
K="$(cat /home/box/.secrets/painel-bots-token)"
H=(-H "Authorization: Bearer $K" -H "Content-Type: application/json")

# status: working|idle|waiting_user|error|done; step com até 80 caracteres (o excedente é cortado)
curl -sS "${H[@]}" -X POST "$URL/ingest" -d '{"type":"status","bot":"Donna","status":"working","step":"Montando o briefing das 8h"}'

# routines: substitui a lista daquele bot; next_run em ISO 8601 ou null
curl -sS "${H[@]}" -X POST "$URL/ingest" -d '{"type":"routines","bot":"Donna","items":[{"name":"Briefing","schedule":"dias úteis 8h","next_run":"2026-11-03T08:00:00-03:00"}]}'

# roster: lista de bots exibidos
curl -sS "${H[@]}" -X POST "$URL/ingest" -d '{"type":"roster","names":["Donna","Grok Bot","Diretor Agentes"]}'

# looks: shape do app (blob|squircle|tablet|pill|pebble|hex|star|flower|house|cloud) ou antigas (circle|square|rounded|triangle|diamond|hexagon)
#        color em hex ou nomeada do app (violet|blue|cyan|green|orange|red|black|gray); sem look = blob + violet
curl -sS "${H[@]}" -X POST "$URL/ingest" -d '{"type":"looks","bots":{"Gmail":{"shape":"pebble","color":"red","accessory":"none"},"Donna":{"shape":"star","color":"#ff8800"}}}'

# avatar: PNG até 512 KB, vira o rosto do boneco
curl -sS -X POST "$URL/avatar?bot=Donna%20Secret%C3%A1ria" -H "Authorization: Bearer $K" -H "Content-Type: image/png" --data-binary @avatar.png

# groups: time de cada bot (cada time vira um andar); floors opcional define a ordem (até 50)
curl -sS "${H[@]}" -X POST "$URL/ingest" -d '{"type":"groups","bots":{"Donna":"Operação","Grok Bot":"Dev"}}'
curl -sS "${H[@]}" -X POST "$URL/ingest" -d '{"type":"groups","bots":{"CEO ANA":"ANA","Donna":"Personal"},"floors":["ANA","Personal","Research","Tech","Ops"]}'

# chat: link precisa começar com grokbot://app/v1/agent?id=
curl -sS "${H[@]}" -X POST "$URL/ingest" -d '{"type":"chat","bots":{"Donna":"grokbot://app/v1/agent?id=SEU-ID"}}'

# usage: percentuais de 0 a 100, resets_at em ISO 8601
curl -sS "${H[@]}" -X POST "$URL/ingest" -d '{"type":"usage","total_used_pct":42.5,"resets_at":"2026-11-09T00:00:00-03:00","bots":{"Donna":10,"Grok Bot":30}}'

# brand: emblema, nome e subtítulo do topo. Sem este ingest o painel fica genérico ("Painel").
# mark é o monograma do emblema (1 a 4 letras ou números); se omitir, o painel usa as iniciais do nome.
curl -sS "${H[@]}" -X POST "$URL/ingest" -d '{"type":"brand","name":"Atlas Consultoria","subtitle":"Gestão","mark":"atl"}'

# org: hierarquia da aba ORGANOGRAMA. reports_to é o bot (ou o nome do owner) a quem reporta.
# cobra desenha uma linha tracejada; sem "to", o rótulo vale para o conjunto ("cobra prazos de todos").
# nodes vazio e sem owner apaga a hierarquia e a aba volta a agrupar por andar.
curl -sS "${H[@]}" -X POST "$URL/ingest" -d '{"type":"org","owner":{"name":"Dono","role":"humano · decide"},"nodes":[{"bot":"CEO","role":"geral","reports_to":"Dono"},{"bot":"Jurídico","role":"diretoria","reports_to":"CEO"}],"cobra":[{"from":"Jurídico","label":"cobra prazos de todos"}]}'

# handoff: um bot passa uma tarefa para outro. No painel, quem passa levanta, leva o papel até a mesa
# do outro e volta (se o outro estiver em outro andar, sai/entra pelo elevador). from ≠ to; task até 80
# caracteres (é cortada com …). Fica só em memória: últimas 20, por 10 min, em /api/state → handoffs.
curl -sS "${H[@]}" -X POST "$URL/ingest" -d '{"type":"handoff","from":"CEO ANA","to":"COO ANA","task":"Revisar a proposta"}'
```

## Desenvolvimento

```bash
npm install
npm test          # build + testes (node:test)
npm run typecheck
PAINEL_TOKEN=$(openssl rand -hex 32) DATA_DIR=./data npm start
```
