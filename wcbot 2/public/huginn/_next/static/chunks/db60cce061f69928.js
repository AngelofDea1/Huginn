(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,33525,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"warnOnce",{enumerable:!0,get:function(){return n}});let n=e=>{}},98183,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var n={assign:function(){return s},searchParamsToUrlQuery:function(){return i},urlQueryToSearchParams:function(){return l}};for(var a in n)Object.defineProperty(r,a,{enumerable:!0,get:n[a]});function i(e){let t={};for(let[r,n]of e.entries()){let e=t[r];void 0===e?t[r]=n:Array.isArray(e)?e.push(n):t[r]=[e,n]}return t}function o(e){return"string"==typeof e?e:("number"!=typeof e||isNaN(e))&&"boolean"!=typeof e?"":String(e)}function l(e){let t=new URLSearchParams;for(let[r,n]of Object.entries(e))if(Array.isArray(n))for(let e of n)t.append(r,o(e));else t.set(r,o(n));return t}function s(e,...t){for(let r of t){for(let t of r.keys())e.delete(t);for(let[t,n]of r.entries())e.append(t,n)}return e}},95057,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var n={formatUrl:function(){return l},formatWithValidation:function(){return c},urlObjectKeys:function(){return s}};for(var a in n)Object.defineProperty(r,a,{enumerable:!0,get:n[a]});let i=e.r(90809)._(e.r(98183)),o=/https?|ftp|gopher|file/;function l(e){let{auth:t,hostname:r}=e,n=e.protocol||"",a=e.pathname||"",l=e.hash||"",s=e.query||"",c=!1;t=t?encodeURIComponent(t).replace(/%3A/i,":")+"@":"",e.host?c=t+e.host:r&&(c=t+(~r.indexOf(":")?`[${r}]`:r),e.port&&(c+=":"+e.port)),s&&"object"==typeof s&&(s=String(i.urlQueryToSearchParams(s)));let u=e.search||s&&`?${s}`||"";return n&&!n.endsWith(":")&&(n+=":"),e.slashes||(!n||o.test(n))&&!1!==c?(c="//"+(c||""),a&&"/"!==a[0]&&(a="/"+a)):c||(c=""),l&&"#"!==l[0]&&(l="#"+l),u&&"?"!==u[0]&&(u="?"+u),a=a.replace(/[?#]/g,encodeURIComponent),u=u.replace("#","%23"),`${n}${c}${a}${u}${l}`}let s=["auth","hash","host","hostname","href","path","pathname","port","protocol","query","search","slashes"];function c(e){return l(e)}},18581,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"useMergedRef",{enumerable:!0,get:function(){return a}});let n=e.r(71645);function a(e,t){let r=(0,n.useRef)(null),a=(0,n.useRef)(null);return(0,n.useCallback)(n=>{if(null===n){let e=r.current;e&&(r.current=null,e());let t=a.current;t&&(a.current=null,t())}else e&&(r.current=i(e,n)),t&&(a.current=i(t,n))},[e,t])}function i(e,t){if("function"!=typeof e)return e.current=t,()=>{e.current=null};{let r=e(t);return"function"==typeof r?r:()=>e(null)}}("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},18967,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var n={DecodeError:function(){return g},MiddlewareNotFoundError:function(){return j},MissingStaticPage:function(){return v},NormalizeError:function(){return b},PageNotFoundError:function(){return y},SP:function(){return h},ST:function(){return x},WEB_VITALS:function(){return i},execOnce:function(){return o},getDisplayName:function(){return d},getLocationOrigin:function(){return c},getURL:function(){return u},isAbsoluteUrl:function(){return s},isResSent:function(){return f},loadGetInitialProps:function(){return m},normalizeRepeatedSlashes:function(){return p},stringifyError:function(){return w}};for(var a in n)Object.defineProperty(r,a,{enumerable:!0,get:n[a]});let i=["CLS","FCP","FID","INP","LCP","TTFB"];function o(e){let t,r=!1;return(...n)=>(r||(r=!0,t=e(...n)),t)}let l=/^[a-zA-Z][a-zA-Z\d+\-.]*?:/,s=e=>l.test(e);function c(){let{protocol:e,hostname:t,port:r}=window.location;return`${e}//${t}${r?":"+r:""}`}function u(){let{href:e}=window.location,t=c();return e.substring(t.length)}function d(e){return"string"==typeof e?e:e.displayName||e.name||"Unknown"}function f(e){return e.finished||e.headersSent}function p(e){let t=e.split("?");return t[0].replace(/\\/g,"/").replace(/\/\/+/g,"/")+(t[1]?`?${t.slice(1).join("?")}`:"")}async function m(e,t){let r=t.res||t.ctx&&t.ctx.res;if(!e.getInitialProps)return t.ctx&&t.Component?{pageProps:await m(t.Component,t.ctx)}:{};let n=await e.getInitialProps(t);if(r&&f(r))return n;if(!n)throw Object.defineProperty(Error(`"${d(e)}.getInitialProps()" should resolve to an object. But found "${n}" instead.`),"__NEXT_ERROR_CODE",{value:"E394",enumerable:!1,configurable:!0});return n}let h="undefined"!=typeof performance,x=h&&["mark","measure","getEntriesByName"].every(e=>"function"==typeof performance[e]);class g extends Error{}class b extends Error{}class y extends Error{constructor(e){super(),this.code="ENOENT",this.name="PageNotFoundError",this.message=`Cannot find module for page: ${e}`}}class v extends Error{constructor(e,t){super(),this.message=`Failed to load static file for page: ${e} ${t}`}}class j extends Error{constructor(){super(),this.code="ENOENT",this.message="Cannot find the middleware module"}}function w(e){return JSON.stringify({message:e.message,stack:e.stack})}},73668,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"isLocalURL",{enumerable:!0,get:function(){return i}});let n=e.r(18967),a=e.r(52817);function i(e){if(!(0,n.isAbsoluteUrl)(e))return!0;try{let t=(0,n.getLocationOrigin)(),r=new URL(e,t);return r.origin===t&&(0,a.hasBasePath)(r.pathname)}catch(e){return!1}}},84508,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"errorOnce",{enumerable:!0,get:function(){return n}});let n=e=>{}},22016,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var n={default:function(){return g},useLinkStatus:function(){return y}};for(var a in n)Object.defineProperty(r,a,{enumerable:!0,get:n[a]});let i=e.r(90809),o=e.r(43476),l=i._(e.r(71645)),s=e.r(95057),c=e.r(8372),u=e.r(18581),d=e.r(18967),f=e.r(5550);e.r(33525);let p=e.r(91949),m=e.r(73668),h=e.r(9396);function x(e){return"string"==typeof e?e:(0,s.formatUrl)(e)}function g(t){var r;let n,a,i,[s,g]=(0,l.useOptimistic)(p.IDLE_LINK_STATUS),y=(0,l.useRef)(null),{href:v,as:j,children:w,prefetch:N=null,passHref:k,replace:_,shallow:C,scroll:P,onClick:E,onMouseEnter:O,onTouchStart:S,legacyBehavior:A=!1,onNavigate:R,ref:T,unstable_dynamicOnHover:$,...L}=t;n=w,A&&("string"==typeof n||"number"==typeof n)&&(n=(0,o.jsx)("a",{children:n}));let M=l.default.useContext(c.AppRouterContext),z=!1!==N,I=!1!==N?null===(r=N)||"auto"===r?h.FetchStrategy.PPR:h.FetchStrategy.Full:h.FetchStrategy.PPR,{href:B,as:F}=l.default.useMemo(()=>{let e=x(v);return{href:e,as:j?x(j):e}},[v,j]);if(A){if(n?.$$typeof===Symbol.for("react.lazy"))throw Object.defineProperty(Error("`<Link legacyBehavior>` received a direct child that is either a Server Component, or JSX that was loaded with React.lazy(). This is not supported. Either remove legacyBehavior, or make the direct child a Client Component that renders the Link's `<a>` tag."),"__NEXT_ERROR_CODE",{value:"E863",enumerable:!1,configurable:!0});a=l.default.Children.only(n)}let U=A?a&&"object"==typeof a&&a.ref:T,W=l.default.useCallback(e=>(null!==M&&(y.current=(0,p.mountLinkInstance)(e,B,M,I,z,g)),()=>{y.current&&((0,p.unmountLinkForCurrentNavigation)(y.current),y.current=null),(0,p.unmountPrefetchableInstance)(e)}),[z,B,M,I,g]),H={ref:(0,u.useMergedRef)(W,U),onClick(t){A||"function"!=typeof E||E(t),A&&a.props&&"function"==typeof a.props.onClick&&a.props.onClick(t),!M||t.defaultPrevented||function(t,r,n,a,i,o,s){if("undefined"!=typeof window){let c,{nodeName:u}=t.currentTarget;if("A"===u.toUpperCase()&&((c=t.currentTarget.getAttribute("target"))&&"_self"!==c||t.metaKey||t.ctrlKey||t.shiftKey||t.altKey||t.nativeEvent&&2===t.nativeEvent.which)||t.currentTarget.hasAttribute("download"))return;if(!(0,m.isLocalURL)(r)){i&&(t.preventDefault(),location.replace(r));return}if(t.preventDefault(),s){let e=!1;if(s({preventDefault:()=>{e=!0}}),e)return}let{dispatchNavigateAction:d}=e.r(99781);l.default.startTransition(()=>{d(n||r,i?"replace":"push",o??!0,a.current)})}}(t,B,F,y,_,P,R)},onMouseEnter(e){A||"function"!=typeof O||O(e),A&&a.props&&"function"==typeof a.props.onMouseEnter&&a.props.onMouseEnter(e),M&&z&&(0,p.onNavigationIntent)(e.currentTarget,!0===$)},onTouchStart:function(e){A||"function"!=typeof S||S(e),A&&a.props&&"function"==typeof a.props.onTouchStart&&a.props.onTouchStart(e),M&&z&&(0,p.onNavigationIntent)(e.currentTarget,!0===$)}};return(0,d.isAbsoluteUrl)(F)?H.href=F:A&&!k&&("a"!==a.type||"href"in a.props)||(H.href=(0,f.addBasePath)(F)),i=A?l.default.cloneElement(a,H):(0,o.jsx)("a",{...L,...H,children:n}),(0,o.jsx)(b.Provider,{value:s,children:i})}e.r(84508);let b=(0,l.createContext)(p.IDLE_LINK_STATUS),y=()=>(0,l.useContext)(b);("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},84998,e=>{"use strict";var t=e.i(43476),r=e.i(71645),n=e.i(22016),a=e.i(18566);let i=[{name:"Home",href:"/"},{name:"Features",href:"/features"},{name:"Commands",href:"/commands"},{name:"Live Chat",href:"/live-chat"}];function o(){let e=(0,a.usePathname)(),[o,l]=(0,r.useState)(!1);return(0,r.useEffect)(()=>{l(!1)},[e]),(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)("nav",{className:"pill-nav-container","aria-label":"Main navigation",children:[(0,t.jsxs)("div",{className:"pill-nav",children:[(0,t.jsxs)(n.default,{href:"/",className:"pill-logo","aria-label":"Huginn home",children:[(0,t.jsx)("img",{src:"/logo.jpeg",alt:"Huginn logo",className:"w-7 h-7 rounded-full object-cover border border-white/10"}),(0,t.jsx)("span",{className:"pill-logo-text",style:{color:"#f0f0f8"},children:"Huginn"})]}),(0,t.jsx)("div",{className:"pill-nav-items desktop-only",children:(0,t.jsx)("ul",{className:"pill-list",role:"list",children:i.map(r=>{let a=e===r.href;return(0,t.jsx)("li",{children:(0,t.jsx)(n.default,{href:r.href,className:`pill${a?" is-active":""}`,"aria-current":a?"page":void 0,style:{"--pill-bg":"rgba(255,255,255,0.06)","--pill-text":"#f0f0f8"},children:(0,t.jsx)("span",{className:"pill-label",children:r.name})})},r.name)})})}),(0,t.jsxs)("button",{className:"mobile-menu-button mobile-only",onClick:()=>l(e=>!e),"aria-label":o?"Close menu":"Open menu","aria-expanded":o,children:[(0,t.jsx)("span",{className:"hamburger-line",style:{transform:o?"rotate(45deg) translate(5px,5px)":"none"}}),(0,t.jsx)("span",{className:"hamburger-line",style:{opacity:+!o}}),(0,t.jsx)("span",{className:"hamburger-line",style:{transform:o?"rotate(-45deg) translate(5px,-5px)":"none"}})]})]}),(0,t.jsx)("div",{className:"mobile-menu-popover mobile-only",style:{opacity:+!!o,visibility:o?"visible":"hidden",transform:o?"scale(1)":"scale(0.95)",transition:"opacity 0.2s, transform 0.2s, visibility 0.2s"},children:(0,t.jsx)("ul",{className:"mobile-menu-list",role:"list",children:i.map(r=>{let a=e===r.href;return(0,t.jsx)("li",{children:(0,t.jsx)(n.default,{href:r.href,className:`mobile-menu-link${a?" is-active":""}`,children:r.name})},r.name)})})})]}),(0,t.jsx)("style",{children:`
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
      `})]})}e.s(["Navigation",()=>o])},52975,e=>{"use strict";var t=e.i(43476),r=e.i(22016);function n(){return(0,t.jsx)("footer",{className:"relative border-t border-border",children:(0,t.jsxs)("div",{className:"max-w-7xl mx-auto px-6 lg:px-8",children:[(0,t.jsxs)("div",{className:"py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8",children:[(0,t.jsxs)("div",{children:[(0,t.jsxs)(r.default,{href:"/",className:"flex items-center gap-2 mb-3",children:[(0,t.jsx)("img",{src:"/logo.jpeg",alt:"Huginn logo",className:"w-8 h-8 rounded-full object-cover border border-white/10"}),(0,t.jsx)("span",{className:"font-semibold tracking-tight",children:"Huginn"})]}),(0,t.jsx)("p",{className:"text-sm text-muted-foreground max-w-xs leading-relaxed",children:"Live football alerts and AI commentary, delivered to your WhatsApp or directly in your browser."})]}),(0,t.jsxs)("div",{className:"flex flex-wrap gap-x-8 gap-y-3",children:[(0,t.jsx)(r.default,{href:"/features",className:"text-sm text-muted-foreground hover:text-foreground transition-colors",children:"Features"}),(0,t.jsx)(r.default,{href:"/commands",className:"text-sm text-muted-foreground hover:text-foreground transition-colors",children:"Commands"}),(0,t.jsx)(r.default,{href:"/live-chat",className:"text-sm text-muted-foreground hover:text-foreground transition-colors",children:"Live Chat"}),(0,t.jsx)("a",{href:"https://txline.txodds.com/documentation/worldcup",target:"_blank",rel:"noopener noreferrer",className:"text-sm text-muted-foreground hover:text-foreground transition-colors",children:"TxLINE ↗"})]})]}),(0,t.jsxs)("div",{className:"py-5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3",children:[(0,t.jsx)("p",{className:"text-xs text-muted-foreground",children:"© 2026 Huginn · World Cup 2026 · Built on TxLINE"}),(0,t.jsx)("span",{className:"text-xs text-muted-foreground font-mono",children:"Powered by Llama 3.3 70B · Baileys · Node.js"})]})]})})}e.s(["FooterSection",()=>n])},67881,72520,e=>{"use strict";let t,r,n;var a,i,o=e.i(43476),l=e.i(91918),s=e.i(7670);let c=e=>"boolean"==typeof e?`${e}`:0===e?"0":e,u=s.clsx;var d=e.i(47163);let f=(t="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",r={variants:{variant:{default:"bg-primary text-primary-foreground hover:bg-primary/90",destructive:"bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",outline:"border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",secondary:"bg-secondary text-secondary-foreground hover:bg-secondary/80",ghost:"hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",link:"text-primary underline-offset-4 hover:underline"},size:{default:"h-9 px-4 py-2 has-[>svg]:px-3",sm:"h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",lg:"h-10 rounded-md px-6 has-[>svg]:px-4",icon:"size-9","icon-sm":"size-8","icon-lg":"size-10"}},defaultVariants:{variant:"default",size:"default"}},e=>{var n;if((null==r?void 0:r.variants)==null)return u(t,null==e?void 0:e.class,null==e?void 0:e.className);let{variants:a,defaultVariants:i}=r,o=Object.keys(a).map(t=>{let r=null==e?void 0:e[t],n=null==i?void 0:i[t];if(null===r)return null;let o=c(r)||c(n);return a[t][o]}),l=e&&Object.entries(e).reduce((e,t)=>{let[r,n]=t;return void 0===n||(e[r]=n),e},{});return u(t,o,null==r||null==(n=r.compoundVariants)?void 0:n.reduce((e,t)=>{let{class:r,className:n,...a}=t;return Object.entries(a).every(e=>{let[t,r]=e;return Array.isArray(r)?r.includes({...i,...l}[t]):({...i,...l})[t]===r})?[...e,r,n]:e},[]),null==e?void 0:e.class,null==e?void 0:e.className)});function p({className:e,variant:t,size:r,asChild:n=!1,...a}){let i=n?l.Slot:"button";return(0,o.jsx)(i,{"data-slot":"button",className:(0,d.cn)(f({variant:t,size:r,className:e})),...a})}e.s(["Button",()=>p],67881);var m=e.i(71645);let h=(...e)=>e.filter((e,t,r)=>!!e&&""!==e.trim()&&r.indexOf(e)===t).join(" ").trim();var x={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};let g=(0,m.forwardRef)(({color:e="currentColor",size:t=24,strokeWidth:r=2,absoluteStrokeWidth:n,className:a="",children:i,iconNode:o,...l},s)=>(0,m.createElement)("svg",{ref:s,...x,width:t,height:t,stroke:e,strokeWidth:n?24*Number(r)/Number(t):r,className:h("lucide",a),...l},[...o.map(([e,t])=>(0,m.createElement)(e,t)),...Array.isArray(i)?i:[i]])),b=(a="ArrowRight",i=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]],(n=(0,m.forwardRef)(({className:e,...t},r)=>(0,m.createElement)(g,{ref:r,iconNode:i,className:h(`lucide-${a.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase()}`,e),...t}))).displayName=`${a}`,n);e.s(["ArrowRight",()=>b],72520)},46331,e=>{"use strict";var t=e.i(43476),r=e.i(71645),n=e.i(67881),a=e.i(72520);function i({className:e=""}){let n=(0,r.useRef)(null);return(0,r.useEffect)(()=>{let e,t=n.current;if(!t)return;let r=t.getContext("2d");if(!r)return;let a=0,i="█▓▒░ ",o=()=>{r.clearRect(0,0,t.width,t.height),r.font="12px JetBrains Mono, monospace";for(let e=0;e<40;e++)for(let t=0;t<120;t++){let n=((Math.sin(.08*t+a)*Math.cos(.12*e+.5*a)+Math.sin(.05*t-.7*a)*Math.sin(.08*e+.3*a)+Math.cos(.03*t+.03*e+.4*a))/3+1)/2,o=Math.floor(n*(i.length-1)),l=i[o];if(" "!==l){let a=170+30*n,i=.5+.3*n;r.fillStyle=`oklch(${i} 0.15 ${a} / ${.3+.7*n})`,r.fillText(l,8*t,12*e+12)}}a+=.03,e=requestAnimationFrame(o)};return t.width=960,t.height=480,o(),()=>cancelAnimationFrame(e)},[]),(0,t.jsx)("canvas",{ref:n,className:`${e}`,style:{imageRendering:"pixelated"}})}function o(){let[e,o]=(0,r.useState)(!1);return(0,r.useEffect)(()=>{o(!0)},[]),(0,t.jsxs)("section",{className:"relative min-h-screen flex flex-col justify-center overflow-hidden pt-20",children:[(0,t.jsx)("div",{className:"absolute inset-0 grid-pattern opacity-50"}),(0,t.jsx)("div",{className:"absolute inset-0 opacity-30 pointer-events-none overflow-hidden",children:(0,t.jsx)(i,{className:"w-full h-full"})}),(0,t.jsxs)("div",{className:"relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-12 lg:py-24",children:[(0,t.jsxs)("div",{className:"text-center max-w-5xl mx-auto mb-10",children:[(0,t.jsxs)("h1",{className:`text-5xl md:text-7xl font-semibold tracking-tight leading-[0.95] mb-8 transition-all duration-700 delay-100 lg:text-7xl ${e?"opacity-100 translate-y-0":"opacity-0 translate-y-4"}`,style:{fontFamily:"var(--font-geist-pixel-line), monospace"},children:[(0,t.jsx)("span",{className:"text-balance",children:"Your World Cup."}),(0,t.jsx)("br",{}),(0,t.jsx)("span",{className:"text-balance",children:"Inside"})," ",(0,t.jsx)("span",{className:"text-primary",children:"WhatsApp."})]}),(0,t.jsx)("p",{className:`text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed transition-all duration-700 delay-200 ${e?"opacity-100 translate-y-0":"opacity-0 translate-y-4"}`,children:"Goals, red cards, and odds shifts pushed to your WhatsApp. Chat directly with Huginn or invite it to any group."})]}),(0,t.jsxs)("div",{className:`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-700 delay-300 ${e?"opacity-100 translate-y-0":"opacity-0 translate-y-4"}`,children:[(0,t.jsx)(n.Button,{size:"lg",variant:"outline",className:"h-11 px-6 text-sm font-semibold border border-white/10 hover:border-white/20 bg-white/[0.03] backdrop-blur-md text-foreground transition-all duration-300 hover:bg-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-xl",asChild:!0,children:(0,t.jsx)("a",{href:"/live-chat",children:"Live Chat"})}),(0,t.jsx)(n.Button,{size:"lg",className:"bg-primary hover:bg-primary/95 text-primary-foreground px-6 h-11 text-sm font-bold group rounded-xl border border-primary/20 shadow-[0_4px_0_#00a852] active:translate-y-[3px] active:shadow-[0_1px_0_#00a852] transition-all",asChild:!0,children:(0,t.jsxs)("a",{href:"/api/join",children:["Add to WhatsApp",(0,t.jsx)(a.ArrowRight,{className:"w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5"})]})})]})]})]})}e.s(["HeroSection",()=>o],46331)},12338,e=>{"use strict";var t=e.i(43476),r=e.i(71645),n=e.i(67881),a=e.i(72520);function i(){let[e,i]=(0,r.useState)(!1),o=(0,r.useRef)(null);return(0,r.useEffect)(()=>{let e=new IntersectionObserver(([e])=>{e.isIntersecting&&i(!0)},{threshold:.2});return o.current&&e.observe(o.current),()=>e.disconnect()},[]),(0,t.jsx)("section",{ref:o,className:"relative py-16 overflow-hidden",children:(0,t.jsx)("div",{className:"max-w-4xl mx-auto px-6",children:(0,t.jsxs)("div",{className:`relative rounded-2xl border border-border bg-card p-10 md:p-14 text-center transition-all duration-1000 ${e?"opacity-100 translate-y-0":"opacity-0 translate-y-8"}`,children:[(0,t.jsx)("div",{className:"absolute inset-0 grid-pattern opacity-[0.03] pointer-events-none"}),(0,t.jsxs)("div",{className:"relative z-10 flex flex-col items-center",children:[(0,t.jsx)("h2",{className:"text-3xl md:text-4xl font-semibold tracking-tight mb-4 text-balance",children:"The raven is ready."}),(0,t.jsx)("p",{className:"text-base text-muted-foreground mb-8 leading-relaxed max-w-lg mx-auto",children:"Chat directly with Huginn or invite it to any WhatsApp group. Simply send a message to get started."}),(0,t.jsxs)("div",{className:"flex flex-col sm:flex-row items-center justify-center gap-4",children:[(0,t.jsx)(n.Button,{size:"lg",variant:"outline",className:"h-11 px-6 text-sm font-semibold border border-white/10 hover:border-white/20 bg-white/[0.03] backdrop-blur-md text-foreground transition-all duration-300 hover:bg-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-xl",asChild:!0,children:(0,t.jsx)("a",{href:"/live-chat",children:"Live Chat"})}),(0,t.jsx)(n.Button,{size:"lg",className:"bg-primary hover:bg-primary/95 text-primary-foreground px-6 h-11 text-sm font-bold group rounded-xl border border-primary/20 shadow-[0_4px_0_#00a852] active:translate-y-[3px] active:shadow-[0_1px_0_#00a852] transition-all",asChild:!0,children:(0,t.jsxs)("a",{href:"/api/join",children:["Add Huginn Now",(0,t.jsx)(a.ArrowRight,{className:"w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5"})]})})]})]})]})})})}e.s(["CtaSection",()=>i])}]);