(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,33525,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"warnOnce",{enumerable:!0,get:function(){return n}});let n=e=>{}},98183,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var n={assign:function(){return l},searchParamsToUrlQuery:function(){return a},urlQueryToSearchParams:function(){return i}};for(var o in n)Object.defineProperty(r,o,{enumerable:!0,get:n[o]});function a(e){let t={};for(let[r,n]of e.entries()){let e=t[r];void 0===e?t[r]=n:Array.isArray(e)?e.push(n):t[r]=[e,n]}return t}function s(e){return"string"==typeof e?e:("number"!=typeof e||isNaN(e))&&"boolean"!=typeof e?"":String(e)}function i(e){let t=new URLSearchParams;for(let[r,n]of Object.entries(e))if(Array.isArray(n))for(let e of n)t.append(r,s(e));else t.set(r,s(n));return t}function l(e,...t){for(let r of t){for(let t of r.keys())e.delete(t);for(let[t,n]of r.entries())e.append(t,n)}return e}},95057,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var n={formatUrl:function(){return i},formatWithValidation:function(){return d},urlObjectKeys:function(){return l}};for(var o in n)Object.defineProperty(r,o,{enumerable:!0,get:n[o]});let a=e.r(90809)._(e.r(98183)),s=/https?|ftp|gopher|file/;function i(e){let{auth:t,hostname:r}=e,n=e.protocol||"",o=e.pathname||"",i=e.hash||"",l=e.query||"",d=!1;t=t?encodeURIComponent(t).replace(/%3A/i,":")+"@":"",e.host?d=t+e.host:r&&(d=t+(~r.indexOf(":")?`[${r}]`:r),e.port&&(d+=":"+e.port)),l&&"object"==typeof l&&(l=String(a.urlQueryToSearchParams(l)));let c=e.search||l&&`?${l}`||"";return n&&!n.endsWith(":")&&(n+=":"),e.slashes||(!n||s.test(n))&&!1!==d?(d="//"+(d||""),o&&"/"!==o[0]&&(o="/"+o)):d||(d=""),i&&"#"!==i[0]&&(i="#"+i),c&&"?"!==c[0]&&(c="?"+c),o=o.replace(/[?#]/g,encodeURIComponent),c=c.replace("#","%23"),`${n}${d}${o}${c}${i}`}let l=["auth","hash","host","hostname","href","path","pathname","port","protocol","query","search","slashes"];function d(e){return i(e)}},18581,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"useMergedRef",{enumerable:!0,get:function(){return o}});let n=e.r(71645);function o(e,t){let r=(0,n.useRef)(null),o=(0,n.useRef)(null);return(0,n.useCallback)(n=>{if(null===n){let e=r.current;e&&(r.current=null,e());let t=o.current;t&&(o.current=null,t())}else e&&(r.current=a(e,n)),t&&(o.current=a(t,n))},[e,t])}function a(e,t){if("function"!=typeof e)return e.current=t,()=>{e.current=null};{let r=e(t);return"function"==typeof r?r:()=>e(null)}}("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},18967,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var n={DecodeError:function(){return g},MiddlewareNotFoundError:function(){return j},MissingStaticPage:function(){return v},NormalizeError:function(){return b},PageNotFoundError:function(){return y},SP:function(){return x},ST:function(){return h},WEB_VITALS:function(){return a},execOnce:function(){return s},getDisplayName:function(){return u},getLocationOrigin:function(){return d},getURL:function(){return c},isAbsoluteUrl:function(){return l},isResSent:function(){return m},loadGetInitialProps:function(){return p},normalizeRepeatedSlashes:function(){return f},stringifyError:function(){return N}};for(var o in n)Object.defineProperty(r,o,{enumerable:!0,get:n[o]});let a=["CLS","FCP","FID","INP","LCP","TTFB"];function s(e){let t,r=!1;return(...n)=>(r||(r=!0,t=e(...n)),t)}let i=/^[a-zA-Z][a-zA-Z\d+\-.]*?:/,l=e=>i.test(e);function d(){let{protocol:e,hostname:t,port:r}=window.location;return`${e}//${t}${r?":"+r:""}`}function c(){let{href:e}=window.location,t=d();return e.substring(t.length)}function u(e){return"string"==typeof e?e:e.displayName||e.name||"Unknown"}function m(e){return e.finished||e.headersSent}function f(e){let t=e.split("?");return t[0].replace(/\\/g,"/").replace(/\/\/+/g,"/")+(t[1]?`?${t.slice(1).join("?")}`:"")}async function p(e,t){let r=t.res||t.ctx&&t.ctx.res;if(!e.getInitialProps)return t.ctx&&t.Component?{pageProps:await p(t.Component,t.ctx)}:{};let n=await e.getInitialProps(t);if(r&&m(r))return n;if(!n)throw Object.defineProperty(Error(`"${u(e)}.getInitialProps()" should resolve to an object. But found "${n}" instead.`),"__NEXT_ERROR_CODE",{value:"E394",enumerable:!1,configurable:!0});return n}let x="undefined"!=typeof performance,h=x&&["mark","measure","getEntriesByName"].every(e=>"function"==typeof performance[e]);class g extends Error{}class b extends Error{}class y extends Error{constructor(e){super(),this.code="ENOENT",this.name="PageNotFoundError",this.message=`Cannot find module for page: ${e}`}}class v extends Error{constructor(e,t){super(),this.message=`Failed to load static file for page: ${e} ${t}`}}class j extends Error{constructor(){super(),this.code="ENOENT",this.message="Cannot find the middleware module"}}function N(e){return JSON.stringify({message:e.message,stack:e.stack})}},73668,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"isLocalURL",{enumerable:!0,get:function(){return a}});let n=e.r(18967),o=e.r(52817);function a(e){if(!(0,n.isAbsoluteUrl)(e))return!0;try{let t=(0,n.getLocationOrigin)(),r=new URL(e,t);return r.origin===t&&(0,o.hasBasePath)(r.pathname)}catch(e){return!1}}},84508,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"errorOnce",{enumerable:!0,get:function(){return n}});let n=e=>{}},22016,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var n={default:function(){return g},useLinkStatus:function(){return y}};for(var o in n)Object.defineProperty(r,o,{enumerable:!0,get:n[o]});let a=e.r(90809),s=e.r(43476),i=a._(e.r(71645)),l=e.r(95057),d=e.r(8372),c=e.r(18581),u=e.r(18967),m=e.r(5550);e.r(33525);let f=e.r(91949),p=e.r(73668),x=e.r(9396);function h(e){return"string"==typeof e?e:(0,l.formatUrl)(e)}function g(t){var r;let n,o,a,[l,g]=(0,i.useOptimistic)(f.IDLE_LINK_STATUS),y=(0,i.useRef)(null),{href:v,as:j,children:N,prefetch:w=null,passHref:k,replace:P,shallow:T,scroll:C,onClick:E,onMouseEnter:O,onTouchStart:A,legacyBehavior:_=!1,onNavigate:S,ref:L,unstable_dynamicOnHover:I,...R}=t;n=N,_&&("string"==typeof n||"number"==typeof n)&&(n=(0,s.jsx)("a",{children:n}));let M=i.default.useContext(d.AppRouterContext),U=!1!==w,H=!1!==w?null===(r=w)||"auto"===r?x.FetchStrategy.PPR:x.FetchStrategy.Full:x.FetchStrategy.PPR,{href:$,as:F}=i.default.useMemo(()=>{let e=h(v);return{href:e,as:j?h(j):e}},[v,j]);if(_){if(n?.$$typeof===Symbol.for("react.lazy"))throw Object.defineProperty(Error("`<Link legacyBehavior>` received a direct child that is either a Server Component, or JSX that was loaded with React.lazy(). This is not supported. Either remove legacyBehavior, or make the direct child a Client Component that renders the Link's `<a>` tag."),"__NEXT_ERROR_CODE",{value:"E863",enumerable:!1,configurable:!0});o=i.default.Children.only(n)}let B=_?o&&"object"==typeof o&&o.ref:L,W=i.default.useCallback(e=>(null!==M&&(y.current=(0,f.mountLinkInstance)(e,$,M,H,U,g)),()=>{y.current&&((0,f.unmountLinkForCurrentNavigation)(y.current),y.current=null),(0,f.unmountPrefetchableInstance)(e)}),[U,$,M,H,g]),D={ref:(0,c.useMergedRef)(W,B),onClick(t){_||"function"!=typeof E||E(t),_&&o.props&&"function"==typeof o.props.onClick&&o.props.onClick(t),!M||t.defaultPrevented||function(t,r,n,o,a,s,l){if("undefined"!=typeof window){let d,{nodeName:c}=t.currentTarget;if("A"===c.toUpperCase()&&((d=t.currentTarget.getAttribute("target"))&&"_self"!==d||t.metaKey||t.ctrlKey||t.shiftKey||t.altKey||t.nativeEvent&&2===t.nativeEvent.which)||t.currentTarget.hasAttribute("download"))return;if(!(0,p.isLocalURL)(r)){a&&(t.preventDefault(),location.replace(r));return}if(t.preventDefault(),l){let e=!1;if(l({preventDefault:()=>{e=!0}}),e)return}let{dispatchNavigateAction:u}=e.r(99781);i.default.startTransition(()=>{u(n||r,a?"replace":"push",s??!0,o.current)})}}(t,$,F,y,P,C,S)},onMouseEnter(e){_||"function"!=typeof O||O(e),_&&o.props&&"function"==typeof o.props.onMouseEnter&&o.props.onMouseEnter(e),M&&U&&(0,f.onNavigationIntent)(e.currentTarget,!0===I)},onTouchStart:function(e){_||"function"!=typeof A||A(e),_&&o.props&&"function"==typeof o.props.onTouchStart&&o.props.onTouchStart(e),M&&U&&(0,f.onNavigationIntent)(e.currentTarget,!0===I)}};return(0,u.isAbsoluteUrl)(F)?D.href=F:_&&!k&&("a"!==o.type||"href"in o.props)||(D.href=(0,m.addBasePath)(F)),a=_?i.default.cloneElement(o,D):(0,s.jsx)("a",{...R,...D,children:n}),(0,s.jsx)(b.Provider,{value:l,children:a})}e.r(84508);let b=(0,i.createContext)(f.IDLE_LINK_STATUS),y=()=>(0,i.useContext)(b);("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},84998,e=>{"use strict";var t=e.i(43476),r=e.i(71645),n=e.i(22016),o=e.i(18566);let a=[{name:"Home",href:"/"},{name:"Features",href:"/features"},{name:"Commands",href:"/commands"},{name:"Live Chat",href:"/live-chat"}];function s(){let e=(0,o.usePathname)(),[s,i]=(0,r.useState)(!1);return(0,r.useEffect)(()=>{i(!1)},[e]),(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)("nav",{className:"pill-nav-container","aria-label":"Main navigation",children:[(0,t.jsxs)("div",{className:"pill-nav",children:[(0,t.jsxs)(n.default,{href:"/",className:"pill-logo","aria-label":"Huginn home",children:[(0,t.jsx)("img",{src:"/raven-logo-v2.jpeg",alt:"Huginn logo",className:"w-7 h-7 rounded-full object-cover border border-white/10"}),(0,t.jsx)("span",{className:"pill-logo-text",style:{color:"#f0f0f8"},children:"Huginn"})]}),(0,t.jsx)("div",{className:"pill-nav-items desktop-only",children:(0,t.jsx)("ul",{className:"pill-list",role:"list",children:a.map(r=>{let o=e===r.href;return(0,t.jsx)("li",{children:(0,t.jsx)(n.default,{href:r.href,className:`pill${o?" is-active":""}`,"aria-current":o?"page":void 0,style:{"--pill-bg":"rgba(255,255,255,0.06)","--pill-text":"#f0f0f8"},children:(0,t.jsx)("span",{className:"pill-label",children:r.name})})},r.name)})})}),(0,t.jsxs)("button",{className:"mobile-menu-button mobile-only",onClick:()=>i(e=>!e),"aria-label":s?"Close menu":"Open menu","aria-expanded":s,children:[(0,t.jsx)("span",{className:"hamburger-line",style:{transform:s?"rotate(45deg) translate(5px,5px)":"none"}}),(0,t.jsx)("span",{className:"hamburger-line",style:{opacity:+!s}}),(0,t.jsx)("span",{className:"hamburger-line",style:{transform:s?"rotate(-45deg) translate(5px,-5px)":"none"}})]})]}),s&&(0,t.jsx)("div",{className:"mobile-menu-backdrop mobile-only",onClick:()=>i(!1)}),(0,t.jsx)("div",{className:"mobile-menu-popover mobile-only",style:{opacity:+!!s,visibility:s?"visible":"hidden",transform:s?"scale(1)":"scale(0.95)",transition:"opacity 0.2s, transform 0.2s, visibility 0.2s"},children:(0,t.jsx)("ul",{className:"mobile-menu-list",role:"list",children:a.map(r=>{let o=e===r.href;return(0,t.jsx)("li",{children:(0,t.jsx)(n.default,{href:r.href,className:`mobile-menu-link${o?" is-active":""}`,children:r.name})},r.name)})})})]}),(0,t.jsx)("style",{children:`
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
        .mobile-menu-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          z-index: 997;
          width: 100vw;
          height: 100vh;
          left: -10px;
          top: -10px;
        }
        .mobile-menu-popover {
          position: absolute;
          top: 58px;
          left: 0;
          right: 0;
          background: rgba(13,13,26,0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 16px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05);
          z-index: 998;
          padding: 10px;
        }
        .mobile-menu-list {
          list-style: none;
          margin: 0; padding: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .mobile-menu-link {
          display: block;
          padding: 14px 20px; /* At least 48px vertical touch target height */
          color: #8c8ca8;
          text-decoration: none;
          font-family: var(--font-sans), sans-serif;
          font-size: 0.95rem;
          font-weight: 500;
          border-radius: 12px;
          transition: all 0.2s;
        }
        .mobile-menu-link:hover { background: rgba(255,255,255,0.05); color: #f0f0f8; }
        .mobile-menu-link.is-active { background: rgba(0,230,118,0.1); color: #00e676; font-weight: 600; }
        @media (max-width: 768px) {
          .pill-nav-container { top: 10px; left: 10px; right: 10px; transform: none; width: calc(100% - 20px); }
          .pill-nav { width: 100%; justify-content: space-between; }
          .desktop-only { display: none; }
          .mobile-only  { display: flex; }
          .mobile-menu-button { display: flex; width: 48px; height: 48px; } /* Ensures 48px touch target */
        }
      `})]})}e.s(["Navigation",()=>s])},52975,e=>{"use strict";var t=e.i(43476),r=e.i(22016);function n(){return(0,t.jsx)("footer",{className:"relative border-t border-border",children:(0,t.jsxs)("div",{className:"max-w-7xl mx-auto px-6 lg:px-8",children:[(0,t.jsxs)("div",{className:"py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8",children:[(0,t.jsxs)("div",{children:[(0,t.jsxs)(r.default,{href:"/",className:"flex items-center gap-2 mb-3",children:[(0,t.jsx)("img",{src:"/raven-logo-v2.jpeg",alt:"Huginn logo",className:"w-8 h-8 rounded-full object-cover border border-white/10"}),(0,t.jsx)("span",{className:"font-semibold tracking-tight",children:"Huginn"})]}),(0,t.jsx)("p",{className:"text-sm text-muted-foreground max-w-xs leading-relaxed",children:"Live football alerts and AI commentary, delivered to your WhatsApp or directly in your browser."})]}),(0,t.jsxs)("div",{className:"flex flex-wrap gap-x-8 gap-y-3",children:[(0,t.jsx)(r.default,{href:"/features",className:"text-sm text-muted-foreground hover:text-foreground transition-colors",children:"Features"}),(0,t.jsx)(r.default,{href:"/commands",className:"text-sm text-muted-foreground hover:text-foreground transition-colors",children:"Commands"}),(0,t.jsx)(r.default,{href:"/live-chat",className:"text-sm text-muted-foreground hover:text-foreground transition-colors",children:"Live Chat"}),(0,t.jsx)("a",{href:"https://txline.txodds.com/documentation/worldcup",target:"_blank",rel:"noopener noreferrer",className:"text-sm text-muted-foreground hover:text-foreground transition-colors",children:"TxLINE ↗"})]})]}),(0,t.jsxs)("div",{className:"py-5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3",children:[(0,t.jsx)("p",{className:"text-xs text-muted-foreground",children:"© 2026 Huginn · World Cup 2026 · Built on TxLINE"}),(0,t.jsxs)("div",{className:"flex items-center gap-5",children:[(0,t.jsx)(r.default,{href:"/privacy",className:"text-xs text-muted-foreground hover:text-foreground transition-colors",children:"Privacy Policy"}),(0,t.jsx)(r.default,{href:"/terms",className:"text-xs text-muted-foreground hover:text-foreground transition-colors",children:"Terms of Service"}),(0,t.jsx)("span",{className:"text-xs text-muted-foreground font-mono hidden sm:block",children:"Powered by Llama 3.3 70B · Baileys · Node.js"})]})]})]})})}e.s(["FooterSection",()=>n])},38592,e=>{"use strict";var t=e.i(43476),r=e.i(84998),n=e.i(52975);function o(){return(0,t.jsxs)("main",{className:"relative min-h-screen overflow-x-hidden",children:[(0,t.jsx)(r.Navigation,{}),(0,t.jsx)("div",{className:"absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none opacity-[0.02] grid-pattern z-0"}),(0,t.jsxs)("div",{className:"relative z-10 max-w-5xl mx-auto px-6 pt-32 pb-24",children:[(0,t.jsxs)("div",{className:"flex flex-col items-center text-center mb-16",children:[(0,t.jsx)("span",{className:"font-mono text-xs text-primary tracking-widest uppercase mb-3 block",children:"Legals"}),(0,t.jsx)("h1",{className:"text-3xl lg:text-5xl font-semibold tracking-tight mb-4",children:"Terms of Service"}),(0,t.jsx)("p",{className:"text-sm text-muted-foreground",children:"Last updated: July 14, 2026"})]}),(0,t.jsxs)("div",{className:"space-y-6",children:[(0,t.jsxs)("div",{className:"bg-card border border-border rounded-2xl p-8 hover:border-primary/20 transition-colors",children:[(0,t.jsx)("h2",{className:"text-lg font-semibold text-foreground mb-4",children:"1. Acceptance of Terms"}),(0,t.jsx)("p",{className:"text-sm text-muted-foreground leading-relaxed",children:"By using Huginn - whether through the website, web chat, push notifications, or the WhatsApp bot - you agree to these Terms of Service. If you do not agree, please discontinue use immediately."})]}),(0,t.jsxs)("div",{className:"bg-card border border-border rounded-2xl p-8 hover:border-primary/20 transition-colors",children:[(0,t.jsx)("h2",{className:"text-lg font-semibold text-foreground mb-4",children:"2. Description of Service"}),(0,t.jsx)("p",{className:"text-sm text-muted-foreground leading-relaxed mb-4",children:"Huginn is a real-time World Cup 2026 football companion service. It delivers:"}),(0,t.jsxs)("ul",{className:"list-none space-y-3 text-sm text-muted-foreground",children:[(0,t.jsxs)("li",{className:"flex items-start gap-3",children:[(0,t.jsx)("span",{className:"text-primary mt-1",children:"•"}),(0,t.jsx)("span",{children:"Live match alerts (goals, red cards, half-time, full-time) via WhatsApp and browser push notifications."})]}),(0,t.jsxs)("li",{className:"flex items-start gap-3",children:[(0,t.jsx)("span",{className:"text-primary mt-1",children:"•"}),(0,t.jsx)("span",{children:"AI-generated match commentary powered by Llama 3.3 70B."})]}),(0,t.jsxs)("li",{className:"flex items-start gap-3",children:[(0,t.jsx)("span",{className:"text-primary mt-1",children:"•"}),(0,t.jsx)("span",{children:"Live odds data sourced from TxLINE / TxODDS."})]}),(0,t.jsxs)("li",{className:"flex items-start gap-3",children:[(0,t.jsx)("span",{className:"text-primary mt-1",children:"•"}),(0,t.jsx)("span",{children:"An interactive web chat for on-demand match information and bot commands."})]})]})]}),(0,t.jsxs)("div",{className:"bg-card border border-border rounded-2xl p-8 hover:border-primary/20 transition-colors",children:[(0,t.jsx)("h2",{className:"text-lg font-semibold text-foreground mb-4",children:"3. Eligibility"}),(0,t.jsx)("p",{className:"text-sm text-muted-foreground leading-relaxed",children:"You must be at least 18 years old to use Huginn, particularly given that the service includes live betting odds information. By using Huginn, you confirm that you meet this age requirement."})]}),(0,t.jsxs)("div",{className:"bg-card border border-border rounded-2xl p-8 hover:border-primary/20 transition-colors",children:[(0,t.jsx)("h2",{className:"text-lg font-semibold text-foreground mb-4",children:"4. Acceptable Use"}),(0,t.jsx)("p",{className:"text-sm text-muted-foreground leading-relaxed mb-4",children:"You agree not to:"}),(0,t.jsxs)("ul",{className:"list-none space-y-3 text-sm text-muted-foreground",children:[(0,t.jsxs)("li",{className:"flex items-start gap-3",children:[(0,t.jsx)("span",{className:"text-primary mt-1",children:"•"}),(0,t.jsx)("span",{children:"Use Huginn to spam, harass, or abuse other WhatsApp group members."})]}),(0,t.jsxs)("li",{className:"flex items-start gap-3",children:[(0,t.jsx)("span",{className:"text-primary mt-1",children:"•"}),(0,t.jsx)("span",{children:"Attempt to reverse-engineer, disrupt, or exploit the bot server, API endpoints, or push notification infrastructure."})]}),(0,t.jsxs)("li",{className:"flex items-start gap-3",children:[(0,t.jsx)("span",{className:"text-primary mt-1",children:"•"}),(0,t.jsx)("span",{children:"Use automated scripts to flood Huginn with commands at scale."})]}),(0,t.jsxs)("li",{className:"flex items-start gap-3",children:[(0,t.jsx)("span",{className:"text-primary mt-1",children:"•"}),(0,t.jsx)("span",{children:"Misuse the /api/relink or internal admin endpoints if they are accessible."})]})]})]}),(0,t.jsxs)("div",{className:"bg-card border border-border rounded-2xl p-8 hover:border-primary/20 transition-colors",children:[(0,t.jsx)("h2",{className:"text-lg font-semibold text-foreground mb-4",children:"5. Odds & Match Data Disclaimer"}),(0,t.jsx)("p",{className:"text-sm text-muted-foreground leading-relaxed",children:"All odds and match data are sourced in real time from TxLINE and may be subject to delay, inaccuracy, or unavailability. Huginn does not encourage or facilitate gambling. Odds are displayed for informational and entertainment context only. Always gamble responsibly and in accordance with the laws of your jurisdiction."})]}),(0,t.jsxs)("div",{className:"bg-card border border-border rounded-2xl p-8 hover:border-primary/20 transition-colors",children:[(0,t.jsx)("h2",{className:"text-lg font-semibold text-foreground mb-4",children:"6. AI-Generated Content"}),(0,t.jsx)("p",{className:"text-sm text-muted-foreground leading-relaxed",children:"Match commentary is generated automatically by an AI model (Llama 3.3 70B). This content is produced in real time and has not been reviewed by a human editor. Huginn is not responsible for any errors, inaccuracies, or tone in AI-generated commentary. Use it for entertainment - not as the definitive record of match events."})]}),(0,t.jsxs)("div",{className:"bg-card border border-border rounded-2xl p-8 hover:border-primary/20 transition-colors",children:[(0,t.jsx)("h2",{className:"text-lg font-semibold text-foreground mb-4",children:"7. WhatsApp Terms Compliance"}),(0,t.jsx)("p",{className:"text-sm text-muted-foreground leading-relaxed",children:"Huginn's WhatsApp integration is built using open-source tooling. Usage of the bot must comply with WhatsApp's own Terms of Service. Huginn is an independent service and is not affiliated with, endorsed by, or sponsored by Meta Platforms, Inc. or WhatsApp LLC."})]}),(0,t.jsxs)("div",{className:"bg-card border border-border rounded-2xl p-8 hover:border-primary/20 transition-colors",children:[(0,t.jsx)("h2",{className:"text-lg font-semibold text-foreground mb-4",children:"8. Service Availability"}),(0,t.jsx)("p",{className:"text-sm text-muted-foreground leading-relaxed",children:"Huginn is provided on a best-effort basis. We do not guarantee uninterrupted or error-free service. The service is limited to the duration of the 2026 FIFA World Cup and may be discontinued or suspended at any time without prior notice."})]}),(0,t.jsxs)("div",{className:"bg-card border border-border rounded-2xl p-8 hover:border-primary/20 transition-colors",children:[(0,t.jsx)("h2",{className:"text-lg font-semibold text-foreground mb-4",children:"9. Limitation of Liability"}),(0,t.jsx)("p",{className:"text-sm text-muted-foreground leading-relaxed",children:'Huginn is provided "as is" without warranty of any kind. To the fullest extent permitted by law, we disclaim all liability for any direct, indirect, incidental, or consequential damages arising from your use of or inability to use the service, including but not limited to missed alerts, incorrect odds, or service downtime.'})]}),(0,t.jsxs)("div",{className:"bg-card border border-border rounded-2xl p-8 hover:border-primary/20 transition-colors",children:[(0,t.jsx)("h2",{className:"text-lg font-semibold text-foreground mb-4",children:"10. Changes to These Terms"}),(0,t.jsx)("p",{className:"text-sm text-muted-foreground leading-relaxed",children:"We reserve the right to update these Terms of Service at any time. Continued use of Huginn after any changes constitutes your acceptance of the revised terms. The date at the top of this page always reflects the most recent update."})]}),(0,t.jsxs)("div",{className:"bg-card border border-border rounded-2xl p-8 hover:border-primary/20 transition-colors",children:[(0,t.jsx)("h2",{className:"text-lg font-semibold text-foreground mb-4",children:"11. Contact"}),(0,t.jsxs)("p",{className:"text-sm text-muted-foreground leading-relaxed",children:["Questions about these terms? Reach us at"," ",(0,t.jsx)("a",{href:"mailto:legal@huginn-sports.com",className:"text-primary hover:underline",children:"legal@huginn-sports.com"}),"."]})]})]})]}),(0,t.jsx)(n.FooterSection,{})]})}e.s(["default",()=>o])}]);