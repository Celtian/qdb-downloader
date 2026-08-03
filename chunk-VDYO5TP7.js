import{$ as F,D as C,F as n,Fa as k,Ga as E,Ha as A,I as y,Ia as P,J as I,Ja as j,K as N,Ka as $,Ma as B,N as h,O as m,P as s,Q as S,R as x,S as p,T as u,U as b,V as i,W as r,_ as l,aa as T,ha as f,ia as c,ja as v,ka as d,o as w,p as M,q as _}from"./chunk-KODXWRUZ.js";var V=["*"];var X=new M("MAT_CARD_CONFIG"),z=(()=>{class t{appearance;constructor(){let e=_(X,{optional:!0});this.appearance=e?.appearance||"raised"}static \u0275fac=function(o){return new(o||t)};static \u0275cmp=y({type:t,selectors:[["mat-card"]],hostAttrs:[1,"mat-mdc-card","mdc-card"],hostVars:8,hostBindings:function(o,g){o&2&&f("mat-mdc-card-outlined",g.appearance==="outlined")("mdc-card--outlined",g.appearance==="outlined")("mat-mdc-card-filled",g.appearance==="filled")("mdc-card--filled",g.appearance==="filled")},inputs:{appearance:"appearance"},exportAs:["matCard"],ngContentSelectors:V,decls:1,vars:0,template:function(o,g){o&1&&(F(),T(0))},styles:[`.mat-mdc-card {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  position: relative;
  border-style: solid;
  border-width: 0;
  background-color: var(--%NS%mat-card-elevated-container-color, var(--%NS%mat-sys-surface-container-low));
  border-color: var(--%NS%mat-card-elevated-container-color, var(--%NS%mat-sys-surface-container-low));
  border-radius: var(--%NS%mat-card-elevated-container-shape, var(--%NS%mat-sys-corner-medium));
  box-shadow: var(--%NS%mat-card-elevated-container-elevation, var(--%NS%mat-sys-level1));
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
  border-radius: var(--%NS%mat-card-elevated-container-shape, var(--%NS%mat-sys-corner-medium));
}

.mat-mdc-card-outlined {
  background-color: var(--%NS%mat-card-outlined-container-color, var(--%NS%mat-sys-surface));
  border-radius: var(--%NS%mat-card-outlined-container-shape, var(--%NS%mat-sys-corner-medium));
  border-width: var(--%NS%mat-card-outlined-outline-width, 1px);
  border-color: var(--%NS%mat-card-outlined-outline-color, var(--%NS%mat-sys-outline-variant));
  box-shadow: var(--%NS%mat-card-outlined-container-elevation, var(--%NS%mat-sys-level0));
}
.mat-mdc-card-outlined::after {
  border: none;
}

.mat-mdc-card-filled {
  background-color: var(--%NS%mat-card-filled-container-color, var(--%NS%mat-sys-surface-container-highest));
  border-radius: var(--%NS%mat-card-filled-container-shape, var(--%NS%mat-sys-corner-medium));
  box-shadow: var(--%NS%mat-card-filled-container-elevation, var(--%NS%mat-sys-level0));
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
  font-family: var(--%NS%mat-card-title-text-font, var(--%NS%mat-sys-title-large-font));
  line-height: var(--%NS%mat-card-title-text-line-height, var(--%NS%mat-sys-title-large-line-height));
  font-size: var(--%NS%mat-card-title-text-size, var(--%NS%mat-sys-title-large-size));
  letter-spacing: var(--%NS%mat-card-title-text-tracking, var(--%NS%mat-sys-title-large-tracking));
  font-weight: var(--%NS%mat-card-title-text-weight, var(--%NS%mat-sys-title-large-weight));
}

.mat-mdc-card-subtitle {
  color: var(--%NS%mat-card-subtitle-text-color, var(--%NS%mat-sys-on-surface));
  font-family: var(--%NS%mat-card-subtitle-text-font, var(--%NS%mat-sys-title-medium-font));
  line-height: var(--%NS%mat-card-subtitle-text-line-height, var(--%NS%mat-sys-title-medium-line-height));
  font-size: var(--%NS%mat-card-subtitle-text-size, var(--%NS%mat-sys-title-medium-size));
  letter-spacing: var(--%NS%mat-card-subtitle-text-tracking, var(--%NS%mat-sys-title-medium-tracking));
  font-weight: var(--%NS%mat-card-subtitle-text-weight, var(--%NS%mat-sys-title-medium-weight));
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
`],encapsulation:2})}return t})();var L=(()=>{class t{static \u0275fac=function(o){return new(o||t)};static \u0275dir=N({type:t,selectors:[["mat-card-content"]],hostAttrs:[1,"mat-mdc-card-content"]})}return t})();var R=(()=>{class t{static \u0275fac=function(o){return new(o||t)};static \u0275mod=I({type:t});static \u0275inj=w({imports:[k]})}return t})();var U=(t,a)=>a.title,D=(t,a)=>a.label;function q(t,a){if(t&1&&(i(0,"a",12),c(1),i(2,"mat-icon",13),c(3,"arrow_forward"),r()()),t&2){let e=l().$implicit;f("doc-hero-outlined-button",!e.primary),b("matButton",e.primary?"filled":"outlined")("routerLink",e.route),n(),d(" ",e.label," ")}}function J(t,a){if(t&1&&(i(0,"a",14),c(1),i(2,"mat-icon",13),c(3,"open_in_new"),r()()),t&2){let e=l().$implicit;f("doc-hero-outlined-button",!e.primary),b("matButton",e.primary?"filled":"outlined")("href",e.href,C),h("aria-label",e.label+" (opens in a new tab)"),n(),d(" ",e.label," ")}}function K(t,a){if(t&1&&m(0,q,4,5,"a",10)(1,J,4,6,"a",11),t&2){let e=a.$implicit;s(e.route?0:1)}}function Q(t,a){if(t&1&&(i(0,"div",5),p(1,K,2,1,null,null,D),r()),t&2){let e=l();n(),u(e.content.actions)}}function W(t,a){if(t&1&&(i(0,"div",17)(1,"dt",18),c(2),r(),i(3,"dd",19),c(4),r()()),t&2){let e=a.$implicit;n(2),d(" ",e.label," "),n(2),v(e.value)}}function Y(t,a){if(t&1&&(i(0,"mat-card",7)(1,"mat-card-content",15)(2,"dl",16),p(3,W,5,2,"div",17,D),r()()()),t&2){let e=l();n(3),u(e.content.facts)}}function Z(t,a){if(t&1&&(i(0,"p",23),c(1),r()),t&2){let e=l().$implicit;n(),d(" ",e.badge," ")}}function tt(t,a){if(t&1&&(i(0,"p",25),c(1),r()),t&2){let e=a.$implicit;n(),v(e)}}function et(t,a){if(t&1&&(i(0,"li",31),c(1),r()),t&2){let e=a.$implicit;n(),d(" ",e," ")}}function at(t,a){if(t&1&&(i(0,"ul",26),p(1,et,2,1,"li",31,x),r()),t&2){let e=l().$implicit;n(),u(e.items)}}function nt(t,a){if(t&1&&(i(0,"li",31),c(1),r()),t&2){let e=a.$implicit;n(),d(" ",e," ")}}function it(t,a){if(t&1&&(i(0,"ol",26),p(1,nt,2,1,"li",31,x),r()),t&2){let e=l().$implicit;n(),u(e.steps)}}function rt(t,a){if(t&1&&(i(0,"th",34),c(1),r()),t&2){let e=a.$implicit;n(),d(" ",e," ")}}function ot(t,a){if(t&1&&(i(0,"td",36),c(1),r()),t&2){let e=a.$implicit;n(),d(" ",e," ")}}function ct(t,a){if(t&1&&(i(0,"tr",35),p(1,ot,2,1,"td",36,S),r()),t&2){let e=a.$implicit;n(),u(e)}}function dt(t,a){if(t&1&&(i(0,"div",27)(1,"table",32)(2,"caption",33),c(3),r(),i(4,"thead")(5,"tr"),p(6,rt,2,1,"th",34,x),r()(),i(8,"tbody"),p(9,ct,3,0,"tr",35,S),r()()()),t&2){let e=a;h("aria-label",e.caption),n(3),d(" ",e.caption," "),n(3),u(e.columns),n(3),u(e.rows)}}function lt(t,a){if(t&1&&(i(0,"pre",28)(1,"code"),c(2),r()()),t&2){let e=l().$implicit;n(2),v(e.code)}}function mt(t,a){if(t&1&&(i(0,"aside",29)(1,"strong",37),c(2,"Good to know"),r(),i(3,"span"),c(4),r()()),t&2){let e=l().$implicit;n(4),v(e.note)}}function st(t,a){if(t&1&&(i(0,"a",38),c(1),i(2,"mat-icon",13),c(3,"arrow_forward"),r()()),t&2){let e=l().$implicit;b("routerLink",e.route),n(),d(" ",e.label," ")}}function pt(t,a){if(t&1&&(i(0,"a",39),c(1),i(2,"mat-icon",13),c(3,"open_in_new"),r()()),t&2){let e=l().$implicit;b("href",e.href,C),h("aria-label",e.label+" (opens in a new tab)"),n(),d(" ",e.label," ")}}function ut(t,a){if(t&1&&m(0,st,4,2,"a",38)(1,pt,4,3,"a",39),t&2){let e=a.$implicit;s(e.route?0:1)}}function ft(t,a){if(t&1&&(i(0,"div",30),p(1,ut,2,1,null,null,D),r()),t&2){let e=l().$implicit;n(),u(e.actions)}}function gt(t,a){if(t&1&&(i(0,"mat-card",20)(1,"mat-card-content",21)(2,"section",22),m(3,Z,2,1,"p",23),i(4,"h2",24),c(5),r(),p(6,tt,2,1,"p",25,x),m(8,at,3,0,"ul",26),m(9,it,3,0,"ol",26),m(10,dt,11,2,"div",27),m(11,lt,3,1,"pre",28),m(12,mt,5,1,"aside",29),m(13,ft,3,0,"div",30),r()()()),t&2){let e,o=a.$implicit;f("col-span-full",o.wide),n(3),s(o.badge?3:-1),n(2),d(" ",o.title," "),n(),u(o.paragraphs),n(2),s(o.items?.length?8:-1),n(),s(o.steps?.length?9:-1),n(),s((e=o.table)?10:-1,e),n(),s(o.code?11:-1),n(),s(o.note?12:-1),n(),s(o.actions?.length?13:-1)}}var G=class t{content=_($).snapshot.data.content;static \u0275fac=function(e){return new(e||t)};static \u0275cmp=y({type:t,selectors:[["app-doc-page"]],hostAttrs:[1,"block"],decls:15,vars:5,consts:[[1,"min-h-60","bg-linear-to-br","from-app-navy","to-app-teal","text-white"],[1,"mx-auto","max-w-360","px-doc-gutter","py-12"],[1,"m-0","text-xs","font-bold","tracking-doc-eyebrow","text-sidebar-icon","uppercase"],[1,"mt-1","mb-3","max-w-228","text-doc-heading","leading-doc-heading","font-bold","tracking-doc-heading","text-balance"],[1,"m-0","max-w-180","text-doc-summary","leading-doc-summary","text-app-mint"],["aria-label","Page actions",1,"mt-6","flex","flex-wrap","items-center","gap-3"],[1,"mx-auto","max-w-360","px-doc-gutter","pt-10","pb-20","max-sm:pb-12"],["appearance","outlined",1,"bg-surface-container-lowest"],[1,"mt-5","grid","grid-cols-doc-sections","gap-5"],["appearance","outlined",1,"min-w-0","bg-surface-container-lowest",3,"col-span-full"],[1,"max-sm:w-full","max-sm:justify-between",3,"matButton","doc-hero-outlined-button","routerLink"],["target","_blank","rel","noopener noreferrer",1,"max-sm:w-full","max-sm:justify-between",3,"matButton","doc-hero-outlined-button","href"],[1,"max-sm:w-full","max-sm:justify-between",3,"matButton","routerLink"],["aria-hidden","true"],["target","_blank","rel","noopener noreferrer",1,"max-sm:w-full","max-sm:justify-between",3,"matButton","href"],[1,"p-0"],["aria-label","At a glance",1,"m-0","grid","grid-cols-doc-facts","overflow-hidden","max-sm:grid-cols-1"],[1,"border-outline-variant","px-6","py-5","not-first:border-l","max-sm:not-first:border-t","max-sm:not-first:border-l-0"],[1,"mb-1.5","text-xs","font-bold","tracking-doc-fact-label","text-app-teal","uppercase"],[1,"m-0","text-doc-copy","font-bold"],["appearance","outlined",1,"min-w-0","bg-surface-container-lowest"],[1,"p-doc-card-padding"],[1,"min-w-0"],[1,"mt-0","mb-3","text-xs","font-bold","tracking-doc-section-label","text-app-teal","uppercase"],[1,"m-0","text-doc-section-heading","font-bold","tracking-doc-section-heading"],[1,"leading-doc-body","text-on-surface-variant"],[1,"mt-doc-list-margin","ps-doc-list-padding","marker:font-bold","marker:text-app-teal"],["role","region","tabindex","0",1,"mt-5","overflow-x-auto","rounded-md","focus-visible:outline-3","focus-visible:outline-offset-3","focus-visible:outline-app-teal"],[1,"overflow-x-auto","rounded-xl","bg-app-navy","p-4","leading-doc-summary","text-sidebar-foreground"],[1,"mt-5","rounded-l","rounded-r-xl","border-l-4","border-amber-700","bg-orange-50","p-4","leading-doc-body","text-amber-950"],[1,"mt-doc-section-actions","flex","flex-wrap","items-center","gap-3"],[1,"ps-1","leading-doc-body","text-on-surface-variant","not-first:mt-doc-list-gap"],[1,"w-full","min-w-240","border-collapse","leading-normal"],[1,"pb-3","text-left","text-base","font-bold","text-on-surface"],["scope","col",1,"border","border-outline-variant","bg-surface-container","p-doc-table-cell","text-left","align-top","text-on-surface"],[1,"even:bg-surface-container-low"],[1,"border","border-outline-variant","p-doc-table-cell","text-left","align-top","text-on-surface-variant"],[1,"mb-doc-note-title","block"],["matButton","",1,"text-app-teal",3,"routerLink"],["matButton","","target","_blank","rel","noopener noreferrer",1,"text-app-teal",3,"href"]],template:function(e,o){e&1&&(i(0,"article")(1,"header",0)(2,"div",1)(3,"p",2),c(4),r(),i(5,"h1",3),c(6),r(),i(7,"p",4),c(8),r(),m(9,Q,3,0,"div",5),r()(),i(10,"div",6),m(11,Y,5,0,"mat-card",7),i(12,"div",8),p(13,gt,14,10,"mat-card",9,U),r()()()),e&2&&(n(4),d(" ",o.content.eyebrow," "),n(2),d(" ",o.content.title," "),n(2),d(" ",o.content.summary," "),n(),s(o.content.actions?.length?9:-1),n(2),s(o.content.facts?.length?11:-1),n(2),u(o.content.sections))},dependencies:[A,E,R,z,L,j,P,B],encapsulation:2})};export{G as DocPage};
