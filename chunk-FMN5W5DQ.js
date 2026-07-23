import{$ as F,C as h,E as a,H as y,I as O,J as I,Ja as E,Ka as A,La as $,M as x,Ma as z,N as l,Na as B,O as s,P as M,Q as v,R as p,S as g,T as C,U as i,V as r,Z as m,_ as S,ga as u,ha as c,ia as d,ja as f,n as w,o as D,p as b,qa as T,sa as k}from"./chunk-VN7Z3VCJ.js";var H=["*"];var V=new D("MAT_CARD_CONFIG"),j=(()=>{class t{appearance;constructor(){let e=b(V,{optional:!0});this.appearance=e?.appearance||"raised"}static \u0275fac=function(o){return new(o||t)};static \u0275cmp=y({type:t,selectors:[["mat-card"]],hostAttrs:[1,"mat-mdc-card","mdc-card"],hostVars:8,hostBindings:function(o,_){o&2&&u("mat-mdc-card-outlined",_.appearance==="outlined")("mdc-card--outlined",_.appearance==="outlined")("mat-mdc-card-filled",_.appearance==="filled")("mdc-card--filled",_.appearance==="filled")},inputs:{appearance:"appearance"},exportAs:["matCard"],ngContentSelectors:H,decls:1,vars:0,template:function(o,_){o&1&&(S(),F(0))},styles:[`.mat-mdc-card {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  position: relative;
  border-style: solid;
  border-width: 0;
  background-color: var(--mat-card-elevated-container-color, var(--mat-sys-surface-container-low));
  border-color: var(--mat-card-elevated-container-color, var(--mat-sys-surface-container-low));
  border-radius: var(--mat-card-elevated-container-shape, var(--mat-sys-corner-medium));
  box-shadow: var(--mat-card-elevated-container-elevation, var(--mat-sys-level1));
}
.mat-mdc-card::after {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: solid 1px transparent;
  content: "";
  display: block;
  pointer-events: none;
  box-sizing: border-box;
  border-radius: var(--mat-card-elevated-container-shape, var(--mat-sys-corner-medium));
}

.mat-mdc-card-outlined {
  background-color: var(--mat-card-outlined-container-color, var(--mat-sys-surface));
  border-radius: var(--mat-card-outlined-container-shape, var(--mat-sys-corner-medium));
  border-width: var(--mat-card-outlined-outline-width, 1px);
  border-color: var(--mat-card-outlined-outline-color, var(--mat-sys-outline-variant));
  box-shadow: var(--mat-card-outlined-container-elevation, var(--mat-sys-level0));
}
.mat-mdc-card-outlined::after {
  border: none;
}

.mat-mdc-card-filled {
  background-color: var(--mat-card-filled-container-color, var(--mat-sys-surface-container-highest));
  border-radius: var(--mat-card-filled-container-shape, var(--mat-sys-corner-medium));
  box-shadow: var(--mat-card-filled-container-elevation, var(--mat-sys-level0));
}

.mdc-card__media {
  position: relative;
  box-sizing: border-box;
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
}
.mdc-card__media::before {
  display: block;
  content: "";
}
.mdc-card__media:first-child {
  border-top-left-radius: inherit;
  border-top-right-radius: inherit;
}
.mdc-card__media:last-child {
  border-bottom-left-radius: inherit;
  border-bottom-right-radius: inherit;
}

.mat-mdc-card-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  box-sizing: border-box;
  min-height: 52px;
  padding: 8px;
}

.mat-mdc-card-title {
  font-family: var(--mat-card-title-text-font, var(--mat-sys-title-large-font));
  line-height: var(--mat-card-title-text-line-height, var(--mat-sys-title-large-line-height));
  font-size: var(--mat-card-title-text-size, var(--mat-sys-title-large-size));
  letter-spacing: var(--mat-card-title-text-tracking, var(--mat-sys-title-large-tracking));
  font-weight: var(--mat-card-title-text-weight, var(--mat-sys-title-large-weight));
}

.mat-mdc-card-subtitle {
  color: var(--mat-card-subtitle-text-color, var(--mat-sys-on-surface));
  font-family: var(--mat-card-subtitle-text-font, var(--mat-sys-title-medium-font));
  line-height: var(--mat-card-subtitle-text-line-height, var(--mat-sys-title-medium-line-height));
  font-size: var(--mat-card-subtitle-text-size, var(--mat-sys-title-medium-size));
  letter-spacing: var(--mat-card-subtitle-text-tracking, var(--mat-sys-title-medium-tracking));
  font-weight: var(--mat-card-subtitle-text-weight, var(--mat-sys-title-medium-weight));
}

.mat-mdc-card-title,
.mat-mdc-card-subtitle {
  display: block;
  margin: 0;
}
.mat-mdc-card-avatar ~ .mat-mdc-card-header-text .mat-mdc-card-title,
.mat-mdc-card-avatar ~ .mat-mdc-card-header-text .mat-mdc-card-subtitle {
  padding: 16px 16px 0;
}

.mat-mdc-card-header {
  display: flex;
  padding: 16px 16px 0;
}

.mat-mdc-card-content {
  display: block;
  padding: 0 16px;
}
.mat-mdc-card-content:first-child {
  padding-top: 16px;
}
.mat-mdc-card-content:last-child {
  padding-bottom: 16px;
}

.mat-mdc-card-title-group {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.mat-mdc-card-avatar {
  height: 40px;
  width: 40px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-bottom: 16px;
  object-fit: cover;
}
.mat-mdc-card-avatar ~ .mat-mdc-card-header-text .mat-mdc-card-subtitle,
.mat-mdc-card-avatar ~ .mat-mdc-card-header-text .mat-mdc-card-title {
  line-height: normal;
}

.mat-mdc-card-sm-image {
  width: 80px;
  height: 80px;
}

.mat-mdc-card-md-image {
  width: 112px;
  height: 112px;
}

.mat-mdc-card-lg-image {
  width: 152px;
  height: 152px;
}

.mat-mdc-card-xl-image {
  width: 240px;
  height: 240px;
}

.mat-mdc-card-subtitle ~ .mat-mdc-card-title,
.mat-mdc-card-title ~ .mat-mdc-card-subtitle,
.mat-mdc-card-header .mat-mdc-card-header-text .mat-mdc-card-title,
.mat-mdc-card-header .mat-mdc-card-header-text .mat-mdc-card-subtitle,
.mat-mdc-card-title-group .mat-mdc-card-title,
.mat-mdc-card-title-group .mat-mdc-card-subtitle {
  padding-top: 0;
}

.mat-mdc-card-content > :last-child:not(.mat-mdc-card-footer) {
  margin-bottom: 0;
}

.mat-mdc-card-actions-align-end {
  justify-content: flex-end;
}
`],encapsulation:2})}return t})();var L=(()=>{class t{static \u0275fac=function(o){return new(o||t)};static \u0275dir=I({type:t,selectors:[["mat-card-content"]],hostAttrs:[1,"mat-mdc-card-content"]})}return t})();var N=(()=>{class t{static \u0275fac=function(o){return new(o||t)};static \u0275mod=O({type:t});static \u0275inj=w({imports:[E]})}return t})();var U=(t,n)=>n.title,P=(t,n)=>n.label;function q(t,n){if(t&1&&(i(0,"a",11),c(1),i(2,"mat-icon",12),c(3,"arrow_forward"),r()()),t&2){let e=m().$implicit;u("primary-action",e.primary),C("matButton",e.primary?"filled":"outlined")("routerLink",e.route),a(),f(" ",e.label," ")}}function J(t,n){if(t&1&&(i(0,"a",13),c(1),i(2,"mat-icon",12),c(3,"open_in_new"),r()()),t&2){let e=m().$implicit;u("primary-action",e.primary),C("matButton",e.primary?"filled":"outlined")("href",e.href,h),x("aria-label",e.label+" (opens in a new tab)"),a(),f(" ",e.label," ")}}function K(t,n){if(t&1&&l(0,q,4,5,"a",9)(1,J,4,6,"a",10),t&2){let e=n.$implicit;s(e.route?0:1)}}function Q(t,n){if(t&1&&(i(0,"div",4),p(1,K,2,1,null,null,P),r()),t&2){let e=m();a(),g(e.content.actions)}}function W(t,n){if(t&1&&(i(0,"div")(1,"dt"),c(2),r(),i(3,"dd"),c(4),r()()),t&2){let e=n.$implicit;a(2),d(e.label),a(2),d(e.value)}}function Y(t,n){if(t&1&&(i(0,"mat-card",6)(1,"mat-card-content")(2,"dl",14),p(3,W,5,2,"div",null,P),r()()()),t&2){let e=m();a(3),g(e.content.facts)}}function Z(t,n){if(t&1&&(i(0,"p",16),c(1),r()),t&2){let e=m().$implicit;a(),d(e.badge)}}function tt(t,n){if(t&1&&(i(0,"p"),c(1),r()),t&2){let e=n.$implicit;a(),d(e)}}function et(t,n){if(t&1&&(i(0,"li"),c(1),r()),t&2){let e=n.$implicit;a(),d(e)}}function nt(t,n){if(t&1&&(i(0,"ul"),p(1,et,2,1,"li",null,v),r()),t&2){let e=m().$implicit;a(),g(e.items)}}function at(t,n){if(t&1&&(i(0,"li"),c(1),r()),t&2){let e=n.$implicit;a(),d(e)}}function it(t,n){if(t&1&&(i(0,"ol"),p(1,at,2,1,"li",null,v),r()),t&2){let e=m().$implicit;a(),g(e.steps)}}function rt(t,n){if(t&1&&(i(0,"th",19),c(1),r()),t&2){let e=n.$implicit;a(),d(e)}}function ot(t,n){if(t&1&&(i(0,"td"),c(1),r()),t&2){let e=n.$implicit;a(),d(e)}}function ct(t,n){if(t&1&&(i(0,"tr"),p(1,ot,2,1,"td",null,M),r()),t&2){let e=n.$implicit;a(),g(e)}}function dt(t,n){if(t&1&&(i(0,"div",17)(1,"table")(2,"caption"),c(3),r(),i(4,"thead")(5,"tr"),p(6,rt,2,1,"th",19,v),r()(),i(8,"tbody"),p(9,ct,3,0,"tr",null,M),r()()()),t&2){let e=n;x("aria-label",e.caption),a(3),f(" ",e.caption," "),a(3),g(e.columns),a(3),g(e.rows)}}function mt(t,n){if(t&1&&(i(0,"pre")(1,"code"),c(2),r()()),t&2){let e=m().$implicit;a(2),d(e.code)}}function lt(t,n){if(t&1&&(i(0,"aside")(1,"strong"),c(2,"Good to know"),r(),i(3,"span"),c(4),r()()),t&2){let e=m().$implicit;a(4),d(e.note)}}function st(t,n){if(t&1&&(i(0,"a",20),c(1),i(2,"mat-icon",12),c(3,"arrow_forward"),r()()),t&2){let e=m().$implicit;C("routerLink",e.route),a(),f(" ",e.label," ")}}function pt(t,n){if(t&1&&(i(0,"a",21),c(1),i(2,"mat-icon",12),c(3,"open_in_new"),r()()),t&2){let e=m().$implicit;C("href",e.href,h),x("aria-label",e.label+" (opens in a new tab)"),a(),f(" ",e.label," ")}}function gt(t,n){if(t&1&&l(0,st,4,2,"a",20)(1,pt,4,3,"a",21),t&2){let e=n.$implicit;s(e.route?0:1)}}function ut(t,n){if(t&1&&(i(0,"div",18),p(1,gt,2,1,null,null,P),r()),t&2){let e=m().$implicit;a(),g(e.actions)}}function ft(t,n){if(t&1&&(i(0,"mat-card",15)(1,"mat-card-content")(2,"section"),l(3,Z,2,1,"p",16),i(4,"h2"),c(5),r(),p(6,tt,2,1,"p",null,v),l(8,nt,3,0,"ul"),l(9,it,3,0,"ol"),l(10,dt,11,2,"div",17),l(11,mt,3,1,"pre"),l(12,lt,5,1,"aside"),l(13,ut,3,0,"div",18),r()()()),t&2){let e,o=n.$implicit;u("wide",o.wide),a(3),s(o.badge?3:-1),a(2),d(o.title),a(),g(o.paragraphs),a(2),s(o.items?.length?8:-1),a(),s(o.steps?.length?9:-1),a(),s((e=o.table)?10:-1,e),a(),s(o.code?11:-1),a(),s(o.note?12:-1),a(),s(o.actions?.length?13:-1)}}var R=class t{content=b(T).snapshot.data.content;static \u0275fac=function(e){return new(e||t)};static \u0275cmp=y({type:t,selectors:[["app-doc-page"]],decls:15,vars:5,consts:[[1,"hero"],[1,"hero-content"],[1,"eyebrow"],[1,"summary"],["aria-label","Page actions",1,"actions"],[1,"page-content"],["appearance","outlined",1,"facts-card"],[1,"sections"],["appearance","outlined",1,"doc-card",3,"wide"],[3,"matButton","primary-action","routerLink"],["target","_blank","rel","noopener noreferrer",3,"matButton","primary-action","href"],[3,"matButton","routerLink"],["aria-hidden","true"],["target","_blank","rel","noopener noreferrer",3,"matButton","href"],["aria-label","At a glance",1,"facts"],["appearance","outlined",1,"doc-card"],[1,"section-badge"],["role","region","tabindex","0",1,"table-scroll"],[1,"section-actions"],["scope","col"],["matButton","",3,"routerLink"],["matButton","","target","_blank","rel","noopener noreferrer",3,"href"]],template:function(e,o){e&1&&(i(0,"article")(1,"header",0)(2,"div",1)(3,"p",2),c(4),r(),i(5,"h1"),c(6),r(),i(7,"p",3),c(8),r(),l(9,Q,3,0,"div",4),r()(),i(10,"div",5),l(11,Y,5,0,"mat-card",6),i(12,"div",7),p(13,ft,14,10,"mat-card",8,U),r()()()),e&2&&(a(4),d(o.content.eyebrow),a(2),d(o.content.title),a(2),d(o.content.summary),a(),s(o.content.actions?.length?9:-1),a(2),s(o.content.facts?.length?11:-1),a(2),g(o.content.sections))},dependencies:[$,A,N,j,L,B,z,k],styles:[".hero[_ngcontent-%COMP%]{background:linear-gradient(135deg,var(--app-navy),var(--app-teal));color:#fff;min-height:15rem}.hero-content[_ngcontent-%COMP%], .page-content[_ngcontent-%COMP%]{margin:0 auto;max-width:90rem;padding-left:clamp(1.25rem,6vw,6rem);padding-right:clamp(1.25rem,6vw,6rem)}.hero-content[_ngcontent-%COMP%]{padding-bottom:3rem;padding-top:3rem}.eyebrow[_ngcontent-%COMP%]{color:#8debd5;font-size:.75rem;font-weight:700;letter-spacing:.16em;margin:0;text-transform:uppercase}h1[_ngcontent-%COMP%]{font-size:clamp(2.2rem,4vw,3.75rem);letter-spacing:-.04em;line-height:1.05;margin:.25rem 0 .75rem;max-width:57rem;text-wrap:balance}.summary[_ngcontent-%COMP%]{color:#d9f4ee;font-size:1.05rem;line-height:1.6;margin:0;max-width:45rem}.actions[_ngcontent-%COMP%], .section-actions[_ngcontent-%COMP%]{align-items:center;display:flex;flex-wrap:wrap;gap:.75rem}.actions[_ngcontent-%COMP%]{margin-top:1.5rem}.actions[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:not(.primary-action){--mat-button-outlined-label-text-color: white;--mat-button-outlined-outline-color: #d9f4ee;--mat-button-outlined-ripple-color: rgb(255 255 255 / 16%);--mat-button-outlined-state-layer-color: white}.page-content[_ngcontent-%COMP%]{padding-bottom:5rem;padding-top:2.5rem}.facts-card[_ngcontent-%COMP%], .doc-card[_ngcontent-%COMP%]{background:var(--mat-sys-surface-container-lowest)}.facts-card[_ngcontent-%COMP%]   mat-card-content[_ngcontent-%COMP%]{padding:0}.facts[_ngcontent-%COMP%]{display:grid;grid-template-columns:repeat(auto-fit,minmax(11rem,1fr));margin:0;overflow:hidden}.facts[_ngcontent-%COMP%]   div[_ngcontent-%COMP%]{padding:1.25rem 1.5rem}.facts[_ngcontent-%COMP%]   div[_ngcontent-%COMP%] + div[_ngcontent-%COMP%]{border-left:1px solid var(--border)}.facts[_ngcontent-%COMP%]   dt[_ngcontent-%COMP%]{color:var(--app-teal);font-size:.75rem;font-weight:700;letter-spacing:.12em;margin-bottom:.35rem;text-transform:uppercase}.facts[_ngcontent-%COMP%]   dd[_ngcontent-%COMP%]{font-size:1.05rem;font-weight:700;margin:0}.sections[_ngcontent-%COMP%]{display:grid;gap:1.25rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr));margin-top:1.25rem}.doc-card[_ngcontent-%COMP%]{min-width:0}.doc-card.wide[_ngcontent-%COMP%]{grid-column:1 / -1}.doc-card[_ngcontent-%COMP%]   mat-card-content[_ngcontent-%COMP%]{padding:clamp(1.25rem,3vw,2rem)}.doc-card[_ngcontent-%COMP%]   section[_ngcontent-%COMP%]{min-width:0}.section-badge[_ngcontent-%COMP%]{color:var(--app-teal);font-size:.75rem;font-weight:700;letter-spacing:.14em;margin:0 0 .75rem;text-transform:uppercase}h2[_ngcontent-%COMP%]{font-size:1.35rem;letter-spacing:-.02em;margin:0}.doc-card[_ngcontent-%COMP%]   section[_ngcontent-%COMP%] > p[_ngcontent-%COMP%]:not(.section-badge), .doc-card[_ngcontent-%COMP%]   section[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]{color:var(--muted-text);line-height:1.65}ul[_ngcontent-%COMP%], ol[_ngcontent-%COMP%]{margin:1.15rem 0 0;padding-left:1.4rem}li[_ngcontent-%COMP%]{padding-left:.25rem}li[_ngcontent-%COMP%] + li[_ngcontent-%COMP%]{margin-top:.65rem}li[_ngcontent-%COMP%]::marker{color:var(--app-teal);font-weight:700}.table-scroll[_ngcontent-%COMP%]{margin-top:1.25rem;overflow-x:auto}.table-scroll[_ngcontent-%COMP%]:focus-visible{border-radius:.35rem;outline:.2rem solid var(--app-teal);outline-offset:.2rem}table[_ngcontent-%COMP%]{border-collapse:collapse;line-height:1.5;min-width:60rem;width:100%}caption[_ngcontent-%COMP%]{color:var(--mat-sys-on-surface);font-size:1rem;font-weight:700;padding-bottom:.75rem;text-align:left}th[_ngcontent-%COMP%], td[_ngcontent-%COMP%]{border:1px solid var(--border);padding:.85rem;text-align:left;vertical-align:top}th[_ngcontent-%COMP%]{background:var(--mat-sys-surface-container);color:var(--mat-sys-on-surface)}td[_ngcontent-%COMP%]{color:var(--muted-text)}tbody[_ngcontent-%COMP%]   tr[_ngcontent-%COMP%]:nth-child(2n){background:var(--mat-sys-surface-container-low)}pre[_ngcontent-%COMP%]{background:var(--app-navy);border-radius:.75rem;color:#dbe9ff;line-height:1.6;overflow-x:auto;padding:1rem}aside[_ngcontent-%COMP%]{background:#fff3e0;border-left:.25rem solid #8b5000;border-radius:.25rem .75rem .75rem .25rem;color:#4e2600;line-height:1.65;margin-top:1.25rem;padding:1rem}aside[_ngcontent-%COMP%]   strong[_ngcontent-%COMP%]{display:block;margin-bottom:.2rem}.section-actions[_ngcontent-%COMP%]{margin-top:1.35rem}.section-actions[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{color:var(--app-teal)}@media(max-width:40rem){.actions[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{justify-content:space-between;width:100%}.facts[_ngcontent-%COMP%]{grid-template-columns:1fr}.facts[_ngcontent-%COMP%]   div[_ngcontent-%COMP%] + div[_ngcontent-%COMP%]{border-left:0;border-top:1px solid var(--border)}.page-content[_ngcontent-%COMP%]{padding-bottom:3rem}}"]})};export{R as DocPage};
