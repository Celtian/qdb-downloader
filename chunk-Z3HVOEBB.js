import{C as x,E as n,H as b,I as D,Ia as k,J as O,Ja as E,Ka as A,La as j,M as h,Ma as z,N as l,O as s,P as y,Q as p,R as g,S as _,T as i,U as r,Y as d,Z as I,_ as S,fa as u,ga as o,ha as m,ia as v,n as P,o as w,p as C,pa as F,ra as T}from"./chunk-5AWOZGHG.js";var G=["*"];var H=new w("MAT_CARD_CONFIG"),$=(()=>{class t{appearance;constructor(){let e=C(H,{optional:!0});this.appearance=e?.appearance||"raised"}static \u0275fac=function(c){return new(c||t)};static \u0275cmp=b({type:t,selectors:[["mat-card"]],hostAttrs:[1,"mat-mdc-card","mdc-card"],hostVars:8,hostBindings:function(c,f){c&2&&u("mat-mdc-card-outlined",f.appearance==="outlined")("mdc-card--outlined",f.appearance==="outlined")("mat-mdc-card-filled",f.appearance==="filled")("mdc-card--filled",f.appearance==="filled")},inputs:{appearance:"appearance"},exportAs:["matCard"],ngContentSelectors:G,decls:1,vars:0,template:function(c,f){c&1&&(I(),S(0))},styles:[`.mat-mdc-card {
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
`],encapsulation:2})}return t})();var B=(()=>{class t{static \u0275fac=function(c){return new(c||t)};static \u0275dir=O({type:t,selectors:[["mat-card-content"]],hostAttrs:[1,"mat-mdc-card-content"]})}return t})();var L=(()=>{class t{static \u0275fac=function(c){return new(c||t)};static \u0275mod=D({type:t});static \u0275inj=P({imports:[k]})}return t})();var X=(t,a)=>a.title,M=(t,a)=>a.label;function U(t,a){if(t&1&&(i(0,"a",11),o(1),i(2,"mat-icon",12),o(3,"arrow_forward"),r()()),t&2){let e=d().$implicit;u("primary-action",e.primary),_("matButton",e.primary?"filled":"outlined")("routerLink",e.route),n(),v(" ",e.label," ")}}function q(t,a){if(t&1&&(i(0,"a",13),o(1),i(2,"mat-icon",12),o(3,"open_in_new"),r()()),t&2){let e=d().$implicit;u("primary-action",e.primary),_("matButton",e.primary?"filled":"outlined")("href",e.href,x),h("aria-label",e.label+" (opens in a new tab)"),n(),v(" ",e.label," ")}}function J(t,a){if(t&1&&l(0,U,4,5,"a",9)(1,q,4,6,"a",10),t&2){let e=a.$implicit;s(e.route?0:1)}}function K(t,a){if(t&1&&(i(0,"div",4),p(1,J,2,1,null,null,M),r()),t&2){let e=d();n(),g(e.content.actions)}}function Q(t,a){if(t&1&&(i(0,"div")(1,"dt"),o(2),r(),i(3,"dd"),o(4),r()()),t&2){let e=a.$implicit;n(2),m(e.label),n(2),m(e.value)}}function W(t,a){if(t&1&&(i(0,"mat-card",6)(1,"mat-card-content")(2,"dl",14),p(3,Q,5,2,"div",null,M),r()()()),t&2){let e=d();n(3),g(e.content.facts)}}function Y(t,a){if(t&1&&(i(0,"p",16),o(1),r()),t&2){let e=d().$implicit;n(),m(e.badge)}}function Z(t,a){if(t&1&&(i(0,"p"),o(1),r()),t&2){let e=a.$implicit;n(),m(e)}}function tt(t,a){if(t&1&&(i(0,"li"),o(1),r()),t&2){let e=a.$implicit;n(),m(e)}}function et(t,a){if(t&1&&(i(0,"ul"),p(1,tt,2,1,"li",null,y),r()),t&2){let e=d().$implicit;n(),g(e.items)}}function nt(t,a){if(t&1&&(i(0,"li"),o(1),r()),t&2){let e=a.$implicit;n(),m(e)}}function at(t,a){if(t&1&&(i(0,"ol"),p(1,nt,2,1,"li",null,y),r()),t&2){let e=d().$implicit;n(),g(e.steps)}}function it(t,a){if(t&1&&(i(0,"pre")(1,"code"),o(2),r()()),t&2){let e=d().$implicit;n(2),m(e.code)}}function rt(t,a){if(t&1&&(i(0,"aside")(1,"strong"),o(2,"Good to know"),r(),i(3,"span"),o(4),r()()),t&2){let e=d().$implicit;n(4),m(e.note)}}function ot(t,a){if(t&1&&(i(0,"a",18),o(1),i(2,"mat-icon",12),o(3,"arrow_forward"),r()()),t&2){let e=d().$implicit;_("routerLink",e.route),n(),v(" ",e.label," ")}}function ct(t,a){if(t&1&&(i(0,"a",19),o(1),i(2,"mat-icon",12),o(3,"open_in_new"),r()()),t&2){let e=d().$implicit;_("href",e.href,x),h("aria-label",e.label+" (opens in a new tab)"),n(),v(" ",e.label," ")}}function dt(t,a){if(t&1&&l(0,ot,4,2,"a",18)(1,ct,4,3,"a",19),t&2){let e=a.$implicit;s(e.route?0:1)}}function mt(t,a){if(t&1&&(i(0,"div",17),p(1,dt,2,1,null,null,M),r()),t&2){let e=d().$implicit;n(),g(e.actions)}}function lt(t,a){if(t&1&&(i(0,"mat-card",15)(1,"mat-card-content")(2,"section"),l(3,Y,2,1,"p",16),i(4,"h2"),o(5),r(),p(6,Z,2,1,"p",null,y),l(8,et,3,0,"ul"),l(9,at,3,0,"ol"),l(10,it,3,1,"pre"),l(11,rt,5,1,"aside"),l(12,mt,3,0,"div",17),r()()()),t&2){let e=a.$implicit;u("wide",e.wide),n(3),s(e.badge?3:-1),n(2),m(e.title),n(),g(e.paragraphs),n(2),s(e.items?.length?8:-1),n(),s(e.steps?.length?9:-1),n(),s(e.code?10:-1),n(),s(e.note?11:-1),n(),s(e.actions?.length?12:-1)}}var N=class t{content=C(F).snapshot.data.content;static \u0275fac=function(e){return new(e||t)};static \u0275cmp=b({type:t,selectors:[["app-doc-page"]],decls:15,vars:5,consts:[[1,"hero"],[1,"hero-content"],[1,"eyebrow"],[1,"summary"],["aria-label","Page actions",1,"actions"],[1,"page-content"],["appearance","outlined",1,"facts-card"],[1,"sections"],["appearance","outlined",1,"doc-card",3,"wide"],[3,"matButton","primary-action","routerLink"],["target","_blank","rel","noopener noreferrer",3,"matButton","primary-action","href"],[3,"matButton","routerLink"],["aria-hidden","true"],["target","_blank","rel","noopener noreferrer",3,"matButton","href"],["aria-label","At a glance",1,"facts"],["appearance","outlined",1,"doc-card"],[1,"section-badge"],[1,"section-actions"],["matButton","",3,"routerLink"],["matButton","","target","_blank","rel","noopener noreferrer",3,"href"]],template:function(e,c){e&1&&(i(0,"article")(1,"header",0)(2,"div",1)(3,"p",2),o(4),r(),i(5,"h1"),o(6),r(),i(7,"p",3),o(8),r(),l(9,K,3,0,"div",4),r()(),i(10,"div",5),l(11,W,5,0,"mat-card",6),i(12,"div",7),p(13,lt,13,9,"mat-card",8,X),r()()()),e&2&&(n(4),m(c.content.eyebrow),n(2),m(c.content.title),n(2),m(c.content.summary),n(),s(c.content.actions?.length?9:-1),n(2),s(c.content.facts?.length?11:-1),n(2),g(c.content.sections))},dependencies:[A,E,L,$,B,z,j,T],styles:[".hero[_ngcontent-%COMP%]{background:linear-gradient(135deg,var(--app-navy),var(--app-teal));color:#fff;min-height:15rem}.hero-content[_ngcontent-%COMP%], .page-content[_ngcontent-%COMP%]{margin:0 auto;max-width:90rem;padding-left:clamp(1.25rem,6vw,6rem);padding-right:clamp(1.25rem,6vw,6rem)}.hero-content[_ngcontent-%COMP%]{padding-bottom:3rem;padding-top:3rem}.eyebrow[_ngcontent-%COMP%]{color:#8debd5;font-size:.75rem;font-weight:700;letter-spacing:.16em;margin:0;text-transform:uppercase}h1[_ngcontent-%COMP%]{font-size:clamp(2.2rem,4vw,3.75rem);letter-spacing:-.04em;line-height:1.05;margin:.25rem 0 .75rem;max-width:57rem;text-wrap:balance}.summary[_ngcontent-%COMP%]{color:#d9f4ee;font-size:1.05rem;line-height:1.6;margin:0;max-width:45rem}.actions[_ngcontent-%COMP%], .section-actions[_ngcontent-%COMP%]{align-items:center;display:flex;flex-wrap:wrap;gap:.75rem}.actions[_ngcontent-%COMP%]{margin-top:1.5rem}.actions[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:not(.primary-action){--mat-button-outlined-label-text-color: white;--mat-button-outlined-outline-color: #d9f4ee;--mat-button-outlined-ripple-color: rgb(255 255 255 / 16%);--mat-button-outlined-state-layer-color: white}.page-content[_ngcontent-%COMP%]{padding-bottom:5rem;padding-top:2.5rem}.facts-card[_ngcontent-%COMP%], .doc-card[_ngcontent-%COMP%]{background:var(--mat-sys-surface-container-lowest)}.facts-card[_ngcontent-%COMP%]   mat-card-content[_ngcontent-%COMP%]{padding:0}.facts[_ngcontent-%COMP%]{display:grid;grid-template-columns:repeat(auto-fit,minmax(11rem,1fr));margin:0;overflow:hidden}.facts[_ngcontent-%COMP%]   div[_ngcontent-%COMP%]{padding:1.25rem 1.5rem}.facts[_ngcontent-%COMP%]   div[_ngcontent-%COMP%] + div[_ngcontent-%COMP%]{border-left:1px solid var(--border)}.facts[_ngcontent-%COMP%]   dt[_ngcontent-%COMP%]{color:var(--app-teal);font-size:.75rem;font-weight:700;letter-spacing:.12em;margin-bottom:.35rem;text-transform:uppercase}.facts[_ngcontent-%COMP%]   dd[_ngcontent-%COMP%]{font-size:1.05rem;font-weight:700;margin:0}.sections[_ngcontent-%COMP%]{display:grid;gap:1.25rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr));margin-top:1.25rem}.doc-card[_ngcontent-%COMP%]{min-width:0}.doc-card.wide[_ngcontent-%COMP%]{grid-column:1 / -1}.doc-card[_ngcontent-%COMP%]   mat-card-content[_ngcontent-%COMP%]{padding:clamp(1.25rem,3vw,2rem)}.doc-card[_ngcontent-%COMP%]   section[_ngcontent-%COMP%]{min-width:0}.section-badge[_ngcontent-%COMP%]{color:var(--app-teal);font-size:.75rem;font-weight:700;letter-spacing:.14em;margin:0 0 .75rem;text-transform:uppercase}h2[_ngcontent-%COMP%]{font-size:1.35rem;letter-spacing:-.02em;margin:0}.doc-card[_ngcontent-%COMP%]   section[_ngcontent-%COMP%] > p[_ngcontent-%COMP%]:not(.section-badge), .doc-card[_ngcontent-%COMP%]   section[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]{color:var(--muted-text);line-height:1.65}ul[_ngcontent-%COMP%], ol[_ngcontent-%COMP%]{margin:1.15rem 0 0;padding-left:1.4rem}li[_ngcontent-%COMP%]{padding-left:.25rem}li[_ngcontent-%COMP%] + li[_ngcontent-%COMP%]{margin-top:.65rem}li[_ngcontent-%COMP%]::marker{color:var(--app-teal);font-weight:700}pre[_ngcontent-%COMP%]{background:var(--app-navy);border-radius:.75rem;color:#dbe9ff;line-height:1.6;overflow-x:auto;padding:1rem}aside[_ngcontent-%COMP%]{background:#fff3e0;border-left:.25rem solid #8b5000;border-radius:.25rem .75rem .75rem .25rem;color:#4e2600;line-height:1.65;margin-top:1.25rem;padding:1rem}aside[_ngcontent-%COMP%]   strong[_ngcontent-%COMP%]{display:block;margin-bottom:.2rem}.section-actions[_ngcontent-%COMP%]{margin-top:1.35rem}.section-actions[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{color:var(--app-teal)}@media(max-width:40rem){.actions[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{justify-content:space-between;width:100%}.facts[_ngcontent-%COMP%]{grid-template-columns:1fr}.facts[_ngcontent-%COMP%]   div[_ngcontent-%COMP%] + div[_ngcontent-%COMP%]{border-left:0;border-top:1px solid var(--border)}.page-content[_ngcontent-%COMP%]{padding-bottom:3rem}}"]})};export{N as DocPage};
