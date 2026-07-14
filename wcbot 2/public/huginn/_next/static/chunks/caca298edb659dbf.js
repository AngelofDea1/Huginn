(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,33525,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"warnOnce",{enumerable:!0,get:function(){return n}});let n=e=>{}},98183,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var n={assign:function(){return l},searchParamsToUrlQuery:function(){return a},urlQueryToSearchParams:function(){return s}};for(var o in n)Object.defineProperty(r,o,{enumerable:!0,get:n[o]});function a(e){let t={};for(let[r,n]of e.entries()){let e=t[r];void 0===e?t[r]=n:Array.isArray(e)?e.push(n):t[r]=[e,n]}return t}function i(e){return"string"==typeof e?e:("number"!=typeof e||isNaN(e))&&"boolean"!=typeof e?"":String(e)}function s(e){let t=new URLSearchParams;for(let[r,n]of Object.entries(e))if(Array.isArray(n))for(let e of n)t.append(r,i(e));else t.set(r,i(n));return t}function l(e,...t){for(let r of t){for(let t of r.keys())e.delete(t);for(let[t,n]of r.entries())e.append(t,n)}return e}},95057,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var n={formatUrl:function(){return s},formatWithValidation:function(){return c},urlObjectKeys:function(){return l}};for(var o in n)Object.defineProperty(r,o,{enumerable:!0,get:n[o]});let a=e.r(90809)._(e.r(98183)),i=/https?|ftp|gopher|file/;function s(e){let{auth:t,hostname:r}=e,n=e.protocol||"",o=e.pathname||"",s=e.hash||"",l=e.query||"",c=!1;t=t?encodeURIComponent(t).replace(/%3A/i,":")+"@":"",e.host?c=t+e.host:r&&(c=t+(~r.indexOf(":")?`[${r}]`:r),e.port&&(c+=":"+e.port)),l&&"object"==typeof l&&(l=String(a.urlQueryToSearchParams(l)));let d=e.search||l&&`?${l}`||"";return n&&!n.endsWith(":")&&(n+=":"),e.slashes||(!n||i.test(n))&&!1!==c?(c="//"+(c||""),o&&"/"!==o[0]&&(o="/"+o)):c||(c=""),s&&"#"!==s[0]&&(s="#"+s),d&&"?"!==d[0]&&(d="?"+d),o=o.replace(/[?#]/g,encodeURIComponent),d=d.replace("#","%23"),`${n}${c}${o}${d}${s}`}let l=["auth","hash","host","hostname","href","path","pathname","port","protocol","query","search","slashes"];function c(e){return s(e)}},18581,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"useMergedRef",{enumerable:!0,get:function(){return o}});let n=e.r(71645);function o(e,t){let r=(0,n.useRef)(null),o=(0,n.useRef)(null);return(0,n.useCallback)(n=>{if(null===n){let e=r.current;e&&(r.current=null,e());let t=o.current;t&&(o.current=null,t())}else e&&(r.current=a(e,n)),t&&(o.current=a(t,n))},[e,t])}function a(e,t){if("function"!=typeof e)return e.current=t,()=>{e.current=null};{let r=e(t);return"function"==typeof r?r:()=>e(null)}}("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},18967,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var n={DecodeError:function(){return g},MiddlewareNotFoundError:function(){return j},MissingStaticPage:function(){return v},NormalizeError:function(){return b},PageNotFoundError:function(){return y},SP:function(){return x},ST:function(){return h},WEB_VITALS:function(){return a},execOnce:function(){return i},getDisplayName:function(){return u},getLocationOrigin:function(){return c},getURL:function(){return d},isAbsoluteUrl:function(){return l},isResSent:function(){return f},loadGetInitialProps:function(){return p},normalizeRepeatedSlashes:function(){return m},stringifyError:function(){return w}};for(var o in n)Object.defineProperty(r,o,{enumerable:!0,get:n[o]});let a=["CLS","FCP","FID","INP","LCP","TTFB"];function i(e){let t,r=!1;return(...n)=>(r||(r=!0,t=e(...n)),t)}let s=/^[a-zA-Z][a-zA-Z\d+\-.]*?:/,l=e=>s.test(e);function c(){let{protocol:e,hostname:t,port:r}=window.location;return`${e}//${t}${r?":"+r:""}`}function d(){let{href:e}=window.location,t=c();return e.substring(t.length)}function u(e){return"string"==typeof e?e:e.displayName||e.name||"Unknown"}function f(e){return e.finished||e.headersSent}function m(e){let t=e.split("?");return t[0].replace(/\\/g,"/").replace(/\/\/+/g,"/")+(t[1]?`?${t.slice(1).join("?")}`:"")}async function p(e,t){let r=t.res||t.ctx&&t.ctx.res;if(!e.getInitialProps)return t.ctx&&t.Component?{pageProps:await p(t.Component,t.ctx)}:{};let n=await e.getInitialProps(t);if(r&&f(r))return n;if(!n)throw Object.defineProperty(Error(`"${u(e)}.getInitialProps()" should resolve to an object. But found "${n}" instead.`),"__NEXT_ERROR_CODE",{value:"E394",enumerable:!1,configurable:!0});return n}let x="undefined"!=typeof performance,h=x&&["mark","measure","getEntriesByName"].every(e=>"function"==typeof performance[e]);class g extends Error{}class b extends Error{}class y extends Error{constructor(e){super(),this.code="ENOENT",this.name="PageNotFoundError",this.message=`Cannot find module for page: ${e}`}}class v extends Error{constructor(e,t){super(),this.message=`Failed to load static file for page: ${e} ${t}`}}class j extends Error{constructor(){super(),this.code="ENOENT",this.message="Cannot find the middleware module"}}function w(e){return JSON.stringify({message:e.message,stack:e.stack})}},73668,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"isLocalURL",{enumerable:!0,get:function(){return a}});let n=e.r(18967),o=e.r(52817);function a(e){if(!(0,n.isAbsoluteUrl)(e))return!0;try{let t=(0,n.getLocationOrigin)(),r=new URL(e,t);return r.origin===t&&(0,o.hasBasePath)(r.pathname)}catch(e){return!1}}},84508,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"errorOnce",{enumerable:!0,get:function(){return n}});let n=e=>{}},22016,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var n={default:function(){return g},useLinkStatus:function(){return y}};for(var o in n)Object.defineProperty(r,o,{enumerable:!0,get:n[o]});let a=e.r(90809),i=e.r(43476),s=a._(e.r(71645)),l=e.r(95057),c=e.r(8372),d=e.r(18581),u=e.r(18967),f=e.r(5550);e.r(33525);let m=e.r(91949),p=e.r(73668),x=e.r(9396);function h(e){return"string"==typeof e?e:(0,l.formatUrl)(e)}function g(t){var r;let n,o,a,[l,g]=(0,s.useOptimistic)(m.IDLE_LINK_STATUS),y=(0,s.useRef)(null),{href:v,as:j,children:w,prefetch:N=null,passHref:k,replace:S,shallow:_,scroll:C,onClick:E,onMouseEnter:P,onTouchStart:O,legacyBehavior:I=!1,onNavigate:L,ref:T,unstable_dynamicOnHover:R,...D}=t;n=w,I&&("string"==typeof n||"number"==typeof n)&&(n=(0,i.jsx)("a",{children:n}));let M=s.default.useContext(c.AppRouterContext),$=!1!==N,A=!1!==N?null===(r=N)||"auto"===r?x.FetchStrategy.PPR:x.FetchStrategy.Full:x.FetchStrategy.PPR,{href:F,as:U}=s.default.useMemo(()=>{let e=h(v);return{href:e,as:j?h(j):e}},[v,j]);if(I){if(n?.$$typeof===Symbol.for("react.lazy"))throw Object.defineProperty(Error("`<Link legacyBehavior>` received a direct child that is either a Server Component, or JSX that was loaded with React.lazy(). This is not supported. Either remove legacyBehavior, or make the direct child a Client Component that renders the Link's `<a>` tag."),"__NEXT_ERROR_CODE",{value:"E863",enumerable:!1,configurable:!0});o=s.default.Children.only(n)}let H=I?o&&"object"==typeof o&&o.ref:T,B=s.default.useCallback(e=>(null!==M&&(y.current=(0,m.mountLinkInstance)(e,F,M,A,$,g)),()=>{y.current&&((0,m.unmountLinkForCurrentNavigation)(y.current),y.current=null),(0,m.unmountPrefetchableInstance)(e)}),[$,F,M,A,g]),z={ref:(0,d.useMergedRef)(B,H),onClick(t){I||"function"!=typeof E||E(t),I&&o.props&&"function"==typeof o.props.onClick&&o.props.onClick(t),!M||t.defaultPrevented||function(t,r,n,o,a,i,l){if("undefined"!=typeof window){let c,{nodeName:d}=t.currentTarget;if("A"===d.toUpperCase()&&((c=t.currentTarget.getAttribute("target"))&&"_self"!==c||t.metaKey||t.ctrlKey||t.shiftKey||t.altKey||t.nativeEvent&&2===t.nativeEvent.which)||t.currentTarget.hasAttribute("download"))return;if(!(0,p.isLocalURL)(r)){a&&(t.preventDefault(),location.replace(r));return}if(t.preventDefault(),l){let e=!1;if(l({preventDefault:()=>{e=!0}}),e)return}let{dispatchNavigateAction:u}=e.r(99781);s.default.startTransition(()=>{u(n||r,a?"replace":"push",i??!0,o.current)})}}(t,F,U,y,S,C,L)},onMouseEnter(e){I||"function"!=typeof P||P(e),I&&o.props&&"function"==typeof o.props.onMouseEnter&&o.props.onMouseEnter(e),M&&$&&(0,m.onNavigationIntent)(e.currentTarget,!0===R)},onTouchStart:function(e){I||"function"!=typeof O||O(e),I&&o.props&&"function"==typeof o.props.onTouchStart&&o.props.onTouchStart(e),M&&$&&(0,m.onNavigationIntent)(e.currentTarget,!0===R)}};return(0,u.isAbsoluteUrl)(U)?z.href=U:I&&!k&&("a"!==o.type||"href"in o.props)||(z.href=(0,f.addBasePath)(U)),a=I?s.default.cloneElement(o,z):(0,i.jsx)("a",{...D,...z,children:n}),(0,i.jsx)(b.Provider,{value:l,children:a})}e.r(84508);let b=(0,s.createContext)(m.IDLE_LINK_STATUS),y=()=>(0,s.useContext)(b);("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},84998,e=>{"use strict";var t=e.i(43476),r=e.i(71645),n=e.i(22016),o=e.i(18566);let a=[{name:"Home",href:"/"},{name:"Features",href:"/features"},{name:"Commands",href:"/commands"},{name:"Live Chat",href:"/live-chat"}];function i(){let e=(0,o.usePathname)(),[i,s]=(0,r.useState)(!1);return(0,r.useEffect)(()=>{s(!1)},[e]),(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)("nav",{className:"pill-nav-container","aria-label":"Main navigation",children:[(0,t.jsxs)("div",{className:"pill-nav",children:[(0,t.jsxs)(n.default,{href:"/",className:"pill-logo","aria-label":"Huginn home",children:[(0,t.jsx)("img",{src:"/raven-logo-v2.jpeg",alt:"Huginn logo",className:"w-7 h-7 rounded-full object-cover border border-white/10"}),(0,t.jsx)("span",{className:"pill-logo-text",style:{color:"#f0f0f8"},children:"Huginn"})]}),(0,t.jsx)("div",{className:"pill-nav-items desktop-only",children:(0,t.jsx)("ul",{className:"pill-list",role:"list",children:a.map(r=>{let o=e===r.href;return(0,t.jsx)("li",{children:(0,t.jsx)(n.default,{href:r.href,className:`pill${o?" is-active":""}`,"aria-current":o?"page":void 0,style:{"--pill-bg":"rgba(255,255,255,0.06)","--pill-text":"#f0f0f8"},children:(0,t.jsx)("span",{className:"pill-label",children:r.name})})},r.name)})})}),(0,t.jsxs)("button",{className:"mobile-menu-button mobile-only",onClick:()=>s(e=>!e),"aria-label":i?"Close menu":"Open menu","aria-expanded":i,children:[(0,t.jsx)("span",{className:"hamburger-line",style:{transform:i?"rotate(45deg) translate(5px,5px)":"none"}}),(0,t.jsx)("span",{className:"hamburger-line",style:{opacity:+!i}}),(0,t.jsx)("span",{className:"hamburger-line",style:{transform:i?"rotate(-45deg) translate(5px,-5px)":"none"}})]})]}),i&&(0,t.jsx)("div",{className:"mobile-menu-backdrop mobile-only",onClick:()=>s(!1)}),(0,t.jsx)("div",{className:"mobile-menu-popover mobile-only",style:{opacity:+!!i,visibility:i?"visible":"hidden",transform:i?"scale(1)":"scale(0.95)",transition:"opacity 0.2s, transform 0.2s, visibility 0.2s"},children:(0,t.jsx)("ul",{className:"mobile-menu-list",role:"list",children:a.map(r=>{let o=e===r.href;return(0,t.jsx)("li",{children:(0,t.jsx)(n.default,{href:r.href,className:`mobile-menu-link${o?" is-active":""}`,children:r.name})},r.name)})})})]}),(0,t.jsx)("style",{children:`
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
      `})]})}e.s(["Navigation",()=>i])},52975,e=>{"use strict";var t=e.i(43476),r=e.i(22016);function n(){return(0,t.jsx)("footer",{className:"relative border-t border-border",children:(0,t.jsxs)("div",{className:"max-w-7xl mx-auto px-6 lg:px-8",children:[(0,t.jsxs)("div",{className:"py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8",children:[(0,t.jsxs)("div",{children:[(0,t.jsxs)(r.default,{href:"/",className:"flex items-center gap-2 mb-3",children:[(0,t.jsx)("img",{src:"/raven-logo-v2.jpeg",alt:"Huginn logo",className:"w-8 h-8 rounded-full object-cover border border-white/10"}),(0,t.jsx)("span",{className:"font-semibold tracking-tight",children:"Huginn"})]}),(0,t.jsx)("p",{className:"text-sm text-muted-foreground max-w-xs leading-relaxed",children:"Live football alerts and AI commentary, delivered to your WhatsApp or directly in your browser."})]}),(0,t.jsxs)("div",{className:"flex flex-wrap gap-x-8 gap-y-3",children:[(0,t.jsx)(r.default,{href:"/features",className:"text-sm text-muted-foreground hover:text-foreground transition-colors",children:"Features"}),(0,t.jsx)(r.default,{href:"/commands",className:"text-sm text-muted-foreground hover:text-foreground transition-colors",children:"Commands"}),(0,t.jsx)(r.default,{href:"/live-chat",className:"text-sm text-muted-foreground hover:text-foreground transition-colors",children:"Live Chat"}),(0,t.jsx)("a",{href:"https://txline.txodds.com/documentation/worldcup",target:"_blank",rel:"noopener noreferrer",className:"text-sm text-muted-foreground hover:text-foreground transition-colors",children:"TxLINE ↗"})]})]}),(0,t.jsxs)("div",{className:"py-5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3",children:[(0,t.jsx)("p",{className:"text-xs text-muted-foreground",children:"© 2026 Huginn · World Cup 2026 · Built on TxLINE"}),(0,t.jsxs)("div",{className:"flex items-center gap-5",children:[(0,t.jsx)(r.default,{href:"/privacy",className:"text-xs text-muted-foreground hover:text-foreground transition-colors",children:"Privacy Policy"}),(0,t.jsx)(r.default,{href:"/terms",className:"text-xs text-muted-foreground hover:text-foreground transition-colors",children:"Terms of Service"}),(0,t.jsx)("span",{className:"text-xs text-muted-foreground font-mono hidden sm:block",children:"Powered by Llama 3.3 70B · Baileys · Node.js"})]})]})]})})}e.s(["FooterSection",()=>n])},75671,e=>{"use strict";var t=e.i(43476),r=e.i(71645),n=e.i(84998),o=e.i(52975);let a="huginn_chat_v1",i="huginn_session_v1",s={from:"huginn",text:"Connected to TxLINE.\n\n/follow [team] · live alerts for any match\n/live · what's on right now\n/schedule · upcoming fixtures\n/stats [player] · career profile & injury history\n/vibe [mode] · hype, tactical, funny, balanced\n/help · full command list\n\nClick a match on the left to follow it, or type below.",ts:Date.now()},l=["/live","/schedule","/follow Brazil","/stats Mbappé","/vibe hype","/help"];function c(){let[e,c]=(0,r.useState)([]),[d,u]=(0,r.useState)([]),[f,m]=(0,r.useState)(""),[p,x]=(0,r.useState)(null),[h,g]=(0,r.useState)(!1),[b,y]=(0,r.useState)(!1),v=(0,r.useRef)(""),j=(0,r.useRef)(null);(0,r.useEffect)(()=>{let{sessionId:e,messages:t}=function(){try{let e=localStorage.getItem(a),t=localStorage.getItem(i),r=e?JSON.parse(e):[],n=t||"web_"+Math.random().toString(36).slice(2,11);return t||localStorage.setItem(i,n),{sessionId:n,messages:r}}catch{return{sessionId:"web_"+Math.random().toString(36).slice(2,11),messages:[]}}}();v.current=e,t.length>0?u(t):(u([s]),localStorage.setItem(a,JSON.stringify([s]))),w()},[]),(0,r.useEffect)(()=>{if(0!==d.length)try{let e=d.slice(-100);localStorage.setItem(a,JSON.stringify(e))}catch{}},[d]),(0,r.useEffect)(()=>{j.current?.scrollIntoView({behavior:"smooth"})},[d]);let w=(0,r.useCallback)(async()=>{g(!0);try{let e=await fetch("/api/live"),t=await e.json(),r=(t.live||[]).map(e=>({id:String(e.id),home:e.home_team?.name||"Home",away:e.away_team?.name||"Away",kickoffIso:e.kickoff_time||new Date().toISOString(),time:e.minute?`${e.minute}'`:"LIVE",status:"LIVE",minute:e.minute??null,homeScore:e.home_score??0,awayScore:e.away_score??0})),n=(t.upcoming||[]).map(e=>{let t=new Date(e.kickoff_time).toLocaleTimeString(void 0,{hour:"2-digit",minute:"2-digit"});return{id:String(e.id),home:e.home_team?.name||"Home",away:e.away_team?.name||"Away",kickoffIso:e.kickoff_time,time:t,status:"SOON",minute:null,homeScore:null,awayScore:null}});c([...r,...n])}catch(e){console.error("Failed to load scores:",e)}finally{g(!1)}},[]);(0,r.useEffect)(()=>{let t=setInterval(w,e.some(e=>"LIVE"===e.status)?1e4:3e4);return()=>clearInterval(t)},[e,w]);let N=(0,r.useCallback)(async e=>{let t=e.trim();if(!t||b)return;let r={from:"user",text:t,ts:Date.now()};u(e=>[...e,r]),m(""),y(!0);try{let e=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:v.current,message:t})}),r=await e.json(),n={from:"huginn",text:r.reply||"Something went wrong. Try again.",ts:Date.now()};u(e=>[...e,n])}catch{u(e=>[...e,{from:"huginn",text:"Connection error. Make sure the server is reachable.",ts:Date.now()}])}finally{y(!1)}},[b]),k=(0,r.useCallback)(e=>{x(e),N(`/follow ${e.home}`)},[N]),S=e.reduce((e,t)=>{let r,n,o,a="LIVE"===t.status?"🔴 Live Now":(r=new Date(t.kickoffIso),((o=new Date(n=new Date)).setDate(n.getDate()+1),r.toDateString()===n.toDateString())?"Today":r.toDateString()===o.toDateString()?"Tomorrow":r.toLocaleDateString(void 0,{weekday:"short",day:"numeric",month:"short"}));return e[a]||(e[a]=[]),e[a].push(t),e},{}),_=Object.keys(S).sort(e=>"🔴 Live Now"===e?-1:1);return(0,t.jsxs)("main",{className:"relative min-h-screen overflow-x-hidden",children:[(0,t.jsx)(n.Navigation,{}),(0,t.jsx)("section",{className:"py-28 lg:py-32",children:(0,t.jsxs)("div",{className:"max-w-7xl mx-auto px-4 lg:px-8",children:[(0,t.jsxs)("div",{className:"flex flex-col items-center text-center mb-10",children:[(0,t.jsx)("h1",{className:"text-3xl lg:text-5xl font-semibold tracking-tight mb-6",children:"Live Chat"}),(0,t.jsx)("p",{className:"text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto mb-8",children:"Chat with Huginn directly. Click a fixture to follow it, alerts fire automatically into this window."})]}),(0,t.jsxs)("div",{className:"grid lg:grid-cols-[280px_1fr] gap-4 items-start",children:[(0,t.jsxs)("div",{className:"bg-card border border-border rounded-2xl overflow-hidden",children:[(0,t.jsxs)("div",{className:"px-5 py-3.5 border-b border-border flex items-center justify-between",children:[(0,t.jsx)("span",{className:"text-sm font-semibold",children:"Fixtures"}),(0,t.jsxs)("button",{onClick:w,disabled:h,className:"text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 disabled:opacity-40",children:[(0,t.jsx)("span",{className:`text-sm leading-none ${h?"animate-spin inline-block":""}`,children:"↻"}),h?"Loading…":"Refresh"]})]}),0===e.length&&!h&&(0,t.jsxs)("div",{className:"px-5 py-12 text-center flex flex-col items-center gap-3",children:[(0,t.jsx)("span",{className:"text-4xl",children:"⚽"}),(0,t.jsx)("p",{className:"text-sm font-medium text-foreground",children:"No matches right now"}),(0,t.jsx)("p",{className:"text-xs text-muted-foreground",children:"World Cup fixtures will appear here live"}),(0,t.jsx)("p",{className:"text-[10px] text-muted-foreground/60",children:"Auto-refreshes every 30 seconds"})]}),(0,t.jsx)("div",{className:"overflow-y-auto",style:{maxHeight:560},children:_.map(e=>(0,t.jsxs)("div",{children:[(0,t.jsx)("div",{className:"px-5 py-2 bg-secondary/30 border-b border-border",children:(0,t.jsx)("span",{className:"text-[10px] font-mono font-bold tracking-widest text-muted-foreground uppercase",children:e})}),(0,t.jsx)("div",{className:"divide-y divide-border",children:S[e].map(e=>(0,t.jsxs)("button",{onClick:()=>k(e),className:`w-full text-left px-5 py-4 hover:bg-secondary/50 transition-colors ${p?.id===e.id?"bg-primary/5 border-l-2 border-l-primary":""}`,children:[(0,t.jsx)("div",{className:"flex items-center justify-between mb-2",children:"LIVE"===e.status?(0,t.jsx)("span",{className:"text-[10px] font-mono font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-sm",children:e.minute?`● ${e.minute}'`:"● LIVE"}):(0,t.jsx)("span",{className:"text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-sm",children:e.time})}),(0,t.jsxs)("div",{className:"flex items-center justify-between text-sm gap-2",children:[(0,t.jsx)("span",{className:"font-medium truncate flex-1 text-left",children:e.home}),null!==e.homeScore?(0,t.jsxs)("span",{className:"font-mono font-bold text-base shrink-0 tabular-nums",children:[e.homeScore,"–",e.awayScore]}):(0,t.jsx)("span",{className:"text-muted-foreground text-xs shrink-0",children:"vs"}),(0,t.jsx)("span",{className:"font-medium truncate flex-1 text-right",children:e.away})]})]},e.id))})]},e))})]}),(0,t.jsxs)("div",{className:"bg-card border border-border rounded-2xl overflow-hidden flex flex-col",style:{minHeight:600},children:[(0,t.jsxs)("div",{className:"px-5 py-4 border-b border-border flex items-center gap-3",children:[(0,t.jsx)("img",{src:"/raven-logo-v2.jpeg",alt:"Huginn",className:"w-9 h-9 rounded-full object-cover border border-border"}),(0,t.jsxs)("div",{children:[(0,t.jsx)("div",{className:"text-sm font-semibold",children:"Huginn"}),(0,t.jsx)("div",{className:"text-xs text-muted-foreground",children:"Live match intelligence · World Cup 2026"})]}),(0,t.jsx)("div",{className:"ml-auto",children:(0,t.jsx)("button",{onClick:()=>{localStorage.removeItem(a),u([s])},className:"text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-2.5 py-1",children:"Clear history"})})]}),(0,t.jsxs)("div",{className:"flex-1 p-4 space-y-3 overflow-y-auto",style:{minHeight:340,maxHeight:520},children:[d.map((e,r)=>(0,t.jsxs)("div",{className:`flex flex-col ${"user"===e.from?"items-end":"items-start"}`,children:[(0,t.jsx)("div",{className:`max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${"huginn"===e.from?"bg-secondary border border-border text-foreground rounded-tl-sm":"bg-primary text-primary-foreground rounded-tr-sm"}`,children:e.text}),e.ts&&(0,t.jsx)("span",{className:"text-[10px] text-muted-foreground mt-1 px-1",children:new Date(e.ts).toLocaleTimeString(void 0,{hour:"2-digit",minute:"2-digit"})})]},r)),b&&(0,t.jsx)("div",{className:"flex items-start",children:(0,t.jsx)("div",{className:"bg-secondary border border-border px-4 py-3 rounded-2xl rounded-tl-sm",children:(0,t.jsxs)("span",{className:"flex gap-1",children:[(0,t.jsx)("span",{className:"w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]"}),(0,t.jsx)("span",{className:"w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]"}),(0,t.jsx)("span",{className:"w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]"})]})})}),(0,t.jsx)("div",{ref:j})]}),(0,t.jsx)("div",{className:"px-4 py-3 border-t border-border bg-secondary/20 flex gap-2 overflow-x-auto scrollbar-hide",children:l.map(e=>(0,t.jsx)("button",{onClick:()=>N(e),disabled:b,className:"text-xs font-mono text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors disabled:opacity-40 whitespace-nowrap shrink-0 min-h-[36px]",children:e},e))}),(0,t.jsxs)("div",{className:"px-4 py-3 border-t border-border flex gap-3 items-center",children:[(0,t.jsx)("input",{type:"text",value:f,onChange:e=>m(e.target.value),onKeyDown:e=>"Enter"===e.key&&!b&&N(f),placeholder:"Type a command or ask anything…",disabled:b,className:"flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"}),(0,t.jsx)("button",{onClick:()=>N(f),disabled:b||!f.trim(),className:"w-11 h-11 rounded-full bg-primary flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity disabled:opacity-30 active:scale-95","aria-label":"Send",children:(0,t.jsx)("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"currentColor",className:"text-primary-foreground",children:(0,t.jsx)("path",{d:"M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"})})})]})]})]})]})}),(0,t.jsx)(o.FooterSection,{})]})}e.s(["default",()=>c])}]);