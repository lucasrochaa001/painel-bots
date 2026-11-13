// HTML do login e do painel (tema escuro e dourado). A marca (emblema, nome, subtítulo) vem do
// ingest "brand"; sem ela o painel mostra um emblema genérico. O organograma vem do ingest "org";
// sem hierarquia, agrupa os bots por andar.
// Nenhum dado de bot é embutido no HTML: o painel busca /api/state (protegido) e monta o DOM só com
// textContent e atributos SVG. Sem CDN nem dependências: tudo inline (SVG + CSS); as fontes vêm de /fonts/ (do próprio serviço).
import { BrandMark } from "./brand.js";
import { floorOrder } from "./floors.js";
import { frescor } from "./frescor.js";
import { mudouSentado, rotaEscritorio, trajeto } from "./caminhada.js";
import { elevSeta } from "./elevador.js";
import { OrgChart } from "./orgchart.js";
import { distribuiCopa, parados, posicionaRotulo, sentaNaMesa } from "./painel.js";

const STYLE = String.raw`
@font-face{font-family:'Orbitron';src:url(/fonts/orbitron.woff2) format('woff2');font-weight:400 900;font-display:swap}
@font-face{font-family:'Inter';src:url(/fonts/inter.woff2) format('woff2');font-weight:100 900;font-display:swap}
@font-face{font-family:'JetBrains Mono';src:url(/fonts/jetbrains-mono.woff2) format('woff2');font-weight:100 800;font-display:swap}
:root{--bg:#0c0b09;--cy:#e0c36a;--pu:#a08040;--pu2:#e7c56a;--go:#d4af37;--wh:#f6f1e6;--rd:#e85d4c;--mint:#3dcc7a;--mu:#a39886;--rest:#8a8175;
--glass:linear-gradient(180deg,rgba(36,30,22,.94),rgba(14,12,9,.96));--bd:rgba(212,175,55,.32);
--working:#3dcc7a;--waiting_user:#d4af37;--error:#e85d4c;--idle:#8a8175;--done:#b7b1a4;--none:#6e675c}
*{box-sizing:border-box;margin:0;padding:0}[hidden]{display:none!important}
html,body{height:100%}
body{background:var(--bg);color:var(--wh);font:14px/1.35 Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;overflow:hidden}
.mono{font-family:'JetBrains Mono',ui-monospace,monospace}.orb{font-family:Orbitron,Inter,sans-serif}
#bg,#frame{position:fixed;inset:0;width:100%;height:100%;pointer-events:none}#bg{z-index:0}#frame{z-index:5}
a{color:inherit;text-decoration:none}button,.btn{font:inherit;cursor:pointer;border:0;color:inherit;background:none;text-decoration:none;display:inline-block}
#app{position:relative;z-index:1;height:100%;display:flex;flex-direction:column;gap:12px;padding:22px 24px 26px}
.card,.glass{background:var(--glass);border:1px solid var(--bd);border-radius:14px;backdrop-filter:blur(14px);box-shadow:0 0 0 1px rgba(212,175,55,.04) inset,0 10px 40px rgba(0,0,0,.45)}
.card{padding:14px 16px}
.h{font-family:Orbitron,Inter,sans-serif;font-weight:700;font-size:14px;letter-spacing:.14em;color:var(--cy);display:flex;align-items:center;gap:10px;margin-bottom:10px;text-transform:uppercase}
.h .n{font-family:'JetBrains Mono',monospace;font-weight:700;font-size:13px;letter-spacing:0;background:rgba(212,175,55,.16);color:var(--go);border:1px solid rgba(212,175,55,.5);border-radius:999px;padding:1px 9px}
.h .n.c{background:rgba(212,175,55,.12);color:var(--cy);border-color:rgba(212,175,55,.4)}
.mu,.vazio{color:var(--mu)}.vazio{font-size:13px}
/* topbar */
#topo{display:flex;align-items:center;flex-wrap:nowrap;padding:0 14px;gap:12px;min-height:62px;height:62px;position:relative;min-width:0}
#topo .marca,#topo .titulo,.vivo,#topo form{flex:none}
#topo .marca{display:flex;align-items:center;gap:12px}
#topo .wm{display:flex;flex-direction:column;gap:1px;line-height:1.15;white-space:nowrap}
#topo .wm b{display:block;font-family:Orbitron,sans-serif;font-weight:800;font-size:13px;letter-spacing:.12em;color:#f6f1e6;text-transform:uppercase}
#topo .wm span{font-size:10px;letter-spacing:.16em;color:#c4b48a;text-transform:uppercase;font-weight:600}
.vsep{width:1px;height:30px;background:rgba(212,175,55,.3);flex:none}
#topo .titulo{font-family:Orbitron,sans-serif;font-weight:800;font-size:18px;letter-spacing:.16em;white-space:nowrap;color:#f3ead2}
.vivo{display:flex;align-items:center;gap:9px;font-size:14px;color:var(--mu);white-space:nowrap}
.vivo .dot{width:9px;height:9px;border-radius:50%;background:#3dcc7a;box-shadow:0 0 0 4px rgba(61,204,122,.18),0 0 12px #3dcc7a;animation:pulsa 2s infinite}
.vivo.off .dot{background:var(--rd);box-shadow:0 0 0 4px rgba(232,93,76,.18),0 0 14px var(--rd);animation:none}
.vivo #hora{font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--wh);font-size:16px;margin-left:4px}
@keyframes pulsa{50%{box-shadow:0 0 0 8px rgba(212,175,55,0),0 0 14px var(--cy)}}
.contas{display:flex;flex:1 1 auto;min-width:0;gap:8px;margin:0 auto;justify-content:center}
.contas span{display:flex;align-items:center;gap:6px;height:34px;padding:0 10px;border-radius:999px;border:1px solid rgba(107,124,158,.5);font-size:13px;font-weight:500;background:rgba(14,12,9,.5);color:var(--mu);white-space:nowrap;flex:none}
.contas b{font-family:'JetBrains Mono',monospace;font-size:17px;font-weight:800;color:inherit}
.contas .dot{width:9px;height:9px;border-radius:50%;display:block}
.contas .on-working{color:#3dcc7a;border-color:rgba(61,204,122,.6);box-shadow:0 0 16px rgba(61,204,122,.2)}
.contas .on-waiting_user{color:var(--go);border-color:rgba(212,175,55,.65);animation:pulsaAmb 2.2s infinite}
.contas .on-error{color:var(--rd);border-color:rgba(232,93,76,.7);box-shadow:0 0 16px rgba(232,93,76,.25)}
.contas .on-working .dot,.contas .on-waiting_user .dot,.contas .on-error .dot{box-shadow:0 0 8px currentColor}
@keyframes pulsaAmb{0%{box-shadow:0 0 0 0 rgba(212,175,55,.5)}70%{box-shadow:0 0 0 9px rgba(212,175,55,0)}100%{box-shadow:0 0 0 0 rgba(212,175,55,0)}}
.abas{display:flex;flex:none;min-width:max-content;border:1px solid var(--bd);border-radius:10px;overflow:hidden;background:rgba(14,12,9,.5)}
.abas button{flex:none;white-space:nowrap;font-family:Orbitron,sans-serif;font-weight:600;font-size:12px;letter-spacing:.08em;padding:10px 12px;color:var(--mu)}
.abas button:hover{color:var(--wh)}.abas button.on{background:rgba(212,175,55,.16);color:var(--cy);box-shadow:inset 0 -2px 0 var(--cy);font-weight:800}
.sair{border:1px solid rgba(212,175,55,.45);color:var(--wh);background:rgba(212,175,55,.07);border-radius:9px;padding:9px 14px;font-size:14px;font-weight:600;white-space:nowrap}.sair:hover{background:rgba(212,175,55,.16)}
/* faixa de erro */
#errs{display:flex;flex-direction:column;gap:8px}
.err{display:flex;align-items:center;gap:14px;min-height:50px;padding:6px 14px 6px 18px;border-radius:12px;background:linear-gradient(90deg,rgba(232,93,76,.20),rgba(232,93,76,.08));border:1px solid rgba(232,93,76,.65);box-shadow:0 0 28px rgba(232,93,76,.2);backdrop-filter:blur(12px)}
.err .ic{width:24px;height:24px;border-radius:50%;background:var(--rd);color:#0c0b09;font-weight:900;display:grid;place-items:center;font-size:15px;box-shadow:0 0 14px var(--rd);flex:none}
.err .tg{font-family:Orbitron,sans-serif;font-weight:800;font-size:13px;letter-spacing:.16em;color:var(--rd);flex:none}
.err .tx{font-size:15px;font-weight:500;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.err .tx b{font-weight:700}
.err .go{margin-left:auto;flex:none;background:var(--rd);color:#0c0b09;font-weight:800;border-radius:9px;padding:8px 22px;font-size:14px;box-shadow:0 0 18px rgba(232,93,76,.5)}
.err .go:hover{filter:brightness(1.12)}
/* colunas */
#cols{flex:1 1 0;display:grid;grid-template-columns:minmax(248px,19vw) minmax(0,1fr) minmax(228px,18vw);gap:12px;min-height:0}
#esq,#dir{display:flex;flex-direction:column;gap:12px;min-height:0;min-width:0;overflow:auto}
.rol{overflow:auto;scrollbar-width:thin;scrollbar-color:rgba(212,175,55,.35) transparent}
.noshrink{flex:none}.precisa{flex:0 1 auto;min-height:230px;overflow:auto;scrollbar-width:thin;scrollbar-color:rgba(212,175,55,.35) transparent}
.atc{flex:1 1 0;min-height:128px;overflow:hidden;display:flex;flex-direction:column}.atc .lst,.rotc .lst,.p2 .passos{flex:1 1 0;min-height:0;overflow:hidden}
.p2{flex:1 1 auto;min-height:220px;display:flex;flex-direction:column;overflow:auto}.rotc{flex:1 1 auto;min-height:120px;overflow:hidden;display:flex;flex-direction:column}
#topo,#errs{flex:none}
.it{display:flex;align-items:flex-start;gap:11px;padding:9px 0;border-top:1px solid rgba(212,175,55,.13);cursor:pointer}.it:first-child{border-top:0;padding-top:2px}
.av{width:30px;height:30px;flex:none;overflow:visible}.mini{width:26px;height:26px;flex:none;overflow:visible}
.it .tx{min-width:0;flex:1}.it .nm{font-weight:700;font-size:15px;white-space:normal;overflow:visible;line-height:1.25}
.it .ac{font-size:13px;color:var(--mu);margin-top:2px;white-space:normal;overflow:visible;line-height:1.35}
.bt{flex:none;font-size:13px;font-weight:600;color:var(--cy);border:1px solid rgba(212,175,55,.5);background:rgba(212,175,55,.08);border-radius:8px;padding:6px 11px;white-space:nowrap}.bt:hover{background:rgba(212,175,55,.2)}
.card.alerta{border-color:rgba(212,175,55,.55);box-shadow:0 0 0 1px rgba(212,175,55,.08) inset,0 0 26px rgba(212,175,55,.14),0 10px 40px rgba(0,0,0,.45)}
.card.alerta .h{color:var(--cy)}
.ok-linha{display:flex;align-items:center;gap:8px;color:var(--mu);font-size:13px}.ok-linha i{width:18px;height:18px;border-radius:50%;background:rgba(31,224,168,.16);color:var(--mint);display:grid;place-items:center;font-style:normal;font-size:11px}
.sub12{margin-top:8px;padding:10px 12px;border-radius:10px;background:rgba(212,175,55,.07);border:1px solid rgba(212,175,55,.35)}
.sub12 .sh{font-family:Orbitron,sans-serif;font-weight:700;font-size:12.5px;letter-spacing:.14em;color:var(--go);display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:6px}
.sub12 .sh span{font-family:Inter,sans-serif;font-weight:500;letter-spacing:0;font-size:12.5px;color:#B79B3E}
.sr{display:flex;align-items:center;gap:10px;font-size:14px;padding:3px 0}
.sr .bar{flex:1;height:4px;border-radius:4px;background:rgba(212,175,55,.15);overflow:hidden}.sr .bar i{display:block;height:100%;background:linear-gradient(90deg,var(--go),#F0D27A)}
.sr .tm{font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--go);font-size:14px;width:56px;text-align:right;flex:none}
.sr .nm{width:108px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:none}
.andar{display:flex;align-items:center;flex-wrap:wrap;gap:6px 8px;padding:7px 10px;border-radius:9px;font-size:15px;margin-bottom:3px;cursor:pointer;border:1px solid transparent}
.andar:hover{background:rgba(212,175,55,.06)}
.andar.sel{background:rgba(212,175,55,.12);border-color:rgba(212,175,55,.45)}
.andar .n{font-family:'JetBrains Mono',monospace;font-weight:800;width:24px;height:24px;border-radius:6px;display:grid;place-items:center;font-size:13px;background:rgba(163,152,134,.14);color:var(--mu);flex:none}
.andar.sel .n{background:var(--cy);color:#0c0b09}
.andar .nm{font-weight:600;color:var(--mu);flex:1 1 8em;min-width:8em;white-space:normal;overflow:visible;line-height:1.25}.andar.sel .nm{color:var(--wh)}
.andar .ct{font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--mu);min-width:22px;text-align:right;font-size:14px}
.tag{font-family:'JetBrains Mono',monospace;font-weight:800;font-size:12.5px;border-radius:999px;padding:1px 8px;border:1px solid;flex:none}
.tag.w{color:var(--go);border-color:rgba(212,175,55,.6);background:rgba(212,175,55,.12)}
.tag.e{color:var(--rd);border-color:rgba(232,93,76,.6);background:rgba(232,93,76,.12)}
.tag.t{color:var(--mint);border-color:rgba(31,224,168,.5);background:rgba(31,224,168,.1)}
.act{display:flex;gap:10px;font-size:14px;padding:9px 0;border-top:1px solid rgba(212,175,55,.10);align-items:baseline}.act:first-child{border-top:0;padding-top:2px}
.act .tm{font-family:'JetBrains Mono',monospace;color:var(--cy);font-size:13px;font-weight:600;flex:none}
.act .tx{color:var(--mu);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.act .tx b{color:var(--wh);font-weight:700}
/* mapa */
#C{position:relative;overflow:hidden;min-height:0}
#C .tagbar{position:absolute;left:18px;top:14px;right:18px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;z-index:2;pointer-events:none}
#C .tagbar>*{pointer-events:auto}
#C .a{font-family:Orbitron,sans-serif;font-weight:700;font-size:14px;letter-spacing:.14em;color:var(--cy);text-transform:uppercase}
.chip{font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--mu);border:1px solid rgba(163,152,134,.3);border-radius:999px;padding:2px 10px;background:rgba(14,12,9,.4);white-space:nowrap}
.chip.c1{color:#f0d78c;border-color:rgba(212,175,55,.4)}.chip.c2{color:#E7C766;border-color:rgba(212,175,55,.45)}
.chip.ho{color:#B9BBFF;border-color:rgba(212,175,55,.6);cursor:pointer}
#cena{position:absolute;inset:0;width:100%;height:100%;display:block}
#leg{position:absolute;left:18px;bottom:14px;display:flex;gap:16px;font-size:13px;color:var(--mu);align-items:center;flex-wrap:wrap;z-index:2}
#leg span{display:flex;align-items:center;gap:7px}#leg i{width:10px;height:10px;border-radius:50%;display:block}
#cena text{font-family:Inter,system-ui,sans-serif}
.lista-wrap{position:absolute;inset:0;padding:18px 18px 14px;display:flex;flex-direction:column;min-height:0}
.tabela{width:100%;border-collapse:collapse;font-size:13px;table-layout:fixed}
.tabela th{font-family:Orbitron,sans-serif;font-weight:700;font-size:11px;letter-spacing:.08em;color:var(--cy);text-align:left;padding:8px 8px;border-bottom:1px solid rgba(212,175,55,.3);position:sticky;top:0;background:#14120e;z-index:1;text-transform:uppercase}
.tabela td{padding:7px 8px;border-bottom:1px solid rgba(212,175,55,.09);white-space:nowrap;vertical-align:middle;overflow:hidden}
.tabela tr.lin{cursor:pointer}.tabela tr.lin:hover td{background:rgba(212,175,55,.06)}.tabela tr.lin.sel td{background:rgba(212,175,55,.12)}
.tabela td.nome{font-weight:700}.tabela td.nome div{display:flex;align-items:center;gap:8px;min-width:0}.tabela td.nome div span{min-width:0;overflow:hidden;text-overflow:ellipsis}
.tabela th:nth-child(1),.tabela td:nth-child(1){width:18%}
.tabela th:nth-child(2),.tabela td:nth-child(2){width:13%}
.tabela th:nth-child(3),.tabela td:nth-child(3){width:22%}
.tabela th:nth-child(4),.tabela td:nth-child(4){width:12%}
.tabela th:nth-child(6),.tabela td:nth-child(6){width:108px}
.tabela td.passo{color:var(--mu);overflow:hidden;text-overflow:ellipsis}
.tabela .sp{max-width:100%;overflow:hidden}
.tabela .bt{padding:5px 8px;font-size:12px}
.tabela td.num{font-family:'JetBrains Mono',monospace;color:var(--mu)}
.sp{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:600;border:1px solid rgba(107,124,158,.55);border-radius:999px;padding:2px 11px;background:rgba(14,12,9,.5);color:var(--mu)}
.sp i{width:8px;height:8px;border-radius:50%;background:var(--rest);display:block}
.sp.s-working{color:#3dcc7a;border-color:rgba(61,204,122,.55)}.sp.s-working i{background:#3dcc7a;box-shadow:0 0 8px #3dcc7a}
.sp.s-waiting_user{color:var(--go);border-color:rgba(212,175,55,.6)}.sp.s-waiting_user i{background:var(--go);box-shadow:0 0 8px var(--go)}
.sp.s-error{color:var(--rd);border-color:rgba(232,93,76,.65)}.sp.s-error i{background:var(--rd);box-shadow:0 0 8px var(--rd)}
.velho12{color:var(--go);font-family:'JetBrains Mono',monospace;font-size:12px;margin-left:8px}
/* organograma */
#org{position:absolute;inset:0;overflow:auto;scrollbar-width:thin;scrollbar-color:rgba(212,175,55,.35) transparent}
#org .oi{position:relative;min-height:100%;padding:14px 10px 12px 24px;display:flex;flex-direction:column;gap:8px}
#org .oh{display:flex;align-items:center;gap:14px;height:30px;flex:none;position:relative;z-index:1}
#org .oh .a{font-family:Orbitron,sans-serif;font-weight:700;font-size:14px;letter-spacing:.14em;color:var(--cy);text-transform:uppercase;white-space:nowrap}
#org .oh .sub{font-size:13px;color:var(--mu);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
#org .oh .lg{margin-left:auto;display:flex;gap:14px;font-size:13px;color:var(--mu);white-space:nowrap;flex:none}
#org .oh .lg span{display:flex;align-items:center;gap:6px}#org .oh .lg i{width:9px;height:9px;border-radius:50%;display:block}
#org svg.ln{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;overflow:visible}
#org .tree,#org .apoio{position:relative;z-index:1}
#org .tree{flex:none}
#org .r0,#org .r1{display:flex;justify-content:center}
#org .r1{margin-top:24px}
#org .r2{display:grid;grid-template-columns:repeat(auto-fit,minmax(0,1fr));gap:10px 8px;margin-top:16px;align-items:start;width:100%}
#org .col{min-width:0;display:flex;flex-direction:column;gap:6px}
#org .tm{margin:0;display:flex;flex-direction:column;gap:4px}
#org .sub2{margin:0 0 0 16px;display:flex;flex-direction:column;gap:4px}
#org .nd{position:relative;display:flex;align-items:center;gap:6px;height:auto;min-height:44px;padding:6px 8px;border-radius:10px;background:linear-gradient(160deg,rgba(212,175,55,.10),rgba(160,128,64,.07) 70%,rgba(212,175,55,.05));border:1px solid rgba(212,175,55,.26);backdrop-filter:blur(10px);box-shadow:0 6px 18px rgba(0,0,0,.35);cursor:pointer;min-width:0}
#org .nd .av{position:relative;width:27px;height:27px;flex:none}
#org .nd .av svg{width:27px;height:27px;overflow:visible;display:block}
#org .nd .sd{position:absolute;right:-4px;bottom:-4px;width:11px;height:11px;border-radius:50%;background:#8a8175;border:2px solid #14120e;box-sizing:content-box}
#org .nd.s-working .sd{background:#3dcc7a;box-shadow:0 0 9px #3dcc7a}
#org .nd.s-waiting_user .sd{background:#D4AF37;box-shadow:0 0 9px #D4AF37}
#org .nd.s-error .sd{background:#e85d4c;box-shadow:0 0 9px #e85d4c}
#org .nd.s-none .sd{background:transparent;border-color:#8a8175;box-shadow:none;width:7px;height:7px}
#org .nd.s-working{border-color:rgba(61,204,122,.6)}
#org .nd.s-waiting_user{border-color:rgba(212,175,55,.7);box-shadow:0 0 16px rgba(212,175,55,.16),0 6px 18px rgba(0,0,0,.35)}
#org .nd.s-error{border-color:rgba(232,93,76,.75)}
#org .nd .t{min-width:0;flex:1;line-height:1.18}
#org .nd .n{font-weight:700;font-size:13.5px;color:var(--wh);white-space:normal;overflow:visible;line-height:1.25;overflow-wrap:anywhere}
#org .nd .c{display:flex;align-items:flex-start;gap:6px;font-size:12px;color:var(--mu);min-width:0}
#org .nd .c .ct{min-width:0;flex:1 1 auto;white-space:normal;overflow:visible;line-height:1.3;overflow-wrap:anywhere}
#org .nd .c .tg{flex:none;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.04em;line-height:1;padding:2px 5px;border-radius:999px;background:#14120e;border:1px solid rgba(212,175,55,.6);color:var(--go);white-space:nowrap}
#org .nd.fora{border-style:dashed;border-color:rgba(163,152,134,.5)}
#org .nd.fora.s-waiting_user{border-color:rgba(212,175,55,.7)}#org .nd.fora.s-working{border-color:rgba(212,175,55,.62)}
#org .nd.nonotion{border-style:dashed;border-color:rgba(212,175,55,.55)}
#org .nd.sel{border-color:#e0c36a;box-shadow:0 0 0 2px rgba(212,175,55,.35),0 0 26px rgba(212,175,55,.45),0 6px 18px rgba(0,0,0,.35);background:linear-gradient(160deg,rgba(212,175,55,.22),rgba(160,128,64,.12))}
#org .nd.dir{height:auto;min-height:54px;padding:8px 10px;gap:10px;border-color:rgba(212,175,55,.42);background:linear-gradient(160deg,rgba(212,175,55,.15),rgba(160,128,64,.10) 70%,rgba(212,175,55,.06))}
#org .nd.dir .av,#org .nd.dir .av svg{width:32px;height:32px}
#org .nd.dir .sd{width:12px;height:12px}
#org .nd.dir .n{font-family:Orbitron,sans-serif;font-weight:800;font-size:13.5px;letter-spacing:.04em}
#org .nd.ceo{height:60px;width:330px;padding:0 14px 0 12px;gap:13px;border-color:rgba(212,175,55,.6);background:linear-gradient(160deg,rgba(212,175,55,.16),rgba(212,175,55,.08) 60%,rgba(160,128,64,.08));box-shadow:0 0 28px rgba(212,175,55,.14),0 8px 24px rgba(0,0,0,.4)}
#org .nd.ceo .av,#org .nd.ceo .av svg{width:46px;height:46px}
#org .nd.ceo .n{font-family:Orbitron,sans-serif;font-weight:800;font-size:17px;letter-spacing:.1em}
#org .nd.ceo .c{font-size:13.5px}
#org .nd.ceo .sd{width:13px;height:13px}
#org .nd.hum{height:44px;width:300px;padding:0 14px 0 10px;gap:12px;border-color:rgba(212,175,55,.7);background:linear-gradient(160deg,rgba(212,175,55,.2),rgba(212,175,55,.06));cursor:default}
#org .nd.hum .av{width:36px;height:36px;border-radius:50%;border:2px solid var(--go);display:grid;place-items:center;font-family:Orbitron,sans-serif;font-weight:800;font-size:14px;color:var(--go);background:rgba(14,12,9,.7);box-shadow:0 0 14px rgba(212,175,55,.4)}
#org .nd.hum .n{font-family:Orbitron,sans-serif;font-weight:800;font-size:15px;letter-spacing:.1em}
#org .nd.hum .c{color:#D9C27A}
#org .resumo{grid-column:4 / 6;grid-row:2;margin-top:10px;padding:13px 15px;border-radius:12px;align-self:start;min-width:0}
#org .resumo .h{margin-bottom:9px;font-size:13px}
#org .mt4{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:10px}
#org .mt4 div{border:1px solid rgba(212,175,55,.22);border-radius:9px;padding:6px 7px;background:rgba(14,12,9,.4)}
#org .mt4 b{font-family:Orbitron,sans-serif;font-size:19px;font-weight:700;display:block;line-height:1.15;color:var(--wh)}
#org .mt4 span{font-size:12px;color:var(--mu);white-space:nowrap;letter-spacing:-.01em}
#org .lgd{display:flex;flex-direction:column;gap:6px;font-size:13px;color:#C4D0E6}
#org .lgd>div{display:flex;align-items:center;gap:9px}#org .lgd>div.rl{display:block}
#org .lgd svg{flex:none;width:34px;height:10px;overflow:visible}
#org .lgd .bx{width:34px;height:14px;border-radius:5px;flex:none;border:1px dashed rgba(163,152,134,.7)}
#org .lgd .rl{margin-top:2px;padding-top:7px;border-top:1px solid rgba(212,175,55,.13);color:var(--mu);font-size:12.5px;line-height:1.35}
#org .lgd .rl b{color:var(--go);font-weight:600}
#org .apoio{flex:1 0 auto;margin-top:2px;padding:10px 14px;border-radius:12px;display:flex;flex-direction:column}
#org .apoio .ah{display:flex;align-items:center;gap:12px;margin-bottom:8px}
#org .apoio .ah .a{font-family:Orbitron,sans-serif;font-weight:700;font-size:13.5px;letter-spacing:.14em;color:var(--pu2);white-space:nowrap;text-transform:uppercase}
#org .apoio .ah .sub{font-size:13px;color:var(--mu)}
#org .apoio .ah .n{margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--cy);border:1px solid rgba(212,175,55,.4);background:rgba(212,175,55,.12);border-radius:999px;padding:1px 10px}
#org .apg{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;flex:1}
#org .bl{min-width:0}
#org .bl .lb{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;letter-spacing:.1em;color:var(--mu);text-transform:uppercase;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid rgba(212,175,55,.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#org .bl .stack{display:flex;flex-direction:column;gap:4px}
#org .lbl{position:absolute;z-index:2;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;letter-spacing:.06em;color:var(--pu2);white-space:nowrap;text-align:right;line-height:1.25;background:#100e0c;padding:2px 7px;border-radius:6px;border:1px solid rgba(212,175,55,.4)}
#org .esq-vazio{margin:18px;padding:16px;border:1px dashed rgba(163,152,134,.35);border-radius:12px;color:var(--mu);font-size:14px}
#org .sk{border-radius:12px;background:linear-gradient(100deg,rgba(212,175,55,.05) 20%,rgba(212,175,55,.13) 40%,rgba(212,175,55,.05) 60%);background-size:200% 100%;animation:esq 1.4s linear infinite;border:1px solid rgba(212,175,55,.14)}
@keyframes esq{to{background-position:-200% 0}}
#dir .orgc{flex:none;padding:12px 16px}#dir .orgc .h{margin-bottom:7px;font-size:13px}
#dir .orgc .ol{display:flex;gap:10px;font-size:13px;line-height:1.35;padding:3px 0;border-top:1px solid rgba(212,175,55,.10)}#dir .orgc .ol:first-of-type{border-top:0}
#dir .orgc .k{flex:none;width:112px;color:var(--mu)}#dir .orgc .v{font-weight:600;color:var(--wh);min-width:0}
/* direita */
.bc{padding:16px;display:flex;gap:14px;align-items:flex-start;background:linear-gradient(160deg,rgba(212,175,55,.12),rgba(212,175,55,.07) 60%,rgba(160,128,64,.07))}
.bc .big{width:62px;height:62px;flex:none;overflow:visible}
.bc .corpo{min-width:0;flex:1}
.bc .nm{font-family:Orbitron,sans-serif;font-weight:800;font-size:20px;letter-spacing:.08em;line-height:1.2;overflow-wrap:anywhere}
.bc .sb{font-size:14px;color:var(--mu);margin-top:3px}
.st{display:inline-flex;align-items:center;gap:7px;margin-top:8px;font-size:13px;font-weight:600;color:var(--mu);border:1px solid rgba(107,124,158,.55);border-radius:999px;padding:3px 11px;background:rgba(14,12,9,.5)}
.st i{width:8px;height:8px;border-radius:50%;background:var(--rest);display:block;flex:none}
.st.s-working{color:#3dcc7a;border-color:rgba(61,204,122,.55)}.st.s-working i{background:#3dcc7a;box-shadow:0 0 8px #3dcc7a}
.st.s-waiting_user{color:var(--go);border-color:rgba(212,175,55,.6)}.st.s-waiting_user i{background:var(--go);box-shadow:0 0 8px var(--go)}
.st.s-error{color:var(--rd);border-color:rgba(232,93,76,.65)}.st.s-error i{background:var(--rd);box-shadow:0 0 8px var(--rd)}
.bc .passo{margin-top:8px;font-size:14px;font-weight:600;word-break:break-word;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.fresco{margin-top:6px;display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:12.5px;color:var(--mu)}
.selo-velho{display:inline-block;color:var(--go);border:1px solid rgba(212,175,55,.55);background:rgba(212,175,55,.1);border-radius:999px;padding:1px 8px;font-size:11.5px;font-weight:700;white-space:nowrap}
.resolver{margin-top:10px;width:100%;background:rgba(212,175,55,.14);color:var(--go);border:1px solid rgba(212,175,55,.55);font-weight:700;border-radius:9px;padding:8px 12px}.resolver:hover{background:rgba(212,175,55,.26)}.resolver.conf{background:var(--go);color:#0c0b09}.resolver:disabled{opacity:.6;cursor:default}
.mt{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:12px;flex:none}
.mt div{border:1px solid rgba(212,175,55,.22);border-radius:10px;padding:9px 12px;background:rgba(14,12,9,.4);min-width:0}
.mt b{font-family:Orbitron,sans-serif;font-size:24px;font-weight:700;color:var(--wh);display:block;line-height:1.2}.mt b small{font-size:15px}
.mt span{font-size:13px;color:var(--mu)}
.ps{display:flex;gap:10px;align-items:center;font-size:14px;padding:6.5px 0;border-top:1px solid rgba(212,175,55,.10)}.ps:first-of-type{border-top:0}
.ps i{width:8px;height:8px;border-radius:50%;flex:none;background:var(--rest)}.ps i.g{background:var(--mint);box-shadow:0 0 7px var(--mint)}.ps i.w{background:var(--go);box-shadow:0 0 7px var(--go)}.ps i.r{background:var(--rd);box-shadow:0 0 7px var(--rd)}
.ps .tx{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.ps .tm{font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--mu);flex:none}
.nx{font-size:13px;color:var(--mu);margin:8px 0 10px}.nx b{color:var(--cy);font-family:'JetBrains Mono',monospace;font-weight:600}
.cta{display:block;text-align:center;font-weight:800;font-size:15px;color:#0c0b09;background:linear-gradient(90deg,var(--cy),#b8892e);border-radius:10px;padding:11px;box-shadow:0 0 22px rgba(212,175,55,.3)}.cta:hover{filter:brightness(1.1)}
.cta.off{background:rgba(163,152,134,.15);color:var(--mu);box-shadow:none;font-weight:600}
.cons{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.cons .v{font-family:Orbitron,sans-serif;font-weight:800;font-size:26px;color:var(--wh)}.cons .v small{font-size:14px;color:var(--mu);font-family:Inter,sans-serif;font-weight:500}
.cons .r{font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--mu);text-align:right}
.prog{height:9px;border-radius:9px;background:rgba(163,152,134,.18);overflow:hidden;margin-top:10px}
.prog i{display:block;height:100%;background:linear-gradient(90deg,var(--cy),var(--pu));box-shadow:0 0 12px var(--cy);border-radius:9px}
.prog.hi i{background:linear-gradient(90deg,var(--go),#F0D27A);box-shadow:0 0 12px var(--go)}.prog.max i{background:linear-gradient(90deg,var(--rd),#FF8FA8);box-shadow:0 0 12px var(--rd)}
.ro{display:flex;gap:11px;align-items:center;padding:12px 0;border-top:1px solid rgba(212,175,55,.10);cursor:pointer}.ro:first-child{border-top:0;padding-top:2px}
.ro .tx{min-width:0;flex:1}.ro .nm{font-weight:700;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ro .sb{font-size:12.5px;color:var(--mu);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ro .w{font-family:'JetBrains Mono',monospace;font-size:12.5px;color:var(--cy);flex:none;white-space:nowrap}
/* cena */
.bot-g{cursor:pointer}.cam{transform-box:view-box}
.respira{transform-box:fill-box;transform-origin:50% 100%;animation:respira 3.2s ease-in-out infinite}@keyframes respira{0%,100%{transform:scale(1,1)}50%{transform:scale(1.035,.965)}}
.hov{transform-box:fill-box;transform-origin:50% 100%;transition:transform .2s ease-out}.bot-g:hover .hov{transform:scale(1.07)}
.balao{transition:opacity .4s;cursor:pointer}.zoom .balao:not(.foco){opacity:.22}
.bot-g.idle .corpo-bot,.bot-g.done .corpo-bot,.bot-g.none .corpo-bot{filter:saturate(.85);opacity:.92}
.anel{transform-box:fill-box;transform-origin:center;animation:anel 1.8s ease-out infinite}
@keyframes anel{0%{transform:scale(.7);opacity:.95}100%{transform:scale(1.5);opacity:0}}
.brilho{animation:brilho 1.6s ease-in-out infinite alternate}@keyframes brilho{from{opacity:.55}to{opacity:1}}
.halo{animation:halo 1.8s ease-in-out infinite}@keyframes halo{50%{opacity:.15}}
.balao text{font-weight:700}
.bot-g.waiting_user .corpo-bot{animation:espera 2.4s ease-in-out infinite}@keyframes espera{50%{transform:translateY(-0.5px)}}
.bot-g.working .corpo-bot{animation:digita .36s ease-in-out infinite alternate}@keyframes digita{to{transform:translateY(-0.6px)}}
.neon-pulso{animation:neon 1.6s ease-in-out infinite}@keyframes neon{0%,100%{opacity:.35}50%{opacity:1}}
.balao.neon .borda{stroke:#e7c56a;stroke-width:2.5px;filter:drop-shadow(0 0 3px #e7c56a) drop-shadow(0 0 9px rgba(231,197,106,.85))}
.cam .bot-g{transition:opacity .4s}.cam.com-neon .bot-g:not(.neon){opacity:.5}.cam.com-neon .balao:not(.neon){opacity:.15}.bot-g.neon .corpo-bot{filter:none;opacity:1}
.vapor path{opacity:.55;animation:vapor 2.6s ease-in-out infinite}@keyframes vapor{0%{opacity:0;transform:translateY(0)}35%{opacity:.8}100%{opacity:0;transform:translateY(-6px)}}
.fluxo{animation:fluxo .9s linear infinite}@keyframes fluxo{to{stroke-dashoffset:-30}}
.passante{pointer-events:none}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
@media (prefers-reduced-motion:reduce){.bot-g:hover .hov{transform:none}}
@media (max-width:1500px){#topo{gap:10px;padding:0 12px}#topo .titulo{font-size:15px;letter-spacing:.08em}.contas{gap:6px}.contas span{padding:0 8px;font-size:12px}#topo .wm b{font-size:12px;letter-spacing:.08em}#topo .wm span{font-size:9px;letter-spacing:.12em}}
@media (max-width:1400px){#topo{flex-wrap:wrap;height:auto;row-gap:8px;padding:8px 12px 10px}.contas{flex:1 0 100%;order:8;margin:0;justify-content:flex-start}.abas{margin-left:auto}}
@media (max-width:1250px){#topo .vsep,#topo .vivo>span:not(.dot):not(#hora){display:none}.contas span{font-size:12px;padding:0 8px;gap:5px}}
@media (max-height:860px){.it{padding:6px 0}.ro{padding:8px 0}.act{padding:7px 0}.card{padding:11px 14px}.mt b{font-size:20px}.mt div{padding:6px 10px}}
.login-wrap{position:relative;z-index:1;min-height:100%;display:grid;place-items:center;padding:20px}
.login{width:100%;max-width:380px;padding:26px}
.login h1{font-family:Orbitron,sans-serif;font-size:19px;letter-spacing:.14em;text-transform:uppercase;margin:0 0 6px}.login p{color:var(--mu);margin:0 0 10px}
.login input{width:100%;padding:11px;margin:6px 0 14px;border-radius:10px;border:1px solid var(--bd);background:rgba(14,12,9,.7);color:var(--wh);font:inherit}
.login .entrar{width:100%;background:linear-gradient(90deg,var(--cy),#b8892e);color:#0c0b09;font-weight:800;border-radius:10px;padding:11px}
.erro{color:var(--rd)!important}
@media (max-width:900px){body{overflow:auto}#app{height:auto;display:flex;flex-direction:column}#topo{flex-wrap:wrap;height:auto;padding:10px 12px}.contas{margin:0;flex-wrap:wrap}#cols{display:flex;flex-direction:column}#C{height:70vh;flex:none}}
.hochips{display:contents}.lista-wrap .rol{flex:1 1 0;min-height:0}
.l1{background:#3dcc7a;box-shadow:0 0 8px #3dcc7a}.l2{background:var(--go);box-shadow:0 0 8px var(--go)}.l3{background:var(--rd);box-shadow:0 0 8px var(--rd)}.l4{background:var(--rest)}.l5{background:#b7b1a4}.l6{background:transparent;box-shadow:none;border:1.5px solid #a39886;box-sizing:border-box}

.emblema{width:42px;height:42px;border-radius:50%;border:1.5px solid rgba(212,175,55,.85);display:grid;place-items:center;font-family:Orbitron,sans-serif;font-weight:800;font-size:11px;letter-spacing:.04em;color:#e7c56a;background:radial-gradient(circle at 40% 35%,#3a3220,#14110c 72%);box-shadow:0 0 0 4px rgba(212,175,55,.08),inset 0 0 12px rgba(212,175,55,.28);text-transform:lowercase;flex:none}
#errs{display:none!important}
.h .ord{margin-left:auto;font-family:Inter,sans-serif;font-weight:500;letter-spacing:0;text-transform:none;color:var(--mu);font-size:12.5px}
.contas .on-done,.contas .on-idle{color:var(--mu);border-color:rgba(138,129,117,.4)}
.tabela tr.s-waiting_user td:first-child{box-shadow:inset 3px 0 0 var(--go)}
.tabela tr.s-error td:first-child{box-shadow:inset 3px 0 0 var(--rd)}
#C .agua{position:absolute;right:5%;bottom:10%;font-family:Orbitron,sans-serif;font-weight:800;font-size:clamp(72px,14vw,150px);letter-spacing:.06em;color:rgba(212,175,55,.05);pointer-events:none;z-index:0;text-transform:lowercase;line-height:1;user-select:none}
#org .hint{margin:2px 4px 12px;padding:10px 12px;border:1px dashed rgba(212,175,55,.45);border-radius:10px;color:#e7d7a1;font-size:13px;line-height:1.45}
#org .cobra-faixa{align-self:center;margin:12px auto 2px;padding:4px 12px;border:1px dashed rgba(212,175,55,.75);border-radius:999px;color:#e7c56a;font:700 12px/1.2 'JetBrains Mono',ui-monospace,monospace;letter-spacing:.02em;background:#14110e;position:relative;z-index:2;white-space:nowrap}
#org .nd.cobra-de{border-style:dashed;border-color:rgba(212,175,55,.8)}
.card.errbox{border-color:rgba(232,93,76,.55)}
.card.errbox .h{color:#e85d4c}
.err-it .ic{width:22px;height:22px;border-radius:50%;background:#e85d4c;color:#1a100c;font-weight:900;display:grid;place-items:center;flex:none;font-size:13px}
.card.parado{border-color:rgba(212,175,55,.4)}
#org .nd.fora.s-working{border-color:rgba(61,204,122,.6)}
`;

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function loginPage(nonce: string, erro?: string): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Painel dos bots — entrar</title><style nonce="${nonce}">${STYLE}</style></head>
<body><div class="login-wrap"><form class="login glass" method="post" action="/login"><h1>Painel dos bots</h1>
<p>Digite a chave de acesso.</p>${erro ? `<p class="erro">${esc(erro)}</p>` : ""}
<input type="password" name="chave" autocomplete="current-password" required autofocus aria-label="Chave">
<button type="submit" class="entrar">Entrar</button></form></div></body></html>`;
}

const CLIENT = String.raw`
(function(){
var TZ='America/Recife',SEM='Sem time',PREFIX='grokbot://app/v1/agent?id=',NS='http://www.w3.org/2000/svg';
var NOME_ST={working:'Trabalhando',idle:'Descansando',waiting_user:'Esperando por mim',error:'Erro',done:'Concluído',none:'Sem status'};
var VERBO={working:'começou',idle:'parou',waiting_user:'pediu você',error:'deu erro',done:'concluiu'};
var COR_ST={working:'#3DCC7A',idle:'#8A8175',waiting_user:'#D4AF37',error:'#E85D4C',done:'#B7B1A4',none:'#6E675C'};
var CORES={violet:'#8b5cf6',blue:'#3b82f6',cyan:'#06b6d4',green:'#22c55e',orange:'#f97316',red:'#ef4444',black:'#2b2b33',gray:'#9ca3af',grey:'#9ca3af'};
var HANDOFF_MS=8000,PARADO_H=12,ASSENTOS_MESA=5;
var st=null,andarSel=null,botSel=null,aba='mapa',fechados={},uid=0,geo=null,sig='',vistos=null,ativos=[],hoTimer=0,slotCopa={},elevCtl=null,orgSelFora=null,orgLay=null;
// transições: troca de andar (1,5 s) e zoom no bot (1 s); com movimento reduzido, só esmaecimento
var RM=window.matchMedia('(prefers-reduced-motion: reduce)'),zoom=null,neon=null,cam0={s:1,x:0,y:0},animCam=false,transAndar=0,ultSel='';
function tf(c){return 'translate('+c.x.toFixed(1)+'px,'+c.y.toFixed(1)+'px) scale('+c.s.toFixed(3)+')';}
function irAndar(nome,bs){var ns=times().map(function(t){return t.nome;}),de=ns.indexOf(andarSel),pa=ns.indexOf(nome);
 if(pa!==de&&de>=0&&aba==='mapa')transAndar=pa>de?1:-1;andarSel=nome;botSel=bs||null;orgSelFora=null;zoom=null;neon=null;cam0={s:1,x:0,y:0};aba='mapa';desenhar();}
// clicar num bot ("falar"): seleciona, dá zoom e liga o neon em volta dele; clicar fora ou Esc solta os dois
function focar(nome){botSel=nome;orgSelFora=null;neon=nome;if(!RM.matches&&zoom!==nome){zoom=nome;animCam=true;}desenhar();}
function soltar(){if(zoom||neon){if(zoom)animCam=true;zoom=null;neon=null;desenhar();}}
var fHora=new Intl.DateTimeFormat('pt-BR',{timeZone:TZ,hour:'2-digit',minute:'2-digit',hour12:false});
var fParts=new Intl.DateTimeFormat('pt-BR',{timeZone:TZ,day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
function el(t,c,txt){var e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=String(txt);return e;}
function sv(t,a,p,txt){var e=document.createElementNS(NS,t);if(a)for(var k in a)e.setAttribute(k,String(a[k]));if(txt!=null)e.textContent=String(txt);if(p)p.appendChild(e);return e;}
function $(id){return document.getElementById(id);}
function hora(iso){var d=new Date(iso);return isNaN(d)?'':fHora.format(d);}
function dm(iso){var d=new Date(iso);if(isNaN(d))return '';var o={};fParts.formatToParts(d).forEach(function(p){o[p.type]=p.value;});return o.day+'/'+o.month+' · '+o.hour+':'+o.minute;}
function ha(iso){if(!iso)return '';var s=Math.round((Date.now()-new Date(iso))/1000);if(s<0)s=0;
 if(s<60)return 'agora';var m=Math.round(s/60);if(m<60)return 'há '+m+' min';var h=Math.round(m/60);if(h<48)return 'há '+h+' h';return 'há '+Math.round(h/24)+' dias';}
function dur(iso){if(!iso)return '';var m=Math.max(0,Math.round((Date.now()-new Date(iso))/60000));if(m<60)return m+' min';var h=Math.floor(m/60);if(h<48)return h+' h '+(m%60)+' min';return Math.round(h/24)+' dias';}
function em(iso){if(!iso)return 'sem próxima';var m=Math.round((new Date(iso)-Date.now())/60000);if(isNaN(m))return '';if(m<=0)return 'agora';
 if(m<60)return 'em '+m+' min';var h=Math.floor(m/60);if(h<24)return 'em '+h+' h'+(m%60?' '+(m%60)+' min':'');return dm(iso);}
function selo(){var s=el('span','selo-velho','pode estar desatualizado');s.title='Esperando há mais de 30 min sem nova atualização de status. Confira no chat do bot.';return s;}
function trunc(s,n){s=String(s);return s.length>n?s.slice(0,n-1)+'…':s;}
function pct(p){return String(p).replace('.',',');}
// ---- cores ----
function hex(c){c=String(c||'').toLowerCase();if(CORES[c])return CORES[c];if(/^#[0-9a-f]{6}$/.test(c))return c;
 if(/^#[0-9a-f]{3}$/.test(c))return '#'+c[1]+c[1]+c[2]+c[2]+c[3]+c[3];return CORES.violet;}
function mix(h,t,a){var r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);
 var x=t?255:0;function f(v){return Math.round(v+(x-v)*a).toString(16).padStart(2,'0');}return '#'+f(r)+f(g)+f(b);}
// ---- formas do app (viewBox 0 0 100 100) ----
function star(cx,cy,R,r){var p=[];for(var i=0;i<10;i++){var a=-Math.PI/2+i*Math.PI/5,q=i%2?r:R;p.push((cx+q*Math.cos(a)).toFixed(1)+','+(cy+q*Math.sin(a)).toFixed(1));}return p.join(' ');}
function formas(s){
 var R=function(x,y,w,h,rx){return ['rect',{x:x,y:y,width:w,height:h,rx:rx}];};
 var P=function(pts,w){return ['polygon',{points:pts,'stroke-width':w||10,'stroke-linejoin':'round',st:1}];};
 var C=function(x,y,r){return ['circle',{cx:x,cy:y,r:r}];};
 switch(s){
  case 'squircle':return [['path',{d:'M50 6C86 6 94 14 94 50C94 86 86 94 50 94C14 94 6 86 6 50C6 14 14 6 50 6Z'}]];
  case 'tablet':return [R(17,4,66,92,20)];
  case 'pill':return [R(21,4,58,92,29)];
  case 'pebble':return [['path',{d:'M47 20C79 17 97 36 96 59C95 83 76 94 50 94C22 94 3 83 4 59C5 37 19 22 47 20Z'}]];
  case 'hex':case 'hexagon':return [P('50,9 89,31 89,71 50,93 11,71 11,31',12)];
  case 'star':return [P(star(50,55,47,24),10)];
  case 'flower':var f=[C(50,52,27)];for(var i=0;i<6;i++){var a=i*Math.PI/3-Math.PI/2;f.push(C(50+27*Math.cos(a),52+27*Math.sin(a),19));}return f;
  case 'house':return [P('50,8 91,43 91,92 9,92 9,43',12)];
  case 'cloud':return [C(31,60,23),C(55,44,28),C(75,62,20),R(9,58,82,36,18)];
  case 'circle':return [C(50,50,45)];
  case 'square':return [R(6,6,88,88,8)];
  case 'rounded':return [R(6,6,88,88,24)];
  case 'triangle':return [P('50,10 92,90 8,90',10)];
  case 'diamond':return [P('50,6 94,50 50,94 6,50',10)];
  default:return [['path',{d:'M50 5C78 4 95 25 94 52C93 79 75 95 49 95C23 95 5 78 6 51C7 24 23 6 50 5Z'}]];
 }}
var OLHO_Y={pebble:56,house:60,cloud:62,flower:50,star:56,triangle:62,tablet:40,pill:40};
function boneco(nome,b,px){
 var look=(b&&b.look)||{},forma=look.shape||'blob',cor=hex(look.color||'violet'),id='b'+(++uid);
 var s=sv('svg',{viewBox:'-8 -14 116 116',width:px,height:px,overflow:'visible'});
 var defs=sv('defs',null,s);
 var g=sv('radialGradient',{id:'g'+id,gradientUnits:'userSpaceOnUse',cx:34,cy:26,r:86},defs);
 sv('stop',{offset:0,'stop-color':mix(cor,1,.45)},g);sv('stop',{offset:.45,'stop-color':cor},g);sv('stop',{offset:1,'stop-color':mix(cor,0,.35)},g);
 var fs=formas(forma),foto=st&&st.avatars&&st.avatars[nome];
 function desenha(par,fill){fs.forEach(function(f){var a={};for(var k in f[1])if(k!=='st')a[k]=f[1][k];a.fill=fill;if(f[1].st)a.stroke=fill;sv(f[0],a,par);});}
 if(foto){
  var cp=sv('clipPath',{id:'c'+id},defs);fs.forEach(function(f){var a={};for(var k in f[1])if(k!=='st')a[k]=f[1][k];if(f[1].st){a.stroke='#000';}sv(f[0],a,cp);});
  desenha(s,cor);
  var im=sv('image',{x:-6,y:-6,width:112,height:112,preserveAspectRatio:'xMidYMid slice','clip-path':'url(#c'+id+')'},s);
  im.setAttribute('href','/avatar/'+encodeURIComponent(nome)+'?v='+encodeURIComponent(foto));
  var hl=sv('radialGradient',{id:'h'+id,gradientUnits:'userSpaceOnUse',cx:32,cy:22,r:70},defs);
  sv('stop',{offset:0,'stop-color':'#fff','stop-opacity':.35},hl);sv('stop',{offset:.5,'stop-color':'#fff','stop-opacity':0},hl);
  var o=sv('g',{'clip-path':'url(#c'+id+')'},s);sv('rect',{x:0,y:0,width:100,height:100,fill:'url(#h'+id+')'},o);
 }else{
  desenha(s,'url(#g'+id+')');
  sv('ellipse',{cx:33,cy:24,rx:13,ry:7,fill:'#fff','fill-opacity':.35,transform:'rotate(-25 33 24)'},s);
  var ey=OLHO_Y[forma]||44,dk=cor==='#2b2b33'?'#0b0b0f':'#1b1530';
  [38,62].forEach(function(x){sv('ellipse',{cx:x,cy:ey,rx:8.5,ry:10.5,fill:'#fff'},s);sv('circle',{cx:x+1.5,cy:ey+2.5,r:4.6,fill:dk},s);sv('circle',{cx:x+3,cy:ey,r:1.5,fill:'#fff'},s);});
 }
 var ac=look.accessory;
 if(ac==='antenna'){sv('line',{x1:50,y1:7,x2:50,y2:-6,stroke:mix(cor,0,.3),'stroke-width':3},s);sv('circle',{cx:50,cy:-8,r:5,fill:'#facc15'},s);}
 else if(ac==='glasses'){var ey2=(OLHO_Y[forma]||44);[38,62].forEach(function(x){sv('circle',{cx:x,cy:ey2,r:12,fill:'none',stroke:'#111','stroke-width':3},s);});sv('line',{x1:50,y1:ey2,x2:50,y2:ey2,stroke:'#111'},s);}
 else if(ac==='bow'){sv('polygon',{points:'50,10 34,0 34,20',fill:'#f43f5e'},s);sv('polygon',{points:'50,10 66,0 66,20',fill:'#f43f5e'},s);sv('circle',{cx:50,cy:10,r:4,fill:'#be123c'},s);}
 else if(ac==='stem'||ac==='leaf'){sv('path',{d:'M50 8C50 0 54 -6 60 -8C60 -2 56 4 50 8Z',fill:'#16a34a'},s);}
 else if(ac==='hat'){sv('rect',{x:30,y:-6,width:40,height:14,rx:3,fill:'#111'},s);sv('rect',{x:22,y:6,width:56,height:5,rx:2,fill:'#111'},s);}
 return s;}
// ---- dados ----
function lista(){var bots=st.bots||{};return (st.roster?st.roster.slice():Object.keys(bots));}
function bot(n){return (st.bots||{})[n]||{};}
function stt(n){return bot(n).status||'none';}
function times(){var t={};lista().forEach(function(n){var k=bot(n).team||SEM;(t[k]=t[k]||[]).push(n);});
 var ordem=floorOrder(Object.keys(t),st.floors);return ordem.map(function(k){return {nome:k,bots:t[k].sort(function(a,b){return a.localeCompare(b,'pt-BR');})};});}
function chatOk(n){var c=bot(n).chat;return typeof c==='string'&&c.indexOf(PREFIX)===0?c:null;}
function linkChat(n,cls,txt){var c=chatOk(n);if(!c)return null;var a=el('a',cls||'bt',txt||'Abrir chat');a.href=c;a.addEventListener('click',function(e){e.stopPropagation();});return a;}
function mini(nome,px){var s=boneco(nome,bot(nome),px||26);s.setAttribute('class','mini');return s;}
// ---- fundo (Neural Constellation) e cantos HUD ----
function fundo(){var g=$('bg');g.replaceChildren();var W=1920,H=1080;g.setAttribute('viewBox','0 0 '+W+' '+H);g.setAttribute('preserveAspectRatio','xMidYMid slice');
 var d=sv('defs',null,g);
 var r=sv('radialGradient',{id:'bg1',cx:.5,cy:.0,r:.75},d);sv('stop',{offset:0,'stop-color':'#3a2e18','stop-opacity':.45},r);sv('stop',{offset:1,'stop-color':'#3a2e18','stop-opacity':0},r);
 sv('rect',{width:W,height:H,fill:'#0c0b09'},g);sv('rect',{width:W,height:H,fill:'url(#bg1)'},g);}
function moldura(){var f=$('frame'),W=window.innerWidth,H=window.innerHeight,L=28,m=10;f.replaceChildren();f.setAttribute('viewBox','0 0 '+W+' '+H);
 [[m,m,1,1],[W-m,m,-1,1],[m,H-m,1,-1],[W-m,H-m,-1,-1]].forEach(function(c){var x=c[0],y=c[1],sx=c[2],sy=c[3];
  sv('path',{d:'M'+x+' '+(y+sy*L)+' V'+y+' H'+(x+sx*L),stroke:'#d4af37','stroke-width':1.4,fill:'none','stroke-opacity':.35},f);});}
// ---- cena isométrica (escritório + copa) ----
var A=27,B=16,Z=32,OX=442,OY=198,WW=22,WH=3.5,TH=0.5,EV0=6.5,EV1=7.9;
function P(x,y,z){return [OX+(x-y)*A,OY+(x+y)*B-(z||0)*Z];}
function pt(a){return a.map(function(p){return P(p[0],p[1],p[2]).map(function(v){return v.toFixed(1);}).join(',');}).join(' ');}
function quad(par,a,fill,extra){var o={points:pt(a),fill:fill};if(extra)for(var k in extra)o[k]=extra[k];return sv('polygon',o,par);}
function caixa(par,x0,y0,z0,x1,y1,z1,top,fy,fx,stroke,sw){
 var s=stroke?{stroke:stroke,'stroke-width':sw||1,'stroke-linejoin':'round'}:null;
 quad(par,[[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]],fy,s);
 quad(par,[[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]],fx,s);
 quad(par,[[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]],top,s);}
function grad(defs,id,cor,a){var r=sv('radialGradient',{id:id},defs);sv('stop',{offset:0,'stop-color':cor,'stop-opacity':a},r);sv('stop',{offset:1,'stop-color':cor,'stop-opacity':0},r);}
function lin(defs,id,c1,c2,x2,y2){var r=sv('linearGradient',{id:id,x1:0,y1:0,x2:x2,y2:y2},defs);sv('stop',{offset:0,'stop-color':c1},r);sv('stop',{offset:1,'stop-color':c2},r);}
function planta(par,x,y){var g=sv('g',null,par);caixa(g,x-.35,y-.35,0,x+.35,y+.35,.55,'#3a3228','#241c16','#1a1612','#d4af37',.6);
 var c=P(x,y,.55);[[-.4,-1.0,.3,.6,-20],[.35,-.95,.28,.55,25],[0,-1.4,.27,.65,0],[-.55,-.5,.32,.45,-50],[.5,-.45,.32,.45,50]].forEach(function(f,i){
  sv('ellipse',{cx:c[0]+f[0]*34,cy:c[1]+f[1]*34,rx:f[2]*34,ry:f[3]*34,fill:i%2?'#0E8F6E':'#17B58A',transform:'rotate('+f[4]+' '+(c[0]+f[0]*34)+' '+(c[1]+f[1]*34)+')',stroke:'#1FE0A8','stroke-opacity':.5},g);});return g;}
// cadeira de escritório: base com rodízios, haste, assento, encosto e braços (voltada para +y)
function cadeira(par,x,y,cor){var g=sv('g',null,par),c0=P(x,y,0);
 sv('ellipse',{cx:c0[0],cy:c0[1]+2,rx:22,ry:9,fill:'#000','fill-opacity':.35,filter:'url(#b3)'},g);
 [[-.6,0],[.6,0],[0,.6],[0,-.6],[.42,.42]].forEach(function(d){var a=P(x,y,.18),b=P(x+d[0],y+d[1],.05);sv('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:'#5c4a38','stroke-width':3,'stroke-linecap':'round'},g);var w=P(x+d[0],y+d[1],.03);sv('circle',{cx:w[0],cy:w[1],r:2.6,fill:'#14110e',stroke:'#a08040'},g);});
 var h0=P(x,y,.18),h1=P(x,y,.62);sv('line',{x1:h0[0],y1:h0[1],x2:h1[0],y2:h1[1],stroke:'#8a7040','stroke-width':4},g);
 caixa(g,x-.6,y-.72,.78,x+.6,y-.52,1.95,cor,'#2a241c','#1e1a14','#d4af37',.9);
 caixa(g,x-.62,y-.5,.55,x+.62,y+.62,.72,cor,'#3a3228','#221c16','#a08040',.9);
 [-1,1].forEach(function(s){caixa(g,x+s*.62-.07,y-.4,.72,x+s*.62+.07,y+.4,1.05,'#4a3e30','#3a3228','#221c16','#a08040',.6);});return g;}
function mesa(par,x0,x1,y0,y1){var g=sv('g',null,par),h=.95;
 [[x0+.15,y0+.15],[x1-.35,y0+.15],[x0+.15,y1-.35],[x1-.35,y1-.35]].forEach(function(p){caixa(g,p[0],p[1],0,p[0]+.2,p[1]+.2,h,'#3a3228','#241c16','#1a1612');});
 quad(g,[[x0+.1,y0+.2,0],[x1+.2,y0+.2,0],[x1+.2,y1+.3,0],[x0+.1,y1+.3,0]],'#000',{'fill-opacity':.22});
 caixa(g,x0,y0,h,x1,y1,h+.1,'#4a3c2a','#2a241c','#1e1a14','#d4af37',1.1);
 sv('polyline',{points:pt([[x0,y1,h+.1],[x1,y1,h+.1]]),stroke:'#d4af37','stroke-width':2,'stroke-opacity':.8,fill:'none'},g);return g;}
// monitor visto por trás + teclado; x,y = centro; tela virada para -y (para o bot)
function monitor(par,x,y,s){var g=sv('g',null,par),z=1.05,on=s==='working',col=s==='error'?'#e85d4c':s==='waiting_user'?'#D4AF37':'#d4af37';
 caixa(g,x-.32,y-.2,z,x+.32,y+.2,z+.06,'#2e2820','#1a1612','#14110e','#a08040',.6);
 caixa(g,x-.07,y-.05,z+.06,x+.07,y+.08,z+.45,'#2e2820','#1a1612','#14110e');
 caixa(g,x-.8,y-.07,z+.38,x+.8,y+.07,z+1.18,'#100e0c','#16130f','#100e0c',on?'#d4af37':'#8a7040',on?1.3:.9);
 var c=P(x,y+.07,z+.78);sv('circle',{cx:c[0],cy:c[1],r:2.4,fill:on?'#d4af37':(s==='error'||s==='waiting_user')?col:'#4a3e2e'},g);
 quad(g,[[x-.55,y-.78,z],[x+.55,y-.78,z],[x+.55,y-.48,z],[x-.55,y-.48,z]],'#1a1612',{stroke:on?'#d4af37':'#6b5438','stroke-width':.8});
 for(var k=0;k<5;k++)sv('polyline',{points:pt([[x-.5+k*.25,y-.74,z],[x-.5+k*.25,y-.52,z]]),stroke:on?'#d4af37':'#8a7040','stroke-opacity':.5,fill:'none'},g);return g;}
// xícara de café (com vapor opcional); x,y,z na cena
function caneca(par,x,y,z,vapor){var g=sv('g',{class:'caneca'},par),b=P(x,y,z);
 if(vapor){var vg=sv('g',{class:'vapor'},g);[-3,3].forEach(function(d,i){var pa=sv('path',{d:'M'+(b[0]+d)+' '+(b[1]-12)+' q 4 -6 0 -12 q -4 -6 0 -12',fill:'none',stroke:'#E8D9A0','stroke-opacity':.7,'stroke-width':1.6,'stroke-linecap':'round'},vg);pa.style.animationDelay=(-i*1.3)+'s';});}
 sv('rect',{x:b[0]-6,y:b[1]-11,width:12,height:11,rx:2.5,fill:'#f6f1e6',stroke:'#e7d7a8'},g);
 sv('ellipse',{cx:b[0],cy:b[1]-11,rx:6,ry:2.2,fill:'#6B4A1E'},g);sv('path',{d:'M'+(b[0]+6)+' '+(b[1]-8)+' q 5 0 5 4 q 0 4 -5 3',fill:'none',stroke:'#e7d7a8','stroke-width':1.8},g);return g;}
// neon: cópia do bot atrás dele com o filtro (vira contorno + brilho) e anel no chão; pulsa (fixo com movimento reduzido)
function neonHalo(par,nome,tam,x,y){var g=sv('g',{class:'neon-halo',filter:'url(#neon)'},par),fig=boneco(nome,bot(nome),tam);
 fig.setAttribute('x',x.toFixed(1));fig.setAttribute('y',y.toFixed(1));g.appendChild(fig);return g;}
function neonAnel(par,cx,cy){var g=sv('g',{class:'neon-chao'},par);
 sv('ellipse',{cx:cx,cy:cy,rx:44,ry:19,fill:'#e7c56a','fill-opacity':.4,filter:'url(#b8)'},g);
 sv('ellipse',{cx:cx,cy:cy,rx:34,ry:14,fill:'none',stroke:'#e7c56a','stroke-width':3.5,filter:'url(#neon)'},g);
 sv('ellipse',{cx:cx,cy:cy,rx:34,ry:14,fill:'none',stroke:'#fff6d8','stroke-width':1.6,class:'neon-pulso'},g);return g;}
// lugares da copa, do mais confortável ao em pé: [tipo, x, y]
var COPA=[['sofa',16.9,7.3],['sofa',16.9,8.7],['sofa',16.9,10.0],['pol',18.8,5.4],['pol',21.0,5.4],
 ['puff',19.0,13.7],['puff',16.4,12.6],['puff',21.0,12.2],['puff',21.1,9.9],
 ['banq',15.4,2.8],['banq',17.3,2.8],['banq',19.2,2.8],['banq',21.1,2.8],
 ['stand',14.6,7.6],['stand',14.6,9.6],['stand',14.6,5.6],['stand',14.6,11.6],['stand',17.2,4.6],['stand',21.0,7.4],['stand',20.0,11.1],['stand',15.6,14.2],['stand',18.0,14.4]];
function lugarCopa(i){if(i<COPA.length)return COPA[i];var k=i-COPA.length;return ['stand',15.2+(k%6)*1.25,4.4+Math.floor(k/6)*1.5+(k%2)*.3];}
var COPA_Z={banq:.85,sofa:.68,pol:.62,puff:.55,stand:0};
function cena(lista){
 var svg=$('cena'),velho=transAndar&&!RM.matches?svg.querySelector('.cam'):null;svg.replaceChildren();
 var n=lista.length,ND=Math.max(1,Math.ceil(n/ASSENTOS_MESA)),D=Math.max(15.5,2.6+(ND-1)*3.5+2.0),W=WW;
 var defs=sv('defs',null,svg);
 [['b3',3],['b8',8],['b16',16]].forEach(function(f){var fl=sv('filter',{id:f[0],x:'-100%',y:'-100%',width:'300%',height:'300%'},defs);sv('feGaussianBlur',{stdDeviation:f[1]},fl);});
 // neon do bot em foco: contorno ciano do formato do bot + brilho ciano (halo roxo largo por fora)
 var fn=sv('filter',{id:'neon',x:'-80%',y:'-80%',width:'260%',height:'260%'},defs);
 sv('feMorphology',{in:'SourceAlpha',operator:'dilate',radius:2.4,result:'d'},fn);
 sv('feFlood',{'flood-color':'#e7c56a',result:'c'},fn);sv('feComposite',{in:'c',in2:'d',operator:'in',result:'contorno'},fn);
 sv('feFlood',{'flood-color':'#d4af37',result:'r'},fn);sv('feComposite',{in:'r',in2:'d',operator:'in',result:'roxo'},fn);
 sv('feGaussianBlur',{in:'roxo',stdDeviation:11,result:'b0'},fn);sv('feGaussianBlur',{in:'contorno',stdDeviation:5,result:'b1'},fn);
 sv('feGaussianBlur',{in:'contorno',stdDeviation:1.8,result:'b2'},fn);var fm=sv('feMerge',null,fn);
 ['b0','b0','b1','b1','b2','contorno'].forEach(function(r){sv('feMergeNode',{in:r},fm);});
 lin(defs,'floor','#241c14','#100e0b',1,1);lin(defs,'win','#3a2e1c','#1a140e',0,1);lin(defs,'ho','#00F0FF','#6366F1',1,0);
 // enquadramento: caixa da sala + folga (rótulos em cima, legenda embaixo)
 var cs=[P(0,0,WH),P(W,0,WH),P(0,D,WH),P(W,D,-TH),P(0,D,-TH),P(W,0,0)];
 var minx=Math.min.apply(null,cs.map(function(c){return c[0];}))-16,maxx=Math.max.apply(null,cs.map(function(c){return c[0];}))+16;
 var miny=Math.min.apply(null,cs.map(function(c){return c[1];}))-78,maxy=Math.max.apply(null,cs.map(function(c){return c[1];}))+58;
 var VW=maxx-minx,VH=maxy-miny;svg.setAttribute('viewBox',minx.toFixed(1)+' '+miny.toFixed(1)+' '+VW.toFixed(1)+' '+VH.toFixed(1));
 var vb={x0:minx,y0:miny,x1:maxx,y1:maxy};
 var cam=sv('g',{class:'cam'},svg),mov=sv('g',{class:'mov'},cam),G0=sv('g',null,mov);
 // ---- piso e paredes ----
 quad(G0,[[0,D,0],[W,D,0],[W,D,-TH],[0,D,-TH]],'#1a1612',{stroke:'rgba(160,128,64,.7)'});
 quad(G0,[[W,0,0],[W,D,0],[W,D,-TH],[W,0,-TH]],'#221c16',{stroke:'rgba(212,175,55,.55)'});
 quad(G0,[[0,0,0],[W,0,0],[W,D,0],[0,D,0]],'url(#floor)',{stroke:'#d4af37','stroke-opacity':.7,'stroke-width':1.5});
 for(var i=2;i<W;i+=2)sv('polyline',{points:pt([[i,0,0],[i,D,0]]),stroke:'#d4af37','stroke-opacity':.07,fill:'none'},G0);
 for(var j=2;j<D;j+=2)sv('polyline',{points:pt([[0,j,0],[W,j,0]]),stroke:'#d4af37','stroke-opacity':.07,fill:'none'},G0);
 quad(G0,[[14,0,0],[W,0,0],[W,D,0],[14,D,0]],'#D4AF37',{'fill-opacity':.05});
 sv('polyline',{points:pt([[14,0,0],[14,D,0]]),stroke:'#D4AF37','stroke-opacity':.55,'stroke-dasharray':'6 5',fill:'none','stroke-width':1.4},G0);
 quad(G0,[[0,0,0],[W,0,0],[W,0,WH],[0,0,WH]],'#14110e',{stroke:'rgba(212,175,55,.45)'});
 quad(G0,[[0,0,0],[0,D,0],[0,D,WH],[0,0,WH]],'#100e0c',{stroke:'rgba(212,175,55,.45)'});
 sv('polyline',{points:pt([[0,0,WH],[W,0,WH]]),stroke:'#d4af37','stroke-width':2.2,fill:'none',opacity:.9},G0);
 sv('polyline',{points:pt([[0,0,WH],[0,D,WH]]),stroke:'#a08040','stroke-width':2.2,fill:'none',opacity:.9},G0);
 function janela(plane,a,b,z0,z1,seed){
  var mk=function(u,z){return plane==='y'?[u,0,z]:[0,u,z];};
  quad(G0,[mk(a,z0),mk(b,z0),mk(b,z1),mk(a,z1)],'url(#win)',{stroke:'#d4af37','stroke-opacity':.55});
  var s2=seed,rr=function(){return (s2=(s2*16807)%2147483647)/2147483647;};
  for(var q=0;q<3;q++){var u0=a+(b-a)*q/3+.06,u1=a+(b-a)*(q+1)/3-.06,h=.25+rr()*.55;
   quad(G0,[mk(u0,z0+.04),mk(u1,z0+.04),mk(u1,z0+.04+h),mk(u0,z0+.04+h)],'#241c14');
   for(var k=0;k<3;k++){var uu=u0+(u1-u0)*(.2+rr()*.6),zz=z0+.1+rr()*h*.8,c=P.apply(null,mk(uu,zz));sv('circle',{cx:c[0],cy:c[1],r:1.3,fill:rr()>.5?'#D4AF37':'#d4af37','fill-opacity':.8},G0);}}
  var m=(a+b)/2;sv('polyline',{points:pt([mk(m,z0),mk(m,z1)]),stroke:'#d4af37','stroke-opacity':.5,fill:'none'},G0);}
 for(var x=1;x<13.6;x+=2.6)janela('y',x,x+2.1,1.1,3.05,Math.round(x*997)+3);
 var jan=[1.2,3.8];for(var yw=13.6;yw<D-1;yw+=2.6)jan.push(yw);jan.forEach(function(y){janela('x',y,y+2.1,1.1,3.05,Math.round(y*811)+9);});
 // monitor de parede (painel de status do andar) na parede esquerda
 var nW=0,nA=0;lista.forEach(function(nn){var s=stt(nn);if(s==='working')nW++;if(s==='waiting_user')nA++;});
 (function(){var y0=9.0,y1=13.0,z0=1.2,z1=2.9,mk=function(u,z){return [0,u,z];};
  quad(G0,[mk(y0,z0),mk(y1,z0),mk(y1,z1),mk(y0,z1)],'#100e0c',{stroke:'#a08040','stroke-width':1.6});
  [[.3,'#d4af37',.4+1.9*nW/Math.max(1,n),2.55],[.3,'#D4AF37',.4+1.9*nA/Math.max(1,n),2.17],[.3,'#a08040',1.1,1.79]].forEach(function(b){quad(G0,[mk(y0+b[0],b[3]),mk(y0+b[0]+b[2],b[3]),mk(y0+b[0]+b[2],b[3]-.15),mk(y0+b[0],b[3]-.15)],b[1],{'fill-opacity':.85});});
  for(var k=0;k<6;k++){var h=.15+((k*37)%7)/7*.5;quad(G0,[mk(y0+2.2+k*.28,1.35),mk(y0+2.4+k*.28,1.35),mk(y0+2.4+k*.28,1.35+h),mk(y0+2.2+k*.28,1.35+h)],'#d4af37',{'fill-opacity':.7});}})();
 // elevador na parede da esquerda (por onde entra/sai quem passa tarefa a outro andar): portas recortadas no vão e painel de andar com seta
 // Desempenho: nada aqui tem filtro nem animação CSS; só muda transform (portas) e opacity/display (painel), em elevPoe.
 var ey0=EV0,ey1=EV1,emd=(ey0+ey1)/2,EZ=2.1,eg=sv('g',{class:'elevador'},G0);
 quad(eg,[[0,ey0-.07,0],[0,ey1+.07,0],[0,ey1+.07,2.3],[0,ey0-.07,2.3]],'#3a3228',{stroke:'#d4af37','stroke-opacity':.7});
 quad(eg,[[0,ey0,0],[0,ey1,0],[0,ey1,EZ],[0,ey0,EZ]],'#0c0b09');
 quad(eg,[[0,ey0,0],[0,ey1,0],[0,ey1,.14],[0,ey0,.14]],'#3a3228');
 quad(eg,[[0,ey0+.06,EZ-.17],[0,ey1-.06,EZ-.17],[0,ey1-.06,EZ-.08],[0,ey0+.06,EZ-.08]],'#FFE9A8');
 var vc=sv('clipPath',{id:'vaoElev'},defs);quad(vc,[[0,ey0,0],[0,ey1,0],[0,ey1,EZ],[0,ey0,EZ]],'#000');
 var vg=sv('g',{'clip-path':'url(#vaoElev)'},eg),pE=sv('g',{class:'porta-elev'},vg),pD=sv('g',{class:'porta-elev'},vg);
 quad(pE,[[0,ey0,0],[0,emd,0],[0,emd,EZ],[0,ey0,EZ]],'#4a3e30',{stroke:'#a08040','stroke-opacity':.8,'stroke-width':.8});quad(pD,[[0,emd,0],[0,ey1,0],[0,ey1,EZ],[0,emd,EZ]],'#5c4632',{stroke:'#a08040','stroke-opacity':.8,'stroke-width':.8});
 var pz=2.4,pn=sv('g',{class:'painel-elev'},eg);quad(pn,[[0,emd-.4,pz],[0,emd+.4,pz],[0,emd+.4,pz+.5],[0,emd-.4,pz+.5]],'#100e0c',{stroke:'#d4af37','stroke-width':1});
 var luz=sv('g',{class:'luz-elev'},pn);
 var sCima=quad(luz,[[0,emd+.3,pz+.1],[0,emd+.1,pz+.1],[0,emd+.2,pz+.4]],'#d4af37',{class:'seta-sobe',display:'none'});
 var sBaixo=quad(luz,[[0,emd+.3,pz+.4],[0,emd+.1,pz+.4],[0,emd+.2,pz+.1]],'#d4af37',{class:'seta-desce',display:'none'});
 var tp0=P(0,emd-.05,pz+.12),nEl=sv('text',{transform:'matrix('+A+' '+(-B)+' 0 '+Z+' '+tp0[0].toFixed(1)+' '+tp0[1].toFixed(1)+')',fill:'#d4af37','font-size':.34,'font-weight':800,'text-anchor':'middle','font-family':'JetBrains Mono,monospace'},luz);
 var elevEls={pE:pE,pD:pD,cima:sCima,baixo:sBaixo,num:nEl,luz:luz,w:(emd-ey0)*.96};
 // placas no piso
 var rects=[];
 // texto do mapa vira obstáculo para os balões: o retângulo do texto (já inclinado pela matriz) é fatiado para não bloquear o que está vazio
 function obstTexto(t,m,sz){var w=0;try{w=t.getBBox().width;}catch(e){w=0;}if(!(w>0))w=(t.textContent||'').length*sz*.8;var n=Math.max(2,Math.ceil(w/(sz*1.5))),k;
  for(k=0;k<n;k++){var xa=w*k/n,xb=w*(k+1)/n,xs=[],ys=[];[[xa,-sz*.85],[xb,-sz*.85],[xb,sz*.15],[xa,sz*.15]].forEach(function(q){xs.push(m[0]*q[0]+m[2]*q[1]+m[4]);ys.push(m[1]*q[0]+m[3]*q[1]+m[5]);});
   var x1=Math.min.apply(null,xs),y1=Math.min.apply(null,ys);rects.push({nome:'',texto:1,x:x1,y:y1,w:Math.max.apply(null,xs)-x1,h:Math.max.apply(null,ys)-y1});}}
 function pisoTexto(txt,x,y,sz,col){var p0=P(x,y),m=[A,B,-A,B,p0[0],p0[1]],t=sv('text',{transform:'matrix('+m.join(' ')+')','font-family':'Orbitron','font-weight':800,'font-size':sz,fill:col,'letter-spacing':'.08','fill-opacity':.9},G0,txt);obstTexto(t,m,sz);return t;}
 pisoTexto('ÁREA DE TRABALHO',1.0,D-.45,.45,'#d4af37');pisoTexto('COPA · DESCANSO',14.4,D-.45,.45,'#D4AF37');
 // luz dourada ambiente da copa e tapete
 [[17.6,8.6,6.5,3.6],[18.6,2.8,5,2.2]].forEach(function(l){var c=P(l[0],l[1]);sv('ellipse',{cx:c[0],cy:c[1],rx:l[2]*A*1.2,ry:l[3]*B*2.2,fill:'#D4AF37','fill-opacity':.2,filter:'url(#b16)'},G0);});
 (function(){var cx=18.2,cy=8.8,rx=3.3,ry=4.6,nn=48,pts_=[];for(var i2=0;i2<nn;i2++){var a=i2/nn*Math.PI*2;pts_.push([cx+rx*Math.cos(a),cy+ry*Math.sin(a),.01]);}
  quad(G0,pts_,'#2a2418',{stroke:'#D4AF37','stroke-opacity':.7,'stroke-width':1.4});
  quad(G0,pts_.map(function(p){return [cx+(p[0]-cx)*.72,cy+(p[1]-cy)*.72,.02];}),'none',{stroke:'#a08040','stroke-opacity':.6,'stroke-dasharray':'4 4'});})();
 // ---- objetos (painter) ----
 var OBJ=[],add=function(k,f){OBJ.push({k:k,f:f});};
 var bals=[],bgs={},pos={},objPar=sv('g',null,mov),seat={},copaP={},ais=[],balEl={};
 // desenha um bot (na mesa ou na copa): grupo clicável, brilho de status, anel de seleção e dica no hover
 function poeBot(par,nome,x,y,z,tam,copa,cup){var b=bot(nome),s=stt(nome),base=P(x,y,z),fp=P(x,y,copa?z:0);
  var emNeon=nome===neon,bg=sv('g',{class:'bot-g '+s+(copa?' cafe':'')+(emNeon?' neon':'')},par);bgs[nome]=bg;
  bg.addEventListener('click',function(ev){ev.stopPropagation();focar(nome);});
  bg.addEventListener('mouseenter',function(){dica(nome);});bg.addEventListener('mouseleave',function(){dica(null);});
  var col=s==='working'||s==='waiting_user'||s==='error'?COR_ST[s]:null,f0=P(x,y,0);
  if(col){sv('ellipse',{cx:f0[0],cy:f0[1]+2,rx:66,ry:30,fill:col,'fill-opacity':s==='working'?.4:.32,filter:'url(#b8)'},bg);
   sv('ellipse',{cx:f0[0],cy:f0[1]+2,rx:44,ry:19,fill:'none',stroke:col,'stroke-width':1.6,'stroke-dasharray':'5 4','stroke-opacity':.85},bg);
   sv('ellipse',{cx:f0[0],cy:f0[1]+2,rx:36,ry:15,fill:'none',stroke:col,'stroke-width':2,class:s==='working'?'brilho':'anel'},bg);
   var mc=[base[0],base[1]-tam*.5];sv('circle',{cx:mc[0],cy:mc[1],r:tam*.78,fill:col,'fill-opacity':.28,filter:'url(#b8)'},bg);}
  else{sv('ellipse',{cx:fp[0],cy:fp[1]+1,rx:19,ry:7,fill:'#000','fill-opacity':.35,filter:'url(#b3)'},bg);if(z===0)sv('ellipse',{cx:fp[0],cy:fp[1]+2,rx:30,ry:12,fill:'#D4AF37','fill-opacity':.14,stroke:'#D4AF37','stroke-opacity':.6},bg);}
  if(emNeon)neonAnel(bg,fp[0],fp[1]+2);
  var hv=sv('g',{class:'hov'},bg),corpo=sv('g',{class:'corpo-bot'},hv),rs=sv('g',{class:'respira'},corpo),hs=0;
  for(var hi=0;hi<nome.length;hi++)hs=(hs*31+nome.charCodeAt(hi))%997;rs.style.animationDelay=(-((hs/97+Date.now()/1000)%3.2)).toFixed(2)+'s';
  var fig=boneco(nome,b,tam),fx=base[0]-tam/2,fy=base[1]-tam*.98;fig.setAttribute('x',fx.toFixed(1));fig.setAttribute('y',fy.toFixed(1));
  if(emNeon)hv.insertBefore(neonHalo(null,nome,tam,fx,fy),corpo);rs.appendChild(fig);
  if(cup)caneca(bg,x+.55,y+.2,z+.1,true);
  if(s==='error'||s==='waiting_user'){var bd=COR_ST[s],bx=base[0]+tam*.42,by=base[1]-tam*.95;sv('circle',{cx:bx,cy:by,r:10,fill:bd,stroke:'#0c0b09','stroke-width':2},bg);
   sv('text',{x:bx,y:by+4.5,'text-anchor':'middle','font-size':13,'font-weight':900,fill:'#0c0b09'},bg).textContent=s==='error'?'!':'?';}
  if(nome===botSel&&!emNeon)sv('ellipse',{cx:f0[0],cy:f0[1]+2,rx:46,ry:19,fill:'rgba(212,175,55,.12)',stroke:'#D4AF37','stroke-width':2},bg);
  var tt=sv('title',null,bg),fb=frescor(b.status_at,s,Date.now());tt.textContent=nome+' · '+NOME_ST[s]+(b.step?' · '+b.step:'')+' · '+fb.texto+(fb.velho?' · pode estar desatualizado':'');
  pos[nome]={x:base[0],y:base[1]-tam*.7,top:base[1]-tam,fx:f0[0],fy:f0[1]};rects.push({nome:nome,x:base[0]-tam*.5,y:base[1]-tam,w:tam,h:tam+8});
  if(s==='working'||s==='waiting_user'||s==='error')bals.push({nome:nome,s:s,at:b.status_at,step:b.step,x:base[0],y:base[1]-tam,tam:tam});
  return bg;}
 // ================= ÁREA DE TRABALHO: mesas de 5 estações (cada bot tem a sua, pelo lugar na lista do andar) =================
 var XS=[2.0,4.3,6.6,8.9,11.2],TX0=.9,TX1=12.3;
 for(var t=0;t<ND;t++){var ty=2.6+t*3.5;ais.push(ty-1.75);var sy=ty-.9,ne=Math.min(ASSENTOS_MESA,n-t*ASSENTOS_MESA),tx1=ne>=ASSENTOS_MESA?TX1:XS[ne-1]+1.2;
  for(var s2=0;s2<ne;s2++)(function(t,s2,ty,sy){var nome=lista[t*ASSENTOS_MESA+s2],x=XS[s2],senta=sentaNaMesa(stt(nome));if(senta)seat[nome]={x:x,y:sy+.05,ay:sy-.85,z:.7};
   add(1000+t*10+.1+s2*.01,function(){var g=sv('g',null,objPar);cadeira(g,x,senta?sy:sy-.25,senta?'#5c4632':'#3a2e24');if(senta)poeBot(g,nome,x,sy+.05,.7,64,0,0);});
   add(1000+t*10+.6+s2*.01,function(){var g=sv('g',null,objPar);monitor(g,x,ty+.55,senta?stt(nome):'idle');if(!senta&&s2%2===0)caneca(g,x+.9,ty+.4,1.05,false);});})(t,s2,ty,sy);
  (function(t,ty,tx1){add(1000+t*10+.5,function(){mesa(objPar,TX0,tx1,ty,ty+1.3);});})(t,ty,tx1);}
 add(2.2,function(){planta(objPar,1.2,1.0);});add(14.3,function(){planta(objPar,13.3,1.0);});
 // ================= COPA =================
 add(2003,function(){var g=sv('g',null,objPar);
  [2.0,2.8].forEach(function(z){quad(g,[[15.2,.02,z],[21.2,.02,z],[21.2,.5,z],[15.2,.5,z]],'#3a3228',{stroke:'#D4AF37','stroke-opacity':.8});
   sv('polyline',{points:pt([[15.2,.52,z],[21.2,.52,z]]),stroke:'#D4AF37','stroke-width':2,'stroke-opacity':.9,fill:'none'},g);
   for(var q=0;q<9;q++){var c=P(15.6+q*.65,.3,z);sv('rect',{x:c[0]-4,y:c[1]-8,width:8,height:8,rx:2,fill:q%3?'#f6f1e6':'#e7d7a8','fill-opacity':.85},g);}});
  var t0=P(17.0,0,3.3),tm='matrix('+A+' '+B+' 0 '+(Z*.9)+' '+t0[0]+' '+t0[1]+')';
  sv('text',{transform:tm,'font-family':'Orbitron','font-weight':800,'font-size':.9,fill:'#D4AF37','letter-spacing':'.12',filter:'url(#b3)','fill-opacity':.8},g,'COPA');
  obstTexto(sv('text',{transform:tm,'font-family':'Orbitron','font-weight':800,'font-size':.9,fill:'#FFF3C4','letter-spacing':'.12'},g,'COPA'),[A,B,0,Z*.9,t0[0],t0[1]],.9);
  caixa(g,15.0,.35,0,21.2,1.7,1.1,'#3a3228','#241c16','#1a1612','#d4af37',.9);
  caixa(g,15.0,.35,1.1,21.2,1.7,1.2,'#3a3228','#2e2820','#221c16','#D4AF37',1.2);
  [16.2,17.4,18.6,19.8].forEach(function(x){var a=P(x,1.72,.15),b=P(x,1.72,.95);sv('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:'#d4af37','stroke-width':1.5,'stroke-opacity':.5},g);});
  caixa(g,15.4,.6,1.2,16.4,1.3,1.75,'#4a3e30','#241c16','#1a1612','#d4af37',1);
  var lc=P(15.9,1.31,1.5);sv('circle',{cx:lc[0],cy:lc[1],r:3,fill:'#D4AF37'},g);sv('circle',{cx:lc[0]+10,cy:lc[1],r:3,fill:'#d4af37'},g);
  caneca(g,17.0,1.2,1.2,true);caneca(g,17.8,1.0,1.2,false);caneca(g,19.4,1.3,1.2,true);[[19.8,1.05],[20.6,1.2]].forEach(function(p){caneca(g,p[0],p[1],1.2,false);});});
 function banquinho(x,y){add(2010+x+y,function(){var g=sv('g',null,objPar),f=P(x,y,0),t2=P(x,y,.85);
  sv('ellipse',{cx:f[0],cy:f[1]+2,rx:16,ry:6,fill:'#000','fill-opacity':.35,filter:'url(#b3)'},g);
  sv('line',{x1:f[0],y1:f[1],x2:t2[0],y2:t2[1],stroke:'#8a7040','stroke-width':3.5},g);sv('ellipse',{cx:f[0],cy:f[1]-1,rx:12,ry:4.5,fill:'none',stroke:'#a08040','stroke-width':2},g);
  sv('ellipse',{cx:t2[0],cy:t2[1]+4,rx:15,ry:6,fill:'#241c16'},g);sv('ellipse',{cx:t2[0],cy:t2[1],rx:15,ry:6,fill:'#5c4632',stroke:'#D4AF37','stroke-opacity':.8},g);});}
 function puff(x,y){add(2010+x+y,function(){var g=sv('g',null,objPar),f=P(x,y,0),t2=P(x,y,.55),rx=.78*A,ry=.78*B;
  sv('ellipse',{cx:f[0],cy:f[1]+3,rx:rx+6,ry:ry+3,fill:'#000','fill-opacity':.35,filter:'url(#b3)'},g);
  sv('path',{d:'M'+(f[0]-rx)+' '+f[1]+' L'+(f[0]-rx)+' '+t2[1]+' A'+rx+' '+ry+' 0 0 0 '+(f[0]+rx)+' '+t2[1]+' L'+(f[0]+rx)+' '+f[1]+' A'+rx+' '+ry+' 0 0 1 '+(f[0]-rx)+' '+f[1]+'Z',fill:'#3a3228',stroke:'#a08040','stroke-opacity':.8},g);
  sv('ellipse',{cx:t2[0],cy:t2[1],rx:rx,ry:ry,fill:'#5c4632',stroke:'#D4AF37','stroke-opacity':.6},g);});}
 function poltrona(x,y){add(2010+x+y-.2,function(){var g=sv('g',null,objPar),c0=P(x,y,0);sv('ellipse',{cx:c0[0],cy:c0[1]+2,rx:46,ry:18,fill:'#000','fill-opacity':.35,filter:'url(#b3)'},g);
  caixa(g,x-.8,y-.95,.2,x+.8,y-.45,1.55,'#5c4632','#3a3228','#2a241c','#a08040',1);
  caixa(g,x-.8,y-.5,.2,x+.8,y+.7,.62,'#6b5340','#4a3e30','#202A6B','#a08040',1);
  [-1,1].forEach(function(s){caixa(g,x+s*.8-.12,y-.5,.2,x+s*.8+.12,y+.7,.98,'#5c4632','#3a3228','#2a241c','#a08040',.8);});});}
 function sofa(x,y){add(2012+x+y,function(){var g=sv('g',null,objPar),c0=P(x+1,y+2,0);sv('ellipse',{cx:c0[0],cy:c0[1]+4,rx:120,ry:34,fill:'#000','fill-opacity':.35,filter:'url(#b8)'},g);
  caixa(g,x,y,.2,x+.6,y+4.4,1.65,'#5c4632','#3a3228','#2a241c','#a08040',1);
  caixa(g,x+.6,y,.2,x+2.1,y+4.4,.65,'#6b5340','#4a3e30','#202A6B','#a08040',1);
  [0,1,2].forEach(function(i){var a=y+.07+i*1.42;caixa(g,x+.65,a+.02,.65,x+2.05,a+1.38,.72,'#7a6248','#5c4632','#4a3e30','#D4AF37',.6);});
  [y-.1,y+4.1].forEach(function(a){caixa(g,x+.6,a,.2,x+2.1,a+.4,1.05,'#5c4632','#3a3228','#2a241c','#a08040',1);});});}
 sofa(15.6,6.6);
 add(2012+19.2+8.5+.5,function(){var g=sv('g',null,objPar);caixa(g,18.6,7.6,0,20.0,9.8,.55,'#3a3228','#241c16','#1a1612','#D4AF37',1.2);caneca(g,19.0,8.3,.6,true);caneca(g,19.4,9.2,.6,true);caneca(g,19.9,8.8,.6,false);});
 poltrona(18.8,5.4);poltrona(21.0,5.4);[15.4,17.3,19.2,21.1].forEach(function(x){banquinho(x,2.8);});
 [[16.4,12.6],[19.0,13.7],[21.0,12.2],[21.1,9.9]].forEach(function(p){puff(p[0],p[1]);});
 add(21.5+.9,function(){planta(objPar,21.5,.9);});add(14.7+1.4,function(){planta(objPar,14.7,1.4);});add(14.8+14.0,function(){planta(objPar,14.8,14.0);});
 // luminárias pendentes (luz ambiente dourada)
 [[17.6,9.0],[18.4,3.4],[20.4,12.2]].forEach(function(l){add(1990,function(){var g=sv('g',null,objPar),t2=P(l[0],l[1],3.5),b=P(l[0],l[1],2.85);
  sv('line',{x1:t2[0],y1:t2[1]-60,x2:b[0],y2:b[1],stroke:'#d4af37','stroke-opacity':.6},g);sv('circle',{cx:b[0],cy:b[1]+4,r:30,fill:'#D4AF37','fill-opacity':.28,filter:'url(#b8)'},g);
  sv('path',{d:'M'+(b[0]-12)+' '+(b[1]+7)+' L'+(b[0]-6)+' '+(b[1]-4)+' H'+(b[0]+6)+' L'+(b[0]+12)+' '+(b[1]+7)+'Z',fill:'#5c4632',stroke:'#D4AF37'},g);sv('ellipse',{cx:b[0],cy:b[1]+7,rx:12,ry:3,fill:'#FFE9A8'},g);});});
 // bots descansando na copa: lugar fixo por bot (slotCopa), sem rótulo; o nome aparece no hover
 var dorme=lista.filter(function(nn){return !sentaNaMesa(stt(nn));}),mapaC=distribuiCopa(dorme,slotCopa,COPA.length);
 Object.keys(slotCopa).forEach(function(k){if(dorme.indexOf(k)<0)delete slotCopa[k];});dorme.forEach(function(k){slotCopa[k]=mapaC[k];});
 dorme.forEach(function(nn){var L=lugarCopa(mapaC[nn]),x=L[1],y=L[2],hh=0;for(var q=0;q<nn.length;q++)hh=(hh*31+nn.charCodeAt(q))%997;
  copaP[nn]={x:x,y:y,z:COPA_Z[L[0]]};add(2010+x+y+.15,function(){poeBot(objPar,nn,x,y,COPA_Z[L[0]],56,1,L[0]!=='stand'&&hh%3!==0);});});
 OBJ.sort(function(a,b){return a.k-b.k;}).forEach(function(o){o.f();});
 var wl=sv('g',{class:'passante'},mov),bl=sv('g',null,mov),hl=sv('g',{class:'passante'},mov),tl=sv('g',{class:'passante'},mov);
 // ---- rótulos fixos só de quem trabalha, espera ou está com erro (sem se sobrepor; quem precisa de atenção escolhe lugar primeiro) ----
 var postos=[],PRI={waiting_user:0,error:0,working:1};
 bals.sort(function(a,b){return (PRI[a.s]-PRI[b.s])||(a.y-b.y);});
 var STL={working:{c:'#3DCC7A',t:'#8EE7B0'},waiting_user:{c:'#D4AF37',t:'#E7C766'},error:{c:'#E85D4C',t:'#F0A090'}};
 function larg(txt,sz,peso){var tt=sv('text',{x:0,y:0,'font-size':sz,'font-weight':peso,visibility:'hidden'},bl,txt),w=0;try{w=tt.getComputedTextLength();}catch(e){w=0;}tt.remove();return w>0?w:txt.length*sz*.56;}
 bals.forEach(function(b){var nome=trunc(b.nome,22),tempo=dur(b.at)||'0 min',l2=b.s==='waiting_user'?'esperando há '+tempo:b.s==='error'?('erro'+(b.step?' · '+trunc(b.step,26):'')):'trabalhando há '+tempo;
  var w=Math.ceil(Math.max(larg(nome,15,700),larg(l2,13,500))+34),h=48,c=STL[b.s];
  var pp=posicionaRotulo(b.x,b.y,w,h,postos,rects,vb),lx=pp.x,ly=pp.y;postos.push({x:lx,y:ly,w:w,h:h});
  var sel=b.nome===botSel,gg=sv('g',{class:'balao '+b.s+(b.nome===neon?' neon':'')},bl);gg.addEventListener('click',function(ev){ev.stopPropagation();focar(b.nome);});balEl[b.nome]=gg;
  if(b.nome===zoom)gg.classList.add('foco');
  var ax=Math.max(lx+12,Math.min(lx+w-12,b.x));sv('line',{x1:ax,y1:ly+h,x2:b.x,y2:b.y-4,stroke:c.c,'stroke-opacity':.8},gg);
  sv('rect',{x:lx,y:ly,width:w,height:h,rx:11,fill:'rgba(14,12,9,.93)',stroke:sel?'#f6f1e6':c.c,'stroke-width':sel?2:1.4,class:'borda'},gg);sv('rect',{x:lx,y:ly,width:w,height:h,rx:11,fill:c.c,'fill-opacity':.1},gg);
  if(b.nome===neon)sv('rect',{x:lx-1,y:ly-1,width:w+2,height:h+2,rx:12,fill:'none',stroke:'#fff6d8','stroke-width':1.2,class:'neon-pulso'},gg);
  sv('circle',{cx:lx+15,cy:ly+17,r:4.5,fill:c.c},gg);sv('text',{x:lx+28,y:ly+21,'font-size':15,'font-weight':700,fill:'#f6f1e6'},gg,nome);sv('text',{x:lx+15,y:ly+39,'font-size':13,'font-weight':500,fill:c.t},gg,l2);});
 geo={andar:andarSel,pos:pos,bgs:bgs,rects:rects,postos:postos,vb:vb,hl:hl,tl:tl,elevEls:elevEls,elevSt:'',elevPt:P(.3,emd,1.1),elevSai:P(.9,emd,.2),mov:mov,seat:seat,copaP:copaP,ais:ais,wl:wl,bal:balEl,ev:{x:.06,y:emd}};
 // câmera: zoom centraliza o bot no meio da cena
 var cxv=(vb.x0+vb.x1)/2,cyv=(vb.y0+vb.y1)/2,ZM=1.7,al=zoom&&pos[zoom]?pos[zoom]:null,c1=al&&!RM.matches?{s:ZM,x:cxv-al.x*ZM,y:cyv-al.y*ZM}:{s:1,x:0,y:0};
 if(!al)zoom=null;cam.classList.toggle('zoom',!!zoom);cam.classList.toggle('com-neon',!!neon);cam.style.transformOrigin='0 0';cam.style.transform=tf(c1);
 if(animCam&&!velho)cam.animate([{transform:tf(cam0)},{transform:tf(c1)}],{duration:1000,easing:'ease-in-out'});
 cam0=c1;animCam=false;
 if(velho){var vm=velho.querySelector('.mov'),d=transAndar*VH*0.45,o={duration:1500,easing:'ease-in-out'};vm.style.pointerEvents='none';svg.insertBefore(velho,cam);
  mov.style.transformOrigin=vm.style.transformOrigin=cxv+'px '+cyv+'px';
  var a1=vm.animate([{transform:'translateY(0) scale(1)',opacity:1},{transform:'translateY('+(-d*0.5)+'px) scale(.92)',opacity:.35,offset:.5},{transform:'translateY('+(-d)+'px) scale(.92)',opacity:0}],o);
  mov.animate([{transform:'translateY('+d+'px) scale(.92)',opacity:0},{transform:'translateY('+(d*0.5)+'px) scale(.92)',opacity:.35,offset:.5},{transform:'translateY(0) scale(1)',opacity:1}],o);
  a1.onfinish=function(){velho.remove();};}
 else if(transAndar){mov.animate([{opacity:0},{opacity:1}],{duration:400,easing:'ease-in-out'});}
 transAndar=0;desenhaHandoffs();if(velho)pendMov=[];else iniciaMov();if(atores.length)quadroJa();else if(filaPass.length)agenda();}
// dica no hover (quem descansa não tem rótulo fixo): nome + status
function dica(nome){if(!geo)return;geo.tl.replaceChildren();if(!nome||!geo.pos[nome])return;
 var b=bot(nome),s=stt(nome),p=geo.pos[nome],l1=nome,l2=NOME_ST[s]+(b.status_at?' · '+dur(b.status_at):'');
 var tt=sv('text',{x:0,y:0,'font-size':15,'font-weight':700,visibility:'hidden'},geo.tl,l1),w1=0;try{w1=tt.getComputedTextLength();}catch(e){}tt.remove();
 var t2=sv('text',{x:0,y:0,'font-size':13,visibility:'hidden'},geo.tl,l2),w2=0;try{w2=t2.getComputedTextLength();}catch(e){}t2.remove();
 var w=Math.ceil(Math.max(w1||l1.length*8.4,w2||l2.length*7)+30),h=52,v=geo.vb,x=Math.min(v.x1-4-w,Math.max(v.x0+4,p.x-w-34)),y=Math.max(v.y0+4,Math.min(v.y1-34-h,p.top-h+6));
 var g=sv('g',null,geo.tl),suave=s==='idle'||s==='done'||s==='none';sv('rect',{x:x,y:y,width:w,height:h,rx:10,fill:'rgba(14,12,9,.96)',stroke:suave?'#D4AF37':COR_ST[s],'stroke-width':1.3},g);
 sv('text',{x:x+14,y:y+23,'font-size':15,'font-weight':700,fill:'#f6f1e6'},g,l1);sv('text',{x:x+14,y:y+43,'font-size':13,fill:'#a39886'},g,l2);
 sv('line',{x1:x+w,y1:y+h/2,x2:p.x-8,y2:p.y-20,stroke:'#D4AF37','stroke-opacity':.7},g);}
// ---- passagem de tarefa (handoff): linha animada ciano→roxo com seta e a tarefa, por ~8 s ----
// Mesmo andar: de um bot ao outro. Outro andar: do bot até o elevador (que abre e mostra a seta do painel e o andar).
// Estado do elevador: o = quanto as portas estão abertas (0 a 1); dir = 'sobe'/'desce'/null; aceso = painel aceso
function elevPoe(o,dir,andar,aceso){var E=geo&&geo.elevEls;if(!E)return;if(elevCtl!==null)o=elevCtl;var ch=o.toFixed(2)+'|'+dir+'|'+andar+'|'+aceso;if(geo.elevSt===ch)return;geo.elevSt=ch;
 var dy=o*E.w;E.pE.setAttribute('transform','translate('+(dy*A).toFixed(1)+' '+(-dy*B).toFixed(1)+')');E.pD.setAttribute('transform','translate('+(-dy*A).toFixed(1)+' '+(dy*B).toFixed(1)+')');
 E.cima.setAttribute('display',dir==='sobe'?'inline':'none');E.baixo.setAttribute('display',dir==='desce'?'inline':'none');E.num.textContent=dir&&andar?String(andar):'';E.luz.setAttribute('opacity',aceso?'1':'0.3');}
function novasPassagens(hs){if(!Array.isArray(hs))return;var ids={};hs.forEach(function(h){ids[h.id]=1;});
 // 1ª carga da página: as passagens que já estavam lá não são animadas
 if(vistos===null){vistos=ids;return;}
 var novas=hs.filter(function(h){return !vistos[h.id];}).reverse();for(var k in vistos)if(!ids[k])delete vistos[k];
 novas.forEach(function(h){vistos[h.id]=1;ativos.push({id:h.id,from:h.from,to:h.to,task:h.task,ate:Date.now()+HANDOFF_MS});filaPass.push({h:h,t:Date.now()});});
 if(filaPass.length>4)filaPass=filaPass.slice(-4);if(novas.length&&!RM.matches)agenda();
 // no máximo 8 linhas ao mesmo tempo
 while(ativos.length>8)ativos.shift();if(novas.length)desenhaHandoffs();}
function desenhaHandoffs(){clearTimeout(hoTimer);var ag=Date.now(),chips=$('hochips');ativos=ativos.filter(function(a){return a.ate>ag;});if(chips)chips.replaceChildren();
 if(!ativos.length&&!atores.some(function(x){return x.ix;}))elevCtl=null;
 if(!geo||aba!=='mapa'||geo.andar!==andarSel)return;
 geo.hl.replaceChildren();var cross=null,usados=[],todos=lista();
 ativos.forEach(function(h){var a=geo.pos[h.from],b=geo.pos[h.to],task=trunc(h.task||'Nova tarefa',30);
  if(a&&b){linhaHo(a,b,[a.x-18,a.top-8],[b.x+8,b.top-14],'handoff · '+task,h.from+'  →  '+h.to,usados);return;}
  if(todos.indexOf(h.from)<0||todos.indexOf(h.to)<0)return;
  if(!a&&!b){if(chips){var ch=el('span','chip ho','handoff · '+trunc(h.from,18)+' → '+trunc(h.to,18));ch.title=h.task||'';ch.addEventListener('click',function(){irAndar(bot(h.from).team||SEM,h.from);});chips.appendChild(ch);}return;}
  // um dos dois está em outro andar: a linha vai até o elevador
  var sai=!!a,aq=sai?a:b,outro=sai?h.to:h.from,tm=bot(outro).team||SEM,ordem=times().map(function(t){return t.nome;});
  var ix=sai?elevSeta(andarSel,tm,ordem):elevSeta(tm,andarSel,ordem);cross=ix;var E=geo.elevPt,pb=[aq.x+(sai?-18:8),aq.top-(sai?8:14)];
  if(sai)linhaHo(aq,{x:E[0],top:E[1],fx:E[0],fy:E[1]+30},pb,[E[0],E[1]],'handoff · '+task,'para '+h.to+' · andar '+tm,usados);
  else linhaHo({x:E[0],top:E[1],fx:E[0],fy:E[1]+30},aq,[E[0],E[1]],pb,'handoff · '+task,'de '+h.from+' · andar '+tm,usados);
  // marcador do elevador (a porta pode ficar atrás de móveis): seta de sobe/desce e número do andar
  var mk=sv('g',null,geo.hl),sym=ix.dir==='sobe'?'▲':ix.dir==='desce'?'▼':'●';sv('circle',{cx:E[0],cy:E[1],r:17,fill:'rgba(14,12,9,.95)',stroke:'url(#ho)','stroke-width':2},mk);
  sv('text',{x:E[0],y:E[1]+5,'text-anchor':'middle','font-size':ix.andar>9?11:13,'font-weight':800,fill:'#d4af37'},mk,sym+(ix.andar||''));});
 // com a caminhada ligada, as portas só abrem quando o boneco chega (até lá, fechadas, com a seta acesa)
 if(cross&&!RM.matches&&elevCtl===null)elevCtl=0;
 if(cross)elevPoe(1,cross.dir,cross.andar,true);else elevPoe(0,null,0,true);
 if(ativos.length)hoTimer=setTimeout(desenhaHandoffs,Math.max(200,Math.min.apply(null,ativos.map(function(a){return a.ate;}))-ag+30));}
function linhaHo(a0,b0,a,b,l1,l2,usados){var par=geo.hl,v=geo.vb,mx=(a[0]+b[0])/2-30,my=Math.min(a[1],b[1])-62,path='M'+a+' Q'+mx+','+my+' '+b;
 sv('path',{d:path,fill:'none',stroke:'url(#ho)','stroke-width':8,'stroke-opacity':.3,filter:'url(#b3)'},par);
 sv('path',{d:path,fill:'none',stroke:'url(#ho)','stroke-width':2.8,'stroke-linecap':'round','stroke-dasharray':'9 6',class:'fluxo'},par);
 var tx=b[0]-mx,ty=b[1]-my,l=Math.hypot(tx,ty)||1,ux=tx/l,uy=ty/l;
 sv('polygon',{points:(b[0]+ux*9)+','+(b[1]+uy*9)+' '+(b[0]-ux*7-uy*8)+','+(b[1]-uy*7+ux*8)+' '+(b[0]-ux*7+uy*8)+','+(b[1]-uy*7-ux*8),fill:'#a08040',stroke:'#d4af37'},par);
 [[a0,'#d4af37'],[b0,'#d4af37']].forEach(function(r){if(r[0].fx==null)return;sv('ellipse',{cx:r[0].fx,cy:r[0].fy+2,rx:46,ry:19,fill:'none',stroke:r[1],'stroke-width':1.8,'stroke-dasharray':'5 4'},par);});
 var t1=sv('text',{x:0,y:0,'font-size':13,'font-weight':700,visibility:'hidden'},par,l1),w1=0;try{w1=t1.getComputedTextLength();}catch(e){}t1.remove();
 var t2=sv('text',{x:0,y:0,'font-size':13,'font-weight':600,visibility:'hidden'},par,l2),w2=0;try{w2=t2.getComputedTextLength();}catch(e){}t2.remove();
 var w=Math.ceil(Math.max(w1||l1.length*7.4,w2||l2.length*7.2)+34),h=46,ax=.25*a[0]+.5*mx+.25*b[0],ay=.25*a[1]+.5*my+.25*b[1],bx=ax-w/2,by=ay-h-12;
 var obst=geo.postos.concat(usados),bots=geo.rects.filter(function(r){return r.nome!==a0.nome&&r.nome!==b0.nome;}),ok=null,tent=[];
 [0,-1,1,-2,2].forEach(function(dy){[0,-.5,.5,-1,1,-1.5,1.5].forEach(function(dx){tent.push([dx*(w+8),dy*(h+8)]);});});
 tent.sort(function(p,q){return (Math.abs(p[0])/2+Math.abs(p[1])*1.5)-(Math.abs(q[0])/2+Math.abs(q[1])*1.5);});
 function dentro(x,y){return x>=v.x0+4&&x+w<=v.x1-4&&y>=v.y0+4&&y+h<=v.y1-30;}
 for(var i=0;i<tent.length&&!ok;i++){var x=bx+tent[i][0],y=by+tent[i][1];if(dentro(x,y)&&!colide(x,y,w,h,obst)&&!colide(x,y,w,h,bots))ok=tent[i];}
 for(var j=0;j<tent.length&&!ok;j++){if(dentro(bx+tent[j][0],by+tent[j][1])&&!colide(bx+tent[j][0],by+tent[j][1],w,h,obst))ok=tent[j];}
 ok=ok||[0,0];var lx=Math.max(v.x0+4,Math.min(v.x1-4-w,bx+ok[0])),ly=Math.max(v.y0+4,Math.min(v.y1-30-h,by+ok[1]));usados.push({x:lx,y:ly,w:w,h:h});
 sv('rect',{x:lx,y:ly,width:w,height:h,rx:12,fill:'rgba(14,12,9,.95)',stroke:'url(#ho)','stroke-width':1.5},par);
 sv('text',{x:lx+w/2,y:ly+19,'text-anchor':'middle','font-size':13,'font-weight':700,fill:'#f6f1e6'},par,l1);
 sv('text',{x:lx+w/2,y:ly+36,'text-anchor':'middle','font-size':13,'font-weight':600,fill:'#d4af37'},par,l2);}
function colide(x,y,w,h,lista2){return lista2.some(function(p){return x<p.x+p.w+4&&x+w+4>p.x&&y<p.y+p.h+3&&y+h+3>p.y;});}
// ---- caminhada: quem muda de status anda da copa à mesa (e volta); quem passa tarefa anda até o outro ou pelo elevador ----
// Só transform/opacity, quadro a quadro (requestAnimationFrame); sem filtro e sem animação CSS. Com movimento reduzido ninguém anda.
// Coordenadas do piso (as mesmas de P(x,y,z)): corredor esquerdo CL (elevador), corredor direito CR (copa), corredores de trás de cada fileira (geo.ais).
var atores=[],filaPass=[],pendMov=[],sentAnt=null,raf=0,VEL=.005,CL=.45,CR=13.2,TAMW=60;
function agenda(){if(!raf)raf=requestAnimationFrame(quadro);}
function quadro(){raf=0;quadroJa();if(atores.length||filaPass.length)agenda();}
// quem trocou de mesa para copa (ou o contrário) desde o estado anterior; só vale se o mapa do andar está na tela
function marcaMov(){pendMov=[];var agora={};lista().forEach(function(n){agora[n]=sentaNaMesa(stt(n));});
 if(sentAnt&&geo&&aba==='mapa'&&!RM.matches)mudouSentado(sentAnt,agora).forEach(function(m){var o=m.para==='mesa'?geo.copaP[m.nome]:geo.seat[m.nome];if(o)pendMov.push({nome:m.nome,para:m.para,de:o,t:Date.now()});});
 sentAnt=agora;}
function lugarDe(o){return o.ay!=null?{k:'a',x:o.x,y:o.y,ay:o.ay,z:o.z}:{k:'n',nc:CR,x:o.x,y:o.y,z:o.z};}
function lugarNome(n){var o=geo.seat[n]||geo.copaP[n];return o?lugarDe(o):null;}
function iniciaMov(){var pm=pendMov;pendMov=[];if(RM.matches||!geo)return;
 pm.forEach(function(m){if(Date.now()-m.t>4000||atores.length>=8)return;var D=m.para==='mesa'?geo.seat[m.nome]:geo.copaP[m.nome];if(!D)return;
  var A=lugarDe(m.de),B=lugarDe(D),r=trajeto(rotaEscritorio(A,B,geo.ais,CL,CR));if(r.len<.6)return;
  atores=atores.filter(function(a){return a.nome!==m.nome;});
  atores.push({tipo:'mov',nome:m.nome,fig:m.nome,andar:geo.andar,t0:performance.now(),ocultos:[m.nome],ix:null,fases:[{d:Math.min(7000,Math.max(1200,r.len/VEL)),r:r,zS:A.z,zE:B.z}]});});
 if(atores.length)agenda();}
// passagem de tarefa: mesmo andar = anda até o lado de quem recebe e volta; outro andar = anda até o elevador, as portas abrem, entra e fecham
// (no andar de destino ele sai do elevador, vai até quem recebe e volta para o elevador)
function planejarPass(h){if(RM.matches||!geo)return null;var A=lugarNome(h.from),B=lugarNome(h.to);if(!A&&!B)return null;
 var ordem=times().map(function(t){return t.nome;}),ev=geo.ev,fases=[],ocultos=[],ix=null,frente={k:'n',nc:CL,x:CL,y:ev.y,z:0},ar=[CL,ev.y],pt=[ev.x,ev.y];
 function anda(r,extra){var o={d:Math.min(7000,Math.max(1000,r.len/VEL)),r:r};for(var k in extra)o[k]=extra[k];fases.push(o);}
 function ladoDe(Bq,lado){return Bq.k==='a'?{k:'a',x:Bq.x+lado*1.15,y:Bq.y-.1,ay:Bq.ay,z:0}:{k:'n',nc:CR,x:Bq.x-.9,y:Bq.y,z:0};}
 function reverso(r){return trajeto(r.pts.slice().reverse());}
 if(A&&B){var S=ladoDe(B,A.x>B.x?1:-1),ida=trajeto(rotaEscritorio(A,S,geo.ais,CL,CR));ocultos=[h.from];
  anda(ida,{zS:A.z,zE:0,papel:1});fases.push({d:1300,fixo:[S.x,S.y],papel:1});anda(reverso(ida),{zS:0,zE:A.z});}
 else if(A){ix=elevSeta(andarSel,bot(h.to).team||SEM,ordem);ocultos=[h.from];var r1=trajeto(rotaEscritorio(A,frente,geo.ais,CL,CR));
  anda(r1,{zS:A.z,zE:0,papel:1,po:[0,1,.55,1]});
  fases.push({d:700,de:ar,ate:pt,op0:1,op1:0,papel:1,po:[1,1]},{d:450,fixo:pt,op0:0,op1:0,po:[1,1]},{d:650,fixo:pt,op0:0,op1:0,po:[1,0]},{d:500,fixo:ar,op0:0,op1:0,po:[0,0],bgOp:[0,1]});}
 else{ix=elevSeta(bot(h.from).team||SEM,andarSel,ordem);var S2=ladoDe(B,B.x>2.6?-1:1),r2=trajeto(rotaEscritorio(frente,S2,geo.ais,CL,CR));
  fases.push({d:650,fixo:pt,op0:0,op1:0,po:[0,1]},{d:700,de:pt,ate:ar,op0:0,op1:1,po:[1,1]});
  anda(r2,{zS:0,zE:0,papel:1,po:[1,0,0,.35]});fases.push({d:1300,fixo:[S2.x,S2.y],papel:1,po:[0,0]});
  anda(reverso(r2),{zS:0,zE:0,po:[0,1,.55,1]});fases.push({d:700,de:ar,ate:pt,op0:1,op1:0,po:[1,1]},{d:450,fixo:pt,op0:0,op1:0,po:[1,1]},{d:650,fixo:pt,op0:0,op1:0,po:[1,0]});}
 var total=fases.reduce(function(s2,f){return s2+f.d;},0);
 // a linha com a tarefa fica na tela enquanto o boneco anda
 ativos.forEach(function(a){if(a.id===h.id)a.ate=Math.max(a.ate,Date.now()+total+800);});desenhaHandoffs();
 return {tipo:'pass',nome:h.from,fig:h.from,andar:geo.andar,t0:performance.now(),fases:fases,ocultos:ocultos,ix:ix};}
function quadroJa(){
 while(!atores.some(function(a){return a.tipo==='pass';})&&filaPass.length&&geo&&aba==='mapa'){var it=filaPass.shift();if(Date.now()-it.t>10000)continue;var p=planejarPass(it.h);if(p)atores.push(p);}
 atores=atores.filter(function(a){
  if(!geo||aba!=='mapa'||geo.andar!==a.andar){limpaAtor(a);return false;}
  var t=performance.now()-a.t0,f=null,u=0;for(var i=0;i<a.fases.length;i++){if(t<a.fases[i].d){f=a.fases[i];u=t/f.d;break;}t-=a.fases[i].d;}
  if(!f){limpaAtor(a);return false;}desenhaAtor(a,f,u);return true;});}
function desenhaAtor(a,f,u){var x,y,z=0,op=1,bob=0,tilt=0,o=null;
 if(f.r){var dd=u*f.r.len,q=f.r.at(dd);x=q[0];y=q[1];z=(f.zS||0)*Math.max(0,1-dd/.6)+(f.zE||0)*Math.max(0,1-(f.r.len-dd)/.6);
  var w=performance.now()/1000*Math.PI*3.2;bob=Math.abs(Math.sin(w))*.12;tilt=Math.sin(w)*5;}
 else if(f.fixo){x=f.fixo[0];y=f.fixo[1];}
 else{x=f.de[0]+(f.ate[0]-f.de[0])*u;y=f.de[1]+(f.ate[1]-f.de[1])*u;}
 if(f.op0!=null)op=f.op0+(f.op1-f.op0)*u;
 if(f.po){var p0=f.po[2]||0,p1=f.po[3]||1;o=f.po[0]+(f.po[1]-f.po[0])*Math.max(0,Math.min(1,(u-p0)/(p1-p0)));}
 if(a.ix){elevCtl=o==null?0:o;elevPoe(elevCtl,a.ix.dir,a.ix.andar,true);}
 // o bot de verdade some enquanto o boneco anda (nunca aparece em dobro); na última fase ele reaparece
 var bo=f.bgOp?f.bgOp[0]+(f.bgOp[1]-f.bgOp[0])*u:0;
 a.ocultos.forEach(function(n){var e=geo.bgs[n],b2=geo.bal[n];if(e){e.style.transition='none';e.style.opacity=bo>=1?'':bo.toFixed(2);}if(b2)b2.style.opacity=bo>=1?'':bo.toFixed(2);});
 var wk=a.wk;if(!wk||wk.parentNode!==geo.wl){wk=a.wk=sv('g',null,geo.wl);a.sh=sv('ellipse',{cx:0,cy:0,rx:19,ry:7,fill:'#000','fill-opacity':.3},wk);a.fg=sv('g',null,wk);
  var fig=boneco(a.fig,bot(a.fig),TAMW);fig.setAttribute('x',(-TAMW/2).toFixed(1));fig.setAttribute('y',(-TAMW*.98).toFixed(1));a.fg.appendChild(fig);
  a.pp=sv('g',null,a.fg);sv('rect',{x:TAMW*.24,y:-TAMW*.7,width:15,height:19,rx:2,fill:'#f6f1e6',stroke:'#d4af37','stroke-width':1,transform:'rotate(12 '+(TAMW*.24+7)+' '+(-TAMW*.6)+')'},a.pp);
  [-.56,-.47,-.38].forEach(function(ly){sv('line',{x1:TAMW*.24+3,y1:TAMW*ly,x2:TAMW*.24+11,y2:TAMW*ly+1.5,stroke:'#a08040','stroke-width':1},a.pp);});}
 var pp=P(x,y,z+bob);wk.setAttribute('transform','translate('+pp[0].toFixed(1)+' '+pp[1].toFixed(1)+')');wk.setAttribute('opacity',op.toFixed(2));
 a.sh.setAttribute('transform','translate(0 '+((z+bob)*Z).toFixed(1)+')');a.fg.setAttribute('transform','rotate('+tilt.toFixed(1)+' 0 0)');a.pp.setAttribute('display',f.papel?'inline':'none');}
function limpaAtor(a){if(a.wk&&a.wk.parentNode)a.wk.remove();
 if(geo){a.ocultos.forEach(function(n){var e=geo.bgs[n],b2=geo.bal[n];if(e){e.style.opacity='';e.style.transition='';}if(b2)b2.style.opacity='';});}
 // as portas ficam fechadas (a seta continua acesa enquanto a linha da passagem estiver na tela)
 if(a.ix){elevCtl=0;if(geo)desenhaHandoffs();}}
// ---- painéis ----
function mostra(id,sim){var e=$(id);if(!e)return;if(sim)e.removeAttribute('hidden');else e.setAttribute('hidden','');}
// tira do fim da lista o que não cabe inteiro (nada de linha cortada pela metade)
function cabe(c){if(!c)return;var ks=[].slice.call(c.children);ks.forEach(function(k){k.removeAttribute('hidden');});var lim=c.getBoundingClientRect().bottom+1;
 for(var i=ks.length-1;i>0&&ks[i].getBoundingClientRect().bottom>lim;i--)ks[i].setAttribute('hidden','');}
function cabeTudo(){cabe(document.querySelector('#esq .atc .lst'));cabe(document.querySelector('#dir .rotc .lst'));cabe(document.querySelector('#dir .p2 .passos'));}
function cartao(cls,titulo,badge,cb){var c=el('section','card '+(cls||''));if(titulo==null)return c;var h=el('div','h');h.appendChild(document.createTextNode(titulo));if(badge!=null){h.appendChild(el('span','n'+(cb?' c':''),badge));}c.appendChild(h);return c;}
function linhaBot(nome,t1,t2,dir){var it=el('div','it');it.appendChild(mini(nome,30));var tx=el('div','tx');tx.appendChild(el('div','nm',t1));if(t2)tx.appendChild(el('div','ac',t2));it.appendChild(tx);
 if(dir)it.appendChild(dir);it.addEventListener('click',function(){irAndar(bot(nome).team||SEM,nome);});return it;}
function aplicaMarca(){var r=brandResolve(st&&st.brand),n=$('marca-nome'),s=$('marca-sub'),e=$('emblema'),a=$('marca-agua');
 if(n)n.textContent=r.name;if(s)s.textContent=r.subtitle;if(e)e.textContent=r.mark;if(a)a.textContent=r.mark;}
function topo(todos){var cnt={working:0,waiting_user:0,error:0,done:0,idle:0};
 todos.forEach(function(n){var s=stt(n);if(s==='working'||s==='waiting_user'||s==='error'||s==='done')cnt[s]++;else cnt.idle++;});
 var ct=$('contas');ct.replaceChildren();
 [['waiting_user',cnt.waiting_user,'esperando'],['working',cnt.working,'trabalhando'],['error',cnt.error,cnt.error===1?'erro':'erros'],['done',cnt.done,cnt.done===1?'concluído':'concluídos'],['idle',cnt.idle,'descansando']].forEach(function(c){
  var s=el('span','on-'+c[0]);var d=el('i','dot');d.style.background=COR_ST[c[0]];s.appendChild(d);s.appendChild(el('b',null,c[1]));s.appendChild(document.createTextNode(' '+c[2]));ct.appendChild(s);});
 aplicaMarca();
 var ab=document.querySelectorAll('#abas button');for(var i=0;i<ab.length;i++)ab[i].classList.toggle('on',ab[i].getAttribute('data-aba')===aba);}
// faixa de erro: só aparece quando há bot em erro; botão abre o chat dele
function faixaErro(todos){var box=$('errs');box.replaceChildren();var es=todos.filter(function(n){return stt(n)==='error';});box.toggleAttribute('hidden',!es.length);
 es.slice(0,3).forEach(function(n){var b=bot(n),r=el('div','err');r.appendChild(el('div','ic','!'));r.appendChild(el('div','tg','ERRO'));var tx=el('div','tx'),nm=el('b',null,n);tx.appendChild(nm);tx.appendChild(document.createTextNode(' · '+(b.step||'deu erro')));r.appendChild(tx);
  var lk=linkChat(n,'go','Abrir chat');if(!lk){lk=el('button','go','Ver bot');lk.type='button';lk.addEventListener('click',function(){irAndar(b.team||SEM,n);});}r.appendChild(lk);box.appendChild(r);});
 if(es.length>3){var mais=el('div','err');mais.appendChild(el('div','tx','+ '+(es.length-3)+' bots com erro'));box.appendChild(mais);}}
function esquerda(todos,ts){var esq=$('esq');esq.replaceChildren();
 var esp=todos.filter(function(n){return stt(n)==='waiting_user';}).sort(function(x,y){return Date.parse(bot(x).status_at||0)-Date.parse(bot(y).status_at||0);});
 var c1=cartao('precisa'+(esp.length?' alerta':''),'Precisa de você',esp.length);
 esp.forEach(function(n){var b=bot(n);c1.appendChild(linhaBot(n,n,b.step||'sem pedido registrado',linkChat(n,'bt')));});
 if(!esp.length){var ok=el('div','ok-linha');ok.appendChild(el('i',null,'✓'));ok.appendChild(document.createTextNode('Ninguém esperando por você.'));c1.appendChild(ok);}
 esq.appendChild(c1);
 var er=todos.filter(function(n){return stt(n)==='error';});
 if(er.length){var ce=cartao('errbox','Com erro',er.length===1?'1 bot':er.length+' bots');
  er.forEach(function(n){var b=bot(n),it=el('div','it err-it');it.appendChild(el('div','ic','!'));var tx=el('div','tx');tx.appendChild(el('div','nm',n));tx.appendChild(el('div','ac',b.step||'deu erro'));it.appendChild(tx);it.appendChild(el('span','tm',b.status_at?dur(b.status_at):''));
   it.addEventListener('click',function(){irAndar(b.team||SEM,n);});ce.appendChild(it);});esq.appendChild(ce);}
 var pr=parados(todos.map(function(n){return {nome:n,status:stt(n),status_at:bot(n).status_at};}),Date.now(),PARADO_H);
 if(pr.length){var sb=cartao('parado','PARADO HÁ +'+PARADO_H+'H');sb.appendChild(el('div','ac','pode estar desatualizado'));
  pr.forEach(function(p){var r=el('div','sr'),nm=el('span','nm',p.nome);nm.title=p.nome;r.appendChild(nm);var bar=el('span','bar'),i=el('i');i.style.width=p.pct+'%';bar.appendChild(i);r.appendChild(bar);r.appendChild(el('span','tm',p.label));sb.appendChild(r);});esq.appendChild(sb);}
 var a=cartao('noshrink','Andares');ts.forEach(function(t,i){var r=el('div','andar'+(t.nome===andarSel?' sel':''));r.appendChild(el('span','n',i+1));r.appendChild(el('span','nm',t.nome));
  var q={working:0,waiting_user:0,error:0};t.bots.forEach(function(n){var s=stt(n);if(q[s]!=null)q[s]++;});
  if(q.waiting_user){var tw=el('span','tag w',q.waiting_user+' ?');tw.title=q.waiting_user+' esperando por mim';r.appendChild(tw);}
  if(q.error){var te=el('span','tag e',q.error+' !');te.title=q.error+' com erro';r.appendChild(te);}
  if(q.working){var tt=el('span','tag t',String(q.working));tt.title=q.working+' trabalhando';r.appendChild(tt);}
  r.appendChild(el('span','ct',t.bots.length));
  r.addEventListener('click',function(){if(t.nome!==andarSel||aba!=='mapa')irAndar(t.nome);});a.appendChild(r);});
 if(!ts.length)a.appendChild(el('div','vazio','Nenhum bot reportou ainda.'));esq.appendChild(a);
 var at=cartao('atc','Atividade'),ls=el('div','lst');
 (st.feed||[]).filter(function(f){return todos.indexOf(f.bot)>=0;}).slice(0,14).forEach(function(f){var r=el('div','act');r.appendChild(el('span','tm',hora(f.at)));
  var tx=el('span','tx');tx.appendChild(el('b',null,f.bot));tx.appendChild(document.createTextNode(' '+(VERBO[f.status]||'')+': '+f.step));r.appendChild(tx);ls.appendChild(r);});
 if(!ls.children.length)ls.appendChild(el('div','vazio','Sem atividade ainda.'));at.appendChild(ls);esq.appendChild(at);}
function direita(todos,andar){var dir=$('dir');dir.replaceChildren();var cs=andarSel+'|'+botSel+'|'+orgSelFora;
 if(ultSel&&cs!==ultSel)dir.animate([{opacity:0},{opacity:1}],{duration:transAndar?700:350,easing:'ease-in-out'});ultSel=cs;
 if(aba==='org'&&orgSelFora){orgCardFora(dir,orgSelFora);}
 else if(botSel){var b=bot(botSel),s=stt(botSel),card=el('section','card bc s-'+s),cab=el('div','corpo');var big=boneco(botSel,b,62);big.setAttribute('class','big');card.appendChild(big);
  cab.appendChild(el('div','nm',botSel));cab.appendChild(el('div','sb',(b.team||SEM)+' · mesa '+(andar.bots.indexOf(botSel)+1)));
  var chip=el('div','st s-'+s);chip.appendChild(el('i'));chip.appendChild(document.createTextNode(NOME_ST[s]+(b.status_at?' · '+dur(b.status_at):'')));cab.appendChild(chip);
  if(b.step&&s!=='idle')cab.appendChild(el('div','passo',b.step));
  var fz=frescor(b.status_at,s,Date.now()),fq=el('div','fresco');fq.appendChild(el('span',null,fz.texto));if(fz.velho)fq.appendChild(selo());if(b.status_at)fq.title='Última atualização de status: '+dm(b.status_at);cab.appendChild(fq);
  if(s==='waiting_user')cab.appendChild(botaoResolver(botSel));
  card.appendChild(cab);dir.appendChild(card);orgCardInfo(dir,botSel);
  var det=cartao('p2'),mt=el('div','mt'),u=st.usage,rec=b.recent||[];
  var vcons=u&&u.bots&&u.bots[botSel]!=null?u.bots[botSel]:null;
  [[rec.length,'passos recentes'],[(b.routines||[]).length,'rotinas'],[vcons,'do consumo']].forEach(function(x,i){var d=el('div'),bb=el('b');bb.appendChild(document.createTextNode(i===2&&x[0]==null?'—':pct(x[0])));if(i===2&&x[0]!=null)bb.appendChild(el('small',null,'%'));d.appendChild(bb);d.appendChild(el('span',null,x[1]));mt.appendChild(d);});
  det.appendChild(mt);var h2=el('div','h','Passos recentes');h2.style.marginBottom='6px';det.appendChild(h2);var ps=el('div','passos');
  rec.slice(0,6).forEach(function(r){var it=el('div','ps'),d=el('i',r.status==='working'?'g':r.status==='waiting_user'?'w':r.status==='error'?'r':null);it.appendChild(d);it.appendChild(el('span','tx',r.step));it.appendChild(el('span','tm',hora(r.at)));it.title=r.step;ps.appendChild(it);});
  if(!rec.length)ps.appendChild(el('div','vazio','Sem passos registrados.'));det.appendChild(ps);
  var pr=(b.routines||[]).filter(function(r){return r.next_run;}).sort(function(x,y){return Date.parse(x.next_run)-Date.parse(y.next_run);})[0];
  var nx=el('div','nx');if(rec[0])nx.appendChild(document.createTextNode('Última: '+trunc(rec[0].step,60)));
  if(pr){var e1=em(pr.next_run),ja=e1.indexOf('em ')===0;nx.appendChild(document.createTextNode((rec[0]?' · ':'')+'próxima rotina '+(ja?'em ':'')));nx.appendChild(el('b',null,ja?e1.slice(3):e1));}
  if(!rec[0]&&!pr)nx.appendChild(document.createTextNode('Sem rotina agendada.'));det.appendChild(nx);
  var lk=linkChat(botSel,'cta','Abrir chat');det.appendChild(lk||el('div','cta off','Sem link de chat'));dir.appendChild(det);}
 var uc=cartao('noshrink','Consumo da semana'),u2=st.usage;
 if(u2){var p=u2.total_used_pct,r=el('div','cons'),v=el('span','v');v.appendChild(document.createTextNode(pct(p)+'%'));v.appendChild(el('small',null,' usado'));r.appendChild(v);r.appendChild(el('span','r','renova '+dm(u2.resets_at)));uc.appendChild(r);
  var br=el('div','prog'+(p>=90?' max':p>=70?' hi':'')),bi=el('i');bi.style.width=Math.max(0,Math.min(100,p))+'%';br.appendChild(bi);uc.appendChild(br);}
 else uc.appendChild(el('div','vazio','Sem dados de consumo ainda.'));dir.appendChild(uc);
 var rot=[];todos.forEach(function(n){(bot(n).routines||[]).forEach(function(r){rot.push({bot:n,r:r});});});
 rot.sort(function(x,y){var a1=x.r.next_run?Date.parse(x.r.next_run):Infinity,b1=y.r.next_run?Date.parse(y.r.next_run):Infinity;return a1-b1;});
 var rc=cartao('rotc','Rotinas',rot.length,1),rl=el('div','lst');rot.slice(0,8).forEach(function(o){var it=el('div','ro');it.appendChild(mini(o.bot,26));var tx=el('div','tx');tx.appendChild(el('div','nm',o.r.name));tx.appendChild(el('div','sb',o.bot+' · '+o.r.schedule));it.appendChild(tx);it.appendChild(el('span','w',em(o.r.next_run)));
  it.addEventListener('click',function(){irAndar(bot(o.bot).team||SEM,o.bot);});rl.appendChild(it);});
 if(!rot.length)rl.appendChild(el('div','vazio','Nenhuma rotina informada.'));rc.appendChild(rl);dir.appendChild(rc);}
// ================= ORGANOGRAMA (aba ORG) =================
// Hierarquia vem do ingest "org" (st.org). Sem isso, agrupa por andar e mostra o aviso.
var ORG_HINT='Sem hierarquia definida. Envie um ingest do tipo org com reports_to e o cargo. Abaixo, os bots ficam agrupados por andar.';
function iniciais(nome){var p=String(nome||'').trim().split(/\s+/),o='';
 for(var i=0;i<p.length&&o.length<2;i++){var ch=(p[i]||'').replace(/[^A-Za-z0-9]/g,'').charAt(0);if(ch)o+=ch.toUpperCase();}
 return o||'•';}
function orgCard(nome,role,humano,cls){var naLista=lista().indexOf(nome)>=0,s=humano?'none':(naLista||bot(nome).status?stt(nome):'none');
 var r=el('div','nd'+(humano?' hum':' s-'+s)+(cls?' '+cls:'')+(!humano&&nome===botSel?' sel':'')+(orgSelFora===nome?' sel':''));
 r.setAttribute('data-nome',nome);
 if(humano){r.appendChild(el('div','av',iniciais(nome)));}
 else{var av=el('div','av');av.appendChild(boneco(nome,bot(nome),cls==='ceo'?40:cls==='dir'?32:28));av.appendChild(el('i','sd'));r.appendChild(av);}
 var t=el('div','t'),nm=el('div','n',nome);nm.title=nome;t.appendChild(nm);
 var c=el('div','c'),ct=el('span','ct',role||(humano?'':'sem cargo'));ct.title=role||'';c.appendChild(ct);t.appendChild(c);r.appendChild(t);
 r.addEventListener('click',function(ev){ev.stopPropagation();
  if(humano||!naLista){orgSelFora=nome;botSel=naLista?nome:botSel;desenhar();return;}
  orgSelFora=null;botSel=nome;var tm=bot(nome).team||SEM;if(times().some(function(x){return x.nome===tm;}))andarSel=tm;desenhar();});
 return r;}
function orgCardFora(dir,nome){var role='',humano=orgLay&&orgLay.owner&&orgLay.owner.nome===nome;
 if(humano)role=orgLay.owner.role||'';
 else if(st.org){(st.org.nodes||[]).forEach(function(n){if(n.bot===nome)role=n.role||role;});}
 var cd=el('section','card bc'),cb=el('div','corpo'),av=el('div','emblema',iniciais(nome));cd.appendChild(av);
 cb.appendChild(el('div','nm',nome));cb.appendChild(el('div','sb',role||'Organograma'));
 cb.appendChild(el('div','passo',humano?'Pessoa no topo do organograma: decide e não entra na fila dos bots.':'Fora do roster do painel: ainda não manda status por aqui.'));
 cd.appendChild(cb);dir.appendChild(cd);orgCardInfo(dir,nome);}
function orgCardInfo(dir,nome){var org=st&&st.org;if(!org||!nome)return;
 var no=(org.nodes||[]).filter(function(n){return n.bot===nome;})[0];
 var cob=(org.cobra||[]).filter(function(c){return c.from===nome;});
 if(!no&&!cob.length)return;
 var c=el('section','card orgc');c.appendChild(el('div','h','No organograma'));
 function ln(k,v){var d=el('div','ol');d.appendChild(el('span','k',k));d.appendChild(el('span','v',v));c.appendChild(d);}
 if(no){ln('Cargo',no.role||'—');ln('Reporta a',no.reports_to||'—');}
 if(cob.length)ln('Cobra prazos de',cob.map(function(x){return x.to?x.to+' · '+x.label:x.label;}).join(' · '));
 dir.appendChild(c);}
function orgLegenda(parent){var lgd=el('div','lgd');
 function lin(txt,dash){var d=el('div'),s=sv('svg',{viewBox:'0 0 34 10'},null),p=sv('path',{d:'M0 5H34',stroke:'#d4af37','stroke-width':2,fill:'none'},s);
  if(dash)p.setAttribute('stroke-dasharray','5 4');d.appendChild(s);d.appendChild(document.createTextNode(txt));lgd.appendChild(d);}
 lin('reporta a',false);lin('cobra prazos',true);parent.appendChild(lgd);}
function orgFind(root,nome){var ns=root.querySelectorAll('[data-nome]');for(var i=0;i<ns.length;i++)if(ns[i].getAttribute('data-nome')===nome)return ns[i];return null;}
function orgLinhas(){var box=$('org'),root=box&&box.querySelector('.oi'),svg=root&&root.querySelector('svg.ln');
 if(!root||!svg||!orgLay)return;svg.replaceChildren();var old=root.querySelectorAll('.lbl');for(var i=0;i<old.length;i++)old[i].remove();
 function rect(e){var a=e.getBoundingClientRect(),b=root.getBoundingClientRect();return {l:a.left-b.left,r:a.right-b.left,t:a.top-b.top,b:a.bottom-b.top,cx:(a.left+a.right)/2-b.left,cy:(a.top+a.bottom)/2-b.top};}
 function mk(d,dash){var p=sv('path',{d:d,fill:'none',stroke:'#d4af37','stroke-width':1.6,'stroke-linejoin':'round','stroke-linecap':'round'},svg);if(dash)p.setAttribute('stroke-dasharray','6 5');return p;}
 var owner=orgLay.owner?orgFind(root,orgLay.owner.nome):null,ceo=orgLay.ceo?orgFind(root,orgLay.ceo.nome):null;
 var heads=orgLay.colunas.map(function(c){return orgFind(root,c.head.nome);}).filter(Boolean);
 if(owner&&ceo){var A=rect(owner),B=rect(ceo);mk('M'+A.cx+' '+A.b+'V'+(B.t-1));}
 var from=ceo||owner;
 if(from&&heads.length){var F=rect(from),hs=heads.map(rect);
  hs.forEach(function(r){var y=Math.round((F.b+r.t)/2);mk('M'+F.cx+' '+F.b+'V'+y+'H'+r.cx+'V'+(r.t-1));});}
 orgLay.colunas.forEach(function(col){var h=orgFind(root,col.head.nome);if(!h||!col.stack.length)return;
  var H=rect(h),kids=col.stack.map(function(s){return orgFind(root,s.nome);}).filter(Boolean);if(!kids.length)return;
  var last=rect(kids[kids.length-1]),tx=H.l+12;mk('M'+tx+' '+H.b+'V'+last.cy);
  kids.forEach(function(k){var K=rect(k);mk('M'+tx+' '+K.cy+'H'+(K.l-1));});});
 var faixa=root.querySelector('.cobra-faixa');
 (orgLay.cobra||[]).forEach(function(c){var a=orgFind(root,c.from);if(!a)return;a.classList.add('cobra-de');var A=rect(a);
  if(c.to){var b=orgFind(root,c.to);if(!b)return;var B=rect(b);mk('M'+A.cx+' '+(A.t+1)+'V'+Math.min(A.t-14,B.cy)+'H'+B.cx+'V'+(B.t-1),true);return;}
  if(!faixa)return;var F=rect(faixa);mk('M'+A.cx+' '+A.t+'V'+(F.cy),true);});}
function orgDesenha(){var box=$('org');if(!box)return;
 var key=JSON.stringify([orgLay,lista().map(function(n){var b=bot(n);return [n,stt(n),(b.look&&b.look.shape)||'',(b.look&&b.look.color)||'',(st.avatars||{})[n]||''];}),orgSelFora,botSel,box.clientWidth]);
 if(box.getAttribute('data-sig')===key&&box.querySelector('.oi')){orgLinhas();return;}
 box.setAttribute('data-sig',key);box.replaceChildren();
 var root=el('div','oi');box.appendChild(root);
 var oh=el('div','oh');oh.appendChild(el('div','a','Organograma'));
 oh.appendChild(el('div','sub',orgLay?'quem reporta a quem · '+lista().length+' bots':'agrupado por andar'));
 root.appendChild(oh);
 if(!orgLay){root.appendChild(el('div','hint',ORG_HINT));
  var ts=times();if(!ts.length){root.appendChild(el('div','vazio','Nenhum bot reportou ainda.'));return;}
  var g=el('div','apg');ts.forEach(function(t){var bl=el('div','bl');bl.appendChild(el('div','lb',t.nome));var stk=el('div','stack');
   t.bots.forEach(function(n){stk.appendChild(orgCard(n,NOME_ST[stt(n)],false));});bl.appendChild(stk);g.appendChild(bl);});
  root.appendChild(g);return;}
 var svg=sv('svg',{class:'ln'},null);root.appendChild(svg);
 var tree=el('div','tree');root.appendChild(tree);
 if(orgLay.owner){var r0=el('div','r0');r0.appendChild(orgCard(orgLay.owner.nome,orgLay.owner.role,true));tree.appendChild(r0);}
 if(orgLay.ceo){var rc=el('div',orgLay.owner?'r1':'r0');rc.appendChild(orgCard(orgLay.ceo.nome,orgLay.ceo.role,false,'ceo'));tree.appendChild(rc);}
 var cobras=(orgLay.cobra||[]).filter(function(c){return !c.to;});
 if(cobras.length){var faixa=el('div','cobra-faixa');cobras.forEach(function(c,i){if(i)faixa.appendChild(document.createTextNode(' · '));faixa.appendChild(document.createTextNode(c.from+' '+c.label));});tree.appendChild(faixa);}
 if(orgLay.colunas.length){var r2=el('div','r2');r2.style.gridTemplateColumns='repeat('+orgLay.colunas.length+',minmax(0,1fr))';
  orgLay.colunas.forEach(function(col){var cell=el('div','col');cell.appendChild(orgCard(col.head.nome,col.head.role,false,'dir'));
   var tm=el('div','tm');col.stack.forEach(function(s){tm.appendChild(orgCard(s.nome,s.role,false));});cell.appendChild(tm);r2.appendChild(cell);});
  tree.appendChild(r2);}
 if(orgLay.fora.length){var fx=el('div','bl');fx.appendChild(el('div','lb','Sem cargo no organograma'));var sk=el('div','stack');
  orgLay.fora.forEach(function(n){sk.appendChild(orgCard(n,bot(n).team||SEM,false));});fx.appendChild(sk);tree.appendChild(fx);}
 orgLegenda(root);orgLinhas();setTimeout(orgLinhas,150);}
// aba LISTA: todos os bots por situação
function tabela(todos){var w=$('lista'),ro=w.querySelector('.rol'),topo=ro?ro.scrollTop:0;w.replaceChildren();var PRI={waiting_user:0,error:1,working:2,done:3},ord=todos.slice().sort(function(a,b){var pa=PRI[stt(a)]!=null?PRI[stt(a)]:4,pb=PRI[stt(b)]!=null?PRI[stt(b)]:4;return pa-pb||a.localeCompare(b,'pt-BR');});
 var h=el('div','h','Todos os bots');h.appendChild(el('span','n c',todos.length));h.appendChild(el('span','ord','ordem: esperando por mim primeiro'));w.appendChild(h);var rol=el('div','rol'),tb=el('table','tabela'),th=el('thead'),tr=el('tr');
 ['Bot','Andar','Status','Há','Passo atual',''].forEach(function(c){tr.appendChild(el('th',null,c));});th.appendChild(tr);tb.appendChild(th);var body=el('tbody');
 var par=parados(todos.map(function(n){return {nome:n,status:stt(n),status_at:bot(n).status_at};}),Date.now(),PARADO_H),vel={};par.forEach(function(p){vel[p.nome]=p.label;});
 ord.forEach(function(n){var b=bot(n),s=stt(n),r=el('tr','lin s-'+s+(n===botSel?' sel':'')),c1=el('td','nome'),nd=el('div');nd.appendChild(mini(n,28));nd.appendChild(el('span',null,n));c1.appendChild(nd);r.appendChild(c1);
  r.appendChild(el('td','num',b.team||SEM));var c3=el('td'),sp=el('span','sp s-'+s);sp.appendChild(el('i'));sp.appendChild(document.createTextNode(NOME_ST[s]));c3.appendChild(sp);r.appendChild(c3);
  var c4=el('td','num',b.status_at?dur(b.status_at):'—');if(vel[n])c4.appendChild(el('span','velho12','+'+PARADO_H+'h'));r.appendChild(c4);
  var c5=el('td','passo',b.step||'—');c5.title=b.step||'';r.appendChild(c5);var c6=el('td'),lk=linkChat(n,'bt');if(lk)c6.appendChild(lk);r.appendChild(c6);
  r.addEventListener('click',function(){irAndar(b.team||SEM,n);});body.appendChild(r);});
 tb.appendChild(body);rol.appendChild(tb);w.appendChild(rol);rol.scrollTop=topo;}
function centro(andar,ts,todos){var mapa=aba==='mapa';mostra('cena',mapa);mostra('tagbar',mapa);mostra('leg',mapa);mostra('lista',aba==='lista');mostra('org',aba==='org');
 if(aba==='lista'){tabela(todos);geo=null;return;}if(aba==='org'){geo=null;orgDesenha();return;}
 var tb=$('tagbar');tb.replaceChildren();var idx=ts.indexOf(andar),na=andar.bots.filter(function(n){return sentaNaMesa(stt(n));}).length;
 tb.appendChild(el('span','a','Andar '+(idx+1)+' · '+andar.nome));tb.appendChild(el('span','chip',andar.bots.length+' bots'));tb.appendChild(el('span','chip c1',na+' na mesa'));tb.appendChild(el('span','chip c2',(andar.bots.length-na)+' na copa'));
 var hc=el('span');hc.id='hochips';hc.className='hochips';tb.appendChild(hc);cena(andar.bots);}
function desenhar(){
 if(!st)return;orgLay=st.org?orgLayout(st.org,lista()):null;var ts=times(),todos=lista();
 if(!ts.some(function(t){return t.nome===andarSel;}))andarSel=ts.length?ts[0].nome:null;
 var andar=ts.filter(function(t){return t.nome===andarSel;})[0]||{nome:'',bots:[]};
 if(botSel&&todos.indexOf(botSel)<0)botSel=null;if(neon&&andar.bots.indexOf(neon)<0)neon=null;
 if(!botSel||(aba==='mapa'&&andar.bots.indexOf(botSel)<0)){botSel=andar.bots.filter(function(n){return stt(n)==='waiting_user';})[0]||andar.bots.filter(function(n){return stt(n)==='working';})[0]||andar.bots[0]||null;}
 if(botSel&&andar.bots.indexOf(botSel)<0){var ob=bot(botSel).team||SEM;if(ts.some(function(t){return t.nome===ob;}))andarSel=ob;andar=ts.filter(function(t){return t.nome===andarSel;})[0]||andar;}
 topo(todos);faixaErro(todos);esquerda(todos,ts);direita(todos,andar);centro(andar,ts,todos);
 cabeTudo();}
// botão "Resolvido": 1º clique pede confirmação, 2º envia POST /api/resolve (cookie + mesma origem)
function botaoResolver(nome){var bt=el('button','resolver','✓ Resolvido'),conf=false,tm=0;bt.type='button';bt.title='Marca que você já respondeu: o bot sai de "Precisa de você" e fica descansando.';
 bt.addEventListener('click',function(ev){ev.stopPropagation();if(bt.disabled)return;
  if(!conf){conf=true;bt.classList.add('conf');bt.textContent='Confirmar: já resolvi';tm=setTimeout(function(){conf=false;bt.classList.remove('conf');bt.textContent='✓ Resolvido';},5000);return;}
  clearTimeout(tm);bt.disabled=true;bt.textContent='Salvando…';
  fetch('/api/resolve',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({bot:nome})})
   .then(function(r){if(r.status===401){location.href='/';return;}if(!r.ok)throw new Error(String(r.status));load();})
   .catch(function(){bt.disabled=false;conf=false;bt.classList.remove('conf');bt.textContent='Falhou. Tentar de novo';});});
 return bt;}
function vivo(ok){var v=$('vivo');v.classList.toggle('off',!ok);$('vivotxt').textContent=ok?'Ao vivo':'sem conexão';}
function relogio(){$('hora').textContent=fHora.format(new Date());}
// só redesenha quando algo mudou (ou a cada minuto, para os "há X min")
function assinatura(s){return JSON.stringify([s.bots,s.roster,s.floors,s.usage,s.feed,s.avatars,s.brand,s.org])+'|'+Math.floor(Date.now()/60000);}
function load(){fetch('/api/state',{credentials:'same-origin',cache:'no-store'}).then(function(r){if(r.status===401){location.href='/';return null;}return r.json();})
 .then(function(s){if(!s)return;st=s;vivo(true);marcaMov();var a=assinatura(s);novasPassagens(s.handoffs);if(a!==sig){sig=a;desenhar();}})
 .catch(function(){vivo(false);});}
$('abas').addEventListener('click',function(e){var b=e.target.closest?e.target.closest('button'):null;if(!b)return;var a=b.getAttribute('data-aba');if(a===aba)return;aba=a;zoom=null;neon=null;desenhar();});
$('C').addEventListener('click',soltar);
document.addEventListener('keydown',function(e){if(e.key==='Escape')soltar();});
var rz;window.addEventListener('resize',function(){clearTimeout(rz);rz=setTimeout(function(){moldura();desenhar();},150);});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){if(st){cabeTudo();if(aba==='org')orgLinhas();}});
fundo();moldura();relogio();setInterval(relogio,15000);load();setInterval(load,10000);
})();
`;

export function panelPage(nonce: string): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Painel dos bots</title><style nonce="${nonce}">${STYLE}</style></head>
<body><svg id="bg" aria-hidden="true"></svg><svg id="frame" aria-hidden="true"></svg>
<div id="app">
<header id="topo" class="glass"><div class="marca" id="marca"><div class="emblema" id="emblema">pb</div><div class="wm"><b id="marca-nome">Painel</b><span id="marca-sub">Status dos bots</span></div></div><div class="vsep"></div><div class="titulo">PAINEL DOS BOTS</div>
<div class="vivo" id="vivo"><span class="dot"></span><span id="vivotxt">carregando</span><span id="hora"></span></div>
<div class="contas" id="contas"></div>
<nav class="abas" id="abas" aria-label="Visões"><button type="button" data-aba="mapa">MAPA</button><button type="button" data-aba="lista">LISTA</button><button type="button" data-aba="org">ORGANOGRAMA</button></nav>
<form method="post" action="/logout"><button type="submit" class="sair">Sair</button></form></header>
<div id="errs" hidden></div>
<main id="cols"><aside id="esq"></aside>
<section id="C" class="glass"><div class="agua" id="marca-agua" aria-hidden="true">pb</div><div class="tagbar" id="tagbar"></div><svg id="cena" aria-label="Escritório dos bots"></svg>
<div id="leg"><span><i class="l1"></i>trabalhando</span><span><i class="l2"></i>esperando por mim</span><span><i class="l3"></i>erro</span><span><i class="l5"></i>concluído</span><span><i class="l4"></i>descansando</span><span><i class="l6"></i>sem status</span></div>
<div class="lista-wrap" id="lista" hidden></div>
<div class="org" id="org" hidden></div></section>
<aside id="dir"></aside></main></div>
<script nonce="${nonce}">var floorOrder=${floorOrder.toString()};var frescor=${frescor.toString()};var elevSeta=${elevSeta.toString()};var rotaEscritorio=${rotaEscritorio.toString()};var trajeto=${trajeto.toString()};var mudouSentado=${mudouSentado.toString()};var parados=${parados.toString()};var sentaNaMesa=${sentaNaMesa.toString()};var distribuiCopa=${distribuiCopa.toString()};var posicionaRotulo=${posicionaRotulo.toString()};var brandResolve=function ${BrandMark.resolve.toString()};var orgLayout=function ${OrgChart.layout.toString()};${CLIENT}</script></body></html>`;
}
