(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,33525,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"warnOnce",{enumerable:!0,get:function(){return n}});let n=e=>{}},98183,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var n={assign:function(){return s},searchParamsToUrlQuery:function(){return a},urlQueryToSearchParams:function(){return l}};for(var o in n)Object.defineProperty(r,o,{enumerable:!0,get:n[o]});function a(e){let t={};for(let[r,n]of e.entries()){let e=t[r];void 0===e?t[r]=n:Array.isArray(e)?e.push(n):t[r]=[e,n]}return t}function i(e){return"string"==typeof e?e:("number"!=typeof e||isNaN(e))&&"boolean"!=typeof e?"":String(e)}function l(e){let t=new URLSearchParams;for(let[r,n]of Object.entries(e))if(Array.isArray(n))for(let e of n)t.append(r,i(e));else t.set(r,i(n));return t}function s(e,...t){for(let r of t){for(let t of r.keys())e.delete(t);for(let[t,n]of r.entries())e.append(t,n)}return e}},95057,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var n={formatUrl:function(){return l},formatWithValidation:function(){return c},urlObjectKeys:function(){return s}};for(var o in n)Object.defineProperty(r,o,{enumerable:!0,get:n[o]});let a=e.r(90809)._(e.r(98183)),i=/https?|ftp|gopher|file/;function l(e){let{auth:t,hostname:r}=e,n=e.protocol||"",o=e.pathname||"",l=e.hash||"",s=e.query||"",c=!1;t=t?encodeURIComponent(t).replace(/%3A/i,":")+"@":"",e.host?c=t+e.host:r&&(c=t+(~r.indexOf(":")?`[${r}]`:r),e.port&&(c+=":"+e.port)),s&&"object"==typeof s&&(s=String(a.urlQueryToSearchParams(s)));let d=e.search||s&&`?${s}`||"";return n&&!n.endsWith(":")&&(n+=":"),e.slashes||(!n||i.test(n))&&!1!==c?(c="//"+(c||""),o&&"/"!==o[0]&&(o="/"+o)):c||(c=""),l&&"#"!==l[0]&&(l="#"+l),d&&"?"!==d[0]&&(d="?"+d),o=o.replace(/[?#]/g,encodeURIComponent),d=d.replace("#","%23"),`${n}${c}${o}${d}${l}`}let s=["auth","hash","host","hostname","href","path","pathname","port","protocol","query","search","slashes"];function c(e){return l(e)}},18581,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"useMergedRef",{enumerable:!0,get:function(){return o}});let n=e.r(71645);function o(e,t){let r=(0,n.useRef)(null),o=(0,n.useRef)(null);return(0,n.useCallback)(n=>{if(null===n){let e=r.current;e&&(r.current=null,e());let t=o.current;t&&(o.current=null,t())}else e&&(r.current=a(e,n)),t&&(o.current=a(t,n))},[e,t])}function a(e,t){if("function"!=typeof e)return e.current=t,()=>{e.current=null};{let r=e(t);return"function"==typeof r?r:()=>e(null)}}("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},18967,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var n={DecodeError:function(){return g},MiddlewareNotFoundError:function(){return j},MissingStaticPage:function(){return v},NormalizeError:function(){return b},PageNotFoundError:function(){return y},SP:function(){return x},ST:function(){return h},WEB_VITALS:function(){return a},execOnce:function(){return i},getDisplayName:function(){return u},getLocationOrigin:function(){return c},getURL:function(){return d},isAbsoluteUrl:function(){return s},isResSent:function(){return f},loadGetInitialProps:function(){return p},normalizeRepeatedSlashes:function(){return m},stringifyError:function(){return N}};for(var o in n)Object.defineProperty(r,o,{enumerable:!0,get:n[o]});let a=["CLS","FCP","FID","INP","LCP","TTFB"];function i(e){let t,r=!1;return(...n)=>(r||(r=!0,t=e(...n)),t)}let l=/^[a-zA-Z][a-zA-Z\d+\-.]*?:/,s=e=>l.test(e);function c(){let{protocol:e,hostname:t,port:r}=window.location;return`${e}//${t}${r?":"+r:""}`}function d(){let{href:e}=window.location,t=c();return e.substring(t.length)}function u(e){return"string"==typeof e?e:e.displayName||e.name||"Unknown"}function f(e){return e.finished||e.headersSent}function m(e){let t=e.split("?");return t[0].replace(/\\/g,"/").replace(/\/\/+/g,"/")+(t[1]?`?${t.slice(1).join("?")}`:"")}async function p(e,t){let r=t.res||t.ctx&&t.ctx.res;if(!e.getInitialProps)return t.ctx&&t.Component?{pageProps:await p(t.Component,t.ctx)}:{};let n=await e.getInitialProps(t);if(r&&f(r))return n;if(!n)throw Object.defineProperty(Error(`"${u(e)}.getInitialProps()" should resolve to an object. But found "${n}" instead.`),"__NEXT_ERROR_CODE",{value:"E394",enumerable:!1,configurable:!0});return n}let x="undefined"!=typeof performance,h=x&&["mark","measure","getEntriesByName"].every(e=>"function"==typeof performance[e]);class g extends Error{}class b extends Error{}class y extends Error{constructor(e){super(),this.code="ENOENT",this.name="PageNotFoundError",this.message=`Cannot find module for page: ${e}`}}class v extends Error{constructor(e,t){super(),this.message=`Failed to load static file for page: ${e} ${t}`}}class j extends Error{constructor(){super(),this.code="ENOENT",this.message="Cannot find the middleware module"}}function N(e){return JSON.stringify({message:e.message,stack:e.stack})}},73668,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"isLocalURL",{enumerable:!0,get:function(){return a}});let n=e.r(18967),o=e.r(52817);function a(e){if(!(0,n.isAbsoluteUrl)(e))return!0;try{let t=(0,n.getLocationOrigin)(),r=new URL(e,t);return r.origin===t&&(0,o.hasBasePath)(r.pathname)}catch(e){return!1}}},84508,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"errorOnce",{enumerable:!0,get:function(){return n}});let n=e=>{}},22016,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var n={default:function(){return g},useLinkStatus:function(){return y}};for(var o in n)Object.defineProperty(r,o,{enumerable:!0,get:n[o]});let a=e.r(90809),i=e.r(43476),l=a._(e.r(71645)),s=e.r(95057),c=e.r(8372),d=e.r(18581),u=e.r(18967),f=e.r(5550);e.r(33525);let m=e.r(91949),p=e.r(73668),x=e.r(9396);function h(e){return"string"==typeof e?e:(0,s.formatUrl)(e)}function g(t){var r;let n,o,a,[s,g]=(0,l.useOptimistic)(m.IDLE_LINK_STATUS),y=(0,l.useRef)(null),{href:v,as:j,children:N,prefetch:w=null,passHref:S,replace:k,shallow:E,scroll:P,onClick:O,onMouseEnter:C,onTouchStart:T,legacyBehavior:L=!1,onNavigate:_,ref:I,unstable_dynamicOnHover:A,...R}=t;n=N,L&&("string"==typeof n||"number"==typeof n)&&(n=(0,i.jsx)("a",{children:n}));let U=l.default.useContext(c.AppRouterContext),$=!1!==w,F=!1!==w?null===(r=w)||"auto"===r?x.FetchStrategy.PPR:x.FetchStrategy.Full:x.FetchStrategy.PPR,{href:M,as:B}=l.default.useMemo(()=>{let e=h(v);return{href:e,as:j?h(j):e}},[v,j]);if(L){if(n?.$$typeof===Symbol.for("react.lazy"))throw Object.defineProperty(Error("`<Link legacyBehavior>` received a direct child that is either a Server Component, or JSX that was loaded with React.lazy(). This is not supported. Either remove legacyBehavior, or make the direct child a Client Component that renders the Link's `<a>` tag."),"__NEXT_ERROR_CODE",{value:"E863",enumerable:!1,configurable:!0});o=l.default.Children.only(n)}let z=L?o&&"object"==typeof o&&o.ref:I,D=l.default.useCallback(e=>(null!==U&&(y.current=(0,m.mountLinkInstance)(e,M,U,F,$,g)),()=>{y.current&&((0,m.unmountLinkForCurrentNavigation)(y.current),y.current=null),(0,m.unmountPrefetchableInstance)(e)}),[$,M,U,F,g]),H={ref:(0,d.useMergedRef)(D,z),onClick(t){L||"function"!=typeof O||O(t),L&&o.props&&"function"==typeof o.props.onClick&&o.props.onClick(t),!U||t.defaultPrevented||function(t,r,n,o,a,i,s){if("undefined"!=typeof window){let c,{nodeName:d}=t.currentTarget;if("A"===d.toUpperCase()&&((c=t.currentTarget.getAttribute("target"))&&"_self"!==c||t.metaKey||t.ctrlKey||t.shiftKey||t.altKey||t.nativeEvent&&2===t.nativeEvent.which)||t.currentTarget.hasAttribute("download"))return;if(!(0,p.isLocalURL)(r)){a&&(t.preventDefault(),location.replace(r));return}if(t.preventDefault(),s){let e=!1;if(s({preventDefault:()=>{e=!0}}),e)return}let{dispatchNavigateAction:u}=e.r(99781);l.default.startTransition(()=>{u(n||r,a?"replace":"push",i??!0,o.current)})}}(t,M,B,y,k,P,_)},onMouseEnter(e){L||"function"!=typeof C||C(e),L&&o.props&&"function"==typeof o.props.onMouseEnter&&o.props.onMouseEnter(e),U&&$&&(0,m.onNavigationIntent)(e.currentTarget,!0===A)},onTouchStart:function(e){L||"function"!=typeof T||T(e),L&&o.props&&"function"==typeof o.props.onTouchStart&&o.props.onTouchStart(e),U&&$&&(0,m.onNavigationIntent)(e.currentTarget,!0===A)}};return(0,u.isAbsoluteUrl)(B)?H.href=B:L&&!S&&("a"!==o.type||"href"in o.props)||(H.href=(0,f.addBasePath)(B)),a=L?l.default.cloneElement(o,H):(0,i.jsx)("a",{...R,...H,children:n}),(0,i.jsx)(b.Provider,{value:s,children:a})}e.r(84508);let b=(0,l.createContext)(m.IDLE_LINK_STATUS),y=()=>(0,l.useContext)(b);("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},84998,e=>{"use strict";var t=e.i(43476),r=e.i(71645),n=e.i(22016),o=e.i(18566);let a=[{name:"Home",href:"/"},{name:"Features",href:"/features"},{name:"Commands",href:"/commands"},{name:"Demo",href:"/demo"}];function i(){let e=(0,o.usePathname)(),[i,l]=(0,r.useState)(!1);return(0,r.useEffect)(()=>{l(!1)},[e]),(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)("nav",{className:"pill-nav-container","aria-label":"Main navigation",children:[(0,t.jsxs)("div",{className:"pill-nav",children:[(0,t.jsxs)(n.default,{href:"/",className:"pill-logo","aria-label":"Huginn home",children:[(0,t.jsx)("img",{src:"/logo.jpeg",alt:"Huginn logo",className:"w-7 h-7 rounded-full object-cover border border-white/10"}),(0,t.jsx)("span",{className:"pill-logo-text",style:{color:"#f0f0f8"},children:"Huginn"})]}),(0,t.jsx)("div",{className:"pill-nav-items desktop-only",children:(0,t.jsx)("ul",{className:"pill-list",role:"list",children:a.map(r=>{let o=e===r.href;return(0,t.jsx)("li",{children:(0,t.jsx)(n.default,{href:r.href,className:`pill${o?" is-active":""}`,"aria-current":o?"page":void 0,style:{"--pill-bg":"rgba(255,255,255,0.06)","--pill-text":"#f0f0f8"},children:(0,t.jsx)("span",{className:"pill-label",children:r.name})})},r.name)})})}),(0,t.jsxs)("button",{className:"mobile-menu-button mobile-only",onClick:()=>l(e=>!e),"aria-label":i?"Close menu":"Open menu","aria-expanded":i,children:[(0,t.jsx)("span",{className:"hamburger-line",style:{transform:i?"rotate(45deg) translate(5px,5px)":"none"}}),(0,t.jsx)("span",{className:"hamburger-line",style:{opacity:+!i}}),(0,t.jsx)("span",{className:"hamburger-line",style:{transform:i?"rotate(-45deg) translate(5px,-5px)":"none"}})]})]}),(0,t.jsx)("div",{className:"mobile-menu-popover mobile-only",style:{opacity:+!!i,visibility:i?"visible":"hidden",transform:i?"scale(1)":"scale(0.95)",transition:"opacity 0.2s, transform 0.2s, visibility 0.2s"},children:(0,t.jsx)("ul",{className:"mobile-menu-list",role:"list",children:a.map(r=>{let o=e===r.href;return(0,t.jsx)("li",{children:(0,t.jsx)(n.default,{href:r.href,className:`mobile-menu-link${o?" is-active":""}`,children:r.name})},r.name)})})})]}),(0,t.jsx)("style",{children:`
        .pill-nav-container {
          position: fixed;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 999;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .pill-nav {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pill-logo {
          height: 46px;
          border-radius: 9999px;
          background: #0d0d1a;
          padding: 0 18px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }
        .pill-logo-text {
          font-family: var(--font-geist-pixel-line), monospace;
          font-weight: 800;
          font-size: 1rem;
          letter-spacing: -0.02em;
          white-space: nowrap;
        }
        .pill-nav-items {
          height: 46px;
          background: #0d0d1a;
          border-radius: 9999px;
          overflow: hidden;
        }
        .pill-list {
          list-style: none;
          display: flex;
          align-items: stretch;
          gap: 3px;
          margin: 0;
          padding: 3px;
          height: 100%;
        }
        .pill-list > li { display: flex; height: 100%; }
         .pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 0 20px;
          background: rgba(255,255,255,0.06);
          color: #f0f0f8;
          text-decoration: none;
          border-radius: 9999px;
          font-family: var(--font-sans), sans-serif;
          font-weight: 600;
          font-size: 0.875rem;
          white-space: nowrap;
          transition: background 0.2s, color 0.2s;
        }
        .pill:hover { background: rgba(255,255,255,0.12); }
        .pill.is-active {
          background: #00e676 !important;
          color: #000 !important;
        }
        .desktop-only { display: flex; }
        .mobile-only  { display: none; }
        .mobile-menu-button {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: #0d0d1a;
          border: none;
          display: none;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
          cursor: pointer;
          padding: 0;
        }
        .hamburger-line {
          width: 16px;
          height: 2px;
          background: #f0f0f8;
          border-radius: 1px;
          transform-origin: center;
          transition: transform 0.25s, opacity 0.25s;
          display: block;
        }
        .mobile-menu-popover {
          position: absolute;
          top: 58px;
          right: 0;
          width: 200px;
          background: #0d0d1a;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow: 0 12px 40px rgba(0,0,0,0.6);
          z-index: 998;
          padding: 8px;
        }
        .mobile-menu-list {
          list-style: none;
          margin: 0; padding: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .mobile-menu-link {
          display: block;
          padding: 10px 16px;
          color: #7070a0;
          text-decoration: none;
          font-family: var(--font-sans), sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          border-radius: 10px;
          transition: all 0.2s;
        }
        .mobile-menu-link:hover { background: rgba(255,255,255,0.04); color: #f0f0f8; }
        .mobile-menu-link.is-active { background: rgba(0,230,118,0.08); color: #00e676; font-weight: 600; }
        @media (max-width: 768px) {
          .pill-nav-container { top: 10px; left: 10px; right: 10px; transform: none; width: calc(100% - 20px); align-items: flex-end; }
          .pill-nav { width: 100%; justify-content: space-between; }
          .desktop-only { display: none; }
          .mobile-only  { display: flex; }
          .mobile-menu-button { display: flex; }
        }
      `})]})}e.s(["Navigation",()=>i])},52975,e=>{"use strict";var t=e.i(43476),r=e.i(22016);function n(){return(0,t.jsx)("footer",{className:"relative border-t border-border",children:(0,t.jsxs)("div",{className:"max-w-7xl mx-auto px-6 lg:px-8",children:[(0,t.jsxs)("div",{className:"py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8",children:[(0,t.jsxs)("div",{children:[(0,t.jsxs)(r.default,{href:"/",className:"flex items-center gap-2 mb-3",children:[(0,t.jsx)("div",{className:"w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center",children:(0,t.jsx)("span",{className:"text-primary font-bold text-sm",children:"H"})}),(0,t.jsx)("span",{className:"font-semibold tracking-tight",children:"Huginn"})]}),(0,t.jsx)("p",{className:"text-sm text-muted-foreground max-w-xs leading-relaxed",children:"Live football alerts and AI commentary, delivered to your WhatsApp group."})]}),(0,t.jsxs)("div",{className:"flex flex-wrap gap-x-8 gap-y-3",children:[(0,t.jsx)(r.default,{href:"/features",className:"text-sm text-muted-foreground hover:text-foreground transition-colors",children:"Features"}),(0,t.jsx)(r.default,{href:"/commands",className:"text-sm text-muted-foreground hover:text-foreground transition-colors",children:"Commands"}),(0,t.jsx)(r.default,{href:"/demo",className:"text-sm text-muted-foreground hover:text-foreground transition-colors",children:"Live Demo"}),(0,t.jsx)("a",{href:"https://txline.txodds.com/documentation/worldcup",target:"_blank",rel:"noopener noreferrer",className:"text-sm text-muted-foreground hover:text-foreground transition-colors",children:"TxLINE ↗"})]})]}),(0,t.jsxs)("div",{className:"py-5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3",children:[(0,t.jsx)("p",{className:"text-xs text-muted-foreground",children:"© 2026 Huginn · World Cup 2026 · Built on TxLINE"}),(0,t.jsx)("span",{className:"text-xs text-muted-foreground font-mono",children:"Powered by Llama 3.3 70B · Baileys · Node.js"})]})]})})}e.s(["FooterSection",()=>n])},38999,e=>{"use strict";var t=e.i(43476),r=e.i(71645),n=e.i(84998),o=e.i(52975);let a=[{id:1,home:"Portugal",away:"Spain",time:"20:00",status:"SOON",homeScore:null,awayScore:null},{id:2,home:"Brazil",away:"Argentina",time:"17:00",status:"LIVE",homeScore:1,awayScore:0},{id:3,home:"France",away:"Germany",time:"23:00",status:"SOON",homeScore:null,awayScore:null},{id:4,home:"England",away:"USA",time:"14:00",status:"FT",homeScore:2,awayScore:1}];function i(e){let t=e.trim().toLowerCase();if("/live"===t)return"📡 LIVE NOW\n\nBrazil 1–0 Argentina (54')\nOdds: Brazil win 1.55 · Draw 3.80\n\nEngland 2–1 USA · FULL TIME";if(t.startsWith("/follow ")){let t=e.trim().slice(8).trim()||"that team";return`✅ Following ${t}

You'll receive automatic alerts for every ${t} match — goals, cards, odds shifts, and summaries.`}return"/schedule"===t?"📅 UPCOMING\n\nPortugal vs Spain · 20:00\nFrance vs Germany · 23:00\nItaly vs Netherlands · 02:00 (tomorrow)":"/status"===t?"📋 YOUR FOLLOWS\n\nNo teams followed yet.\nSend /follow [team] to start tracking a match.":"/vibe hype"===t?"🔥 Vibe set to HYPE\n\nEvery goal treated like a cup final. Loud, dramatic, and relentless.":"/vibe tactical"===t?"📊 Vibe set to TACTICAL\n\nxG, formation shifts, and market movements explained cleanly.":"/vibe funny"===t?"😂 Vibe set to FUNNY\n\nNothing is presented straight. Banter mode active.":"/vibe balanced"===t?"⚖️ Vibe set to BALANCED\n\nFactual and easy to read. Default mode restored.":"/help"===t?"📋 COMMANDS\n\n/follow [team] · start tracking\n/unfollow [team] · stop tracking\n/live · active matches now\n/schedule · upcoming fixtures\n/status · your active follows\n/vibe hype|tactical|funny|balanced":t.startsWith("/")?`Unknown command: ${e.trim()}

Try /help for the full list.`:"Send a command to get started. Try /live or /follow Brazil."}let l={from:"huginn",text:"Huginn · connected to TxLINE.\n\n/follow [team] · start tracking a match\n/live · see what is on right now\n/vibe [mode] · hype, tactical, funny, balanced\n/status · check your active follows\n/help · full list\n\nClick a match on the left, or type below."},s=["/live","/schedule","/follow Brazil","/vibe hype","/help"];function c(){let[e,c]=(0,r.useState)([l]),[d,u]=(0,r.useState)(""),[f,m]=(0,r.useState)(null),p=(0,r.useRef)(null);(0,r.useEffect)(()=>{p.current?.scrollIntoView({behavior:"smooth"})},[e]);let x=e=>{let t=e.trim();if(!t)return;let r={from:"user",text:t},n={from:"huginn",text:i(t)};c(e=>[...e,r,n]),u("")};return(0,t.jsxs)("main",{className:"relative min-h-screen overflow-x-hidden",children:[(0,t.jsx)(n.Navigation,{}),(0,t.jsx)("section",{className:"py-32",children:(0,t.jsxs)("div",{className:"max-w-7xl mx-auto px-6 lg:px-8",children:[(0,t.jsx)("h1",{className:"text-3xl lg:text-5xl font-semibold tracking-tight mb-4",children:"Try Huginn in your browser."}),(0,t.jsx)("p",{className:"text-lg text-muted-foreground leading-relaxed mb-12",children:"Type any command below to test the Huginn assistant live. Click a match to auto-follow it."}),(0,t.jsxs)("div",{className:"grid lg:grid-cols-[280px_1fr] gap-6 items-start",children:[(0,t.jsxs)("div",{className:"bg-card border border-border rounded-2xl overflow-hidden",children:[(0,t.jsxs)("div",{className:"px-5 py-4 border-b border-border flex items-center justify-between",children:[(0,t.jsx)("span",{className:"text-sm font-semibold",children:"Live Scores"}),(0,t.jsxs)("button",{className:"text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1",children:[(0,t.jsx)("span",{className:"text-base leading-none",children:"↻"})," Update scores"]})]}),(0,t.jsx)("div",{className:"divide-y divide-border",children:a.map(e=>(0,t.jsxs)("button",{onClick:()=>{let t,r,n;return m(e),r={from:"user",text:t=`/follow ${e.home}`},n={from:"huginn",text:i(t)},void c(e=>[...e,r,n])},className:`w-full text-left px-5 py-4 hover:bg-secondary/50 transition-colors ${f?.id===e.id?"bg-primary/5 border-l-2 border-l-primary":""}`,children:[(0,t.jsx)("div",{className:"flex items-center justify-between mb-1",children:(0,t.jsx)("span",{className:`text-xs font-mono font-bold px-2 py-0.5 rounded ${"LIVE"===e.status?"text-primary bg-primary/15":(e.status,"text-muted-foreground bg-secondary")}`,children:"LIVE"===e.status?"● LIVE":"FT"===e.status?"FT":e.time})}),(0,t.jsxs)("div",{className:"flex items-center justify-between text-sm",children:[(0,t.jsx)("span",{className:"font-medium",children:e.home}),null!==e.homeScore?(0,t.jsxs)("span",{className:"font-mono font-bold text-base",children:[e.homeScore,"–",e.awayScore]}):(0,t.jsx)("span",{className:"text-muted-foreground text-xs",children:"vs"}),(0,t.jsx)("span",{className:"font-medium",children:e.away})]})]},e.id))})]}),(0,t.jsxs)("div",{className:"bg-card border border-border rounded-2xl overflow-hidden flex flex-col",style:{minHeight:560},children:[(0,t.jsxs)("div",{className:"px-5 py-4 border-b border-border flex items-center gap-3",children:[(0,t.jsx)("div",{className:"w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary",children:"HG"}),(0,t.jsxs)("div",{children:[(0,t.jsx)("div",{className:"text-sm font-semibold",children:"Huginn Assistant"}),(0,t.jsx)("div",{className:"text-xs text-muted-foreground",children:"Live match intelligence · World Cup 2026"})]}),(0,t.jsxs)("div",{className:"ml-auto flex items-center gap-1.5 text-xs text-primary font-mono",children:[(0,t.jsx)("span",{className:"w-1.5 h-1.5 rounded-full bg-primary animate-pulse"}),"connected to TxLINE"]})]}),(0,t.jsxs)("div",{className:"flex-1 p-5 space-y-4 overflow-y-auto",style:{maxHeight:380},children:[e.map((e,r)=>(0,t.jsx)("div",{className:`flex ${"user"===e.from?"justify-end":"justify-start"}`,children:(0,t.jsxs)("div",{className:`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${"huginn"===e.from?"bg-secondary border border-border text-foreground rounded-tl-sm":"bg-primary text-primary-foreground rounded-tr-sm"}`,children:["huginn"===e.from&&(0,t.jsx)("div",{className:"text-xs text-primary font-bold font-mono mb-1.5 tracking-wide",children:"HUGINN"}),e.text]})},r)),(0,t.jsx)("div",{ref:p})]}),(0,t.jsx)("div",{className:"px-5 py-3 border-t border-border bg-secondary/20 flex gap-2 flex-wrap",children:s.map(e=>(0,t.jsx)("button",{onClick:()=>x(e),className:"text-xs font-mono text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full hover:bg-primary/20 transition-colors",children:e},e))}),(0,t.jsxs)("div",{className:"px-4 py-3 border-t border-border flex gap-3 items-center",children:[(0,t.jsx)("input",{type:"text",value:d,onChange:e=>u(e.target.value),onKeyDown:e=>"Enter"===e.key&&x(d),placeholder:"Type a command (e.g. /live, /follow Brazil, /vibe hype)…",className:"flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"}),(0,t.jsx)("button",{onClick:()=>x(d),className:"w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity","aria-label":"Send",children:(0,t.jsx)("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"currentColor",className:"text-primary-foreground",children:(0,t.jsx)("path",{d:"M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"})})})]})]})]})]})}),(0,t.jsx)(o.FooterSection,{})]})}e.s(["default",()=>c])}]);