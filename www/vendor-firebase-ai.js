(()=>{var gt=()=>{};var Et=function(t){let e=[],n=0;for(let s=0;s<t.length;s++){let i=t.charCodeAt(s);i<128?e[n++]=i:i<2048?(e[n++]=i>>6|192,e[n++]=i&63|128):(i&64512)===55296&&s+1<t.length&&(t.charCodeAt(s+1)&64512)===56320?(i=65536+((i&1023)<<10)+(t.charCodeAt(++s)&1023),e[n++]=i>>18|240,e[n++]=i>>12&63|128,e[n++]=i>>6&63|128,e[n++]=i&63|128):(e[n++]=i>>12|224,e[n++]=i>>6&63|128,e[n++]=i&63|128)}return e},Sn=function(t){let e=[],n=0,s=0;for(;n<t.length;){let i=t[n++];if(i<128)e[s++]=String.fromCharCode(i);else if(i>191&&i<224){let r=t[n++];e[s++]=String.fromCharCode((i&31)<<6|r&63)}else if(i>239&&i<365){let r=t[n++],o=t[n++],a=t[n++],c=((i&7)<<18|(r&63)<<12|(o&63)<<6|a&63)-65536;e[s++]=String.fromCharCode(55296+(c>>10)),e[s++]=String.fromCharCode(56320+(c&1023))}else{let r=t[n++],o=t[n++];e[s++]=String.fromCharCode((i&15)<<12|(r&63)<<6|o&63)}}return e.join("")},Z={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(t,e){if(!Array.isArray(t))throw Error("encodeByteArray takes an array as a parameter");this.init_();let n=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,s=[];for(let i=0;i<t.length;i+=3){let r=t[i],o=i+1<t.length,a=o?t[i+1]:0,c=i+2<t.length,l=c?t[i+2]:0,h=r>>2,f=(r&3)<<4|a>>4,p=(a&15)<<2|l>>6,b=l&63;c||(b=64,o||(p=64)),s.push(n[h],n[f],n[p],n[b])}return s.join("")},encodeString(t,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(t):this.encodeByteArray(Et(t),e)},decodeString(t,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(t):Sn(this.decodeStringToByteArray(t,e))},decodeStringToByteArray(t,e){this.init_();let n=e?this.charToByteMapWebSafe_:this.charToByteMap_,s=[];for(let i=0;i<t.length;){let r=n[t.charAt(i++)],a=i<t.length?n[t.charAt(i)]:0;++i;let l=i<t.length?n[t.charAt(i)]:64;++i;let f=i<t.length?n[t.charAt(i)]:64;if(++i,r==null||a==null||l==null||f==null)throw new Ee;let p=r<<2|a>>4;if(s.push(p),l!==64){let b=a<<4&240|l>>2;if(s.push(b),f!==64){let m=l<<6&192|f;s.push(m)}}}return s},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let t=0;t<this.ENCODED_VALS.length;t++)this.byteToCharMap_[t]=this.ENCODED_VALS.charAt(t),this.charToByteMap_[this.byteToCharMap_[t]]=t,this.byteToCharMapWebSafe_[t]=this.ENCODED_VALS_WEBSAFE.charAt(t),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[t]]=t,t>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(t)]=t,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(t)]=t)}}},Ee=class extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}},An=function(t){let e=Et(t);return Z.encodeByteArray(e,!0)},_e=function(t){return An(t).replace(/\./g,"")},_t=function(t){try{return Z.decodeString(t,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};function M(t){return bt(void 0,t)}function bt(t,e){if(!(e instanceof Object))return e;switch(e.constructor){case Date:let n=e;return new Date(n.getTime());case Object:t===void 0&&(t={});break;case Array:t=[];break;default:return e}for(let n in e)!e.hasOwnProperty(n)||!Tn(n)||(t[n]=bt(t[n],e[n]));return t}function Tn(t){return t!=="__proto__"}function K(){if(typeof self!="undefined")return self;if(typeof window!="undefined")return window;if(typeof global!="undefined")return global;throw new Error("Unable to locate global object.")}var Cn=()=>K().__FIREBASE_DEFAULTS__,On=()=>{if(typeof process=="undefined"||typeof process.env=="undefined")return;let t=process.env.__FIREBASE_DEFAULTS__;if(t)return JSON.parse(t)},Rn=()=>{if(typeof document=="undefined")return;let t;try{t=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}let e=t&&_t(t[1]);return e&&JSON.parse(e)},In=()=>{try{return gt()||Cn()||On()||Rn()}catch(t){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${t}`);return}};var be=()=>{var t;return(t=In())==null?void 0:t.config};var O=class{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,n)=>{this.resolve=e,this.reject=n})}wrapCallback(e){return(n,s)=>{n?this.reject(n):this.resolve(s),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(n):e(n,s))}}};function Y(){try{return typeof indexedDB=="object"}catch{return!1}}function yt(){return new Promise((t,e)=>{try{let n=!0,s="validate-browser-context-for-indexeddb-analytics-module",i=self.indexedDB.open(s);i.onsuccess=()=>{i.result.close(),n||self.indexedDB.deleteDatabase(s),t(!0)},i.onupgradeneeded=()=>{n=!1},i.onerror=()=>{var r;e(((r=i.error)==null?void 0:r.message)||"")}}catch(n){e(n)}})}var Dn="FirebaseError",v=class t extends Error{constructor(e,n,s){super(n),this.code=e,this.customData=s,this.name=Dn,Object.setPrototypeOf(this,t.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,B.prototype.create)}},B=class{constructor(e,n,s){this.service=e,this.serviceName=n,this.errors=s}create(e,...n){let s=n[0]||{},i=`${this.service}/${e}`,r=this.errors[e],o=r?vn(r,s):"Error",a=`${this.serviceName}: ${o} (${i}).`;return new v(i,a,s)}};function vn(t,e){try{let n=0,s="";for(;n<t.length;){let i=t.indexOf("{$",n);if(i===-1){s+=t.substring(n);break}let r=t.indexOf("}",i+2);if(r===-1){s+=t.substring(n);break}let o=t.substring(i+2,r),a=e[o];s+=t.substring(n,i)+(a!=null?String(a):`<${o}?>`),n=r+1}return s}catch{return t}}function ee(t,e){if(t===e)return!0;let n=Object.keys(t),s=Object.keys(e);for(let i of n){if(!s.includes(i))return!1;let r=t[i],o=e[i];if(mt(r)&&mt(o)){if(!ee(r,o))return!1}else if(r!==o)return!1}for(let i of s)if(!n.includes(i))return!1;return!0}function mt(t){return t!==null&&typeof t=="object"}var kn=1e3,Nn=2,Ln=14400*1e3,Pn=.5;function wt(t,e=kn,n=Nn){let s=e*Math.pow(n,t),i=Math.round(Pn*s*(Math.random()-.5)*2);return Math.min(Ln,s+i)}function te(t){return t&&t._delegate?t._delegate:t}var A=class{constructor(e,n,s){this.name=e,this.instanceFactory=n,this.type=s,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}};var H="[DEFAULT]";var ye=class{constructor(e,n){this.name=e,this.container=n,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){let n=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(n)){let s=new O;if(this.instancesDeferred.set(n,s),this.isInitialized(n)||this.shouldAutoInitialize())try{let i=this.getOrInitializeService({instanceIdentifier:n});i&&s.resolve(i)}catch{}}return this.instancesDeferred.get(n).promise}getImmediate(e){var i;let n=this.normalizeInstanceIdentifier(e==null?void 0:e.identifier),s=(i=e==null?void 0:e.optional)!=null?i:!1;if(this.isInitialized(n)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:n})}catch(r){if(s)return null;throw r}else{if(s)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(xn(e))try{this.getOrInitializeService({instanceIdentifier:H})}catch{}for(let[n,s]of this.instancesDeferred.entries()){let i=this.normalizeInstanceIdentifier(n);try{let r=this.getOrInitializeService({instanceIdentifier:i});s.resolve(r)}catch{}}}}clearInstance(e=H){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){let e=Array.from(this.instances.values());await Promise.all([...e.filter(n=>"INTERNAL"in n).map(n=>n.INTERNAL.delete()),...e.filter(n=>"_delete"in n).map(n=>n._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=H){return this.instances.has(e)}getOptions(e=H){return this.instancesOptions.get(e)||{}}initialize(e={}){let{options:n={}}=e,s=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(s))throw Error(`${this.name}(${s}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);let i=this.getOrInitializeService({instanceIdentifier:s,options:n});for(let[r,o]of this.instancesDeferred.entries()){let a=this.normalizeInstanceIdentifier(r);s===a&&o.resolve(i)}return i}onInit(e,n){var o;let s=this.normalizeInstanceIdentifier(n),i=(o=this.onInitCallbacks.get(s))!=null?o:new Set;i.add(e),this.onInitCallbacks.set(s,i);let r=this.instances.get(s);return r&&e(r,s),()=>{i.delete(e)}}invokeOnInitCallbacks(e,n){let s=this.onInitCallbacks.get(n);if(s)for(let i of s)try{i(e,n)}catch{}}getOrInitializeService({instanceIdentifier:e,options:n={}}){let s=this.instances.get(e);if(!s&&this.component&&(s=this.component.instanceFactory(this.container,{instanceIdentifier:Mn(e),options:n}),this.instances.set(e,s),this.instancesOptions.set(e,n),this.invokeOnInitCallbacks(s,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,s)}catch{}return s||null}normalizeInstanceIdentifier(e=H){return this.component?this.component.multipleInstances?e:H:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}};function Mn(t){return t===H?void 0:t}function xn(t){return t.instantiationMode==="EAGER"}var ne=class{constructor(e){this.name=e,this.providers=new Map}addComponent(e){let n=this.getProvider(e.name);if(n.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);n.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);let n=new ye(e,this);return this.providers.set(e,n),n}getProviders(){return Array.from(this.providers.values())}};var Un=[],g;(function(t){t[t.DEBUG=0]="DEBUG",t[t.VERBOSE=1]="VERBOSE",t[t.INFO=2]="INFO",t[t.WARN=3]="WARN",t[t.ERROR=4]="ERROR",t[t.SILENT=5]="SILENT"})(g||(g={}));var Fn={debug:g.DEBUG,verbose:g.VERBOSE,info:g.INFO,warn:g.WARN,error:g.ERROR,silent:g.SILENT},$n=g.INFO,Bn={[g.DEBUG]:"log",[g.VERBOSE]:"log",[g.INFO]:"info",[g.WARN]:"warn",[g.ERROR]:"error"},Hn=(t,e,...n)=>{if(e<t.logLevel)return;let s=new Date().toISOString(),i=Bn[e];if(i)console[i](`[${s}]  ${t.name}:`,...n);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)},x=class{constructor(e){this.name=e,this._logLevel=$n,this._logHandler=Hn,this._userLogHandler=null,Un.push(this)}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in g))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?Fn[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,g.DEBUG,...e),this._logHandler(this,g.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,g.VERBOSE,...e),this._logHandler(this,g.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,g.INFO,...e),this._logHandler(this,g.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,g.WARN,...e),this._logHandler(this,g.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,g.ERROR,...e),this._logHandler(this,g.ERROR,...e)}};var Gn=(t,e)=>e.some(n=>t instanceof n),St,At;function Vn(){return St||(St=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function Wn(){return At||(At=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}var Tt=new WeakMap,Se=new WeakMap,Ct=new WeakMap,we=new WeakMap,Te=new WeakMap;function jn(t){let e=new Promise((n,s)=>{let i=()=>{t.removeEventListener("success",r),t.removeEventListener("error",o)},r=()=>{n(R(t.result)),i()},o=()=>{s(t.error),i()};t.addEventListener("success",r),t.addEventListener("error",o)});return e.then(n=>{n instanceof IDBCursor&&Tt.set(n,t)}).catch(()=>{}),Te.set(e,t),e}function zn(t){if(Se.has(t))return;let e=new Promise((n,s)=>{let i=()=>{t.removeEventListener("complete",r),t.removeEventListener("error",o),t.removeEventListener("abort",o)},r=()=>{n(),i()},o=()=>{s(t.error||new DOMException("AbortError","AbortError")),i()};t.addEventListener("complete",r),t.addEventListener("error",o),t.addEventListener("abort",o)});Se.set(t,e)}var Ae={get(t,e,n){if(t instanceof IDBTransaction){if(e==="done")return Se.get(t);if(e==="objectStoreNames")return t.objectStoreNames||Ct.get(t);if(e==="store")return n.objectStoreNames[1]?void 0:n.objectStore(n.objectStoreNames[0])}return R(t[e])},set(t,e,n){return t[e]=n,!0},has(t,e){return t instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in t}};function Ot(t){Ae=t(Ae)}function Kn(t){return t===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...n){let s=t.call(se(this),e,...n);return Ct.set(s,e.sort?e.sort():[e]),R(s)}:Wn().includes(t)?function(...e){return t.apply(se(this),e),R(Tt.get(this))}:function(...e){return R(t.apply(se(this),e))}}function Yn(t){return typeof t=="function"?Kn(t):(t instanceof IDBTransaction&&zn(t),Gn(t,Vn())?new Proxy(t,Ae):t)}function R(t){if(t instanceof IDBRequest)return jn(t);if(we.has(t))return we.get(t);let e=Yn(t);return e!==t&&(we.set(t,e),Te.set(e,t)),e}var se=t=>Te.get(t);function It(t,e,{blocked:n,upgrade:s,blocking:i,terminated:r}={}){let o=indexedDB.open(t,e),a=R(o);return s&&o.addEventListener("upgradeneeded",c=>{s(R(o.result),c.oldVersion,c.newVersion,R(o.transaction),c)}),n&&o.addEventListener("blocked",c=>n(c.oldVersion,c.newVersion,c)),a.then(c=>{r&&c.addEventListener("close",()=>r()),i&&c.addEventListener("versionchange",l=>i(l.oldVersion,l.newVersion,l))}).catch(()=>{}),a}var qn=["get","getKey","getAll","getAllKeys","count"],Jn=["put","add","delete","clear"],Ce=new Map;function Rt(t,e){if(!(t instanceof IDBDatabase&&!(e in t)&&typeof e=="string"))return;if(Ce.get(e))return Ce.get(e);let n=e.replace(/FromIndex$/,""),s=e!==n,i=Jn.includes(n);if(!(n in(s?IDBIndex:IDBObjectStore).prototype)||!(i||qn.includes(n)))return;let r=async function(o,...a){let c=this.transaction(o,i?"readwrite":"readonly"),l=c.store;return s&&(l=l.index(a.shift())),(await Promise.all([l[n](...a),i&&c.done]))[0]};return Ce.set(e,r),r}Ot(t=>({...t,get:(e,n,s)=>Rt(e,n)||t.get(e,n,s),has:(e,n)=>!!Rt(e,n)||t.has(e,n)}));var Re=class{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(n=>{if(Xn(n)){let s=n.getImmediate();return`${s.library}/${s.version}`}else return null}).filter(n=>n).join(" ")}};function Xn(t){let e=t.getComponent();return(e==null?void 0:e.type)==="VERSION"}var Ie="@firebase/app",Dt="0.16.5";var N=new x("@firebase/app"),Qn="@firebase/app-compat",Zn="@firebase/analytics-compat",es="@firebase/analytics",ts="@firebase/app-check-compat",ns="@firebase/app-check",ss="@firebase/auth",is="@firebase/auth-compat",rs="@firebase/crashlytics",os="@firebase/database",as="@firebase/data-connect",cs="@firebase/database-compat",ls="@firebase/functions",us="@firebase/functions-compat",ds="@firebase/installations",fs="@firebase/installations-compat",hs="@firebase/messaging",ps="@firebase/messaging-compat",gs="@firebase/performance",ms="@firebase/performance-compat",Es="@firebase/remote-config",_s="@firebase/remote-config-compat",bs="@firebase/storage",ys="@firebase/storage-compat",ws="@firebase/firestore",Ss="@firebase/ai",As="@firebase/firestore-compat",Ts="firebase";var De="[DEFAULT]",Cs={[Ie]:"fire-core",[Qn]:"fire-core-compat",[es]:"fire-analytics",[Zn]:"fire-analytics-compat",[ns]:"fire-app-check",[ts]:"fire-app-check-compat",[ss]:"fire-auth",[is]:"fire-auth-compat",[rs]:"fire-cls",[os]:"fire-rtdb",[as]:"fire-data-connect",[cs]:"fire-rtdb-compat",[ls]:"fire-fn",[us]:"fire-fn-compat",[ds]:"fire-iid",[fs]:"fire-iid-compat",[hs]:"fire-fcm",[ps]:"fire-fcm-compat",[gs]:"fire-perf",[ms]:"fire-perf-compat",[Es]:"fire-rc",[_s]:"fire-rc-compat",[bs]:"fire-gcs",[ys]:"fire-gcs-compat",[ws]:"fire-fst",[As]:"fire-fst-compat",[Ss]:"fire-vertex","fire-js":"fire-js",[Ts]:"fire-js-all"};var ie=new Map,Os=new Map,ve=new Map;function vt(t,e){try{t.container.addComponent(e)}catch(n){N.debug(`Component ${e.name} failed to register with FirebaseApp ${t.name}`,n)}}function U(t){let e=t.name;if(ve.has(e))return N.debug(`There were multiple attempts to register component ${e}.`),!1;ve.set(e,t);for(let n of ie.values())vt(n,t);for(let n of Os.values())vt(n,t);return!0}function J(t,e){let n=t.container.getProvider("heartbeat").getImmediate({optional:!0});return n&&n.triggerHeartbeat(),t.container.getProvider(e)}function Pt(t){return t==null?!1:t.settings!==void 0}var Rs={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different {$mismatchedParam}. Existing: '{$oldValue}'. New: '{$newValue}'.","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},k=new B("app","Firebase",Rs);var ke=class{constructor(e,n,s){this._isDeleted=!1,this._options={...e},this._config={...n},this._name=n.name,this._automaticDataCollectionEnabled=n.automaticDataCollectionEnabled,this._container=s,this.container.addComponent(new A("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw k.create("app-deleted",{appName:this._name})}};function Pe(t,e={}){let n=t;typeof e!="object"&&(e={name:e});let s={name:De,automaticDataCollectionEnabled:!0,...e},i=s.name;if(typeof i!="string"||!i)throw k.create("bad-app-name",{appName:String(i)});if(n||(n=be()),!n)throw k.create("no-options");let r=ie.get(i);if(r)if(ee(n,r.options)){if(ee(s,r.config))return r;throw k.create("duplicate-app",{appName:i,mismatchedParam:"config",oldValue:JSON.stringify(r.config),newValue:JSON.stringify(s)})}else throw k.create("duplicate-app",{appName:i,mismatchedParam:"options",oldValue:JSON.stringify(r.options),newValue:JSON.stringify(n)});let o=new ne(i);for(let c of ve.values())o.addComponent(c);let a=new ke(n,s,o);return ie.set(i,a),a}function re(t=De){let e=ie.get(t);if(!e&&t===De&&be())return Pe();if(!e)throw k.create("no-app",{appName:t});return e}function I(t,e,n){var o;let s=(o=Cs[t])!=null?o:t;n&&(s+=`-${n}`);let i=s.match(/\s|\//),r=e.match(/\s|\//);if(i||r){let a=[`Unable to register library "${s}" with version "${e}":`];i&&a.push(`library name "${s}" contains illegal characters (whitespace or "/")`),i&&r&&a.push("and"),r&&a.push(`version name "${e}" contains illegal characters (whitespace or "/")`),N.warn(a.join(" "));return}U(new A(`${s}-version`,()=>({library:s,version:e}),"VERSION"))}var Is="firebase-heartbeat-database",Ds=1,q="firebase-heartbeat-store",Oe=null;function Mt(){return Oe||(Oe=It(Is,Ds,{upgrade:(t,e)=>{switch(e){case 0:try{t.createObjectStore(q)}catch(n){console.warn(n)}}}}).catch(t=>{throw k.create("idb-open",{originalErrorMessage:t.message})})),Oe}async function vs(t){try{let n=(await Mt()).transaction(q),s=await n.objectStore(q).get(xt(t));return await n.done,s}catch(e){if(e instanceof v)N.warn(e.message);else{let n=k.create("idb-get",{originalErrorMessage:e==null?void 0:e.message});N.warn(n.message)}}}async function kt(t,e){try{let s=(await Mt()).transaction(q,"readwrite");await s.objectStore(q).put(e,xt(t)),await s.done}catch(n){if(n instanceof v)N.warn(n.message);else{let s=k.create("idb-set",{originalErrorMessage:n==null?void 0:n.message});N.warn(s.message)}}}function xt(t){return`${t.name}!${t.options.appId}`}var ks=1024,Ns=30,Ne=class{constructor(e){this.container=e,this._heartbeatsCache=null;let n=this.container.getProvider("app").getImmediate();this._storage=new Le(n),this._heartbeatsCachePromise=this._storage.read().then(s=>(this._heartbeatsCache=s,s))}async triggerHeartbeat(){var e,n;try{let i=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),r=Nt();if(((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((n=this._heartbeatsCache)==null?void 0:n.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===r||this._heartbeatsCache.heartbeats.some(o=>o.date===r))return;if(this._heartbeatsCache.heartbeats.push({date:r,agent:i}),this._heartbeatsCache.heartbeats.length>Ns){let o=Ps(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(o,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(s){N.warn(s)}}async getHeartbeatsHeader(){var e;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";let n=Nt(),{heartbeatsToSend:s,unsentEntries:i}=Ls(this._heartbeatsCache.heartbeats),r=_e(JSON.stringify({version:2,heartbeats:s}));return this._heartbeatsCache.lastSentHeartbeatDate=n,i.length>0?(this._heartbeatsCache.heartbeats=i,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),r}catch(n){return N.warn(n),""}}};function Nt(){return new Date().toISOString().substring(0,10)}function Ls(t,e=ks){let n=[],s=t.slice();for(let i of t){let r=n.find(o=>o.agent===i.agent);if(r){if(r.dates.push(i.date),Lt(n)>e){r.dates.pop();break}}else if(n.push({agent:i.agent,dates:[i.date]}),Lt(n)>e){n.pop();break}s=s.slice(1)}return{heartbeatsToSend:n,unsentEntries:s}}var Le=class{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return Y()?yt().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){let n=await vs(this.app);return n!=null&&n.heartbeats?n:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){var s;if(await this._canUseIndexedDBPromise){let i=await this.read();return kt(this.app,{lastSentHeartbeatDate:(s=e.lastSentHeartbeatDate)!=null?s:i.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){var s;if(await this._canUseIndexedDBPromise){let i=await this.read();return kt(this.app,{lastSentHeartbeatDate:(s=e.lastSentHeartbeatDate)!=null?s:i.lastSentHeartbeatDate,heartbeats:[...i.heartbeats,...e.heartbeats]})}else return}};function Lt(t){return _e(JSON.stringify({version:2,heartbeats:t})).length}function Ps(t){if(t.length===0)return-1;let e=0,n=t[0].date;for(let s=1;s<t.length;s++)t[s].date<n&&(n=t[s].date,e=s);return e}function Ms(t){U(new A("platform-logger",e=>new Re(e),"PRIVATE")),U(new A("heartbeat",e=>new Ne(e),"PRIVATE")),I(Ie,Dt,t),I(Ie,Dt,"esm2020"),I("fire-js","")}Ms("");var xs="firebase",Us="13.2.0";I(xs,Us,"app");var Ut="@firebase/ai",$e="3.0.0";var j="AI",Fs="global",$s="firebasevertexai.googleapis.com",ae="v1beta",Ft=$e,Bs="gl-js",Hs="hybrid",Gs=180*1e3,Vs="gemini-3.5-flash-lite";var d=class t extends v{constructor(e,n,s){let i=j,r=`${i}/${e}`,o=`${i}: ${n} (${r})`;super(e,o),this.code=e,this.customErrorData=s,Error.captureStackTrace&&Error.captureStackTrace(this,t),Object.setPrototypeOf(this,t.prototype),this.toString=()=>o}};var $t=["user","model","function","system"];var jt={HARM_SEVERITY_NEGLIGIBLE:"HARM_SEVERITY_NEGLIGIBLE",HARM_SEVERITY_LOW:"HARM_SEVERITY_LOW",HARM_SEVERITY_MEDIUM:"HARM_SEVERITY_MEDIUM",HARM_SEVERITY_HIGH:"HARM_SEVERITY_HIGH",HARM_SEVERITY_UNSUPPORTED:"HARM_SEVERITY_UNSUPPORTED"};var w={STOP:"STOP",MAX_TOKENS:"MAX_TOKENS",SAFETY:"SAFETY",RECITATION:"RECITATION",OTHER:"OTHER",BLOCKLIST:"BLOCKLIST",PROHIBITED_CONTENT:"PROHIBITED_CONTENT",SPII:"SPII",MALFORMED_FUNCTION_CALL:"MALFORMED_FUNCTION_CALL",IMAGE_SAFETY:"IMAGE_SAFETY",IMAGE_PROHIBITED_CONTENT:"IMAGE_PROHIBITED_CONTENT",IMAGE_OTHER:"IMAGE_OTHER",NO_IMAGE:"NO_IMAGE",IMAGE_RECITATION:"IMAGE_RECITATION",LANGUAGE:"LANGUAGE",UNEXPECTED_TOOL_CALL:"UNEXPECTED_TOOL_CALL",TOO_MANY_TOOL_CALLS:"TOO_MANY_TOOL_CALLS",MISSING_THOUGHT_SIGNATURE:"MISSING_THOUGHT_SIGNATURE",MALFORMED_RESPONSE:"MALFORMED_RESPONSE"};var T={PREFER_ON_DEVICE:"prefer_on_device",ONLY_ON_DEVICE:"only_on_device",ONLY_IN_CLOUD:"only_in_cloud",PREFER_IN_CLOUD:"prefer_in_cloud"},F={ON_DEVICE:"on_device",IN_CLOUD:"in_cloud"};var u={ERROR:"error",REQUEST_ERROR:"request-error",RESPONSE_ERROR:"response-error",FETCH_ERROR:"fetch-error",SESSION_CLOSED:"session-closed",INVALID_CONTENT:"invalid-content",API_NOT_ENABLED:"api-not-enabled",INVALID_SCHEMA:"invalid-schema",NO_API_KEY:"no-api-key",NO_APP_ID:"no-app-id",NO_MODEL:"no-model",NO_PROJECT_ID:"no-project-id",PARSE_FAILED:"parse-failed",UNSUPPORTED:"unsupported"};var W={STRING:"string",NUMBER:"number",INTEGER:"integer",BOOLEAN:"boolean",ARRAY:"array",OBJECT:"object"};var P={AGENT_PLATFORM:"AGENT_PLATFORM",GOOGLE_AI:"GOOGLE_AI"};var ce=class{constructor(e){this.backendType=e}},V=class extends ce{constructor(){super(P.GOOGLE_AI)}_getModelPath(e,n){return`/${ae}/projects/${e}/${n}`}_getTemplatePath(e,n){return`/${ae}/projects/${e}/templates/${n}`}},le=class extends ce{constructor(e){super(P.AGENT_PLATFORM),this.location=Fs,e&&(this.location=e)}_getModelPath(e,n){return`/${ae}/projects/${e}/locations/${this.location}/${n}`}_getTemplatePath(e,n){return`/${ae}/projects/${e}/locations/${this.location}/templates/${n}`}};function Ws(t){if(t instanceof V)return`${j}/googleai`;if(t instanceof le)return`${j}/agentplatform/${t.location}`;throw new d(u.ERROR,`Invalid backend: ${JSON.stringify(t.backendType)}`)}function js(t){let e=t.split("/");if(e[0]!==j)throw new d(u.ERROR,`Invalid instance identifier, unknown prefix '${e[0]}'`);switch(e[1]){case"agentplatform":let s=e[2];if(!s)throw new d(u.ERROR,`Invalid instance identifier, unknown location '${t}'`);return new le(s);case"googleai":return new V;default:throw new d(u.ERROR,`Invalid instance identifier string: '${t}'`)}}var E=new x("@firebase/ai"),L;(function(t){t.UNAVAILABLE="unavailable",t.DOWNLOADABLE="downloadable",t.DOWNLOADING="downloading",t.AVAILABLE="available"})(L||(L={}));var zt={type:"text",languages:["en"]},Me=[zt,{type:"image"}],xe=[zt],ue=class t{constructor(e,n,s){this.languageModelProvider=e,this.mode=n,this.downloadPromise=null,this.onDeviceParams={createOptions:{expectedInputs:Me,expectedOutputs:xe}},s&&(this.onDeviceParams=s,this.onDeviceParams.createOptions?(this.onDeviceParams.createOptions.expectedInputs||(this.onDeviceParams.createOptions.expectedInputs=Me),this.onDeviceParams.createOptions.expectedOutputs||(this.onDeviceParams.createOptions.expectedOutputs=xe)):this.onDeviceParams.createOptions={expectedInputs:Me,expectedOutputs:xe})}async isAvailable(e){var s;if(!this.mode)return E.debug("On-device inference unavailable because mode is undefined."),!1;if(this.mode===T.ONLY_IN_CLOUD)return E.debug('On-device inference unavailable because mode is "only_in_cloud".'),!1;let n=await((s=this.languageModelProvider)==null?void 0:s.availability(this.onDeviceParams.createOptions));if(this.mode===T.ONLY_ON_DEVICE){if(n===L.UNAVAILABLE)throw new d(u.API_NOT_ENABLED,"Local LanguageModel API not available in this environment.");if(n===L.DOWNLOADABLE||n===L.DOWNLOADING){E.debug("Waiting for download of LanguageModel to complete.");try{await this.downloadPromise}catch(i){throw new d(u.ERROR,i.message)}return!0}return!0}return n!==L.AVAILABLE?(E.debug(`On-device inference unavailable because availability is "${n}".`),!1):t.isOnDeviceRequest(e)?!0:(E.debug("On-device inference unavailable because request is incompatible."),!1)}async generateContent(e){let n=await this.createSession(),s=await Promise.all(e.contents.map(t.toLanguageModelMessage)),i=await n.prompt(s,this.onDeviceParams.promptOptions);return t.toResponse(i)}async generateContentStream(e){let n=await this.createSession(),s=await Promise.all(e.contents.map(t.toLanguageModelMessage)),i=n.promptStreaming(s,this.onDeviceParams.promptOptions);return t.toStreamResponse(i)}async countTokens(e){throw new d(u.REQUEST_ERROR,"Count Tokens is not yet available for on-device model.")}static isOnDeviceRequest(e){if(e.contents.length===0)return E.debug("Empty prompt rejected for on-device inference."),!1;for(let n of e.contents){if(n.parts.some(s=>"functionResponse"in s))return E.debug("Content with a function response part rejected for on-device inference."),!1;for(let s of n.parts)if("inlineData"in s&&s.inlineData&&t.SUPPORTED_MIME_TYPES.indexOf(s.inlineData.mimeType)===-1)return E.debug(`Unsupported mime type "${s.inlineData.mimeType}" rejected for on-device inference.`),!1}return!0}async downloadIfAvailable(e){var s;let n=await((s=this.languageModelProvider)==null?void 0:s.availability(this.onDeviceParams.createOptions));return(n===L.DOWNLOADABLE||n===L.DOWNLOADING)&&this.download(e),n}download(e){var s;if(this.downloadPromise)return;let n={...this.onDeviceParams.createOptions};n&&!n.monitor&&e&&(n.monitor=i=>{i.addEventListener("downloadprogress",r=>{e(r.loaded)})}),this.downloadPromise=(s=this.languageModelProvider)==null?void 0:s.create(n).finally(()=>{this.downloadPromise=null})}static async toLanguageModelMessage(e){let n=await Promise.all(e.parts.map(t.toLanguageModelMessageContent));return{role:t.toLanguageModelMessageRole(e.role),content:n}}static async toLanguageModelMessageContent(e){if("text"in e&&typeof e.text=="string")return{type:"text",value:e.text};if("inlineData"in e&&e.inlineData){let s=await(await fetch(`data:${e.inlineData.mimeType};base64,${e.inlineData.data}`)).blob();return{type:"image",value:await createImageBitmap(s)}}throw new d(u.REQUEST_ERROR,"Processing of this Part type is not currently supported.")}static toLanguageModelMessageRole(e){return e==="model"?"assistant":"user"}async createSession(){if(!this.languageModelProvider)throw new d(u.UNSUPPORTED,"Chrome AI requested for unsupported browser version.");let e=await this.languageModelProvider.create(this.onDeviceParams.createOptions);return this.oldSession&&this.oldSession.destroy(),this.oldSession=e,e}static toResponse(e){return{json:async()=>({candidates:[{content:{parts:[{text:e}]}}]})}}static toStreamResponse(e){let n=new TextEncoder;return{body:e.pipeThrough(new TransformStream({transform(s,i){let r=JSON.stringify({candidates:[{content:{role:"model",parts:[{text:s}]}}]});i.enqueue(n.encode(`data: ${r}

`))}}))}}};ue.SUPPORTED_MIME_TYPES=["image/jpeg","image/png"];function zs(t,e,n){let i=(e||K()).LanguageModel;if(i&&t)return new ue(i,t,n)}var Be=class{constructor(e,n,s,i,r){this.app=e,this.backend=n,this.chromeAdapterFactory=r;let o=i==null?void 0:i.getImmediate({optional:!0}),a=s==null?void 0:s.getImmediate({optional:!0});this.auth=a||null,this.appCheck=o||null}_delete(){return Promise.resolve()}set options(e){this._options=e}get options(){return this._options}};function Ks(t,{instanceIdentifier:e}){if(!e)throw new d(u.ERROR,"AIService instance identifier is undefined.");let n=js(e),s=t.getProvider("app").getImmediate(),i=t.getProvider("auth-internal"),r=t.getProvider("app-check-internal");return new Be(s,n,i,r,zs)}function Ys(t){var n,s,i,r,o,a,c;if((s=(n=t.app)==null?void 0:n.options)!=null&&s.apiKey)if((r=(i=t.app)==null?void 0:i.options)!=null&&r.projectId){if(!((a=(o=t.app)==null?void 0:o.options)!=null&&a.appId))throw new d(u.NO_APP_ID,'The "appId" field is empty in the local Firebase config. Firebase AI requires this field to contain a valid app ID.')}else throw new d(u.NO_PROJECT_ID,'The "projectId" field is empty in the local Firebase config. Firebase AI requires this field to contain a valid project ID.');else throw new d(u.NO_API_KEY,'The "apiKey" field is empty in the local Firebase config. Firebase AI requires this field to contain a valid API key.');let e={apiKey:t.app.options.apiKey,project:t.app.options.projectId,appId:t.app.options.appId,automaticDataCollectionEnabled:t.app.automaticDataCollectionEnabled,backend:t.backend};if(Pt(t.app)&&t.app.settings.appCheckToken){let l=t.app.settings.appCheckToken;e.getAppCheckToken=()=>Promise.resolve({token:l})}else t.appCheck&&((c=t.options)!=null&&c.useLimitedUseAppCheckTokens?e.getAppCheckToken=()=>t.appCheck.getLimitedUseToken():e.getAppCheckToken=()=>t.appCheck.getToken());return t.auth&&(e.getAuthToken=()=>t.auth.getToken()),e}var He=class t{constructor(e,n){this._apiSettings=Ys(e),this.model=t.normalizeModelName(n,this._apiSettings.backend.backendType)}static normalizeModelName(e,n){return n===P.GOOGLE_AI?t.normalizeGoogleAIModelName(e):t.normalizeVertexAIModelName(e)}static normalizeGoogleAIModelName(e){return`models/${e}`}static normalizeVertexAIModelName(e){let n;return e.includes("/")?e.startsWith("models/")?n=`publishers/google/${e}`:n=e:n=`publishers/google/models/${e}`,n}};var qs="Timeout has expired.",Ue="AbortError",Ge=class{constructor(e){this.params=e}toString(){let e=new URL(this.baseUrl);return e.pathname=this.pathname,e.search=this.queryParams.toString(),e.toString()}get pathname(){return this.params.templateId?`${this.params.apiSettings.backend._getTemplatePath(this.params.apiSettings.project,this.params.templateId)}:${this.params.task}`:`${this.params.apiSettings.backend._getModelPath(this.params.apiSettings.project,this.params.model)}:${this.params.task}`}get baseUrl(){var e,n;return(n=(e=this.params.singleRequestOptions)==null?void 0:e.baseUrl)!=null?n:`https://${$s}`}get queryParams(){let e=new URLSearchParams;return this.params.stream&&e.set("alt","sse"),e}};function Js(t){let e=[];return e.push(`${Bs}/${Ft}`),e.push(`fire/${Ft}`),(t.params.apiSettings.inferenceMode===T.PREFER_ON_DEVICE||t.params.apiSettings.inferenceMode===T.PREFER_IN_CLOUD)&&e.push(Hs),e.join(" ")}async function Xs(t){let e=new Headers;if(e.append("Content-Type","application/json"),e.append("x-goog-api-client",Js(t)),e.append("x-goog-api-key",t.params.apiSettings.apiKey),t.params.apiSettings.automaticDataCollectionEnabled&&e.append("X-Firebase-Appid",t.params.apiSettings.appId),t.params.apiSettings.getAppCheckToken){let n=await t.params.apiSettings.getAppCheckToken();n&&(e.append("X-Firebase-AppCheck",n.token),n.error&&E.warn(`Unable to obtain a valid App Check token: ${n.error.message}`))}if(t.params.apiSettings.getAuthToken){let n=await t.params.apiSettings.getAuthToken();n&&e.append("Authorization",`Firebase ${n.accessToken}`)}return e}async function Qe(t,e){var l,h,f;let n=new Ge(t),s,i=(l=t.singleRequestOptions)==null?void 0:l.signal,r=((h=t.singleRequestOptions)==null?void 0:h.timeout)!=null&&t.singleRequestOptions.timeout>=0?t.singleRequestOptions.timeout:Gs,o=new AbortController,a=setTimeout(()=>{o.abort(new DOMException(qs,Ue)),E.debug(`Aborting request to ${n} due to timeout (${r}ms)`)},r),c=AbortSignal.any(i?[i,o.signal]:[o.signal]);if(i&&i.aborted)throw clearTimeout(a),new DOMException((f=i.reason)!=null?f:"Aborted externally before fetch",Ue);try{let p={method:"POST",headers:await Xs(n),signal:c,body:e};if(s=await fetch(n.toString(),p),!s.ok){let b="",m;try{let y=await s.json();b=y.error.message,y.error.details&&(b+=` ${JSON.stringify(y.error.details)}`,m=y.error.details)}catch{}throw s.status===403&&m&&m.some(y=>y.reason==="SERVICE_DISABLED")&&m.some(y=>{var ht,pt;return(pt=(ht=y.links)==null?void 0:ht[0])==null?void 0:pt.description.includes("Google developers console API activation")})?new d(u.API_NOT_ENABLED,`The Firebase AI SDK requires the Firebase AI API ('firebasevertexai.googleapis.com') to be enabled in your Firebase project. Enable this API by visiting the Firebase Console at https://console.firebase.google.com/project/${n.params.apiSettings.project}/ailogic/ and clicking "Get started". If you enabled this API recently, wait a few minutes for the action to propagate to our systems and then retry.`,{status:s.status,statusText:s.statusText,errorDetails:m}):new d(u.FETCH_ERROR,`Error fetching from ${n}: [${s.status} ${s.statusText}] ${b}`,{status:s.status,statusText:s.statusText,errorDetails:m})}}catch(p){let b=p;throw p.code!==u.FETCH_ERROR&&p.code!==u.API_NOT_ENABLED&&p instanceof Error&&p.name!==Ue&&(b=new d(u.ERROR,`Error fetching from ${n.toString()}: ${p.message}`),b.stack=p.stack),b}finally{clearTimeout(a)}return s}function oe(t){if(t.candidates&&t.candidates.length>0){if(t.candidates.length>1&&E.warn(`This response had ${t.candidates.length} candidates. Returning text from the first candidate only. Access response.candidates directly to use the other candidates.`),Yt(t.candidates[0]))throw new d(u.RESPONSE_ERROR,`Response error: ${G(t)}. Response body stored in error.response`,{response:t});return!0}else return!1}function D(t){return"type"in t&&t.type?t:t.text!==void 0?{...t,type:"text"}:t.inlineData!==void 0?{...t,type:"inlineData"}:t.functionCall!==void 0?{...t,type:"functionCall"}:t.functionResponse!==void 0?{...t,type:"functionResponse"}:t.fileData!==void 0?{...t,type:"fileData"}:t.executableCode!==void 0?{...t,type:"executableCode"}:t.codeExecutionResult!==void 0?{...t,type:"codeExecutionResult"}:t}function de(t,e=F.IN_CLOUD){var s;if(t.candidates&&!t.candidates[0].hasOwnProperty("index")&&(t.candidates[0].index=0),t.candidates)for(let i of t.candidates)(s=i.content)!=null&&s.parts&&(i.content.parts=i.content.parts.map(D));let n=Qs(t);return n.inferenceSource=e,n}function Qs(t){return t.text=()=>{if(oe(t))return Bt(t,e=>!("thought"in e&&e.thought));if(t.promptFeedback)throw new d(u.RESPONSE_ERROR,`Text not available. ${G(t)}`,{response:t});return""},t.thoughtSummary=()=>{if(oe(t)){let e=Bt(t,n=>!!("thought"in n&&n.thought));return e===""?void 0:e}else if(t.promptFeedback)throw new d(u.RESPONSE_ERROR,`Thought summary not available. ${G(t)}`,{response:t})},t.inlineDataParts=()=>{if(oe(t))return Zs(t);if(t.promptFeedback)throw new d(u.RESPONSE_ERROR,`Data not available. ${G(t)}`,{response:t})},t.functionCalls=()=>{if(oe(t))return Kt(t);if(t.promptFeedback)throw new d(u.RESPONSE_ERROR,`Function call not available. ${G(t)}`,{response:t})},t}function Bt(t,e){var s,i,r,o;let n=[];if((i=(s=t.candidates)==null?void 0:s[0].content)!=null&&i.parts)for(let a of(o=(r=t.candidates)==null?void 0:r[0].content)==null?void 0:o.parts){let c=D(a);c.type==="text"&&e(c)&&n.push(c.text)}return n.length>0?n.join(""):""}function Kt(t){var n,s,i,r;if(!t)return;let e=[];if((s=(n=t.candidates)==null?void 0:n[0].content)!=null&&s.parts)for(let o of(r=(i=t.candidates)==null?void 0:i[0].content)==null?void 0:r.parts){let a=D(o);a.type==="functionCall"&&e.push(a.functionCall)}if(e.length>0)return e}function Zs(t){var n,s,i,r;let e=[];if((s=(n=t.candidates)==null?void 0:n[0].content)!=null&&s.parts)for(let o of(r=(i=t.candidates)==null?void 0:i[0].content)==null?void 0:r.parts){let a=D(o);a.type==="inlineData"&&e.push(a)}if(e.length>0)return e}var ei=[w.RECITATION,w.SAFETY,w.BLOCKLIST,w.PROHIBITED_CONTENT,w.SPII,w.MALFORMED_FUNCTION_CALL,w.IMAGE_SAFETY,w.IMAGE_PROHIBITED_CONTENT,w.IMAGE_OTHER,w.NO_IMAGE,w.IMAGE_RECITATION,w.LANGUAGE,w.UNEXPECTED_TOOL_CALL,w.TOO_MANY_TOOL_CALLS,w.MISSING_THOUGHT_SIGNATURE,w.MALFORMED_RESPONSE];function Yt(t){return!!t.finishReason&&ei.some(e=>e===t.finishReason)}function G(t){var n,s,i;let e="";if((!t.candidates||t.candidates.length===0)&&t.promptFeedback)e+="Response was blocked",(n=t.promptFeedback)!=null&&n.blockReason&&(e+=` due to ${t.promptFeedback.blockReason}`),(s=t.promptFeedback)!=null&&s.blockReasonMessage&&(e+=`: ${t.promptFeedback.blockReasonMessage}`);else if((i=t.candidates)!=null&&i[0]){let r=t.candidates[0];Yt(r)&&(e+=`Candidate was blocked due to ${r.finishReason}`,r.finishMessage&&(e+=`: ${r.finishMessage}`))}return e}function Ze(t){if(t!=null){if(typeof t=="string")return{role:"system",parts:[{type:"text",text:t}]};if(t.type==="text"||"text"in t&&typeof t.text=="string")return{role:"system",parts:[M(D(t))]};if(t.parts){let e=t.parts.map(n=>M(D(n)));return t.role?{...t,parts:e}:{role:"system",parts:e}}}}function X(t){let e=[];if(typeof t=="string")e=[{type:"text",text:t}];else for(let n of t)typeof n=="string"?e.push({type:"text",text:n}):e.push(M(D(n)));return ti(e)}function ti(t){let e={role:"user",parts:[]},n=!1,s=!1;for(let i of t)i.type==="functionResponse"||"functionResponse"in i?s=!0:n=!0,e.parts.push(i);if(n&&s)throw new d(u.INVALID_CONTENT,"Within a single message, FunctionResponse cannot be mixed with other type of Part in the request for sending chat message.");if(!n&&!s)throw new d(u.INVALID_CONTENT,"No Content is provided for sending chat message.");return e}function Fe(t){let e;if(t.contents){let n=t;e={...n,contents:n.contents.map(s=>({...s,parts:s.parts?s.parts.map(D):[]}))}}else e={contents:[X(t)]};return t.systemInstruction&&(e.systemInstruction=Ze(t.systemInstruction)),e}function ni(t){return t.parts&&Array.isArray(t.parts)?{...t,parts:t.parts.map(et)}:t}function et(t){let e;if("type"in t){let{type:n,...s}=t;e=s}else e=t;return e.functionResponse&&(e={...e,functionResponse:ni(e.functionResponse)}),e}function tt(t){return t.parts?{...t,parts:t.parts.map(et)}:t}function qt(t){return t==null||typeof t=="string"?t:"parts"in t&&Array.isArray(t.parts)?tt(t):et(t)}function Jt(t){let e={...t};return e.contents&&(e.contents=e.contents.map(tt)),e.systemInstruction&&(e.systemInstruction=qt(e.systemInstruction)),e}function si(t){let e={...t};return e.contents&&(e.contents=e.contents.map(tt)),e.systemInstruction&&(e.systemInstruction=qt(e.systemInstruction)),e}function Xt(t){var e,n;if((e=t.safetySettings)==null||e.forEach(s=>{if(s.method)throw new d(u.UNSUPPORTED,"SafetySetting.method is not supported in the the Gemini Developer API. Please remove this property.")}),(n=t.generationConfig)!=null&&n.topK){let s=Math.round(t.generationConfig.topK);s!==t.generationConfig.topK&&(E.warn("topK in GenerationConfig has been rounded to the nearest integer to match the format for requests to the Gemini Developer API."),t.generationConfig.topK=s)}return t}function nt(t){return{candidates:t.candidates?ri(t.candidates):void 0,prompt:t.promptFeedback?oi(t.promptFeedback):void 0,usageMetadata:t.usageMetadata}}function ii(t,e){return{generateContentRequest:{model:e,...t}}}function ri(t){let e=[],n;return e&&t.forEach(s=>{var o,a;let i;if(s.citationMetadata&&(i={citations:s.citationMetadata.citationSources}),s.safetyRatings&&(n=s.safetyRatings.map(c=>{var l,h,f;return{...c,severity:(l=c.severity)!=null?l:jt.HARM_SEVERITY_UNSUPPORTED,probabilityScore:(h=c.probabilityScore)!=null?h:0,severityScore:(f=c.severityScore)!=null?f:0}})),(a=(o=s.content)==null?void 0:o.parts)!=null&&a.some(c=>"videoMetadata"in c&&c.videoMetadata))throw new d(u.UNSUPPORTED,"Part.videoMetadata is not supported in the Gemini Developer API. Please remove this property.");let r={index:s.index,content:s.content,finishReason:s.finishReason,finishMessage:s.finishMessage,safetyRatings:n,citationMetadata:i,groundingMetadata:s.groundingMetadata,urlContextMetadata:s.urlContextMetadata};e.push(r)}),e}function oi(t){let e=[];return t.safetyRatings.forEach(s=>{var i,r,o;e.push({category:s.category,probability:s.probability,severity:(i=s.severity)!=null?i:jt.HARM_SEVERITY_UNSUPPORTED,probabilityScore:(r=s.probabilityScore)!=null?r:0,severityScore:(o=s.severityScore)!=null?o:0,blocked:s.blocked})}),{blockReason:t.blockReason,safetyRatings:e,blockReasonMessage:t.blockReasonMessage}}var Ht=/^data\: (.*)(?:\n\n|\r\r|\r\n\r\n)/;async function ai(t,e,n){let s=t.body.pipeThrough(new TextDecoderStream("utf8",{fatal:!0})),i=di(s),[r,o]=i.tee(),{response:a,firstValue:c}=await ci(o,e,n);return{stream:ui(r,e,n),response:a,firstValue:c}}async function ci(t,e,n){let[s,i]=t.tee(),r=s.getReader(),{value:o}=await r.read();return{firstValue:o,response:li(i,e,n)}}async function li(t,e,n){let s=[],i=t.getReader();for(;;){let{done:r,value:o}=await i.read();if(r){let a=fi(s);return e.backend.backendType===P.GOOGLE_AI&&(a=nt(a)),de(a,n)}s.push(o)}}async function*ui(t,e,n){var i,r;let s=t.getReader();for(;;){let{value:o,done:a}=await s.read();if(a)break;let c;e.backend.backendType===P.GOOGLE_AI?c=de(nt(o),n):c=de(o,n);let l=(i=c.candidates)==null?void 0:i[0];!((r=l==null?void 0:l.content)!=null&&r.parts)&&!(l!=null&&l.finishReason)&&!(l!=null&&l.citationMetadata)&&!(l!=null&&l.urlContextMetadata)||(yield c)}}function di(t){let e=t.getReader();return new ReadableStream({start(s){let i="";return r();function r(){return e.read().then(({value:o,done:a})=>{if(a){if(i.trim()){s.error(new d(u.PARSE_FAILED,"Failed to parse stream"));return}s.close();return}i+=o;let c=i.match(Ht),l;for(;c;){try{l=JSON.parse(c[1])}catch{s.error(new d(u.PARSE_FAILED,`Error parsing JSON response: "${c[1]}`));return}s.enqueue(l),i=i.substring(c[0].length),c=i.match(Ht)}return r()})}}})}function fi(t){let e=t[t.length-1],n={promptFeedback:e==null?void 0:e.promptFeedback};for(let s of t)if(s.candidates)for(let i of s.candidates){let r=i.index||0;n.candidates||(n.candidates=[]),n.candidates[r]||(n.candidates[r]={index:i.index}),n.candidates[r].citationMetadata=i.citationMetadata,n.candidates[r].finishReason=i.finishReason,n.candidates[r].finishMessage=i.finishMessage,n.candidates[r].safetyRatings=i.safetyRatings,n.candidates[r].groundingMetadata=i.groundingMetadata;let o=i.urlContextMetadata;if(typeof o=="object"&&o!==null&&Object.keys(o).length>0&&(n.candidates[r].urlContextMetadata=o),i.content){if(!i.content.parts)continue;n.candidates[r].content||(n.candidates[r].content={role:i.content.role||"user",parts:[]});for(let a of i.content.parts){if("text"in a&&a.text==="")continue;if(Object.keys(a).length===0)throw new d(u.INVALID_CONTENT,"Part should have at least one property, but there are none. This is likely caused by a malformed response from the backend.");let c=D({...a});Object.keys(c).length>0&&n.candidates[r].content.parts.push(c)}}}return n}var hi=[u.FETCH_ERROR,u.ERROR,u.API_NOT_ENABLED];async function Qt(t,e,n,s){if(!e)return{response:await s(),inferenceSource:F.IN_CLOUD};switch(e.mode){case T.ONLY_ON_DEVICE:if(await e.isAvailable(t))return{response:await n(),inferenceSource:F.ON_DEVICE};throw new d(u.UNSUPPORTED,"Inference mode is ONLY_ON_DEVICE, but an on-device model is not available.");case T.ONLY_IN_CLOUD:return{response:await s(),inferenceSource:F.IN_CLOUD};case T.PREFER_IN_CLOUD:try{return{response:await s(),inferenceSource:F.IN_CLOUD}}catch(i){if(i instanceof d&&hi.includes(i.code)&&await e.isAvailable(t))return{response:await n(),inferenceSource:F.ON_DEVICE};throw i}case T.PREFER_ON_DEVICE:return await e.isAvailable(t)?{response:await n(),inferenceSource:F.ON_DEVICE}:{response:await s(),inferenceSource:F.IN_CLOUD};default:throw new d(u.ERROR,`Unexpected infererence mode: ${e.mode}`)}}async function pi(t,e,n,s){return n=Jt(n),t.backend.backendType===P.GOOGLE_AI&&(n=Xt(n)),Qe({task:"streamGenerateContent",model:e,apiSettings:t,stream:!0,singleRequestOptions:s},JSON.stringify(n))}async function Zt(t,e,n,s,i){let r=await Qt(n,s,()=>s.generateContentStream(n),()=>pi(t,e,n,i));return ai(r.response,t,r.inferenceSource)}async function gi(t,e,n,s){return n=Jt(n),t.backend.backendType===P.GOOGLE_AI&&(n=Xt(n)),Qe({model:e,task:"generateContent",apiSettings:t,stream:!1,singleRequestOptions:s},JSON.stringify(n))}async function en(t,e,n,s,i){let r=await Qt(n,s,()=>s.generateContent(n),()=>gi(t,e,n,i)),o=await mi(r.response,t);return{response:de(o,r.inferenceSource)}}async function mi(t,e){let n=await t.json();return e.backend.backendType===P.GOOGLE_AI?nt(n):n}var Gt="SILENT_ERROR",Vt=10,Ve=class{constructor(e,n,s){this.params=n,this.requestOptions=s,this._history=[],this._sendPromise=Promise.resolve(),this._apiSettings=e}async getHistory(){return await this._sendPromise,M(this._history).map(e=>({...e,parts:e.parts?e.parts.map(D):[]}))}async _sendMessage(e,n){let s={};await this._sendPromise;let i=[];return this._sendPromise=this._sendPromise.then(async()=>{var c,l,h,f;let r,o=0,a=(l=(c=this.requestOptions)==null?void 0:c.maxSequentialFunctionCalls)!=null?l:Vt;do{let p;if(r){o++;let y=await this._callFunctionsAsNeeded(r);p=X(y)}else p=X(e);let b=this._formatRequest(p,[...i]);i.push(p);let m=await this._callGenerateContent(b,n);if(m)if(s=m,r=this._getCallableFunctionCalls(m.response),m.response.candidates&&m.response.candidates.length>0){let y={parts:((h=m.response.candidates)==null?void 0:h[0].content.parts)||[],role:((f=m.response.candidates)==null?void 0:f[0].content.role)||"model"};i.push(M(y))}else{let y=G(m.response);y&&E.warn(`sendMessage() was unsuccessful. ${y}. Inspect response object for details.`)}else r=void 0}while(r&&o<a);r&&o>=a&&E.warn(`Automatic function calling exceeded the limit of ${a} function calls. Returning last model response.`)}),await this._sendPromise,this._history=this._history.concat(i),s}async _sendMessageStream(e,n){await this._sendPromise;let s=[],r=(async()=>{var h,f;let o,a=0,c=(f=(h=this.requestOptions)==null?void 0:h.maxSequentialFunctionCalls)!=null?f:Vt,l;do{let p;if(o){a++;let m=await this._callFunctionsAsNeeded(o);p=X(m)}else p=X(e);let b=this._formatRequest(p,[...s]);if(s.push(p),l=await this._callGenerateContentStream(b,n),o=this._getCallableFunctionCalls(l.firstValue),o&&l.firstValue&&l.firstValue.candidates&&l.firstValue.candidates.length>0){let m={...l.firstValue.candidates[0].content};m.role||(m.role="model"),s.push(m)}}while(o&&a<c);return o&&a>=c&&E.warn(`Automatic function calling exceeded the limit of ${c} function calls. Returning last model response.`),{stream:l.stream,response:l.response}})();return this._sendPromise=this._sendPromise.then(async()=>r).catch(o=>{throw new Error(Gt)}).then(o=>o.response).then(o=>{if(o.candidates&&o.candidates.length>0){this._history=this._history.concat(s);let a={...o.candidates[0].content};a.role||(a.role="model"),this._history.push(M(a))}else{let a=G(o);a&&E.warn(`sendMessageStream() was unsuccessful. ${a}. Inspect response object for details.`)}}).catch(o=>{o.message!==Gt&&o.name!=="AbortError"&&E.error(o)}),r}_getCallableFunctionCalls(e){var i,r,o;let n=(r=(i=this.params)==null?void 0:i.tools)==null?void 0:r.find(a=>a.functionDeclarations);if(!(n!=null&&n.functionDeclarations))return;let s=Kt(e);if(s){for(let a of s)if(!((o=n.functionDeclarations)==null?void 0:o.some(l=>l.name===a.name&&typeof l.functionReference=="function")))return;return s}}async _callFunctionsAsNeeded(e){var r,o;let n=[],s=[],i=(o=(r=this.params)==null?void 0:r.tools)==null?void 0:o.find(a=>a.functionDeclarations);if(i&&i.functionDeclarations){for(let c of e){let l=i.functionDeclarations.find(h=>h.name===c.name);if(l!=null&&l.functionReference){let h=Promise.resolve(l.functionReference(c.args)).catch(f=>{let p=new d(u.ERROR,`Error in user-defined function "${l.name}": ${f.message}`);throw p.stack=f.stack,p});n.push({name:c.name,id:c.id,results:h}),s.push(h)}}await Promise.all(s);let a=[];for(let{name:c,id:l,results:h}of n){let f={name:c,response:await h};l&&(f.id=l),a.push({type:"functionResponse",functionResponse:f})}return a}else throw new d(u.REQUEST_ERROR,'No function declarations were provided in "tools".')}};var Ei=["text","inlineData","functionCall","functionResponse","thought","thoughtSignature"],_i={user:["text","inlineData","functionResponse"],function:["functionResponse"],model:["text","functionCall","thought","thoughtSignature"],system:["text"]},Wt={user:["model"],function:["model"],model:["user","function"],system:[]};function bi(t){let e=null;for(let n of t){let{role:s,parts:i}=n;if(!e&&s!=="user")throw new d(u.INVALID_CONTENT,`First Content should be with role 'user', got ${s}`);if(!$t.includes(s))throw new d(u.INVALID_CONTENT,`Each item should include role field. Got ${s} but valid roles are: ${JSON.stringify($t)}`);if(!Array.isArray(i))throw new d(u.INVALID_CONTENT,"Content should have 'parts' property with an array of Parts");if(i.length===0)throw new d(u.INVALID_CONTENT,"Each Content should have at least one part");let r={text:0,inlineData:0,functionCall:0,functionResponse:0,thought:0,thoughtSignature:0,fileData:0,executableCode:0,codeExecutionResult:0};for(let a of i){if(a.type)r[a.type]+=1;else for(let c of["text","inlineData","functionCall","functionResponse","fileData","executableCode","codeExecutionResult"])c in a&&(r[c]+=1);"thought"in a&&a.thought&&(r.thought+=1),"thoughtSignature"in a&&a.thoughtSignature&&(r.thoughtSignature+=1)}let o=_i[s];for(let a of Ei)if(!o.includes(a)&&r[a]>0)throw new d(u.INVALID_CONTENT,`Content with role '${s}' can't contain '${a}' part`);if(e&&!Wt[s].includes(e.role))throw new d(u.INVALID_CONTENT,`Content with role '${s}' can't follow '${e.role}'. Valid previous roles: ${JSON.stringify(Wt)}`);e=n}}var We=class extends Ve{constructor(e,n,s,i,r){var o;super(e,i,r),this.model=n,this.chromeAdapter=s,this.params=i,this.requestOptions=r,i!=null&&i.history&&(bi(i.history),this._history=M(i.history)),((o=this.params)==null?void 0:o.systemInstruction)!=null&&(this.params={...this.params,systemInstruction:Ze(this.params.systemInstruction)})}_formatRequest(e,n){var s,i,r,o,a;return{safetySettings:(s=this.params)==null?void 0:s.safetySettings,generationConfig:(i=this.params)==null?void 0:i.generationConfig,tools:(r=this.params)==null?void 0:r.tools,toolConfig:(o=this.params)==null?void 0:o.toolConfig,systemInstruction:(a=this.params)==null?void 0:a.systemInstruction,contents:[...this._history,...n,e]}}_callGenerateContent(e,n){return en(this._apiSettings,this.model,e,this.chromeAdapter,{...this.requestOptions,...n})}_callGenerateContentStream(e,n){return Zt(this._apiSettings,this.model,e,this.chromeAdapter,{...this.requestOptions,...n})}async sendMessage(e,n){return this._sendMessage(e,n)}async sendMessageStream(e,n){return this._sendMessageStream(e,n)}};async function yi(t,e,n,s){n=si(n);let i="";if(t.backend.backendType===P.GOOGLE_AI){let o=ii(n,e);i=JSON.stringify(o)}else i=JSON.stringify(n);return(await Qe({model:e,task:"countTokens",apiSettings:t,stream:!1,singleRequestOptions:s},i)).json()}async function wi(t,e,n,s,i){if((s==null?void 0:s.mode)===T.ONLY_ON_DEVICE)throw new d(u.UNSUPPORTED,"countTokens() is not supported for on-device models.");return yi(t,e,n,i)}var je=class extends He{constructor(e,n,s,i){super(e,n.model),this.chromeAdapter=i,this.generationConfig=n.generationConfig||{},Si(this.generationConfig),this.safetySettings=n.safetySettings||[],this.tools=n.tools,this.toolConfig=n.toolConfig,this.systemInstruction=Ze(n.systemInstruction),this.requestOptions=s||{}}async initializeDeviceModel(e){if(!this.chromeAdapter||this.chromeAdapter.mode===T.ONLY_IN_CLOUD)return;if(await this.chromeAdapter.downloadIfAvailable(e)===L.UNAVAILABLE){let s=new d(u.API_NOT_ENABLED,"Local LanguageModel API not available in this environment.");if(this.chromeAdapter.mode===T.ONLY_ON_DEVICE)throw s;E.debug(s.message)}await this.chromeAdapter.downloadPromise}async generateContent(e,n){let s=Fe(e);return en(this._apiSettings,this.model,{generationConfig:this.generationConfig,safetySettings:this.safetySettings,tools:this.tools,toolConfig:this.toolConfig,systemInstruction:this.systemInstruction,...s},this.chromeAdapter,{...this.requestOptions,...n})}async generateContentStream(e,n){let s=Fe(e),{stream:i,response:r}=await Zt(this._apiSettings,this.model,{generationConfig:this.generationConfig,safetySettings:this.safetySettings,tools:this.tools,toolConfig:this.toolConfig,systemInstruction:this.systemInstruction,...s},this.chromeAdapter,{...this.requestOptions,...n});return{stream:i,response:r}}startChat(e){return new We(this._apiSettings,this.model,this.chromeAdapter,{tools:this.tools,toolConfig:this.toolConfig,systemInstruction:this.systemInstruction,generationConfig:this.generationConfig,safetySettings:this.safetySettings,...e},this.requestOptions)}async countTokens(e,n){let s=Fe(e);return wi(this._apiSettings,this.model,s,this.chromeAdapter,{...this.requestOptions,...n})}};function Si(t){var e,n;if(((e=t.thinkingConfig)==null?void 0:e.thinkingBudget)!=null&&((n=t.thinkingConfig)!=null&&n.thinkingLevel))throw new d(u.UNSUPPORTED,"Cannot set both thinkingBudget and thinkingLevel in a config.");if(t.responseSchema!=null&&t.responseJsonSchema!=null)throw new d(u.UNSUPPORTED,"Cannot set both responseSchema and responseJsonSchema in a config.");if((t.responseSchema!=null||t.responseJsonSchema!=null)&&t.responseMimeType!=="application/json"&&t.responseMimeType!=="text/x.enum")throw new d(u.UNSUPPORTED,'responseMimeType must be set to "application/json" or "text/x.enum" if responseSchema or responseJsonSchema are set.')}var C=class{constructor(e){if(!e.type&&!e.anyOf)throw new d(u.INVALID_SCHEMA,"A schema must have either a 'type' or an 'anyOf' array of sub-schemas.");for(let n in e)this[n]=e[n];this.type=e.type,this.format=e.hasOwnProperty("format")?e.format:void 0,this.nullable=e.hasOwnProperty("nullable")?!!e.nullable:!1}toJSON(){let e={type:this.type};for(let n in this)this.hasOwnProperty(n)&&this[n]!==void 0&&(n!=="required"||this.type===W.OBJECT)&&(e[n]=this[n]);return e}static array(e){return new qe(e,e.items)}static object(e){return new Je(e,e.properties,e.optionalProperties)}static string(e){return new fe(e)}static enumString(e){return new fe(e,e.enum)}static integer(e){return new ze(e)}static number(e){return new Ke(e)}static boolean(e){return new Ye(e)}static anyOf(e){return new Xe(e)}},ze=class extends C{constructor(e){super({type:W.INTEGER,...e})}},Ke=class extends C{constructor(e){super({type:W.NUMBER,...e})}},Ye=class extends C{constructor(e){super({type:W.BOOLEAN,...e})}},fe=class extends C{constructor(e,n){super({type:W.STRING,...e}),this.enum=n}toJSON(){let e=super.toJSON();return this.enum&&(e.enum=this.enum),e}},qe=class extends C{constructor(e,n){super({type:W.ARRAY,...e}),this.items=n}toJSON(){let e=super.toJSON();return e.items=this.items.toJSON(),e}},Je=class extends C{constructor(e,n,s=[]){super({type:W.OBJECT,...e}),this.properties=n,this.optionalProperties=s}toJSON(){let e=super.toJSON();e.properties={...this.properties};let n=[];if(this.optionalProperties){for(let s of this.optionalProperties)if(!this.properties.hasOwnProperty(s))throw new d(u.INVALID_SCHEMA,`Property "${s}" specified in "optionalProperties" does not exist.`)}for(let s in this.properties)this.properties.hasOwnProperty(s)&&(e.properties[s]=this.properties[s].toJSON(),this.optionalProperties.includes(s)||n.push(s));return n.length>0&&(e.required=n),delete e.optionalProperties,e}},Xe=class extends C{constructor(e){if(e.anyOf.length===0)throw new d(u.INVALID_SCHEMA,"The 'anyOf' array must not be empty.");super({...e,type:void 0}),this.anyOf=e.anyOf}toJSON(){let e=super.toJSON();return this.anyOf&&Array.isArray(this.anyOf)&&(e.anyOf=this.anyOf.map(n=>n.toJSON())),e}};var Ai="audio-processor",Mr=`
  class AudioProcessor extends AudioWorkletProcessor {
    constructor(options) {
      super();
      this.targetSampleRate = options.processorOptions.targetSampleRate;
      // 'sampleRate' is a global variable available inside the AudioWorkletGlobalScope,
      // representing the native sample rate of the AudioContext.
      this.inputSampleRate = sampleRate;
    }

    /**
     * This method is called by the browser's audio engine for each block of audio data.
     * Input is a single input, with a single channel (input[0][0]).
     */
    process(inputs) {
      const input = inputs[0];
      if (input && input.length > 0 && input[0].length > 0) {
        const pcmData = input[0]; // Float32Array of raw audio samples.
        
        // Simple linear interpolation for resampling.
        const resampled = new Float32Array(Math.round(pcmData.length * this.targetSampleRate / this.inputSampleRate));
        const ratio = pcmData.length / resampled.length;
        for (let i = 0; i < resampled.length; i++) {
          resampled[i] = pcmData[Math.floor(i * ratio)];
        }

        // Convert Float32 (-1, 1) samples to Int16 (-32768, 32767)
        const resampledInt16 = new Int16Array(resampled.length);
        for (let i = 0; i < resampled.length; i++) {
          const sample = Math.max(-1, Math.min(1, resampled[i]));
          if (sample < 0) {
            resampledInt16[i] = sample * 32768;
          } else {
            resampledInt16[i] = sample * 32767;
          }
        }
        
        this.port.postMessage(resampledInt16);
      }
      // Return true to keep the processor alive and processing the next audio block.
      return true;
    }
  }

  // Register the processor with a name that can be used to instantiate it from the main thread.
  registerProcessor('${Ai}', AudioProcessor);
`;function tn(t=re(),e){var a,c;t=te(t);let n=J(t,j),s=(a=e==null?void 0:e.backend)!=null?a:new V,i={useLimitedUseAppCheckTokens:(c=e==null?void 0:e.useLimitedUseAppCheckTokens)!=null?c:!1},r=Ws(s),o=n.getImmediate({identifier:r});return o.options=i,o}var Ti=["mode","onDeviceParams","inCloudParams"];function nn(t,e,n){var a;let s=e,i;if(s.mode){for(let c of Object.keys(e))Ti.includes(c)||E.warn(`When a hybrid inference mode is specified (mode is currently set to ${s.mode}), "${c}" cannot be configured at the top level. Configuration for in-cloud and on-device must be done separately in inCloudParams and onDeviceParams. Configuration values set outside of inCloudParams and onDeviceParams will be ignored.`);i=s.inCloudParams||{model:Vs}}else i=e;if(!i.model)throw new d(u.NO_MODEL,"Must provide a model name. Example: getGenerativeModel({ model: 'my-model-name' })");let r=(a=t.chromeAdapterFactory)==null?void 0:a.call(t,s.mode,typeof window=="undefined"?void 0:window,s.onDeviceParams),o=new je(t,i,n,r);return o._apiSettings.inferenceMode=s.mode,o}function Ci(){U(new A(j,Ks,"PUBLIC").setMultipleInstances(!0)),I(Ut,$e),I(Ut,$e,"esm2020")}Ci();var rt=new Map,ln={activated:!1,tokenObservers:[]},Oi={initialized:!1,enabled:!1};function _(t){return rt.get(t)||{...ln}}function Ri(t,e){return rt.set(t,e),rt.get(t)}function me(){return Oi}var un="https://content-firebaseappcheck.googleapis.com/v1",Ii="exchangeRecaptchaV3Token";var Di="exchangeDebugToken",sn={RETRIAL_MIN_WAIT:30*1e3,RETRIAL_MAX_WAIT:960*1e3},vi=1440*60*1e3;var ot=class{constructor(e,n,s,i,r){if(this.operation=e,this.retryPolicy=n,this.getWaitDuration=s,this.lowerBound=i,this.upperBound=r,this.pending=null,this.nextErrorWaitInterval=i,i>r)throw new Error("Proactive refresh lower bound greater than upper bound!")}start(){this.nextErrorWaitInterval=this.lowerBound,this.process(!0).catch(()=>{})}stop(){this.pending&&(this.pending.reject("cancelled"),this.pending=null)}isRunning(){return!!this.pending}async process(e){this.stop();try{this.pending=new O,this.pending.promise.catch(n=>{}),await ki(this.getNextRun(e)),this.pending.resolve(),await this.pending.promise,this.pending=new O,this.pending.promise.catch(n=>{}),await this.operation(),this.pending.resolve(),await this.pending.promise,this.process(!0).catch(()=>{})}catch(n){this.retryPolicy(n)?this.process(!1).catch(()=>{}):this.stop()}}getNextRun(e){if(e)return this.nextErrorWaitInterval=this.lowerBound,this.getWaitDuration();{let n=this.nextErrorWaitInterval;return this.nextErrorWaitInterval*=2,this.nextErrorWaitInterval>this.upperBound&&(this.nextErrorWaitInterval=this.upperBound),n}}};function ki(t){return new Promise(e=>{setTimeout(e,t)})}var Ni={"already-initialized":"You have already called initializeAppCheck() for FirebaseApp {$appName} with different options. To avoid this error, call initializeAppCheck() with the same options as when it was originally called. This will return the already initialized instance.","use-before-activation":"App Check is being used before initializeAppCheck() is called for FirebaseApp {$appName}. Call initializeAppCheck() before instantiating other Firebase services.","fetch-network-error":"Fetch failed to connect to a network. Check Internet connection. Original error: {$originalErrorMessage}.","fetch-parse-error":"Fetch client could not parse response. Original error: {$originalErrorMessage}.","fetch-status-error":"Fetch server returned an HTTP error status. HTTP status: {$httpStatus}.","storage-open":"Error thrown when opening storage. Original error: {$originalErrorMessage}.","storage-get":"Error thrown when reading from storage. Original error: {$originalErrorMessage}.","storage-set":"Error thrown when writing to storage. Original error: {$originalErrorMessage}.","recaptcha-error":"ReCAPTCHA error.","initial-throttle":"{$httpStatus} error. Attempts allowed again after {$time}",throttled:"Requests throttled due to previous {$httpStatus} error. Attempts allowed again after {$time}"},S=new B("appCheck","AppCheck",Ni);function rn(t=!1){var e;return t?(e=self.grecaptcha)==null?void 0:e.enterprise:self.grecaptcha}function lt(t){if(!_(t).activated)throw S.create("use-before-activation",{appName:t.name})}function dn(t){let e=Math.round(t/1e3),n=Math.floor(e/(3600*24)),s=Math.floor((e-n*3600*24)/3600),i=Math.floor((e-n*3600*24-s*3600)/60),r=e-n*3600*24-s*3600-i*60,o="";return n&&(o+=he(n)+"d:"),s&&(o+=he(s)+"h:"),o+=he(i)+"m:"+he(r)+"s",o}function he(t){return t===0?"00":t>=10?t.toString():"0"+t}async function ut({url:t,body:e},n){let s={"Content-Type":"application/json"},i=n.getImmediate({optional:!0});if(i){let f=await i.getHeartbeatsHeader();f&&(s["X-Firebase-Client"]=f)}let r={method:"POST",body:JSON.stringify(e),headers:s},o;try{o=await fetch(t,r)}catch(f){throw S.create("fetch-network-error",{originalErrorMessage:f==null?void 0:f.message})}if(o.status!==200)throw S.create("fetch-status-error",{httpStatus:o.status});let a;try{a=await o.json()}catch(f){throw S.create("fetch-parse-error",{originalErrorMessage:f==null?void 0:f.message})}let c=a.ttl.match(/^([\d.]+)(s)$/);if(!c||!c[2]||isNaN(Number(c[1])))throw S.create("fetch-parse-error",{originalErrorMessage:`ttl field (timeToLive) is not in standard Protobuf Duration format: ${a.ttl}`});let l=Number(c[1])*1e3,h=Date.now();return{token:a.token,expireTimeMillis:h+l,issuedAtTimeMillis:h}}function Li(t,e){let{projectId:n,appId:s,apiKey:i}=t.options;return{url:`${un}/projects/${n}/apps/${s}:${Ii}?key=${i}`,body:{recaptcha_v3_token:e}}}function fn(t,e){let{projectId:n,appId:s,apiKey:i}=t.options;return{url:`${un}/projects/${n}/apps/${s}:${Di}?key=${i}`,body:{debug_token:e}}}var Pi="firebase-app-check-database",Mi=1,Q="firebase-app-check-store",hn="debug-token",pe=null;function pn(){return pe||(pe=new Promise((t,e)=>{try{let n=indexedDB.open(Pi,Mi);n.onsuccess=s=>{t(s.target.result)},n.onerror=s=>{var i;e(S.create("storage-open",{originalErrorMessage:(i=s.target.error)==null?void 0:i.message}))},n.onupgradeneeded=s=>{let i=s.target.result;s.oldVersion===0&&i.createObjectStore(Q,{keyPath:"compositeKey"})}}catch(n){e(S.create("storage-open",{originalErrorMessage:n==null?void 0:n.message}))}}),pe)}function xi(t){return mn(En(t))}function Ui(t,e){return gn(En(t),e)}function Fi(t){return gn(hn,t)}function $i(){return mn(hn)}async function gn(t,e){let s=(await pn()).transaction(Q,"readwrite"),r=s.objectStore(Q).put({compositeKey:t,value:e});return new Promise((o,a)=>{r.onsuccess=c=>{o()},s.onerror=c=>{var l;a(S.create("storage-set",{originalErrorMessage:(l=c.target.error)==null?void 0:l.message}))}})}async function mn(t){let n=(await pn()).transaction(Q,"readonly"),i=n.objectStore(Q).get(t);return new Promise((r,o)=>{i.onsuccess=a=>{let c=a.target.result;r(c?c.value:void 0)},n.onerror=a=>{var c;o(S.create("storage-get",{originalErrorMessage:(c=a.target.error)==null?void 0:c.message}))}})}function En(t){return`${t.options.appId}-${t.name}`}var $=new x("@firebase/app-check");async function Bi(t){if(Y()){let e;try{e=await xi(t)}catch(n){$.warn(`Failed to read token from IndexedDB. Error: ${n}`)}return e}}function st(t,e){return Y()?Ui(t,e).catch(n=>{$.warn(`Failed to write token to IndexedDB. Error: ${n}`)}):Promise.resolve()}async function Hi(t){let e;try{e=await $i()}catch{}if(e)return e;{let n=crypto.randomUUID(),s=`To use this token for app debugging, register it with your project.

Firebase App Check debug token: ${n}

`,i=t==null?void 0:t.options.appId,r=t==null?void 0:t.options.projectId;return r&&i?s+=`You can do so in the Firebase Console:
https://console.firebase.google.com/project/${r}/appcheck/apps?selectedAppId=${i}

Or using the Firebase CLI:
firebase appcheck:debugtokens:create ${n} --project ${r} --app ${i}

`:s+=`You will need to add it to your app's App Check settings in the Firebase Console for it to work.

`,s+=`Note: To keep your project secure, please revoke and delete this token using the
Firebase Console or the CLI (\`firebase appcheck:debugtokens:delete\`) when you finish debugging.

Warning: This debug token is a secret and should not be shared or uploaded to source code.

Debug Token Guide: https://firebase.google.com/docs/app-check/web/debug-provider
Firebase CLI install instructions: https://firebase.google.com/docs/cli
`,console.log(s),Fi(n).catch(o=>$.warn(`Failed to persist debug token to IndexedDB. Error: ${o}`)),n}}function dt(){return me().enabled}async function ft(){let t=me();if(t.enabled&&t.token)return t.token.promise;throw Error(`
            Can't get debug token in production mode.
        `)}function Gi(t){let e=K(),n=me();if(n.initialized=!0,typeof e.FIREBASE_APPCHECK_DEBUG_TOKEN!="string"&&e.FIREBASE_APPCHECK_DEBUG_TOKEN!==!0)return;n.enabled=!0;let s=new O;n.token=s,typeof e.FIREBASE_APPCHECK_DEBUG_TOKEN=="string"?s.resolve(e.FIREBASE_APPCHECK_DEBUG_TOKEN):s.resolve(Hi(t))}var Vi={error:"UNKNOWN_ERROR"};function Wi(t){return Z.encodeString(JSON.stringify(t),!1)}async function at(t,e=!1,n=!1){let s=t.app;lt(s);let i=_(s),r=i.token,o;if(r&&!z(r)&&(i.token=void 0,r=void 0),!r){let l=await i.cachedTokenPromise;l&&(z(l)?r=l:await st(s,void 0))}if(!e&&r&&z(r))return{token:r.token};let a=!1;if(dt())try{let l=await ft();i.exchangeTokenPromise||(i.exchangeTokenPromise=ut(fn(s,l),t.heartbeatServiceProvider).finally(()=>{i.exchangeTokenPromise=void 0}),a=!0);let h=await i.exchangeTokenPromise;return await st(s,h),i.token=h,{token:h.token}}catch(l){return l.code==="appCheck/throttled"||l.code==="appCheck/initial-throttle"?$.warn(l.message):n&&$.error(l),it(l)}try{i.exchangeTokenPromise||(i.exchangeTokenPromise=i.provider.getToken().finally(()=>{i.exchangeTokenPromise=void 0}),a=!0),r=await _(s).exchangeTokenPromise}catch(l){l.code==="appCheck/throttled"||l.code==="appCheck/initial-throttle"?$.warn(l.message):n&&$.error(l),o=l}let c;return r?o?z(r)?c={token:r.token,internalError:o}:c=it(o):(c={token:r.token},i.token=r,await st(s,r)):c=it(o),a&&yn(s,c),c}async function ji(t){let e=t.app;lt(e);let{provider:n}=_(e);if(dt()){let s=await ft(),i=fn(e,s);i.body.limited_use=!0;let{token:r}=await ut(i,t.heartbeatServiceProvider);return{token:r}}else{let{token:s}=await n.getToken(!0);return{token:s}}}function _n(t,e,n,s){let{app:i}=t,r=_(i),o={next:n,error:s,type:e};if(r.tokenObservers=[...r.tokenObservers,o],r.token&&z(r.token)){let a=r.token;Promise.resolve().then(()=>{n({token:a.token}),on(t)}).catch(()=>{})}r.cachedTokenPromise.then(()=>on(t))}function bn(t,e){let n=_(t),s=n.tokenObservers.filter(i=>i.next!==e);s.length===0&&n.tokenRefresher&&n.tokenRefresher.isRunning()&&n.tokenRefresher.stop(),n.tokenObservers=s}function on(t){let{app:e}=t,n=_(e),s=n.tokenRefresher;s||(s=zi(t),n.tokenRefresher=s),!s.isRunning()&&n.isTokenAutoRefreshEnabled&&s.start()}function zi(t){let{app:e}=t;return new ot(async()=>{let n=_(e),s;if(n.token?s=await at(t,!0):s=await at(t),s.error)throw s.error;if(s.internalError)throw s.internalError},()=>!0,()=>{let n=_(e);if(n.token){let s=n.token.issuedAtTimeMillis+(n.token.expireTimeMillis-n.token.issuedAtTimeMillis)*.5+3e5,i=n.token.expireTimeMillis-300*1e3;return s=Math.min(s,i),Math.max(0,s-Date.now())}else return 0},sn.RETRIAL_MIN_WAIT,sn.RETRIAL_MAX_WAIT)}function yn(t,e){let n=_(t).tokenObservers;for(let s of n)try{s.type==="EXTERNAL"&&e.error!=null?s.error(e.error):s.next(e)}catch{}}function z(t){return t.expireTimeMillis-Date.now()>0}function it(t){return{token:Wi(Vi),error:t}}var ct=class{constructor(e,n){this.app=e,this.heartbeatServiceProvider=n}_delete(){let{tokenObservers:e}=_(this.app);for(let n of e)bn(this.app,n.next);return Promise.resolve()}};function Ki(t,e){return new ct(t,e)}function Yi(t){return{getToken:e=>at(t,e),getLimitedUseToken:()=>ji(t),addTokenListener:e=>_n(t,"INTERNAL",e),removeTokenListener:e=>bn(t.app,e)}}var qi="@firebase/app-check",Ji="0.13.1";var Xi="https://www.google.com/recaptcha/api.js";function Qi(t,e){let n=new O,s=_(t);s.reCAPTCHAState={initialized:n};let i=Zi(t),r=rn(!1);return r?an(t,e,r,i,n):nr(()=>{let o=rn(!1);if(!o)throw new Error("no recaptcha");an(t,e,o,i,n)}),n.promise}function an(t,e,n,s,i){n.ready(()=>{tr(t,e,n,s),i.resolve(n)})}function Zi(t){let e=`fire_app_check_${t.name}`,n=document.createElement("div");return n.id=e,n.style.display="none",document.body.appendChild(n),e}async function er(t){lt(t);let n=await _(t).reCAPTCHAState.initialized.promise;return new Promise((s,i)=>{let r=_(t).reCAPTCHAState;n.ready(()=>{s(n.execute(r.widgetId,{action:"fire_app_check"}))})})}function tr(t,e,n,s){let i=n.render(s,{sitekey:e,size:"invisible",callback:()=>{_(t).reCAPTCHAState.succeeded=!0},"error-callback":()=>{_(t).reCAPTCHAState.succeeded=!1}}),r=_(t);r.reCAPTCHAState={...r.reCAPTCHAState,widgetId:i}}function nr(t){let e=document.createElement("script");e.src=Xi,e.onload=t,document.head.appendChild(e)}var ge=class t{constructor(e){this._siteKey=e,this._throttleData=null}async getToken(e=!1){var i,r,o;ir(this._throttleData);let n=await er(this._app).catch(a=>{throw S.create("recaptcha-error")});if(!((i=_(this._app).reCAPTCHAState)!=null&&i.succeeded))throw S.create("recaptcha-error");let s;try{let a=Li(this._app,n);e&&(a.body.limited_use=!0),s=await ut(a,this._heartbeatServiceProvider)}catch(a){throw(r=a.code)!=null&&r.includes("fetch-status-error")?(this._throttleData=sr(Number((o=a.customData)==null?void 0:o.httpStatus),this._throttleData),S.create("initial-throttle",{time:dn(this._throttleData.allowRequestsAfter-Date.now()),httpStatus:this._throttleData.httpStatus})):a}return this._throttleData=null,s}initialize(e){this._app=e,this._heartbeatServiceProvider=J(e,"heartbeat"),Qi(e,this._siteKey).catch(()=>{})}isEqual(e){return e instanceof t?this._siteKey===e._siteKey:!1}};function sr(t,e){if(t===404||t===403)return{backoffCount:1,allowRequestsAfter:Date.now()+vi,httpStatus:t};{let n=e?e.backoffCount:0,s=wt(n,1e3,2);return{backoffCount:n+1,allowRequestsAfter:Date.now()+s,httpStatus:t}}}function ir(t){if(t&&Date.now()-t.allowRequestsAfter<=0)throw S.create("throttled",{time:dn(t.allowRequestsAfter-Date.now()),httpStatus:t.httpStatus})}function wn(t=re(),e){var i;t=te(t);let n=J(t,"app-check");if(me().initialized||Gi(t),dt()&&ft().then(r=>{console.log(`Firebase App Check debug token: ${r}`)}),n.isInitialized()){let r=n.getImmediate(),o=n.getOptions();if(o&&!!o.isTokenAutoRefreshEnabled==!!e.isTokenAutoRefreshEnabled&&((i=o.provider)!=null&&i.isEqual(e.provider)))return r;throw S.create("already-initialized",{appName:t.name})}let s=n.initialize({options:e});return rr(t,e.provider,e.isTokenAutoRefreshEnabled),_(t).isTokenAutoRefreshEnabled&&_n(s,"INTERNAL",()=>{}),s}function rr(t,e,n=!1){let s=Ri(t,{...ln});s.activated=!0,s.provider=e,s.cachedTokenPromise=Bi(t).then(i=>(i&&z(i)&&(s.token=i,yn(t,{token:i.token})),i)),s.isTokenAutoRefreshEnabled=n&&t.automaticDataCollectionEnabled,!t.automaticDataCollectionEnabled&&n&&$.warn("`isTokenAutoRefreshEnabled` is true but `automaticDataCollectionEnabled` was set to false during `initializeApp()`. This blocks automatic token refresh."),s.provider.initialize(t)}var or="app-check",cn="app-check-internal";function ar(){U(new A(or,t=>{let e=t.getProvider("app").getImmediate(),n=t.getProvider("heartbeat");return Ki(e,n)},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((t,e,n)=>{t.getProvider(cn).initialize()})),U(new A(cn,t=>{let e=t.getProvider("app-check").getImmediate();return Yi(e)},"PUBLIC").setInstantiationMode("EXPLICIT")),I(qi,Ji)}ar();window.FirebaseAI={initializeApp:Pe,getAI:tn,getGenerativeModel:nn,GoogleAIBackend:V,Schema:C,initializeAppCheck:wn,ReCaptchaV3Provider:ge};})();
/*! Bundled license information:

@firebase/util/dist/index.esm.js:
@firebase/util/dist/index.esm.js:
@firebase/util/dist/index.esm.js:
@firebase/util/dist/index.esm.js:
@firebase/util/dist/index.esm.js:
@firebase/util/dist/index.esm.js:
@firebase/util/dist/index.esm.js:
@firebase/util/dist/index.esm.js:
@firebase/util/dist/index.esm.js:
@firebase/util/dist/index.esm.js:
@firebase/logger/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2025 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm.js:
@firebase/ai/dist/esm/index.esm.js:
@firebase/ai/dist/esm/index.esm.js:
@firebase/ai/dist/esm/index.esm.js:
@firebase/ai/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2025 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/component/dist/esm/index.esm.js:
@firebase/app/dist/esm/index.esm.js:
@firebase/app/dist/esm/index.esm.js:
@firebase/app/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2023 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

firebase/app/dist/esm/index.esm.js:
@firebase/app-check/dist/esm/index.esm.js:
@firebase/app-check/dist/esm/index.esm.js:
@firebase/app-check/dist/esm/index.esm.js:
@firebase/app-check/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/ai/dist/esm/index.esm.js:
@firebase/ai/dist/esm/index.esm.js:
@firebase/ai/dist/esm/index.esm.js:
@firebase/ai/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2024 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/ai/dist/esm/index.esm.js:
@firebase/ai/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2024 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2025 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/ai/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2025 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2024 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/ai/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2026 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2024 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2025 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/ai/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2026 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app-check/dist/esm/index.esm.js:
@firebase/app-check/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
*/
