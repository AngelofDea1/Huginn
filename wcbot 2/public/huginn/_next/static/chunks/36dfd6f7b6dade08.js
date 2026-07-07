(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,33525,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"warnOnce",{enumerable:!0,get:function(){return n}});let n=e=>{}},98183,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var n={assign:function(){return l},searchParamsToUrlQuery:function(){return o},urlQueryToSearchParams:function(){return s}};for(var a in n)Object.defineProperty(r,a,{enumerable:!0,get:n[a]});function o(e){let t={};for(let[r,n]of e.entries()){let e=t[r];void 0===e?t[r]=n:Array.isArray(e)?e.push(n):t[r]=[e,n]}return t}function i(e){return"string"==typeof e?e:("number"!=typeof e||isNaN(e))&&"boolean"!=typeof e?"":String(e)}function s(e){let t=new URLSearchParams;for(let[r,n]of Object.entries(e))if(Array.isArray(n))for(let e of n)t.append(r,i(e));else t.set(r,i(n));return t}function l(e,...t){for(let r of t){for(let t of r.keys())e.delete(t);for(let[t,n]of r.entries())e.append(t,n)}return e}},95057,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var n={formatUrl:function(){return s},formatWithValidation:function(){return c},urlObjectKeys:function(){return l}};for(var a in n)Object.defineProperty(r,a,{enumerable:!0,get:n[a]});let o=e.r(90809)._(e.r(98183)),i=/https?|ftp|gopher|file/;function s(e){let{auth:t,hostname:r}=e,n=e.protocol||"",a=e.pathname||"",s=e.hash||"",l=e.query||"",c=!1;t=t?encodeURIComponent(t).replace(/%3A/i,":")+"@":"",e.host?c=t+e.host:r&&(c=t+(~r.indexOf(":")?`[${r}]`:r),e.port&&(c+=":"+e.port)),l&&"object"==typeof l&&(l=String(o.urlQueryToSearchParams(l)));let d=e.search||l&&`?${l}`||"";return n&&!n.endsWith(":")&&(n+=":"),e.slashes||(!n||i.test(n))&&!1!==c?(c="//"+(c||""),a&&"/"!==a[0]&&(a="/"+a)):c||(c=""),s&&"#"!==s[0]&&(s="#"+s),d&&"?"!==d[0]&&(d="?"+d),a=a.replace(/[?#]/g,encodeURIComponent),d=d.replace("#","%23"),`${n}${c}${a}${d}${s}`}let l=["auth","hash","host","hostname","href","path","pathname","port","protocol","query","search","slashes"];function c(e){return s(e)}},18581,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"useMergedRef",{enumerable:!0,get:function(){return a}});let n=e.r(71645);function a(e,t){let r=(0,n.useRef)(null),a=(0,n.useRef)(null);return(0,n.useCallback)(n=>{if(null===n){let e=r.current;e&&(r.current=null,e());let t=a.current;t&&(a.current=null,t())}else e&&(r.current=o(e,n)),t&&(a.current=o(t,n))},[e,t])}function o(e,t){if("function"!=typeof e)return e.current=t,()=>{e.current=null};{let r=e(t);return"function"==typeof r?r:()=>e(null)}}("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},18967,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var n={DecodeError:function(){return g},MiddlewareNotFoundError:function(){return j},MissingStaticPage:function(){return v},NormalizeError:function(){return b},PageNotFoundError:function(){return y},SP:function(){return x},ST:function(){return h},WEB_VITALS:function(){return o},execOnce:function(){return i},getDisplayName:function(){return u},getLocationOrigin:function(){return c},getURL:function(){return d},isAbsoluteUrl:function(){return l},isResSent:function(){return f},loadGetInitialProps:function(){return m},normalizeRepeatedSlashes:function(){return p},stringifyError:function(){return N}};for(var a in n)Object.defineProperty(r,a,{enumerable:!0,get:n[a]});let o=["CLS","FCP","FID","INP","LCP","TTFB"];function i(e){let t,r=!1;return(...n)=>(r||(r=!0,t=e(...n)),t)}let s=/^[a-zA-Z][a-zA-Z\d+\-.]*?:/,l=e=>s.test(e);function c(){let{protocol:e,hostname:t,port:r}=window.location;return`${e}//${t}${r?":"+r:""}`}function d(){let{href:e}=window.location,t=c();return e.substring(t.length)}function u(e){return"string"==typeof e?e:e.displayName||e.name||"Unknown"}function f(e){return e.finished||e.headersSent}function p(e){let t=e.split("?");return t[0].replace(/\\/g,"/").replace(/\/\/+/g,"/")+(t[1]?`?${t.slice(1).join("?")}`:"")}async function m(e,t){let r=t.res||t.ctx&&t.ctx.res;if(!e.getInitialProps)return t.ctx&&t.Component?{pageProps:await m(t.Component,t.ctx)}:{};let n=await e.getInitialProps(t);if(r&&f(r))return n;if(!n)throw Object.defineProperty(Error(`"${u(e)}.getInitialProps()" should resolve to an object. But found "${n}" instead.`),"__NEXT_ERROR_CODE",{value:"E394",enumerable:!1,configurable:!0});return n}let x="undefined"!=typeof performance,h=x&&["mark","measure","getEntriesByName"].every(e=>"function"==typeof performance[e]);class g extends Error{}class b extends Error{}class y extends Error{constructor(e){super(),this.code="ENOENT",this.name="PageNotFoundError",this.message=`Cannot find module for page: ${e}`}}class v extends Error{constructor(e,t){super(),this.message=`Failed to load static file for page: ${e} ${t}`}}class j extends Error{constructor(){super(),this.code="ENOENT",this.message="Cannot find the middleware module"}}function N(e){return JSON.stringify({message:e.message,stack:e.stack})}},73668,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"isLocalURL",{enumerable:!0,get:function(){return o}});let n=e.r(18967),a=e.r(52817);function o(e){if(!(0,n.isAbsoluteUrl)(e))return!0;try{let t=(0,n.getLocationOrigin)(),r=new URL(e,t);return r.origin===t&&(0,a.hasBasePath)(r.pathname)}catch(e){return!1}}},84508,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"errorOnce",{enumerable:!0,get:function(){return n}});let n=e=>{}},22016,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var n={default:function(){return g},useLinkStatus:function(){return y}};for(var a in n)Object.defineProperty(r,a,{enumerable:!0,get:n[a]});let o=e.r(90809),i=e.r(43476),s=o._(e.r(71645)),l=e.r(95057),c=e.r(8372),d=e.r(18581),u=e.r(18967),f=e.r(5550);e.r(33525);let p=e.r(91949),m=e.r(73668),x=e.r(9396);function h(e){return"string"==typeof e?e:(0,l.formatUrl)(e)}function g(t){var r;let n,a,o,[l,g]=(0,s.useOptimistic)(p.IDLE_LINK_STATUS),y=(0,s.useRef)(null),{href:v,as:j,children:N,prefetch:w=null,passHref:E,replace:O,shallow:A,scroll:P,onClick:C,onMouseEnter:k,onTouchStart:T,legacyBehavior:S=!1,onNavigate:I,ref:L,unstable_dynamicOnHover:R,..._}=t;n=N,S&&("string"==typeof n||"number"==typeof n)&&(n=(0,i.jsx)("a",{children:n}));let M=s.default.useContext(c.AppRouterContext),$=!1!==w,F=!1!==w?null===(r=w)||"auto"===r?x.FetchStrategy.PPR:x.FetchStrategy.Full:x.FetchStrategy.PPR,{href:D,as:U}=s.default.useMemo(()=>{let e=h(v);return{href:e,as:j?h(j):e}},[v,j]);if(S){if(n?.$$typeof===Symbol.for("react.lazy"))throw Object.defineProperty(Error("`<Link legacyBehavior>` received a direct child that is either a Server Component, or JSX that was loaded with React.lazy(). This is not supported. Either remove legacyBehavior, or make the direct child a Client Component that renders the Link's `<a>` tag."),"__NEXT_ERROR_CODE",{value:"E863",enumerable:!1,configurable:!0});a=s.default.Children.only(n)}let K=S?a&&"object"==typeof a&&a.ref:L,W=s.default.useCallback(e=>(null!==M&&(y.current=(0,p.mountLinkInstance)(e,D,M,F,$,g)),()=>{y.current&&((0,p.unmountLinkForCurrentNavigation)(y.current),y.current=null),(0,p.unmountPrefetchableInstance)(e)}),[$,D,M,F,g]),B={ref:(0,d.useMergedRef)(W,K),onClick(t){S||"function"!=typeof C||C(t),S&&a.props&&"function"==typeof a.props.onClick&&a.props.onClick(t),!M||t.defaultPrevented||function(t,r,n,a,o,i,l){if("undefined"!=typeof window){let c,{nodeName:d}=t.currentTarget;if("A"===d.toUpperCase()&&((c=t.currentTarget.getAttribute("target"))&&"_self"!==c||t.metaKey||t.ctrlKey||t.shiftKey||t.altKey||t.nativeEvent&&2===t.nativeEvent.which)||t.currentTarget.hasAttribute("download"))return;if(!(0,m.isLocalURL)(r)){o&&(t.preventDefault(),location.replace(r));return}if(t.preventDefault(),l){let e=!1;if(l({preventDefault:()=>{e=!0}}),e)return}let{dispatchNavigateAction:u}=e.r(99781);s.default.startTransition(()=>{u(n||r,o?"replace":"push",i??!0,a.current)})}}(t,D,U,y,O,P,I)},onMouseEnter(e){S||"function"!=typeof k||k(e),S&&a.props&&"function"==typeof a.props.onMouseEnter&&a.props.onMouseEnter(e),M&&$&&(0,p.onNavigationIntent)(e.currentTarget,!0===R)},onTouchStart:function(e){S||"function"!=typeof T||T(e),S&&a.props&&"function"==typeof a.props.onTouchStart&&a.props.onTouchStart(e),M&&$&&(0,p.onNavigationIntent)(e.currentTarget,!0===R)}};return(0,u.isAbsoluteUrl)(U)?B.href=U:S&&!E&&("a"!==a.type||"href"in a.props)||(B.href=(0,f.addBasePath)(U)),o=S?s.default.cloneElement(a,B):(0,i.jsx)("a",{..._,...B,children:n}),(0,i.jsx)(b.Provider,{value:l,children:o})}e.r(84508);let b=(0,s.createContext)(p.IDLE_LINK_STATUS),y=()=>(0,s.useContext)(b);("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},84998,e=>{"use strict";var t=e.i(43476),r=e.i(71645),n=e.i(22016),a=e.i(18566);let o=[{name:"Home",href:"/"},{name:"Features",href:"/features"},{name:"Commands",href:"/commands"},{name:"Live Chat",href:"/live-chat"}];function i(){let e=(0,a.usePathname)(),[i,s]=(0,r.useState)(!1);return(0,r.useEffect)(()=>{s(!1)},[e]),(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)("nav",{className:"pill-nav-container","aria-label":"Main navigation",children:[(0,t.jsxs)("div",{className:"pill-nav",children:[(0,t.jsxs)(n.default,{href:"/",className:"pill-logo","aria-label":"Huginn home",children:[(0,t.jsx)("img",{src:"/logo.jpeg",alt:"Huginn logo",className:"w-7 h-7 rounded-full object-cover border border-white/10"}),(0,t.jsx)("span",{className:"pill-logo-text",style:{color:"#f0f0f8"},children:"Huginn"})]}),(0,t.jsx)("div",{className:"pill-nav-items desktop-only",children:(0,t.jsx)("ul",{className:"pill-list",role:"list",children:o.map(r=>{let a=e===r.href;return(0,t.jsx)("li",{children:(0,t.jsx)(n.default,{href:r.href,className:`pill${a?" is-active":""}`,"aria-current":a?"page":void 0,style:{"--pill-bg":"rgba(255,255,255,0.06)","--pill-text":"#f0f0f8"},children:(0,t.jsx)("span",{className:"pill-label",children:r.name})})},r.name)})})}),(0,t.jsxs)("button",{className:"mobile-menu-button mobile-only",onClick:()=>s(e=>!e),"aria-label":i?"Close menu":"Open menu","aria-expanded":i,children:[(0,t.jsx)("span",{className:"hamburger-line",style:{transform:i?"rotate(45deg) translate(5px,5px)":"none"}}),(0,t.jsx)("span",{className:"hamburger-line",style:{opacity:+!i}}),(0,t.jsx)("span",{className:"hamburger-line",style:{transform:i?"rotate(-45deg) translate(5px,-5px)":"none"}})]})]}),(0,t.jsx)("div",{className:"mobile-menu-popover mobile-only",style:{opacity:+!!i,visibility:i?"visible":"hidden",transform:i?"scale(1)":"scale(0.95)",transition:"opacity 0.2s, transform 0.2s, visibility 0.2s"},children:(0,t.jsx)("ul",{className:"mobile-menu-list",role:"list",children:o.map(r=>{let a=e===r.href;return(0,t.jsx)("li",{children:(0,t.jsx)(n.default,{href:r.href,className:`mobile-menu-link${a?" is-active":""}`,children:r.name})},r.name)})})})]}),(0,t.jsx)("style",{children:`
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
      `})]})}e.s(["Navigation",()=>i])},52975,e=>{"use strict";var t=e.i(43476),r=e.i(22016);function n(){return(0,t.jsx)("footer",{className:"relative border-t border-border",children:(0,t.jsxs)("div",{className:"max-w-7xl mx-auto px-6 lg:px-8",children:[(0,t.jsxs)("div",{className:"py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8",children:[(0,t.jsxs)("div",{children:[(0,t.jsxs)(r.default,{href:"/",className:"flex items-center gap-2 mb-3",children:[(0,t.jsx)("img",{src:"/logo.jpeg",alt:"Huginn logo",className:"w-8 h-8 rounded-full object-cover border border-white/10"}),(0,t.jsx)("span",{className:"font-semibold tracking-tight",children:"Huginn"})]}),(0,t.jsx)("p",{className:"text-sm text-muted-foreground max-w-xs leading-relaxed",children:"Live football alerts and AI commentary, delivered to your WhatsApp or directly in your browser."})]}),(0,t.jsxs)("div",{className:"flex flex-wrap gap-x-8 gap-y-3",children:[(0,t.jsx)(r.default,{href:"/features",className:"text-sm text-muted-foreground hover:text-foreground transition-colors",children:"Features"}),(0,t.jsx)(r.default,{href:"/commands",className:"text-sm text-muted-foreground hover:text-foreground transition-colors",children:"Commands"}),(0,t.jsx)(r.default,{href:"/live-chat",className:"text-sm text-muted-foreground hover:text-foreground transition-colors",children:"Live Chat"}),(0,t.jsx)("a",{href:"https://txline.txodds.com/documentation/worldcup",target:"_blank",rel:"noopener noreferrer",className:"text-sm text-muted-foreground hover:text-foreground transition-colors",children:"TxLINE ↗"})]})]}),(0,t.jsxs)("div",{className:"py-5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3",children:[(0,t.jsx)("p",{className:"text-xs text-muted-foreground",children:"© 2026 Huginn · World Cup 2026 · Built on TxLINE"}),(0,t.jsx)("span",{className:"text-xs text-muted-foreground font-mono",children:"Powered by Llama 3.3 70B · Baileys · Node.js"})]})]})})}e.s(["FooterSection",()=>n])},89688,e=>{"use strict";var t=e.i(43476),r=e.i(84998),n=e.i(71645);let a={liveMatch:e=>[`   GOAL! ⚽
  ┌─────────┐
  │ • \xb7  \xb7  │
  │  \xb7 \xb7  \xb7 │
  │ \xb7  \xb7  \xb7 │
  └─────────┘`,`  MATCH LIVE
  ┌─────────┐
  │\xb7  \xb7  \xb7\xb7 │
  │ \xb7 \xb7 \xb7  \xb7│
  │ \xb7 \xb7  \xb7 \xb7│
  └─────────┘`,`  3-2 FINAL
  ┌─────────┐
  │ \xb7\xb7  \xb7  \xb7│
  │\xb7  \xb7 \xb7 \xb7 │
  │  \xb7 \xb7  \xb7\xb7│
  └─────────┘`,`  KICKOFF!
  ┌─────────┐
  │ \xb7 \xb7 \xb7 \xb7 │
  │ \xb7 ⚽ \xb7 \xb7 │
  │ \xb7 \xb7 \xb7 \xb7 │
  └─────────┘`][e%4],smartAlerts:e=>[`  ALERT
  ┌─ GOAL ─┐
  │ 🔔⚽    │
  │    →  📱│
  └────────┘`,`  RED CARD
  ┌ ALERT  ┐
  │    🔔  │
  │   →📱  │
  └────────┘`,`  INJURY
  ┌─ ALERT ┐
  │       │
  │    📱 │
  │ 🔔  ← │
  └────────┘`,`  CORNER
  ┌ ALERT  ┐
  │ ↓      │
  │📱 ← 🔔 │
  └────────┘`][e%4],oneCommand:e=>{let t=[`  SETUP
  /add huginn
  
  ✓ Active
  ────────`,`  TYPE:
  /help
  
  ✓ Loaded
  ────────`,`  READY!
  /stats
  
  ✓ Running
  ────────`,`  LIVE
  /scores
  
  ✓ Online
  ────────`];return t[e%t.length]},aiCommentary:e=>{let t=[[1,3,2,1],[2,1,3,2],[3,2,1,3],[1,2,3,1]],r=t[e%t.length],n=e=>3===e?"█":2===e?"▄":"▁";return`  AI INSIGHT
  ${n(r[0])} ${n(r[1])} ${n(r[2])} ${n(r[3])}
  • • • •
  Possession`},liveOdds:e=>{let t=[`  1.80 ▼
  Man City
  ──────
  Draw
  2.10 ▲
  ──────`,`  1.75 ↘
  Man City
  ──────
  Draw
  2.15 ↗`,`  1.82 ▲
  Man City
  ──────
  Draw
  2.08 ▼`,`  1.78 ↓
  Man City
  ──────
  Draw
  2.12 ↑`];return t[e%t.length]},playerStats:e=>{let t=[`  HAALAND
  ⚽ Goals: 12
  🎯 Assists: 5
  ─────────
  Form: HOT`,`  DE BRUYNE
  ⚽ Goals: 3
  🎯 Assists: 8
  ─────────
  Form: HOT`,`  FODEN
  ⚽ Goals: 7
  🎯 Assists: 6
  ─────────
  Form: GOOD`,`  PHILLIPS
  ⚽ Goals: 0
  🎯 Assists: 2
  ─────────
  Form: OK`];return t[e%t.length]}},o=[{title:"Live Match Updates",description:"Real-time goals, assists, and possession stats delivered instantly to your WhatsApp chat.",animationKey:"liveMatch"},{title:"Smart Alerts",description:"Custom notifications for your favorite teams. Never miss a goal, card, or substitution.",animationKey:"smartAlerts"},{title:"AI Commentary",description:"Get instant AI-powered analysis and predictions for every match moment.",animationKey:"aiCommentary"},{title:"Live Odds Updates",description:"Real-time betting odds and line movements from multiple sportsbooks.",animationKey:"liveOdds"},{title:"Player Stats",description:"Comprehensive player performance metrics, injury reports, and form analysis.",animationKey:"playerStats"},{title:"One Command Setup",description:"Add Huginn to any WhatsApp group with a single command. No registration needed.",animationKey:"oneCommand"}];function i({animationKey:e}){let[r,o]=(0,n.useState)(0);(0,n.useEffect)(()=>{let e=setInterval(()=>{o(e=>e+1)},400);return()=>clearInterval(e)},[]);let i=(0,n.useCallback)(()=>a[e](r),[e,r]);return(0,t.jsx)("pre",{className:"font-mono text-xs text-primary leading-tight whitespace-pre",children:i()})}function s({feature:e,index:r}){let[a,o]=(0,n.useState)(!1),s=(0,n.useRef)(null);return(0,n.useEffect)(()=>{let e=new IntersectionObserver(([e])=>{e.isIntersecting&&o(!0)},{threshold:.2});return s.current&&e.observe(s.current),()=>e.disconnect()},[]),(0,t.jsxs)("div",{ref:s,className:`group relative rounded-xl p-8 border border-border bg-card transition-all duration-700 hover:border-primary/50 ${a?"opacity-100 translate-y-0":"opacity-0 translate-y-8"}`,style:{transitionDelay:`${100*r}ms`},children:[(0,t.jsx)("div",{className:"mb-6 h-20 flex items-center",children:(0,t.jsx)(i,{animationKey:e.animationKey})}),(0,t.jsx)("h3",{className:"text-lg font-semibold mb-2",children:e.title}),(0,t.jsx)("p",{className:"text-sm text-muted-foreground leading-relaxed",children:e.description})]})}function l(){let[e,r]=(0,n.useState)(!1),a=(0,n.useRef)(null);return(0,n.useEffect)(()=>{let e=new IntersectionObserver(([e])=>{e.isIntersecting&&r(!0)},{threshold:.1});return a.current&&e.observe(a.current),()=>e.disconnect()},[]),(0,t.jsx)("section",{id:"features",ref:a,className:"relative py-32 overflow-hidden",children:(0,t.jsxs)("div",{className:"max-w-7xl mx-auto px-6 lg:px-8",children:[(0,t.jsxs)("div",{className:"flex flex-col items-center text-center mb-10",children:[(0,t.jsx)("h2",{className:`text-3xl lg:text-5xl font-semibold tracking-tight mb-6 transition-all duration-700 ${e?"opacity-100 translate-y-0":"opacity-0 translate-y-4"}`,children:(0,t.jsx)("span",{className:"text-balance",children:"Everything a football fan needs."})}),(0,t.jsx)("p",{className:`text-lg text-muted-foreground leading-relaxed transition-all duration-700 delay-100 mb-8 ${e?"opacity-100 translate-y-0":"opacity-0 translate-y-4"}`,children:"From live match updates to AI-powered analysis, Huginn brings the complete football experience to your WhatsApp."})]}),(0,t.jsx)("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",children:o.map((e,r)=>(0,t.jsx)(s,{feature:e,index:r},e.title))})]})})}var c=e.i(52975);let d=[{num:"01",title:"Save the number",desc:"Save Huginn's WhatsApp number as a contact on your phone. That's the only thing you do outside WhatsApp."},{num:"02",title:"Add it to your group",desc:"Open any WhatsApp group you're already in. Tap Add Participant, search Huginn, done. It joins silently."},{num:"03",title:"Send one command",desc:"Type /follow Brazil in the group. From that moment, every goal, red card, and odds shift fires automatically straight into the chat."}],u=[{name:"TxLINE",desc:"Live odds and match data across all 104 World Cup fixtures",logo:"https://txodds.net/wp-content/uploads/2025/11/TxODDS-White-on-Transparent-300x60.png",logoIsWide:!0},{name:"Llama 3.3 70B",desc:"AI commentary generation running on match events in real time",logo:"https://cdn.simpleicons.org/meta/ffffff",logoIsWide:!1},{name:"WhatsApp",desc:"Direct delivery to your group chat without extra apps",logo:"https://cdn.simpleicons.org/whatsapp/ffffff",logoIsWide:!1},{name:"Node.js",desc:"Always-on event processing and alert scheduling",logo:"https://cdn.simpleicons.org/nodedotjs/ffffff",logoIsWide:!1}];function f(){return(0,t.jsxs)("main",{className:"relative min-h-screen overflow-x-hidden",children:[(0,t.jsx)(r.Navigation,{}),(0,t.jsxs)("div",{className:"pt-24",children:[(0,t.jsx)(l,{}),(0,t.jsx)("section",{className:"py-24 bg-secondary/10 border-t border-border",children:(0,t.jsxs)("div",{className:"max-w-7xl mx-auto px-6 lg:px-8",children:[(0,t.jsx)("div",{className:"text-center mb-16",children:(0,t.jsx)("h2",{className:"text-3xl lg:text-5xl font-semibold tracking-tight mb-4",children:"Three steps is all you need."})}),(0,t.jsx)("div",{className:"grid md:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden",children:d.map(e=>(0,t.jsx)("div",{className:"bg-card p-8 flex flex-col justify-between",children:(0,t.jsxs)("div",{children:[(0,t.jsx)("span",{className:"font-mono text-xs text-primary mb-4 block tracking-widest",children:e.num}),(0,t.jsx)("h3",{className:"text-lg font-semibold mb-3",children:e.title}),(0,t.jsx)("p",{className:"text-sm text-muted-foreground leading-relaxed",children:e.desc})]})},e.num))})]})}),(0,t.jsx)("section",{className:"py-24 bg-secondary/20 border-t border-border",children:(0,t.jsxs)("div",{className:"max-w-7xl mx-auto px-6 lg:px-8",children:[(0,t.jsx)("h2",{className:"text-3xl lg:text-5xl font-semibold tracking-tight mb-16 text-center",children:"Built on what works."}),(0,t.jsxs)("div",{className:"relative",children:[(0,t.jsx)("div",{className:"absolute top-[36px] left-0 right-0 h-px hidden lg:block",style:{background:"linear-gradient(90deg, transparent, hsl(var(--border)) 10%, hsl(var(--border)) 90%, transparent)"}}),(0,t.jsx)("div",{className:"grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-6",children:u.map(e=>(0,t.jsxs)("div",{className:"relative flex flex-col items-start lg:items-center lg:text-center animate-fade-in",children:[(0,t.jsx)("div",{className:"relative z-10 mb-5",children:(0,t.jsx)("div",{className:"w-[72px] h-[72px] rounded-2xl bg-card border border-border flex items-center justify-center shadow-sm p-3",children:(0,t.jsx)("img",{src:e.logo,alt:e.name,className:e.logoIsWide?"w-full h-auto object-contain":"w-8 h-8 object-contain",style:{filter:"brightness(0) invert(1)"},onError:e=>{e.target.style.display="none"}})})}),(0,t.jsx)("h3",{className:"font-semibold text-base mb-2",children:e.name}),(0,t.jsx)("p",{className:"text-sm text-muted-foreground leading-relaxed",children:e.desc})]},e.name))})]})]})})]}),(0,t.jsx)(c.FooterSection,{})]})}e.s(["default",()=>f],89688)}]);