(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,33525,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"warnOnce",{enumerable:!0,get:function(){return n}});let n=e=>{}},98183,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var n={assign:function(){return s},searchParamsToUrlQuery:function(){return a},urlQueryToSearchParams:function(){return l}};for(var o in n)Object.defineProperty(r,o,{enumerable:!0,get:n[o]});function a(e){let t={};for(let[r,n]of e.entries()){let e=t[r];void 0===e?t[r]=n:Array.isArray(e)?e.push(n):t[r]=[e,n]}return t}function i(e){return"string"==typeof e?e:("number"!=typeof e||isNaN(e))&&"boolean"!=typeof e?"":String(e)}function l(e){let t=new URLSearchParams;for(let[r,n]of Object.entries(e))if(Array.isArray(n))for(let e of n)t.append(r,i(e));else t.set(r,i(n));return t}function s(e,...t){for(let r of t){for(let t of r.keys())e.delete(t);for(let[t,n]of r.entries())e.append(t,n)}return e}},95057,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var n={formatUrl:function(){return l},formatWithValidation:function(){return c},urlObjectKeys:function(){return s}};for(var o in n)Object.defineProperty(r,o,{enumerable:!0,get:n[o]});let a=e.r(90809)._(e.r(98183)),i=/https?|ftp|gopher|file/;function l(e){let{auth:t,hostname:r}=e,n=e.protocol||"",o=e.pathname||"",l=e.hash||"",s=e.query||"",c=!1;t=t?encodeURIComponent(t).replace(/%3A/i,":")+"@":"",e.host?c=t+e.host:r&&(c=t+(~r.indexOf(":")?`[${r}]`:r),e.port&&(c+=":"+e.port)),s&&"object"==typeof s&&(s=String(a.urlQueryToSearchParams(s)));let d=e.search||s&&`?${s}`||"";return n&&!n.endsWith(":")&&(n+=":"),e.slashes||(!n||i.test(n))&&!1!==c?(c="//"+(c||""),o&&"/"!==o[0]&&(o="/"+o)):c||(c=""),l&&"#"!==l[0]&&(l="#"+l),d&&"?"!==d[0]&&(d="?"+d),o=o.replace(/[?#]/g,encodeURIComponent),d=d.replace("#","%23"),`${n}${c}${o}${d}${l}`}let s=["auth","hash","host","hostname","href","path","pathname","port","protocol","query","search","slashes"];function c(e){return l(e)}},18581,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"useMergedRef",{enumerable:!0,get:function(){return o}});let n=e.r(71645);function o(e,t){let r=(0,n.useRef)(null),o=(0,n.useRef)(null);return(0,n.useCallback)(n=>{if(null===n){let e=r.current;e&&(r.current=null,e());let t=o.current;t&&(o.current=null,t())}else e&&(r.current=a(e,n)),t&&(o.current=a(t,n))},[e,t])}function a(e,t){if("function"!=typeof e)return e.current=t,()=>{e.current=null};{let r=e(t);return"function"==typeof r?r:()=>e(null)}}("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},18967,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var n={DecodeError:function(){return g},MiddlewareNotFoundError:function(){return j},MissingStaticPage:function(){return v},NormalizeError:function(){return b},PageNotFoundError:function(){return y},SP:function(){return x},ST:function(){return h},WEB_VITALS:function(){return a},execOnce:function(){return i},getDisplayName:function(){return u},getLocationOrigin:function(){return c},getURL:function(){return d},isAbsoluteUrl:function(){return s},isResSent:function(){return f},loadGetInitialProps:function(){return p},normalizeRepeatedSlashes:function(){return m},stringifyError:function(){return w}};for(var o in n)Object.defineProperty(r,o,{enumerable:!0,get:n[o]});let a=["CLS","FCP","FID","INP","LCP","TTFB"];function i(e){let t,r=!1;return(...n)=>(r||(r=!0,t=e(...n)),t)}let l=/^[a-zA-Z][a-zA-Z\d+\-.]*?:/,s=e=>l.test(e);function c(){let{protocol:e,hostname:t,port:r}=window.location;return`${e}//${t}${r?":"+r:""}`}function d(){let{href:e}=window.location,t=c();return e.substring(t.length)}function u(e){return"string"==typeof e?e:e.displayName||e.name||"Unknown"}function f(e){return e.finished||e.headersSent}function m(e){let t=e.split("?");return t[0].replace(/\\/g,"/").replace(/\/\/+/g,"/")+(t[1]?`?${t.slice(1).join("?")}`:"")}async function p(e,t){let r=t.res||t.ctx&&t.ctx.res;if(!e.getInitialProps)return t.ctx&&t.Component?{pageProps:await p(t.Component,t.ctx)}:{};let n=await e.getInitialProps(t);if(r&&f(r))return n;if(!n)throw Object.defineProperty(Error(`"${u(e)}.getInitialProps()" should resolve to an object. But found "${n}" instead.`),"__NEXT_ERROR_CODE",{value:"E394",enumerable:!1,configurable:!0});return n}let x="undefined"!=typeof performance,h=x&&["mark","measure","getEntriesByName"].every(e=>"function"==typeof performance[e]);class g extends Error{}class b extends Error{}class y extends Error{constructor(e){super(),this.code="ENOENT",this.name="PageNotFoundError",this.message=`Cannot find module for page: ${e}`}}class v extends Error{constructor(e,t){super(),this.message=`Failed to load static file for page: ${e} ${t}`}}class j extends Error{constructor(){super(),this.code="ENOENT",this.message="Cannot find the middleware module"}}function w(e){return JSON.stringify({message:e.message,stack:e.stack})}},73668,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"isLocalURL",{enumerable:!0,get:function(){return a}});let n=e.r(18967),o=e.r(52817);function a(e){if(!(0,n.isAbsoluteUrl)(e))return!0;try{let t=(0,n.getLocationOrigin)(),r=new URL(e,t);return r.origin===t&&(0,o.hasBasePath)(r.pathname)}catch(e){return!1}}},84508,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"errorOnce",{enumerable:!0,get:function(){return n}});let n=e=>{}},22016,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var n={default:function(){return g},useLinkStatus:function(){return y}};for(var o in n)Object.defineProperty(r,o,{enumerable:!0,get:n[o]});let a=e.r(90809),i=e.r(43476),l=a._(e.r(71645)),s=e.r(95057),c=e.r(8372),d=e.r(18581),u=e.r(18967),f=e.r(5550);e.r(33525);let m=e.r(91949),p=e.r(73668),x=e.r(9396);function h(e){return"string"==typeof e?e:(0,s.formatUrl)(e)}function g(t){var r;let n,o,a,[s,g]=(0,l.useOptimistic)(m.IDLE_LINK_STATUS),y=(0,l.useRef)(null),{href:v,as:j,children:w,prefetch:N=null,passHref:S,replace:k,shallow:_,scroll:C,onClick:E,onMouseEnter:P,onTouchStart:O,legacyBehavior:L=!1,onNavigate:T,ref:I,unstable_dynamicOnHover:R,...$}=t;n=w,L&&("string"==typeof n||"number"==typeof n)&&(n=(0,i.jsx)("a",{children:n}));let M=l.default.useContext(c.AppRouterContext),A=!1!==N,F=!1!==N?null===(r=N)||"auto"===r?x.FetchStrategy.PPR:x.FetchStrategy.Full:x.FetchStrategy.PPR,{href:U,as:D}=l.default.useMemo(()=>{let e=h(v);return{href:e,as:j?h(j):e}},[v,j]);if(L){if(n?.$$typeof===Symbol.for("react.lazy"))throw Object.defineProperty(Error("`<Link legacyBehavior>` received a direct child that is either a Server Component, or JSX that was loaded with React.lazy(). This is not supported. Either remove legacyBehavior, or make the direct child a Client Component that renders the Link's `<a>` tag."),"__NEXT_ERROR_CODE",{value:"E863",enumerable:!1,configurable:!0});o=l.default.Children.only(n)}let B=L?o&&"object"==typeof o&&o.ref:I,H=l.default.useCallback(e=>(null!==M&&(y.current=(0,m.mountLinkInstance)(e,U,M,F,A,g)),()=>{y.current&&((0,m.unmountLinkForCurrentNavigation)(y.current),y.current=null),(0,m.unmountPrefetchableInstance)(e)}),[A,U,M,F,g]),z={ref:(0,d.useMergedRef)(H,B),onClick(t){L||"function"!=typeof E||E(t),L&&o.props&&"function"==typeof o.props.onClick&&o.props.onClick(t),!M||t.defaultPrevented||function(t,r,n,o,a,i,s){if("undefined"!=typeof window){let c,{nodeName:d}=t.currentTarget;if("A"===d.toUpperCase()&&((c=t.currentTarget.getAttribute("target"))&&"_self"!==c||t.metaKey||t.ctrlKey||t.shiftKey||t.altKey||t.nativeEvent&&2===t.nativeEvent.which)||t.currentTarget.hasAttribute("download"))return;if(!(0,p.isLocalURL)(r)){a&&(t.preventDefault(),location.replace(r));return}if(t.preventDefault(),s){let e=!1;if(s({preventDefault:()=>{e=!0}}),e)return}let{dispatchNavigateAction:u}=e.r(99781);l.default.startTransition(()=>{u(n||r,a?"replace":"push",i??!0,o.current)})}}(t,U,D,y,k,C,T)},onMouseEnter(e){L||"function"!=typeof P||P(e),L&&o.props&&"function"==typeof o.props.onMouseEnter&&o.props.onMouseEnter(e),M&&A&&(0,m.onNavigationIntent)(e.currentTarget,!0===R)},onTouchStart:function(e){L||"function"!=typeof O||O(e),L&&o.props&&"function"==typeof o.props.onTouchStart&&o.props.onTouchStart(e),M&&A&&(0,m.onNavigationIntent)(e.currentTarget,!0===R)}};return(0,u.isAbsoluteUrl)(D)?z.href=D:L&&!S&&("a"!==o.type||"href"in o.props)||(z.href=(0,f.addBasePath)(D)),a=L?l.default.cloneElement(o,z):(0,i.jsx)("a",{...$,...z,children:n}),(0,i.jsx)(b.Provider,{value:s,children:a})}e.r(84508);let b=(0,l.createContext)(m.IDLE_LINK_STATUS),y=()=>(0,l.useContext)(b);("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},84998,e=>{"use strict";var t=e.i(43476),r=e.i(71645),n=e.i(22016),o=e.i(18566);let a=[{name:"Home",href:"/"},{name:"Features",href:"/features"},{name:"Commands",href:"/commands"},{name:"Live Chat",href:"/live-chat"}];function i(){let e=(0,o.usePathname)(),[i,l]=(0,r.useState)(!1);return(0,r.useEffect)(()=>{l(!1)},[e]),(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)("nav",{className:"pill-nav-container","aria-label":"Main navigation",children:[(0,t.jsxs)("div",{className:"pill-nav",children:[(0,t.jsxs)(n.default,{href:"/",className:"pill-logo","aria-label":"Huginn home",children:[(0,t.jsx)("img",{src:"/logo.jpeg",alt:"Huginn logo",className:"w-7 h-7 rounded-full object-cover border border-white/10"}),(0,t.jsx)("span",{className:"pill-logo-text",style:{color:"#f0f0f8"},children:"Huginn"})]}),(0,t.jsx)("div",{className:"pill-nav-items desktop-only",children:(0,t.jsx)("ul",{className:"pill-list",role:"list",children:a.map(r=>{let o=e===r.href;return(0,t.jsx)("li",{children:(0,t.jsx)(n.default,{href:r.href,className:`pill${o?" is-active":""}`,"aria-current":o?"page":void 0,style:{"--pill-bg":"rgba(255,255,255,0.06)","--pill-text":"#f0f0f8"},children:(0,t.jsx)("span",{className:"pill-label",children:r.name})})},r.name)})})}),(0,t.jsxs)("button",{className:"mobile-menu-button mobile-only",onClick:()=>l(e=>!e),"aria-label":i?"Close menu":"Open menu","aria-expanded":i,children:[(0,t.jsx)("span",{className:"hamburger-line",style:{transform:i?"rotate(45deg) translate(5px,5px)":"none"}}),(0,t.jsx)("span",{className:"hamburger-line",style:{opacity:+!i}}),(0,t.jsx)("span",{className:"hamburger-line",style:{transform:i?"rotate(-45deg) translate(5px,-5px)":"none"}})]})]}),(0,t.jsx)("div",{className:"mobile-menu-popover mobile-only",style:{opacity:+!!i,visibility:i?"visible":"hidden",transform:i?"scale(1)":"scale(0.95)",transition:"opacity 0.2s, transform 0.2s, visibility 0.2s"},children:(0,t.jsx)("ul",{className:"mobile-menu-list",role:"list",children:a.map(r=>{let o=e===r.href;return(0,t.jsx)("li",{children:(0,t.jsx)(n.default,{href:r.href,className:`mobile-menu-link${o?" is-active":""}`,children:r.name})},r.name)})})})]}),(0,t.jsx)("style",{children:`
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
          left: 0;
          right: 0;
          background: rgba(13,13,26,0.92);
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
          padding: 12px 18px;
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
          .mobile-menu-button { display: flex; }
        }
      `})]})}e.s(["Navigation",()=>i])},52975,e=>{"use strict";var t=e.i(43476),r=e.i(22016);function n(){return(0,t.jsx)("footer",{className:"relative border-t border-border",children:(0,t.jsxs)("div",{className:"max-w-7xl mx-auto px-6 lg:px-8",children:[(0,t.jsxs)("div",{className:"py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8",children:[(0,t.jsxs)("div",{children:[(0,t.jsxs)(r.default,{href:"/",className:"flex items-center gap-2 mb-3",children:[(0,t.jsx)("img",{src:"/logo.jpeg",alt:"Huginn logo",className:"w-8 h-8 rounded-full object-cover border border-white/10"}),(0,t.jsx)("span",{className:"font-semibold tracking-tight",children:"Huginn"})]}),(0,t.jsx)("p",{className:"text-sm text-muted-foreground max-w-xs leading-relaxed",children:"Live football alerts and AI commentary, delivered to your WhatsApp or directly in your browser."})]}),(0,t.jsxs)("div",{className:"flex flex-wrap gap-x-8 gap-y-3",children:[(0,t.jsx)(r.default,{href:"/features",className:"text-sm text-muted-foreground hover:text-foreground transition-colors",children:"Features"}),(0,t.jsx)(r.default,{href:"/commands",className:"text-sm text-muted-foreground hover:text-foreground transition-colors",children:"Commands"}),(0,t.jsx)(r.default,{href:"/live-chat",className:"text-sm text-muted-foreground hover:text-foreground transition-colors",children:"Live Chat"}),(0,t.jsx)("a",{href:"https://txline.txodds.com/documentation/worldcup",target:"_blank",rel:"noopener noreferrer",className:"text-sm text-muted-foreground hover:text-foreground transition-colors",children:"TxLINE ↗"})]})]}),(0,t.jsxs)("div",{className:"py-5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3",children:[(0,t.jsx)("p",{className:"text-xs text-muted-foreground",children:"© 2026 Huginn · World Cup 2026 · Built on TxLINE"}),(0,t.jsx)("span",{className:"text-xs text-muted-foreground font-mono",children:"Powered by Llama 3.3 70B · Baileys · Node.js"})]})]})})}e.s(["FooterSection",()=>n])},75671,e=>{"use strict";var t=e.i(43476),r=e.i(71645),n=e.i(84998),o=e.i(52975);let a="huginn_chat_v1",i="huginn_session_v1",l={from:"huginn",text:"Connected to TxLINE.\n\n/follow [team] · live alerts for any match\n/live · what's on right now\n/schedule · upcoming fixtures\n/vibe [mode] · hype, tactical, funny, balanced\n/help · full command list\n\nClick a match on the left to follow it, or type below.",ts:Date.now()},s=["/live","/schedule","/follow Brazil","/vibe hype","/help"];function c(){let[e,c]=(0,r.useState)([]),[d,u]=(0,r.useState)([]),[f,m]=(0,r.useState)(""),[p,x]=(0,r.useState)(null),[h,g]=(0,r.useState)(!1),[b,y]=(0,r.useState)(!1),[v,j]=(0,r.useState)(""),w=(0,r.useRef)(null);(0,r.useEffect)(()=>{let{sessionId:e,messages:t}=function(){try{let e=localStorage.getItem(a),t=localStorage.getItem(i),r=e?JSON.parse(e):[],n=t||"web_"+Math.random().toString(36).slice(2,11);return t||localStorage.setItem(i,n),{sessionId:n,messages:r}}catch{return{sessionId:"web_"+Math.random().toString(36).slice(2,11),messages:[]}}}();j(e),t.length>0?u(t):(u([l]),localStorage.setItem(a,JSON.stringify([l]))),N()},[]),(0,r.useEffect)(()=>{if(0!==d.length)try{let e=d.slice(-100);localStorage.setItem(a,JSON.stringify(e))}catch{}},[d]),(0,r.useEffect)(()=>{w.current?.scrollIntoView({behavior:"smooth"})},[d]),(0,r.useEffect)(()=>{let e=setInterval(N,3e4);return()=>clearInterval(e)},[]);let N=(0,r.useCallback)(async()=>{g(!0);try{let e=await fetch("/api/live"),t=await e.json(),r=(t.live||[]).map(e=>({id:String(e.id),home:e.home_team?.name||"Home",away:e.away_team?.name||"Away",time:e.minute?`${e.minute}'`:"LIVE",status:"LIVE",homeScore:e.home_score??0,awayScore:e.away_score??0})),n=(t.upcoming||[]).map(e=>{let t=new Date(e.kickoff_time).toLocaleTimeString(void 0,{hour:"2-digit",minute:"2-digit"});return{id:String(e.id),home:e.home_team?.name||"Home",away:e.away_team?.name||"Away",time:t,status:"SOON",homeScore:null,awayScore:null}});c([...r,...n])}catch(e){console.error("Failed to load scores:",e)}finally{g(!1)}},[]),S=(0,r.useCallback)(async e=>{let t=e.trim();if(!t||b)return;let r={from:"user",text:t,ts:Date.now()};u(e=>[...e,r]),m(""),y(!0);try{let e=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:v,message:t})}),r=await e.json(),n={from:"huginn",text:r.reply||"Something went wrong. Try again.",ts:Date.now()};u(e=>[...e,n])}catch{let e={from:"huginn",text:"Connection error. Make sure the server is reachable.",ts:Date.now()};u(t=>[...t,e])}finally{y(!1)}},[v,b]),k=(0,r.useCallback)(e=>{x(e),S(`/follow ${e.home}`)},[S]);return(0,t.jsxs)("main",{className:"relative min-h-screen overflow-x-hidden",children:[(0,t.jsx)(n.Navigation,{}),(0,t.jsx)("section",{className:"py-28 lg:py-32",children:(0,t.jsxs)("div",{className:"max-w-7xl mx-auto px-4 lg:px-8",children:[(0,t.jsxs)("div",{className:"flex items-end justify-between mb-10",children:[(0,t.jsxs)("div",{children:[(0,t.jsx)("h1",{className:"text-3xl lg:text-5xl font-semibold tracking-tight mb-3",children:"Live Chat"}),(0,t.jsx)("p",{className:"text-base text-muted-foreground leading-relaxed max-w-xl",children:"Chat with Huginn directly. Click a fixture to follow it — alerts fire automatically into this window."})]}),(0,t.jsx)("button",{onClick:()=>{localStorage.removeItem(a),u([l])},className:"text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-3 py-1.5 shrink-0",children:"Clear history"})]}),(0,t.jsxs)("div",{className:"grid lg:grid-cols-[260px_1fr] gap-5 items-start",children:[(0,t.jsxs)("div",{className:"bg-card border border-border rounded-2xl overflow-hidden",children:[(0,t.jsxs)("div",{className:"px-5 py-3.5 border-b border-border flex items-center justify-between",children:[(0,t.jsx)("span",{className:"text-sm font-semibold",children:"Fixtures"}),(0,t.jsxs)("button",{onClick:N,disabled:h,className:"text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 disabled:opacity-40",children:[(0,t.jsx)("span",{className:`text-sm leading-none ${h?"animate-spin inline-block":""}`,children:"↻"}),h?"Loading…":"Refresh"]})]}),0===e.length&&!h&&(0,t.jsx)("div",{className:"px-5 py-8 text-center text-xs text-muted-foreground",children:"No matches right now"}),(0,t.jsx)("div",{className:"divide-y divide-border",children:e.map(e=>(0,t.jsxs)("button",{onClick:()=>k(e),className:`w-full text-left px-5 py-4 hover:bg-secondary/50 transition-colors ${p?.id===e.id?"bg-primary/5 border-l-2 border-l-primary":""}`,children:[(0,t.jsx)("div",{className:"flex items-center justify-between mb-1.5",children:(0,t.jsx)("span",{className:`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm ${"LIVE"===e.status?"text-emerald-400 bg-emerald-400/10":"text-muted-foreground bg-secondary"}`,children:"LIVE"===e.status?"● LIVE":e.time})}),(0,t.jsxs)("div",{className:"flex items-center justify-between text-sm gap-2",children:[(0,t.jsx)("span",{className:"font-medium truncate",children:e.home}),null!==e.homeScore?(0,t.jsxs)("span",{className:"font-mono font-bold text-sm shrink-0",children:[e.homeScore,"–",e.awayScore]}):(0,t.jsx)("span",{className:"text-muted-foreground text-xs shrink-0",children:"vs"}),(0,t.jsx)("span",{className:"font-medium truncate text-right",children:e.away})]})]},e.id))})]}),(0,t.jsxs)("div",{className:"bg-card border border-border rounded-2xl overflow-hidden flex flex-col",style:{minHeight:560},children:[(0,t.jsxs)("div",{className:"px-5 py-4 border-b border-border flex items-center gap-3",children:[(0,t.jsx)("img",{src:"/logo.jpeg",alt:"Huginn",className:"w-9 h-9 rounded-full object-cover border border-border"}),(0,t.jsxs)("div",{children:[(0,t.jsx)("div",{className:"text-sm font-semibold",children:"Huginn"}),(0,t.jsx)("div",{className:"text-xs text-muted-foreground",children:"Live match intelligence · World Cup 2026"})]}),(0,t.jsxs)("div",{className:"ml-auto flex items-center gap-1.5 text-xs text-emerald-400 font-mono",children:[(0,t.jsx)("span",{className:"w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"}),"TxLINE"]})]}),(0,t.jsxs)("div",{className:"flex-1 p-5 space-y-3 overflow-y-auto",style:{maxHeight:400},children:[d.map((e,r)=>(0,t.jsxs)("div",{className:`flex flex-col ${"user"===e.from?"items-end":"items-start"}`,children:[(0,t.jsx)("div",{className:`max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${"huginn"===e.from?"bg-secondary border border-border text-foreground rounded-tl-sm":"bg-primary text-primary-foreground rounded-tr-sm"}`,children:e.text}),e.ts&&(0,t.jsx)("span",{className:"text-[10px] text-muted-foreground mt-1 px-1",children:new Date(e.ts).toLocaleTimeString(void 0,{hour:"2-digit",minute:"2-digit"})})]},r)),b&&(0,t.jsx)("div",{className:"flex items-start",children:(0,t.jsx)("div",{className:"bg-secondary border border-border px-4 py-3 rounded-2xl rounded-tl-sm",children:(0,t.jsxs)("span",{className:"flex gap-1",children:[(0,t.jsx)("span",{className:"w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]"}),(0,t.jsx)("span",{className:"w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]"}),(0,t.jsx)("span",{className:"w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]"})]})})}),(0,t.jsx)("div",{ref:w})]}),(0,t.jsx)("div",{className:"px-5 py-3 border-t border-border bg-secondary/20 flex gap-2 flex-wrap",children:s.map(e=>(0,t.jsx)("button",{onClick:()=>S(e),disabled:b,className:"text-xs font-mono text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full hover:bg-primary/20 transition-colors disabled:opacity-40",children:e},e))}),(0,t.jsxs)("div",{className:"px-4 py-3 border-t border-border flex gap-3 items-center",children:[(0,t.jsx)("input",{type:"text",value:f,onChange:e=>m(e.target.value),onKeyDown:e=>"Enter"===e.key&&!b&&S(f),placeholder:"Type a command or ask anything…",disabled:b,className:"flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"}),(0,t.jsx)("button",{onClick:()=>S(f),disabled:b||!f.trim(),className:"w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity disabled:opacity-30","aria-label":"Send",children:(0,t.jsx)("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"currentColor",className:"text-primary-foreground",children:(0,t.jsx)("path",{d:"M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"})})})]})]})]})]})}),(0,t.jsx)(o.FooterSection,{})]})}e.s(["default",()=>c])}]);