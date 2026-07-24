import{$ as u,A as w,Aa as $e,B as ze,Ba as Je,C as Ve,Ca as A,D as ee,Da as Ye,E as c,Ea as L,F as ge,Fa as Xe,G as F,Ga as P,H as g,Ha as et,I as te,Ia as ie,J as ne,Ja as tt,K as Ae,Ka as nt,L as I,La as rt,M as z,Ma as at,N as W,Na as it,O as Q,R as _e,S as we,T as G,U as o,V as s,W as Le,X as V,Y as R,Z as M,_ as v,a as Ee,aa as ve,b as p,ba as re,c as Pe,ca as b,d as ce,da as y,e as Te,ea as U,f as k,fa as H,g as he,ga as f,h as Be,ha as l,i as pe,ia as Ne,j as ue,ja as be,k as Fe,ka as ye,l as K,la as O,m,ma as Ce,n as $,na as q,o as T,oa as je,p as i,pa as We,q as x,r as D,ra as Qe,s as J,sa as Ge,t as Y,ta as Ue,u as X,ua as He,v as _,va as E,w as Ie,wa as ae,x as me,xa as qe,y as B,ya as Ze,z as fe,za as Ke}from"./chunk-VN7Z3VCJ.js";var ot=new T("[ngxAppVersion] Options"),st=r=>({provide:ot,useValue:{version:r.version}}),dt=(()=>{class r{options=i(ot);element=i(w);renderer=i(F);ngOnInit(){this.renderer.setAttribute(this.element.nativeElement,"app-version",this.options.version)}static \u0275fac=function(t){return new(t||r)};static \u0275dir=ne({type:r,selectors:[["","ngxAppVersion",""]]})}return r})();var N={version:"0.0.17",date:"2026-07-24T09:11:45.163Z",author:{name:"Dominik Hlad\xEDk",email:"dominik.hladik@seznam.cz",url:"https://github.com/Celtian"},git:{branch:"HEAD",commit:"68bbe300a7db65ecd2b852dc3ed257214c811e49"}};var C={overview:{eyebrow:"Local-first desktop app",title:"Football data, frozen at the date you choose",summary:"Create focused football-data snapshots, review every database change, browse normalized leagues, teams, and players, then export the exact data you need.",actions:[{label:"Download for Windows",href:"https://github.com/Celtian/qdb-downloader/releases/latest",primary:!0},{label:"Explore the features",route:"/features"}],facts:[{label:"Platform",value:"Windows x64"},{label:"Storage",value:"Local SQLite"},{label:"Sources",value:"4 online providers"},{label:"Exports",value:"JSON, nested JSON, and CSV"}],sections:[{badge:"01 \xB7 Organize",title:"A project is a snapshot",paragraphs:["Create projects such as 2026/1 with a reference date of 2026-01-01. The timezone-independent calendar date describes the project snapshot as a whole. Transfermarkt can use a separate optional season, while Eurofotbal includes a league season in its Source ID.","Project names are unique without regard to letter case. Search larger project lists, review record totals, and rename or delete projects without affecting other snapshots."]},{badge:"02 \xB7 Collect",title:"Choose what enters your data",paragraphs:["Preview a league or team from Transfermarkt, Soccerway, WorldFootball, or Eurofotbal before anything is saved. Select the squads and individual players that belong in the snapshot, then review conflicts and commit the change as one transaction."]},{badge:"03 \xB7 Explore",title:"Browse without losing context",paragraphs:["Search, filter, sort, page, and customize columns across league, team, and player tables. Follow a league into its teams and a team into its players while staying inside the active snapshot.","Filter selections are remembered per project and table. Column visibility and order are remembered for each entity, including keyboard-accessible reordering. Select records on the current page to change countries or league tiers in bulk, or to review and confirm their deletion."],actions:[{label:"Manage stored data",route:"/managing-data"}]},{badge:"04 \xB7 Reuse",title:"Take the whole snapshot with you",paragraphs:["Choose leagues, unassigned teams, and columns, then export the resulting teams and players as separate JSON or CSV files or as one nested JSON snapshot. The predictable output is ready for analysis, scripts, spreadsheets, or archiving."]},{badge:"Privacy",title:"Local by design",paragraphs:["Your projects live in a local SQLite database with transactional writes, foreign keys, and WAL. SQLite and Soccerbot run only in the Electron main process, while the Angular interface stays behind a typed, restricted desktop boundary."],actions:[{label:"See every feature",route:"/features"}],wide:!0}]},features:{eyebrow:"What you can do",title:"From a source page to a reusable snapshot",summary:"QDB Downloader keeps collection, review, storage, exploration, and export in one focused desktop workflow.",actions:[{label:"Download the app",route:"/download",primary:!0},{label:"Read the import guide",route:"/importing"},{label:"Manage stored data",route:"/managing-data"}],sections:[{badge:"Snapshots",title:"Manage snapshots by date",paragraphs:["Give each project a name and a required reference date. Every project remains isolated, so you can keep multiple historical or planned datasets side by side."],items:["Timezone-independent calendar dates","Case-insensitive unique project names","Search plus at-a-glance league, team, and player totals","Rename or permanently delete projects and their stored records"]},{badge:"Import",title:"Preview before saving",paragraphs:["Start with a supported source URL or ID, load its data, and narrow the result before it reaches the database."],items:["League and direct-team import workflows","Transfermarkt, Soccerway, WorldFootball, and Eurofotbal provider identities kept separate","Optional Transfermarkt seasons independent of the reference date","Eurofotbal league seasons embedded in their Source IDs","Team, squad, and individual-player selection","Progress reporting and cancellation after the current squad"]},{badge:"Updates",title:"Control conflicts and ownership",paragraphs:["Refresh existing sources without blindly overwriting the snapshot. Review matching identities and decide how names, missing records, leagues, and teams should be handled."],items:["Keep, refresh, move, detach, deduplicate, or delete records","Missing-team, missing-player, name, and ownership policies","One final add, update, preserve, move, detach, deduplicate, and delete summary"]},{badge:"Browse",title:"Find the records that matter",paragraphs:["Explore normalized tables without loading the entire dataset into the interface. SQLite handles large result sets behind the scenes."],items:["Search, sorting, filters, and pagination","Filters for source, parents, seasons, league tiers, nationalities, positions, and preferred foot","League tier sorting plus filters for tiers 1 to 10 and leagues without a tier","General and detailed player positions, including GK, CB, CAM, and ST","Remembered filter selections plus column visibility and order","Mouse, touch, and keyboard column reordering"]},{badge:"Manage",title:"Keep stored data accurate",paragraphs:["Edit league and team names, countries, source identities, optional Transfermarkt seasons, league tiers, and team-to-league relationships. Select records on the current page to change countries, apply or clear league tiers, or delete them in one confirmed action."],items:["Optional league tiers from 1 to 10","Single-record and page-selection metadata changes","League-only deletion that keeps teams unassigned","Cascading league, team, and player deletion with affected-record counts","Source-based cleanup from Settings with a deletion preview"],actions:[{label:"Read the managing data guide",route:"/managing-data"}]},{badge:"Preferences",title:"Keep the workspace comfortable",paragraphs:["Follow the operating-system appearance or choose a persistent light or dark theme. Settings can also clear every saved finder filter and column layout without changing search text, projects, or the theme."]},{badge:"Export",title:"Create portable output",paragraphs:["Select columns plus leagues or unassigned teams. Their teams and players are included automatically. Choose separate JSON for code and APIs, Single JSON for one nested snapshot, or CSV for spreadsheets and data tools."],actions:[{label:"Learn about exports",route:"/exporting"}]}]},download:{eyebrow:"Windows x64",title:"Download, install, and start your first snapshot",summary:"Get QDB Downloader from the official GitHub Releases page. Use the installer for automatic setup, or choose the ZIP when you prefer a portable copy.",actions:[{label:"Open the latest release",href:"https://github.com/Celtian/qdb-downloader/releases/latest",primary:!0},{label:"View all releases",href:"https://github.com/Celtian/qdb-downloader/releases"}],facts:[{label:"Recommended",value:"Setup installer"},{label:"Alternative",value:"Portable ZIP"},{label:"License",value:"MIT"}],sections:[{badge:"Recommended",title:"Install with Setup",paragraphs:["The Setup build is the simplest choice for regular use and receives packaged-app update checks."],steps:["Open the latest release and expand Assets if GitHub has collapsed the file list.","Download QDB-Downloader-Setup.exe and its matching .sha256 file.","Run QDB-Downloader-Setup.exe and follow the Windows prompts.","Launch QDB Downloader from the installed application shortcut."],note:"The application is currently unsigned. Windows SmartScreen or antivirus software may show a warning. Confirm that the download came from the official Celtian/qdb-downloader release and verify its checksum before deciding whether to continue. Do not disable antivirus globally.",actions:[{label:"Download the latest Setup",href:"https://github.com/Celtian/qdb-downloader/releases/latest"}]},{badge:"Portable option",title:"Run from the ZIP",paragraphs:["The ZIP does not need the normal installer and can live in a folder you choose."],steps:["Download the Windows x64 ZIP and its matching .sha256 file from the release assets.","Extract the entire archive to a writable folder. Do not run the executable from inside the ZIP preview.","Open the extracted folder and run QDB Downloader.exe."],note:"Keep the extracted files together. Moving only the executable will leave behind files the desktop app needs to start."},{badge:"Integrity check",title:"Verify the download",paragraphs:["Open PowerShell in the download folder and calculate the SHA-256 hash. Compare the resulting hash with the first value in the matching checksum file."],code:`Get-FileHash .\\QDB-Downloader-Setup.exe -Algorithm SHA256
Get-Content .\\QDB-Downloader-Setup.exe.sha256`},{badge:"First run",title:"Create your first project",paragraphs:["QDB Downloader stores its project database locally. An internet connection is required when fetching or refreshing data from an online source."],steps:["Select New project, enter a unique name, and choose the snapshot reference date.","Open the project and select Import.","Enter a league or team name plus a supported source URL or ID.","Preview the result, select teams and players, review every proposed change, then confirm the import.","Browse the saved records or choose the leagues, columns, and format for an export."],actions:[{label:"Continue to importing",route:"/importing"}],wide:!0}]},importing:{eyebrow:"Source data",title:"Preview first, commit once",summary:"Use the guided workflow to add or update selected teams and players without leaving partially imported data.",actions:[{label:"Download QDB Downloader",route:"/download",primary:!0},{label:"Review all features",route:"/features"}],sections:[{title:"Choose the operation and provider",paragraphs:["Choose New import to add source data or Update existing to synchronize a stored league or team. Then choose whether the selected source represents a league or one team.","Enter the selected provider\u2019s source ID or paste a complete provider URL. Only the extracted source ID is stored. League names are detected when possible from provider metadata or source slugs; direct-team imports require the display name. When updating an existing record, the selected provider filters the available targets."],table:{caption:"Supported provider capabilities",columns:["Provider","Best for","Import behavior","Season handling","Player links"],rows:[["Transfermarkt","Recommended for the broadest coverage","Fast imports","Optional separate four-digit season","Not available"],["Soccerway","Global alternative when Transfermarkt data is unavailable","Slower because requests are rate-limited","Not used","Available"],["WorldFootball","Global coverage with detailed player profiles","Profiles load separately; fetch no more than two squads per batch","Not used","Available"],["Eurofotbal","Very fast, Europe-focused imports","Final canonical URLs only; redirected URLs cannot be loaded","League season embedded in the Source ID; no separate team season","Not available"]]},wide:!0},{title:"How Soccerbot combines stored source IDs into URLs",paragraphs:["QDB Downloader stores sourceName and sourceId, then asks Soccerbot to derive the source page. The URL is not stored, so changing a source ID immediately regenerates the link.","Transfermarkt league: GB1 \u2192 https://www.transfermarkt.com/slug/startseite/wettbewerb/GB1. Supplying season 2026 adds /plus?saison_id=2026.","Transfermarkt team: 281 \u2192 https://www.transfermarkt.com/slug/kader/verein/281/plus/1. Supplying season 2026 adds ?saison_id=2026.","Soccerway league: czech-republic/chance-liga/standings/bNFMkskm \u2192 https://www.soccerway.com/czech-republic/chance-liga/standings/bNFMkskm/standings/overall/.","Soccerway team: slavia-prague/viXGgnyB \u2192 https://www.soccerway.com/team/slavia-prague/viXGgnyB/squad/. Soccerway player: kolar-ondrej/xfBGcS1U \u2192 https://www.soccerway.com/player/kolar-ondrej/xfBGcS1U/.","WorldFootball league: co7093/mexico-lp---serie-b \u2192 https://www.worldfootball.net/competition/co7093/mexico-lp---serie-b/.","WorldFootball team: te237557/artesanos-metepec \u2192 https://www.worldfootball.net/teams/te237557/artesanos-metepec/squad/. WorldFootball player: pe599828/oscar-altamirano \u2192 https://www.worldfootball.net/person/pe599828/oscar-altamirano/.","Eurofotbal league: chance-liga/2026-2027 \u2192 https://www.eurofotbal.cz/chance-liga/2026-2027/tabulky/. The season is part of the Eurofotbal league Source ID. Paste only the final canonical URL because redirected URLs cannot be loaded.","Eurofotbal team: cesko/sparta-praha \u2192 https://www.eurofotbal.cz/kluby/cesko/sparta-praha/soupiska.","Transfermarkt and Eurofotbal player source pages are left absent because Soccerbot does not provide player URL APIs for those providers."],note:"An import job always uses one provider. Equal player IDs from different providers remain separate records; cross-provider player matching is not performed. Soccerbot may use LiveFutbol internally if WorldFootball is blocked, but QDB Downloader accepts and stores only canonical WorldFootball identities."},{title:"Build the selection",paragraphs:["Preview a league, select the teams whose squads should be fetched, and then choose entire squads or individual players. A direct-team import starts with its returned squad; individual players are selected from that result."],note:"During a multi-team fetch, Cancel after current team stops before the next squad while preserving the squads already loaded for review. With WorldFootball, fetch no more than two squads at a time because larger batches may be temporarily blocked."},{title:"Control update behavior",paragraphs:["For an existing league, decide whether absent teams stay unchanged, become unassigned, or are deleted with their players. For league and team updates, decide whether absent players stay or are deleted."],items:["Keep or move teams already owned by another league","Keep or move players already owned by another team","Keep stored names or replace them with incoming source names"]},{title:"Resolve matches before importing",paragraphs:["A new import that matches stored source identities shows the conflicts before commit. Choose whether matching data is kept or refreshed and whether team and player ownership stays where it is or moves to the imported parent.","Historical duplicate player copies are identified and consolidated when required."]},{title:"Review and commit once",paragraphs:["The final summary shows the source, selection, policies, conflicts, and add, update, preserve, move, detach, deduplicate, and delete counts. Destructive changes are called out before the action is enabled.","Only the final confirmation writes to SQLite, and all selected changes are applied in one transaction. Cancellation, preview errors, and network failures do not modify the database."]},{title:"Refresh or edit a stored source",paragraphs:["Use Refresh from a league or team table to open the update workflow for that record. Its stored provider is locked and automatically selects the matching scraper. Use Edit to change league or team names, league and team countries, source IDs, optional Transfermarkt seasons, and team-to-league relationships. Eurofotbal league seasons are edited as part of the Source ID. Regenerated source links and provider-aware duplicate checks keep the stored source consistent. Teams can also be permanently deleted with their attached players after confirmation."],actions:[{label:"Manage existing records",route:"/managing-data"}]}]},managingData:{eyebrow:"Stored project data",title:"Keep every snapshot accurate and intentional",summary:"Classify leagues, update countries in bulk, and remove records with a clear preview of what will be retained or permanently deleted.",actions:[{label:"Review all features",route:"/features",primary:!0},{label:"Read the import guide",route:"/importing"}],sections:[{badge:"Select",title:"Work with one record or a page selection",paragraphs:["Open a league or team row action menu to edit, refresh, or delete that record. Player row actions support deletion. To manage several records together, select their checkboxes in a league, team, or player finder. Select all applies to the records on the current page, and changing the page, search, sort, or filters clears the selection.","The selection bar shows how many records are selected and exposes only the actions supported by that entity: countries for leagues and teams, tiers for leagues, and deletion for every entity."]},{badge:"Classify",title:"Organize leagues by tier",paragraphs:["A league can have an optional tier from 1 to 10. Set it while editing one league, or select leagues and use Change tier to apply the same tier or clear it from every selected league.","Show the Tier column when you want to sort the finder by tier. The league filters can include one or more tiers and can separately include leagues without a tier. Tier filters and column choices are remembered like the other finder preferences."]},{badge:"Countries",title:"Correct countries individually or in bulk",paragraphs:["Edit one league or team to choose a country from the football-country and association autocomplete. Flags and normalized country metadata are shown throughout the finders.","For a larger correction, select leagues or teams on the current page and choose Change country. Apply one country to the selection or clear the country from every selected record."]},{badge:"Delete",title:"Review the impact before deleting records",paragraphs:["Delete one record from its row action menu, or select records and use the selection bar. Every confirmation names or counts the affected records and warns that the action cannot be undone."],items:["Deleting players removes only the selected player records.","Deleting a team permanently removes that team and every player attached to it.","Deleting a league only keeps its teams and players, but the teams become unassigned.","Deleting a league with teams permanently removes the league, its teams, and their players."],note:"League deletion defaults to \u201CDelete league only.\u201D Choose the cascading option explicitly when the teams and players should also be removed."},{badge:"Settings",title:"Remove stored data by source",paragraphs:["Open Settings and use Stored source data when an entire provider should be removed from the current project. Select one or more sources and wait for the preview to show the exact league, team, and player counts before deletion is enabled.","The cleanup removes leagues, teams, and players whose provider is selected. Deleting a selected-source team also deletes every player attached to it, even when a player came from another source. A team from another source under a deleted league is retained without a league."],note:"Source cleanup does not delete the project, existing export folders, the theme, or saved finder preferences. The confirmed database deletion is permanent."}]},exporting:{eyebrow:"Portable data",title:"Portable exports for every workflow",summary:"Choose the scope and columns, then export related leagues, teams, and players as separate JSON or CSV files or as one nested JSON snapshot.",actions:[{label:"Download QDB Downloader",route:"/download",primary:!0}],sections:[{title:"Choose the scope",paragraphs:["Select one or more leagues and optionally include teams that are not assigned to a league. Teams belonging to the selected leagues and all players belonging to the included teams are added automatically."]},{title:"Choose the columns",paragraphs:["Select at least one column for leagues, teams, and players. Defaults include portable identities and football data while leaving project IDs, source URLs, totals, and timestamps available when you need them."]},{title:"Choose one of three layouts",paragraphs:["JSON writes normalized league, team, and player arrays to three files. Single JSON writes snapshot.json with portable project metadata, selected leagues at the root, and players nested under their teams. CSV writes three UTF-8 tables with stable headers, CRLF rows, and RFC 4180 escaping."]},{title:"Create and open the export",paragraphs:["Choose a destination directory and review the format, scope, and columns. QDB Downloader creates a collision-safe folder from the project name, reference date, and timestamp, then offers to open it when writing succeeds.","Empty entity selections produce an empty JSON array or a header-only CSV; Single JSON always keeps its project, leagues, and teams structure."]}]},development:{eyebrow:"Contributor guide",title:"Strict from the first commit",summary:"The Bun-managed Angular 22 workspace validates renderer, desktop, shared, and documentation code together.",actions:[{label:"Browse the source",href:"https://github.com/Celtian/qdb-downloader",primary:!0},{label:"Read the contributor guide",href:"https://github.com/Celtian/qdb-downloader/blob/master/CONTRIBUTING.md"}],sections:[{title:"Install and run",paragraphs:["Use Bun 1.3.14 and Node.js 24.18 or newer, but earlier than Node.js 25. The main start command compiles Electron code, serves the renderer on 127.0.0.1:4200, and opens the desktop window; start the docs separately when needed."],code:`bun install --frozen-lockfile
bun run start
bun run start:docs`},{title:"Workspace layout",paragraphs:["projects/electron contains the standalone zoneless renderer, shared IPC contracts, Electron main and preload code, SQLite, Soccerbot integration, exports, and tests. projects/docs contains this statically generated site."]},{title:"Quality gates",paragraphs:["TypeScript strict mode, typed ESLint, Angular template accessibility checks, AXE tests, Prettier, Vitest, lint-staged, commit-message validation, and Husky are enforced through root scripts and CI."],code:`bun run format:check
bun run lint
bun run typecheck
bun run test
bun run validate`}]},releases:{eyebrow:"Delivery",title:"Windows builds and GitHub Pages",summary:"Stable semantic-version tags publish the app and documentation as one validated release.",actions:[{label:"Latest release",href:"https://github.com/Celtian/qdb-downloader/releases/latest",primary:!0},{label:"Release history",href:"https://github.com/Celtian/qdb-downloader/releases"}],sections:[{title:"Stable tags",paragraphs:["Push a stable vMAJOR.MINOR.PATCH tag from master to run validation, package unsigned Windows x64 Squirrel Setup and portable ZIP builds with Electron Forge, and publish the artifacts with SHA-256 checksums."]},{title:"Updates and documentation",paragraphs:["Packaged Windows builds check GitHub Releases for updates. The static documentation is built with the /qdb-downloader/ base path and deployed to GitHub Pages only after the Windows release succeeds."]}]}},S=(r,h,e)=>({path:r,title:h,data:{content:e},loadComponent:()=>import("./chunk-FMN5W5DQ.js").then(t=>t.DocPage)}),lt=[S("","QDB Downloader documentation",C.overview),S("features","Features \xB7 QDB Downloader",C.features),S("download","Download \xB7 QDB Downloader",C.download),S("importing","Importing \xB7 QDB Downloader",C.importing),S("managing-data","Managing data \xB7 QDB Downloader",C.managingData),S("exporting","Exporting \xB7 QDB Downloader",C.exporting),S("development","Development \xB7 QDB Downloader",C.development),S("releases","Releases \xB7 QDB Downloader",C.releases),{path:"**",redirectTo:""}];var ct={providers:[Ie(),He(lt),We(),st({version:N.version})]};var yt=20,Ct=(()=>{class r{_ngZone=i(_);_platform=i(E);_renderer=i(ge).createRenderer(null,null);_cleanupGlobalListener;_scrolled=new p;_scrolledCount=0;scrollContainers=new Map;register(e){this.scrollContainers.has(e)||this.scrollContainers.set(e,e.elementScrolled().subscribe(()=>this._scrolled.next(e)))}deregister(e){let t=this.scrollContainers.get(e);t&&(t.unsubscribe(),this.scrollContainers.delete(e))}scrolled(e=yt){return this._platform.isBrowser?new Ee(t=>{this._cleanupGlobalListener||(this._cleanupGlobalListener=this._ngZone.runOutsideAngular(()=>this._renderer.listen("document","scroll",()=>this._scrolled.next())));let n=e>0?this._scrolled.pipe(he(e)).subscribe(t):this._scrolled.subscribe(t);return this._scrolledCount++,()=>{n.unsubscribe(),this._scrolledCount--,this._scrolledCount||(this._cleanupGlobalListener?.(),this._cleanupGlobalListener=void 0)}}):Pe()}ngOnDestroy(){this._cleanupGlobalListener?.(),this._cleanupGlobalListener=void 0,this.scrollContainers.forEach((e,t)=>this.deregister(t)),this._scrolled.complete()}ancestorScrolled(e,t){let n=this.getAncestorScrollContainers(e);return this.scrolled(t).pipe(k(a=>!a||n.indexOf(a)>-1))}getAncestorScrollContainers(e){let t=[];return this.scrollContainers.forEach((n,a)=>{this._targetContainsElement(a,e)&&t.push(a)}),t}_targetContainsElement(e,t){let n=qe(t),a=e.getElementRef().nativeElement;do if(n==a)return!0;while(n=n.parentElement);return!1}static \u0275fac=function(t){return new(t||r)};static \u0275prov=fe({token:r,factory:r.\u0275fac})}return r})(),j=(()=>{class r{elementRef=i(w);scrollDispatcher=i(Ct);ngZone=i(_);dir=i(ie,{optional:!0});_scrollElement=this.elementRef.nativeElement;_destroyed=new p;_renderer=i(F);_cleanupScroll;_elementScrolled=new p;ngOnInit(){this._cleanupScroll=this.ngZone.runOutsideAngular(()=>this._renderer.listen(this._scrollElement,"scroll",e=>this._elementScrolled.next(e))),this.scrollDispatcher.register(this)}ngOnDestroy(){this._cleanupScroll?.(),this._elementScrolled.complete(),this.scrollDispatcher.deregister(this),this._destroyed.next(),this._destroyed.complete()}elementScrolled(){return this._elementScrolled}getElementRef(){return this.elementRef}scrollTo(e){let t=this.elementRef.nativeElement,n=this.dir&&this.dir.value=="rtl";e.left==null&&(e.left=n?e.end:e.start),e.right==null&&(e.right=n?e.start:e.end),e.bottom!=null&&(e.top=t.scrollHeight-t.clientHeight-e.bottom),n&&L()!=A.NORMAL?(e.left!=null&&(e.right=t.scrollWidth-t.clientWidth-e.left),L()==A.INVERTED?e.left=e.right:L()==A.NEGATED&&(e.left=e.right?-e.right:e.right)):e.right!=null&&(e.left=t.scrollWidth-t.clientWidth-e.right),this._applyScrollToOptions(e)}_applyScrollToOptions(e){let t=this.elementRef.nativeElement;Ye()?t.scrollTo(e):(e.top!=null&&(t.scrollTop=e.top),e.left!=null&&(t.scrollLeft=e.left))}measureScrollOffset(e){let t="left",n="right",a=this.elementRef.nativeElement;if(e=="top")return a.scrollTop;if(e=="bottom")return a.scrollHeight-a.clientHeight-a.scrollTop;let d=this.dir&&this.dir.value=="rtl";return e=="start"?e=d?n:t:e=="end"&&(e=d?t:n),d&&L()==A.INVERTED?e==t?a.scrollWidth-a.clientWidth-a.scrollLeft:a.scrollLeft:d&&L()==A.NEGATED?e==t?a.scrollLeft+a.scrollWidth-a.clientWidth:-a.scrollLeft:e==t?a.scrollLeft:a.scrollWidth-a.clientWidth-a.scrollLeft}static \u0275fac=function(t){return new(t||r)};static \u0275dir=ne({type:r,selectors:[["","cdk-scrollable",""],["","cdkScrollable",""]]})}return r})(),St=20,ht=(()=>{class r{_platform=i(E);_listeners;_viewportSize=null;_change=new p;_document=i(Y);constructor(){let e=i(_),t=i(ge).createRenderer(null,null);e.runOutsideAngular(()=>{if(this._platform.isBrowser){let n=a=>this._change.next(a);this._listeners=[t.listen("window","resize",n),t.listen("window","orientationchange",n)]}this.change().subscribe(()=>this._viewportSize=null)})}ngOnDestroy(){this._listeners?.forEach(e=>e()),this._change.complete()}getViewportSize(){this._viewportSize||this._updateViewportSize();let e={width:this._viewportSize.width,height:this._viewportSize.height};return this._platform.isBrowser||(this._viewportSize=null),e}getViewportRect(){let e=this.getViewportScrollPosition(),{width:t,height:n}=this.getViewportSize();return{top:e.top,left:e.left,bottom:e.top+n,right:e.left+t,height:n,width:t}}getViewportScrollPosition(){if(!this._platform.isBrowser)return{top:0,left:0};let e=this._document,t=this._getWindow(),n=e.documentElement,a=n.getBoundingClientRect(),d=-a.top||e.body?.scrollTop||t.scrollY||n.scrollTop||0,le=-a.left||e.body?.scrollLeft||t.scrollX||n.scrollLeft||0;return{top:d,left:le}}change(e=St){return e>0?this._change.pipe(he(e)):this._change}_getWindow(){return this._document.defaultView||window}_updateViewportSize(){let e=this._getWindow();this._viewportSize=this._platform.isBrowser?{width:e.innerWidth,height:e.innerHeight}:{width:0,height:0}}static \u0275fac=function(t){return new(t||r)};static \u0275prov=fe({token:r,factory:r.\u0275fac})}return r})();var ke=(()=>{class r{static \u0275fac=function(t){return new(t||r)};static \u0275mod=te({type:r});static \u0275inj=$({})}return r})();var se=["*"],xt=["content"],pt=[[["mat-drawer"],["mat-sidenav"]],[["mat-drawer-content"],["mat-sidenav-content"]],"*"],ut=["mat-drawer, mat-sidenav","mat-drawer-content, mat-sidenav-content","*"];function Dt(r,h){if(r&1){let e=V();o(0,"div",1),R("click",function(){x(e);let n=M();return D(n._onBackdropClicked())}),s()}if(r&2){let e=M();f("mat-drawer-shown",e._isShowingBackdrop())}}function Rt(r,h){r&1&&(o(0,"mat-drawer-content"),u(1,2),s())}function Mt(r,h){if(r&1){let e=V();o(0,"div",1),R("click",function(){x(e);let n=M();return D(n._onBackdropClicked())}),s()}if(r&2){let e=M();f("mat-drawer-shown",e._isShowingBackdrop())}}function Ot(r,h){r&1&&(o(0,"mat-sidenav-content"),u(1,2),s())}var Et=`.mat-drawer-container {
  position: relative;
  z-index: 1;
  color: var(--mat-sidenav-content-text-color, var(--mat-sys-on-background));
  background-color: var(--mat-sidenav-content-background-color, var(--mat-sys-background));
  box-sizing: border-box;
  display: block;
  overflow: hidden;
}
.mat-drawer-container[fullscreen] {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
}
.mat-drawer-container[fullscreen].mat-drawer-container-has-open {
  overflow: hidden;
}
.mat-drawer-container.mat-drawer-container-explicit-backdrop .mat-drawer-side {
  z-index: 3;
}
.mat-drawer-container.ng-animate-disabled .mat-drawer-backdrop,
.mat-drawer-container.ng-animate-disabled .mat-drawer-content, .ng-animate-disabled .mat-drawer-container .mat-drawer-backdrop,
.ng-animate-disabled .mat-drawer-container .mat-drawer-content {
  transition: none;
}

.mat-drawer-backdrop {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  display: block;
  z-index: 3;
  visibility: hidden;
}
.mat-drawer-backdrop.mat-drawer-shown {
  visibility: visible;
  background-color: var(--mat-sidenav-scrim-color, color-mix(in srgb, var(--mat-sys-neutral-variant20) 40%, transparent));
}
.mat-drawer-transition .mat-drawer-backdrop {
  transition-duration: 400ms;
  transition-timing-function: cubic-bezier(0.25, 0.8, 0.25, 1);
  transition-property: background-color, visibility;
}
@media (forced-colors: active) {
  .mat-drawer-backdrop {
    opacity: 0.5;
  }
}

.mat-drawer-content {
  position: relative;
  z-index: 1;
  display: block;
  height: 100%;
  overflow: auto;
}
.mat-drawer-content.mat-drawer-content-hidden {
  opacity: 0;
}
.mat-drawer-transition .mat-drawer-content {
  transition-duration: 400ms;
  transition-timing-function: cubic-bezier(0.25, 0.8, 0.25, 1);
  transition-property: transform, margin-left, margin-right;
}

.mat-drawer {
  position: relative;
  z-index: 4;
  color: var(--mat-sidenav-container-text-color, var(--mat-sys-on-surface-variant));
  box-shadow: var(--mat-sidenav-container-elevation-shadow, none);
  background-color: var(--mat-sidenav-container-background-color, var(--mat-sys-surface));
  border-top-right-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-bottom-right-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  width: var(--mat-sidenav-container-width, 360px);
  display: block;
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 3;
  outline: 0;
  box-sizing: border-box;
  overflow-y: auto;
  transform: translate3d(-100%, 0, 0);
}
@media (forced-colors: active) {
  .mat-drawer, [dir=rtl] .mat-drawer.mat-drawer-end {
    border-right: solid 1px currentColor;
  }
}
@media (forced-colors: active) {
  [dir=rtl] .mat-drawer, .mat-drawer.mat-drawer-end {
    border-left: solid 1px currentColor;
    border-right: none;
  }
}
.mat-drawer.mat-drawer-side {
  z-index: 2;
}
.mat-drawer.mat-drawer-end {
  right: 0;
  transform: translate3d(100%, 0, 0);
  border-top-left-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-bottom-left-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
[dir=rtl] .mat-drawer {
  border-top-left-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-bottom-left-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  transform: translate3d(100%, 0, 0);
}
[dir=rtl] .mat-drawer.mat-drawer-end {
  border-top-right-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-bottom-right-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  left: 0;
  right: auto;
  transform: translate3d(-100%, 0, 0);
}
.mat-drawer-transition .mat-drawer {
  transition: transform 400ms cubic-bezier(0.25, 0.8, 0.25, 1);
}
.mat-drawer:not(.mat-drawer-opened):not(.mat-drawer-animating) {
  visibility: hidden;
  box-shadow: none;
}
.mat-drawer:not(.mat-drawer-opened):not(.mat-drawer-animating) .mat-drawer-inner-container {
  display: none;
}
.mat-drawer.mat-drawer-opened.mat-drawer-opened {
  transform: none;
}

.mat-drawer-side {
  box-shadow: none;
  border-right-color: var(--mat-sidenav-container-divider-color, transparent);
  border-right-width: 1px;
  border-right-style: solid;
}
.mat-drawer-side.mat-drawer-end {
  border-left-color: var(--mat-sidenav-container-divider-color, transparent);
  border-left-width: 1px;
  border-left-style: solid;
  border-right: none;
}
[dir=rtl] .mat-drawer-side {
  border-left-color: var(--mat-sidenav-container-divider-color, transparent);
  border-left-width: 1px;
  border-left-style: solid;
  border-right: none;
}
[dir=rtl] .mat-drawer-side.mat-drawer-end {
  border-right-color: var(--mat-sidenav-container-divider-color, transparent);
  border-right-width: 1px;
  border-right-style: solid;
  border-left: none;
}

.mat-drawer-inner-container {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.mat-sidenav-fixed {
  position: fixed;
}
`;var Pt=new T("MAT_DRAWER_DEFAULT_AUTOSIZE",{providedIn:"root",factory:()=>!1}),Re=new T("MAT_DRAWER_CONTAINER"),Z=(()=>{class r extends j{_platform=i(E);_changeDetectorRef=i(q);_element=i(w);_ngZone=i(_);_isInert=!1;_container=i(De);ngAfterContentInit(){this._container._contentMarginChanges.subscribe(()=>this._changeDetectorRef.markForCheck())}_drawerToggled(e){e.opened?this._ngZone.runOutsideAngular(()=>{e._animationEnd.pipe(Fe(50),pe(1)).subscribe(()=>this._updateInert())}):this._updateInert()}_drawerModeChanged(){this._updateInert()}_updateInert(){let e=this._container._isShowingBackdrop();if(e!==this._isInert){let t=this._element.nativeElement;this._isInert=e,e?t.setAttribute("inert","true"):t.removeAttribute("inert")}}_shouldBeHidden(){if(this._platform.isBrowser)return!1;let{start:e,end:t}=this._container;return e!=null&&e.mode!=="over"&&e.opened||t!=null&&t.mode!=="over"&&t.opened}static \u0275fac=(()=>{let e;return function(n){return(e||(e=B(r)))(n||r)}})();static \u0275cmp=g({type:r,selectors:[["mat-drawer-content"]],hostAttrs:[1,"mat-drawer-content"],hostVars:6,hostBindings:function(t,n){t&2&&(H("margin-left",n._container._contentMargins.left,"px")("margin-right",n._container._contentMargins.right,"px"),f("mat-drawer-content-hidden",n._shouldBeHidden()))},features:[O([{provide:j,useExisting:r}]),I],ngContentSelectors:se,decls:1,vars:0,template:function(t,n){t&1&&(v(),u(0))},encapsulation:2})}return r})(),xe=(()=>{class r{_elementRef=i(w);_focusTrapFactory=i($e);_focusMonitor=i(Ze);_platform=i(E);_ngZone=i(_);_renderer=i(F);_interactivityChecker=i(Ke);_doc=i(Y);_container=i(Re,{optional:!0});_focusTrap=null;_elementFocusedBeforeDrawerWasOpened=null;_eventCleanups;_isAttached=!1;_anchor=null;get position(){return this._position}set position(e){e=e==="end"?"end":"start",e!==this._position&&(this._isAttached&&this._updatePositionInParent(e),this._position=e,this.onPositionChanged.emit())}_position="start";get mode(){return this._mode}set mode(e){this._mode=e,this._updateFocusTrapState(),this._modeChanged.next(),this._getContent()?._drawerModeChanged()}_mode="over";get disableClose(){return this._disableClose}set disableClose(e){this._disableClose=P(e)}_disableClose=!1;get autoFocus(){let e=this._autoFocus;return e??(this.mode==="side"?"dialog":"first-tabbable")}set autoFocus(e){(e==="true"||e==="false"||e==null)&&(e=P(e)),this._autoFocus=e}_autoFocus;get opened(){return this._opened()}set opened(e){this.toggle(P(e))}_opened=me(!1);_openedVia=null;_animationStarted=new p;_animationEnd=new p;openedChange=new X(!0);_openedStream=this.openedChange.pipe(k(e=>e),ce(()=>{}));openedStart=this._animationStarted.pipe(k(()=>this.opened),ue(void 0));_closedStream=this.openedChange.pipe(k(e=>!e),ce(()=>{}));closedStart=this._animationStarted.pipe(k(()=>!this.opened),ue(void 0));_destroyed=new p;onPositionChanged=new X;_content;_modeChanged=new p;_injector=i(J);_changeDetectorRef=i(q);constructor(){this.openedChange.pipe(m(this._destroyed)).subscribe(e=>{e?(this._elementFocusedBeforeDrawerWasOpened=this._doc.activeElement,this._takeFocus()):this._isFocusWithinDrawer()&&this._restoreFocus(this._openedVia||"program")}),this._eventCleanups=this._ngZone.runOutsideAngular(()=>{let e=this._renderer,t=this._elementRef.nativeElement;return[e.listen(t,"keydown",n=>{n.keyCode===27&&!this.disableClose&&!Je(n)&&this._ngZone.run(()=>{this.close(),n.stopPropagation(),n.preventDefault()})}),e.listen(t,"transitionend",this._handleTransitionEvent),e.listen(t,"transitioncancel",this._handleTransitionEvent)]}),this._animationEnd.subscribe(()=>{this.openedChange.emit(this.opened)})}_focusByCssSelector(e,t){let n=this._elementRef.nativeElement.querySelector(e);n&&(this._interactivityChecker.isFocusable(n)||(n.tabIndex=-1,this._ngZone.runOutsideAngular(()=>{let a=()=>{d(),le(),n.removeAttribute("tabindex")},d=this._renderer.listen(n,"blur",a),le=this._renderer.listen(n,"mousedown",a)})),n.focus(t))}_takeFocus(){if(!this._focusTrap)return;let e=this._elementRef.nativeElement;switch(this.autoFocus){case!1:case"dialog":return;case!0:case"first-tabbable":ee(()=>{!this._focusTrap.focusInitialElement()&&typeof e.focus=="function"&&e.focus()},{injector:this._injector});break;case"first-heading":this._focusByCssSelector('h1, h2, h3, h4, h5, h6, [role="heading"]');break;default:this._focusByCssSelector(this.autoFocus);break}}_restoreFocus(e){this.autoFocus!=="dialog"&&(this._elementFocusedBeforeDrawerWasOpened?this._focusMonitor.focusVia(this._elementFocusedBeforeDrawerWasOpened,e):this._elementRef.nativeElement.blur(),this._elementFocusedBeforeDrawerWasOpened=null)}_isFocusWithinDrawer(){let e=this._doc.activeElement;return!!e&&this._elementRef.nativeElement.contains(e)}ngAfterViewInit(){this._isAttached=!0,this._position==="end"&&this._updatePositionInParent("end"),this._platform.isBrowser&&(this._focusTrap=this._focusTrapFactory.create(this._elementRef.nativeElement),this._updateFocusTrapState())}ngOnDestroy(){this._eventCleanups.forEach(e=>e()),this._focusTrap?.destroy(),this._anchor?.remove(),this._anchor=null,this._animationStarted.complete(),this._animationEnd.complete(),this._modeChanged.complete(),this._destroyed.next(),this._destroyed.complete()}open(e){return this.toggle(!0,e)}close(){return this.toggle(!1)}_closeViaBackdropClick(){return this._setOpen(!1,!0,"mouse")}toggle(e=!this.opened,t){e&&t&&(this._openedVia=t);let n=this._setOpen(e,!e&&this._isFocusWithinDrawer(),this._openedVia||"program");return e||(this._openedVia=null),n}_setOpen(e,t,n){return e===this.opened?Promise.resolve(e?"open":"close"):(this._opened.set(e),this._getContent()?._drawerToggled(this),this._container?._transitionsEnabled?(this._setIsAnimating(!0),setTimeout(()=>this._animationStarted.next())):setTimeout(()=>{this._animationStarted.next(),this._animationEnd.next()}),this._elementRef.nativeElement.classList.toggle("mat-drawer-opened",e),!e&&t&&this._restoreFocus(n),this._changeDetectorRef.markForCheck(),this._updateFocusTrapState(),new Promise(a=>{this.openedChange.pipe(pe(1)).subscribe(d=>a(d?"open":"close"))}))}_getContent(){return this._container?._content||this._container?._userContent}_setIsAnimating(e){this._elementRef.nativeElement.classList.toggle("mat-drawer-animating",e)}_getWidth(){return this._elementRef.nativeElement.offsetWidth||0}_updateFocusTrapState(){this._focusTrap&&(this._focusTrap.enabled=this.opened&&!!this._container?._isShowingBackdrop())}_updatePositionInParent(e){if(!this._platform.isBrowser)return;let t=this._elementRef.nativeElement,n=t.parentNode;e==="end"?(this._anchor||(this._anchor=this._doc.createComment("mat-drawer-anchor"),n.insertBefore(this._anchor,t)),n.appendChild(t)):this._anchor&&this._anchor.parentNode.insertBefore(t,this._anchor)}_handleTransitionEvent=e=>{let t=this._elementRef.nativeElement;e.target===t&&this._ngZone.run(()=>{e.type==="transitionend"&&this._setIsAnimating(!1),this._animationEnd.next(e)})};static \u0275fac=function(t){return new(t||r)};static \u0275cmp=g({type:r,selectors:[["mat-drawer"]],viewQuery:function(t,n){if(t&1&&re(xt,5),t&2){let a;b(a=y())&&(n._content=a.first)}},hostAttrs:[1,"mat-drawer"],hostVars:12,hostBindings:function(t,n){t&2&&(z("align",null)("tabIndex",n.mode!=="side"?"-1":null),H("visibility",!n._container&&!n.opened?"hidden":null),f("mat-drawer-end",n.position==="end")("mat-drawer-over",n.mode==="over")("mat-drawer-push",n.mode==="push")("mat-drawer-side",n.mode==="side"))},inputs:{position:"position",mode:"mode",disableClose:"disableClose",autoFocus:"autoFocus",opened:"opened"},outputs:{openedChange:"openedChange",_openedStream:"opened",openedStart:"openedStart",_closedStream:"closed",closedStart:"closedStart",onPositionChanged:"positionChanged"},exportAs:["matDrawer"],ngContentSelectors:se,decls:3,vars:0,consts:[["content",""],["cdkScrollable","",1,"mat-drawer-inner-container"]],template:function(t,n){t&1&&(v(),o(0,"div",1,0),u(2),s())},dependencies:[j],encapsulation:2})}return r})(),De=(()=>{class r{_dir=i(ie,{optional:!0});_element=i(w);_ngZone=i(_);_changeDetectorRef=i(q);_animationDisabled=Xe();_transitionsEnabled=!1;_allDrawers;_drawers=new ze;_content;_userContent;get start(){return this._start}get end(){return this._end}get autosize(){return this._autosize}set autosize(e){this._autosize=P(e)}_autosize=i(Pt);get hasBackdrop(){return this._drawerHasBackdrop(this._start)||this._drawerHasBackdrop(this._end)}set hasBackdrop(e){this._backdropOverride=e==null?null:P(e)}_backdropOverride=null;backdropClick=new X;_start=null;_end=null;_left=null;_right=null;_destroyed=new p;_doCheckSubject=new p;_contentMargins={left:null,right:null};_contentMarginChanges=new p;get scrollable(){return this._userContent||this._content}_injector=i(J);constructor(){let e=i(E),t=i(ht);this._dir?.change.pipe(m(this._destroyed)).subscribe(()=>{this._validateDrawers(),this.updateContentMargins()}),t.change().pipe(m(this._destroyed)).subscribe(()=>this.updateContentMargins()),!this._animationDisabled&&e.isBrowser&&this._ngZone.runOutsideAngular(()=>{setTimeout(()=>{this._element.nativeElement.classList.add("mat-drawer-transition"),this._transitionsEnabled=!0},200)})}ngAfterContentInit(){this._allDrawers.changes.pipe(K(this._allDrawers),m(this._destroyed)).subscribe(e=>{this._drawers.reset(e.filter(t=>!t._container||t._container===this)),this._drawers.notifyOnChanges()}),this._drawers.changes.pipe(K(null)).subscribe(()=>{this._validateDrawers(),this._drawers.forEach(e=>{this._watchDrawerToggle(e),this._watchDrawerPosition(e),this._watchDrawerMode(e)}),(!this._drawers.length||this._isDrawerOpen(this._start)||this._isDrawerOpen(this._end))&&this.updateContentMargins(),this._changeDetectorRef.markForCheck()}),this._ngZone.runOutsideAngular(()=>{this._doCheckSubject.pipe(Be(10),m(this._destroyed)).subscribe(()=>this.updateContentMargins())})}ngOnDestroy(){this._contentMarginChanges.complete(),this._doCheckSubject.complete(),this._drawers.destroy(),this._destroyed.next(),this._destroyed.complete()}open(){this._drawers.forEach(e=>e.open())}close(){this._drawers.forEach(e=>e.close())}updateContentMargins(){let e=0,t=0;if(this._left&&this._left.opened){if(this._left.mode=="side")e+=this._left._getWidth();else if(this._left.mode=="push"){let n=this._left._getWidth();e+=n,t-=n}}if(this._right&&this._right.opened){if(this._right.mode=="side")t+=this._right._getWidth();else if(this._right.mode=="push"){let n=this._right._getWidth();t+=n,e-=n}}e=e||null,t=t||null,(e!==this._contentMargins.left||t!==this._contentMargins.right)&&(this._contentMargins={left:e,right:t},this._ngZone.run(()=>this._contentMarginChanges.next(this._contentMargins)))}ngDoCheck(){this._autosize&&this._isPushed()&&this._ngZone.runOutsideAngular(()=>this._doCheckSubject.next())}_watchDrawerToggle(e){e._animationStarted.pipe(m(this._drawers.changes)).subscribe(()=>{this.updateContentMargins(),this._changeDetectorRef.markForCheck()}),e.mode!=="side"&&e.openedChange.pipe(m(this._drawers.changes)).subscribe(()=>this._setContainerClass(e.opened))}_watchDrawerPosition(e){e.onPositionChanged.pipe(m(this._drawers.changes)).subscribe(()=>{ee({read:()=>this._validateDrawers()},{injector:this._injector})})}_watchDrawerMode(e){e._modeChanged.pipe(m(Te(this._drawers.changes,this._destroyed))).subscribe(()=>{this.updateContentMargins(),this._changeDetectorRef.markForCheck()})}_setContainerClass(e){let t=this._element.nativeElement.classList,n="mat-drawer-container-has-open";e?t.add(n):t.remove(n)}_validateDrawers(){this._start=this._end=null,this._drawers.forEach(e=>{e.position=="end"?(this._end!=null,this._end=e):(this._start!=null,this._start=e)}),this._right=this._left=null,this._dir&&this._dir.value==="rtl"?(this._left=this._end,this._right=this._start):(this._left=this._start,this._right=this._end)}_isPushed(){return this._isDrawerOpen(this._start)&&this._start.mode!="over"||this._isDrawerOpen(this._end)&&this._end.mode!="over"}_onBackdropClicked(){this.backdropClick.emit(),this._closeModalDrawersViaBackdrop()}_closeModalDrawersViaBackdrop(){[this._start,this._end].filter(e=>e&&!e.disableClose&&this._drawerHasBackdrop(e)).forEach(e=>e._closeViaBackdropClick())}_isShowingBackdrop(){return this._isDrawerOpen(this._start)&&this._drawerHasBackdrop(this._start)||this._isDrawerOpen(this._end)&&this._drawerHasBackdrop(this._end)}_isDrawerOpen(e){return e!=null&&e.opened}_drawerHasBackdrop(e){return this._backdropOverride==null?!!e&&e.mode!=="side":this._backdropOverride}static \u0275fac=function(t){return new(t||r)};static \u0275cmp=g({type:r,selectors:[["mat-drawer-container"]],contentQueries:function(t,n,a){if(t&1&&ve(a,Z,5)(a,xe,5),t&2){let d;b(d=y())&&(n._content=d.first),b(d=y())&&(n._allDrawers=d)}},viewQuery:function(t,n){if(t&1&&re(Z,5),t&2){let a;b(a=y())&&(n._userContent=a.first)}},hostAttrs:[1,"mat-drawer-container"],hostVars:2,hostBindings:function(t,n){t&2&&f("mat-drawer-container-explicit-backdrop",n._backdropOverride)},inputs:{autosize:"autosize",hasBackdrop:"hasBackdrop"},outputs:{backdropClick:"backdropClick"},exportAs:["matDrawerContainer"],features:[O([{provide:Re,useExisting:r}])],ngContentSelectors:ut,decls:4,vars:2,consts:[[1,"mat-drawer-backdrop",3,"mat-drawer-shown"],[1,"mat-drawer-backdrop",3,"click"]],template:function(t,n){t&1&&(v(pt),W(0,Dt,1,2,"div",0),u(1),u(2,1),W(3,Rt,2,0,"mat-drawer-content")),t&2&&(Q(n.hasBackdrop?0:-1),c(3),Q(n._content?-1:3))},dependencies:[Z],styles:[`.mat-drawer-container {
  position: relative;
  z-index: 1;
  color: var(--mat-sidenav-content-text-color, var(--mat-sys-on-background));
  background-color: var(--mat-sidenav-content-background-color, var(--mat-sys-background));
  box-sizing: border-box;
  display: block;
  overflow: hidden;
}
.mat-drawer-container[fullscreen] {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
}
.mat-drawer-container[fullscreen].mat-drawer-container-has-open {
  overflow: hidden;
}
.mat-drawer-container.mat-drawer-container-explicit-backdrop .mat-drawer-side {
  z-index: 3;
}
.mat-drawer-container.ng-animate-disabled .mat-drawer-backdrop,
.mat-drawer-container.ng-animate-disabled .mat-drawer-content, .ng-animate-disabled .mat-drawer-container .mat-drawer-backdrop,
.ng-animate-disabled .mat-drawer-container .mat-drawer-content {
  transition: none;
}

.mat-drawer-backdrop {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  display: block;
  z-index: 3;
  visibility: hidden;
}
.mat-drawer-backdrop.mat-drawer-shown {
  visibility: visible;
  background-color: var(--mat-sidenav-scrim-color, color-mix(in srgb, var(--mat-sys-neutral-variant20) 40%, transparent));
}
.mat-drawer-transition .mat-drawer-backdrop {
  transition-duration: 400ms;
  transition-timing-function: cubic-bezier(0.25, 0.8, 0.25, 1);
  transition-property: background-color, visibility;
}
@media (forced-colors: active) {
  .mat-drawer-backdrop {
    opacity: 0.5;
  }
}

.mat-drawer-content {
  position: relative;
  z-index: 1;
  display: block;
  height: 100%;
  overflow: auto;
}
.mat-drawer-content.mat-drawer-content-hidden {
  opacity: 0;
}
.mat-drawer-transition .mat-drawer-content {
  transition-duration: 400ms;
  transition-timing-function: cubic-bezier(0.25, 0.8, 0.25, 1);
  transition-property: transform, margin-left, margin-right;
}

.mat-drawer {
  position: relative;
  z-index: 4;
  color: var(--mat-sidenav-container-text-color, var(--mat-sys-on-surface-variant));
  box-shadow: var(--mat-sidenav-container-elevation-shadow, none);
  background-color: var(--mat-sidenav-container-background-color, var(--mat-sys-surface));
  border-top-right-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-bottom-right-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  width: var(--mat-sidenav-container-width, 360px);
  display: block;
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 3;
  outline: 0;
  box-sizing: border-box;
  overflow-y: auto;
  transform: translate3d(-100%, 0, 0);
}
@media (forced-colors: active) {
  .mat-drawer, [dir=rtl] .mat-drawer.mat-drawer-end {
    border-right: solid 1px currentColor;
  }
}
@media (forced-colors: active) {
  [dir=rtl] .mat-drawer, .mat-drawer.mat-drawer-end {
    border-left: solid 1px currentColor;
    border-right: none;
  }
}
.mat-drawer.mat-drawer-side {
  z-index: 2;
}
.mat-drawer.mat-drawer-end {
  right: 0;
  transform: translate3d(100%, 0, 0);
  border-top-left-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-bottom-left-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
[dir=rtl] .mat-drawer {
  border-top-left-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-bottom-left-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  transform: translate3d(100%, 0, 0);
}
[dir=rtl] .mat-drawer.mat-drawer-end {
  border-top-right-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-bottom-right-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  left: 0;
  right: auto;
  transform: translate3d(-100%, 0, 0);
}
.mat-drawer-transition .mat-drawer {
  transition: transform 400ms cubic-bezier(0.25, 0.8, 0.25, 1);
}
.mat-drawer:not(.mat-drawer-opened):not(.mat-drawer-animating) {
  visibility: hidden;
  box-shadow: none;
}
.mat-drawer:not(.mat-drawer-opened):not(.mat-drawer-animating) .mat-drawer-inner-container {
  display: none;
}
.mat-drawer.mat-drawer-opened.mat-drawer-opened {
  transform: none;
}

.mat-drawer-side {
  box-shadow: none;
  border-right-color: var(--mat-sidenav-container-divider-color, transparent);
  border-right-width: 1px;
  border-right-style: solid;
}
.mat-drawer-side.mat-drawer-end {
  border-left-color: var(--mat-sidenav-container-divider-color, transparent);
  border-left-width: 1px;
  border-left-style: solid;
  border-right: none;
}
[dir=rtl] .mat-drawer-side {
  border-left-color: var(--mat-sidenav-container-divider-color, transparent);
  border-left-width: 1px;
  border-left-style: solid;
  border-right: none;
}
[dir=rtl] .mat-drawer-side.mat-drawer-end {
  border-right-color: var(--mat-sidenav-container-divider-color, transparent);
  border-right-width: 1px;
  border-right-style: solid;
  border-left: none;
}

.mat-drawer-inner-container {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.mat-sidenav-fixed {
  position: fixed;
}
`],encapsulation:2})}return r})(),oe=(()=>{class r extends Z{static \u0275fac=(()=>{let e;return function(n){return(e||(e=B(r)))(n||r)}})();static \u0275cmp=g({type:r,selectors:[["mat-sidenav-content"]],hostAttrs:[1,"mat-drawer-content","mat-sidenav-content"],features:[O([{provide:j,useExisting:r},{provide:Z,useExisting:r}]),I],ngContentSelectors:se,decls:1,vars:0,template:function(t,n){t&1&&(v(),u(0))},encapsulation:2})}return r})(),Me=(()=>{class r extends xe{get fixedInViewport(){return this._fixedInViewport}set fixedInViewport(e){this._fixedInViewport=P(e)}_fixedInViewport=!1;get fixedTopGap(){return this._fixedTopGap}set fixedTopGap(e){this._fixedTopGap=ae(e)}_fixedTopGap=0;get fixedBottomGap(){return this._fixedBottomGap}set fixedBottomGap(e){this._fixedBottomGap=ae(e)}_fixedBottomGap=0;static \u0275fac=(()=>{let e;return function(n){return(e||(e=B(r)))(n||r)}})();static \u0275cmp=g({type:r,selectors:[["mat-sidenav"]],hostAttrs:[1,"mat-drawer","mat-sidenav"],hostVars:16,hostBindings:function(t,n){t&2&&(z("tabIndex",n.mode!=="side"?"-1":null)("align",null),H("top",n.fixedInViewport?n.fixedTopGap:null,"px")("bottom",n.fixedInViewport?n.fixedBottomGap:null,"px"),f("mat-drawer-end",n.position==="end")("mat-drawer-over",n.mode==="over")("mat-drawer-push",n.mode==="push")("mat-drawer-side",n.mode==="side")("mat-sidenav-fixed",n.fixedInViewport))},inputs:{fixedInViewport:"fixedInViewport",fixedTopGap:"fixedTopGap",fixedBottomGap:"fixedBottomGap"},exportAs:["matSidenav"],features:[O([{provide:xe,useExisting:r}]),I],ngContentSelectors:se,decls:3,vars:0,consts:[["content",""],["cdkScrollable","",1,"mat-drawer-inner-container"]],template:function(t,n){t&1&&(v(),o(0,"div",1,0),u(2),s())},dependencies:[j],encapsulation:2})}return r})(),mt=(()=>{class r extends De{_allDrawers=void 0;_content=void 0;static \u0275fac=(()=>{let e;return function(n){return(e||(e=B(r)))(n||r)}})();static \u0275cmp=g({type:r,selectors:[["mat-sidenav-container"]],contentQueries:function(t,n,a){if(t&1&&ve(a,oe,5)(a,Me,5),t&2){let d;b(d=y())&&(n._content=d.first),b(d=y())&&(n._allDrawers=d)}},hostAttrs:[1,"mat-drawer-container","mat-sidenav-container"],hostVars:2,hostBindings:function(t,n){t&2&&f("mat-drawer-container-explicit-backdrop",n._backdropOverride)},exportAs:["matSidenavContainer"],features:[O([{provide:Re,useExisting:r},{provide:De,useExisting:r}]),I],ngContentSelectors:ut,decls:4,vars:2,consts:[[1,"mat-drawer-backdrop",3,"mat-drawer-shown"],[1,"mat-drawer-backdrop",3,"click"]],template:function(t,n){t&1&&(v(pt),W(0,Mt,1,2,"div",0),u(1),u(2,1),W(3,Ot,2,0,"mat-sidenav-content")),t&2&&(Q(n.hasBackdrop?0:-1),c(3),Q(n._content?-1:3))},dependencies:[oe],styles:[Et],encapsulation:2})}return r})(),ft=(()=>{class r{static \u0275fac=function(t){return new(t||r)};static \u0275mod=te({type:r});static \u0275inj=$({imports:[ke,tt,ke]})}return r})();var gt="https://github.com/Celtian/qdb-downloader",Oe=N.version,_t={version:Oe,versionLabel:`v${Oe}`,author:N.author.name,copyrightYear:new Date(N.date).getUTCFullYear(),links:{repository:gt,version:`${gt}/tree/v${Oe}`}};var vt=r=>({exact:r}),wt=(r,h)=>h.path;function Bt(r,h){if(r&1){let e=V();o(0,"a",27),R("click",function(){x(e),M();let n=U(4);return D(n.close())}),l(1),s()}if(r&2){let e=h.$implicit;G("routerLink",e.path)("routerLinkActiveOptions",Ce(3,vt,e.path==="/")),c(),be(" ",e.label," ")}}function Ft(r,h){if(r&1&&(o(0,"a",9),l(1),s()),r&2){let e=h.$implicit;f("download-link",e.path==="/download"),G("routerLink",e.path)("routerLinkActiveOptions",Ce(5,vt,e.path==="/")),c(),be(" ",e.label," ")}}var de=class r{productName="QDB Downloader";site=_t;navigationLinks=[{label:"Overview",path:"/"},{label:"Features",path:"/features"},{label:"Download",path:"/download"},{label:"Importing",path:"/importing"},{label:"Managing data",path:"/managing-data"},{label:"Exporting",path:"/exporting"},{label:"Development",path:"/development"},{label:"Releases",path:"/releases"}];static \u0275fac=function(e){return new(e||r)};static \u0275cmp=g({type:r,selectors:[["app-root"]],features:[Ae([dt])],decls:54,vars:9,consts:[["navigationDrawer",""],["href","#content",1,"skip-link"],[1,"site-shell"],["mode","over","position","start",1,"navigation-drawer",3,"fixedInViewport"],[1,"drawer-header"],[1,"drawer-title"],["aria-hidden","true"],["matIconButton","","type","button","aria-label","Close documentation navigation",3,"click"],["id","documentation-navigation","aria-label","Mobile documentation",1,"drawer-nav"],["matButton","","routerLinkActive","active","ariaCurrentWhenActive","page",3,"routerLink","routerLinkActiveOptions"],[1,"site-content"],[1,"site-header"],[1,"header-inner"],[1,"brand-group"],["routerLink","/","aria-label","QDB Downloader documentation overview",1,"brand"],["matIconButton","","type","button","aria-label","Open documentation navigation","aria-controls","documentation-navigation",1,"menu-button",3,"click"],["aria-label","Documentation",1,"site-nav"],["matButton","","routerLinkActive","active","ariaCurrentWhenActive","page",3,"download-link","routerLink","routerLinkActiveOptions"],["id","content","tabindex","-1"],[1,"site-footer"],[1,"footer-inner"],[1,"footer-copy"],[1,"footer-meta"],["target","_blank","rel","noopener noreferrer",3,"href"],["aria-label","Project links",1,"footer-nav"],["matButton","","href","https://github.com/Celtian/qdb-downloader","target","_blank","rel","noopener noreferrer","aria-label","Star on GitHub (opens in a new tab)"],["matButton","","href","https://github.com/Celtian/qdb-downloader/issues","target","_blank","rel","noopener noreferrer","aria-label","Report an issue (opens in a new tab)"],["matButton","","routerLinkActive","active","ariaCurrentWhenActive","page",3,"click","routerLink","routerLinkActiveOptions"]],template:function(e,t){if(e&1){let n=V();o(0,"a",1),l(1,"Skip to content"),s(),o(2,"mat-sidenav-container",2)(3,"mat-sidenav",3,0)(5,"div",4)(6,"div",5)(7,"mat-icon",6),l(8,"menu_book"),s(),o(9,"strong"),l(10,"Documentation"),s()(),o(11,"button",7),R("click",function(){x(n);let d=U(4);return D(d.close())}),o(12,"mat-icon",6),l(13,"close"),s()()(),o(14,"nav",8),_e(15,Bt,2,5,"a",9,wt),s()(),o(17,"mat-sidenav-content",10)(18,"header",11)(19,"div",12)(20,"div",13)(21,"a",14)(22,"mat-icon",6),l(23,"storage"),s(),o(24,"span"),l(25),s()(),o(26,"button",15),R("click",function(){x(n);let d=U(4);return D(d.open())}),o(27,"mat-icon",6),l(28,"menu"),s()()(),o(29,"nav",16),_e(30,Ft,2,7,"a",17,wt),s()()(),o(32,"main",18),Le(33,"router-outlet"),s(),o(34,"footer",19)(35,"div",20)(36,"div",21)(37,"strong"),l(38,"QDB Downloader"),s(),o(39,"p"),l(40,"Create date-based football-data snapshots from supported online sources."),s(),o(41,"p",22),l(42),o(43,"a",23),l(44),s()()(),o(45,"nav",24)(46,"a",25)(47,"mat-icon",6),l(48,"star"),s(),l(49," Star on GitHub "),s(),o(50,"a",26)(51,"mat-icon",6),l(52,"bug_report"),s(),l(53," Report an issue "),s()()()()()()}if(e&2){let n=U(4);c(3),G("fixedInViewport",!0),c(12),we(t.navigationLinks),c(10),Ne(t.productName),c(),z("aria-expanded",n.opened),c(4),we(t.navigationLinks),c(12),ye(" \xA9 ",t.site.copyrightYear," ",t.site.author," \xB7 "),c(),G("href",t.site.links.version,Ve),z("aria-label",t.productName+" "+t.site.versionLabel+" (opens in a new tab)"),c(),ye("",t.productName," ",t.site.versionLabel)}},dependencies:[rt,nt,et,it,at,ft,Me,mt,oe,Ge,Ue,Qe],styles:["[_nghost-%COMP%]{display:block;height:100dvh}.site-shell[_ngcontent-%COMP%]{background:var(--mat-sys-surface);height:100%}.site-content[_ngcontent-%COMP%]{display:flex;flex-direction:column;height:100%;overflow-y:auto}.navigation-drawer[_ngcontent-%COMP%]{background:var(--app-navy);border-radius:0;color:#fff;padding:1rem .75rem;width:min(19rem,85vw)}.drawer-header[_ngcontent-%COMP%], .drawer-title[_ngcontent-%COMP%]{align-items:center;display:flex}.drawer-header[_ngcontent-%COMP%]{justify-content:space-between;padding:.25rem .25rem 1rem .75rem}.drawer-title[_ngcontent-%COMP%]{gap:.75rem}.drawer-title[_ngcontent-%COMP%]   mat-icon[_ngcontent-%COMP%]{color:#8debd5}.drawer-header[_ngcontent-%COMP%]   button[_ngcontent-%COMP%], .drawer-nav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{color:#dbe9ff}.drawer-nav[_ngcontent-%COMP%]{display:grid;gap:.25rem}.drawer-nav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{justify-content:flex-start;width:100%}.drawer-nav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover{background:#ffffff1a}.drawer-nav[_ngcontent-%COMP%]   a.active[_ngcontent-%COMP%]{background:var(--app-mint);color:var(--app-mint-text)}.site-header[_ngcontent-%COMP%]{background:var(--app-navy);color:#fff;position:sticky;top:0;z-index:10}.header-inner[_ngcontent-%COMP%], .footer-inner[_ngcontent-%COMP%]{margin:0 auto;max-width:90rem;width:100%}.header-inner[_ngcontent-%COMP%]{align-items:center;display:flex;gap:1.5rem;justify-content:space-between;padding:.75rem clamp(1.25rem,6vw,6rem)}.brand-group[_ngcontent-%COMP%]{align-items:center;display:flex;gap:.5rem;min-width:0}.menu-button[_ngcontent-%COMP%]{color:#fff;display:none;flex:0 0 auto}.brand[_ngcontent-%COMP%]{align-items:center;color:#fff;display:flex;font-size:1.05rem;font-weight:700;gap:.75rem;text-decoration:none;white-space:nowrap}.brand[_ngcontent-%COMP%]   mat-icon[_ngcontent-%COMP%]{color:#8debd5}.site-nav[_ngcontent-%COMP%], .footer-nav[_ngcontent-%COMP%]{display:flex;flex-wrap:wrap;gap:.25rem}.site-nav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{color:#dbe9ff}.site-nav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover{background:#ffffff1a}.site-nav[_ngcontent-%COMP%]   a.active[_ngcontent-%COMP%]{background:var(--app-mint);color:var(--app-mint-text)}.site-nav[_ngcontent-%COMP%]   a.download-link[_ngcontent-%COMP%]:not(.active){box-shadow:inset 0 0 0 1px #8debd5}main[_ngcontent-%COMP%]{flex:1;min-width:0}.site-footer[_ngcontent-%COMP%]{background:var(--mat-sys-surface-container-low);border-top:1px solid var(--border)}.footer-inner[_ngcontent-%COMP%]{align-items:flex-start;display:flex;gap:2rem;justify-content:space-between;padding:2rem clamp(1.25rem,6vw,6rem)}.footer-copy[_ngcontent-%COMP%]   strong[_ngcontent-%COMP%]{color:var(--mat-sys-on-surface)}.footer-copy[_ngcontent-%COMP%]   p[_ngcontent-%COMP%]{color:var(--muted-text);margin:.35rem 0 0}.footer-copy[_ngcontent-%COMP%]   .footer-meta[_ngcontent-%COMP%]{font-size:.875rem;margin-top:.75rem}.footer-meta[_ngcontent-%COMP%]   a[_ngcontent-%COMP%], .footer-nav[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{color:var(--app-teal)}@media(max-width:64rem){.header-inner[_ngcontent-%COMP%]{padding-bottom:.625rem;padding-top:.625rem}.site-nav[_ngcontent-%COMP%]{display:none}.menu-button[_ngcontent-%COMP%]{display:inline-flex;margin-left:auto}.brand-group[_ngcontent-%COMP%]{width:100%}}@media(max-width:40rem){.footer-inner[_ngcontent-%COMP%]{flex-direction:column}.footer-nav[_ngcontent-%COMP%]{align-items:flex-start;flex-direction:column}}"]})};je(de,ct).catch(r=>console.error(r));
