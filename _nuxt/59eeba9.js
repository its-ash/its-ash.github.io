(window.webpackJsonp=window.webpackJsonp||[]).push([[5],{430:function(t,e,n){var content=n(464);content.__esModule&&(content=content.default),"string"==typeof content&&(content=[[t.i,content,""]]),content.locals&&(t.exports=content.locals);(0,n(51).default)("3d649645",content,!0,{sourceMap:!1})},463:function(t,e,n){"use strict";n(430)},464:function(t,e,n){var r=n(50)((function(i){return i[1]}));r.push([t.i,"pre{border-radius:3px;padding:10px}",""]),r.locals={},t.exports=r},574:function(t,e,n){"use strict";n.r(e);var r=n(14),o=(n(63),{name:"_slug",data:function(){return{post:{}}},methods:{},fetch:function(){var t=this;return Object(r.a)(regeneratorRuntime.mark((function e(){var n;return regeneratorRuntime.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.next=2,t.$content().where({slug:t.$route.params.slug}).limit(1).fetch();case 2:if(e.t1=n=e.sent,e.t0=null===e.t1,e.t0){e.next=6;break}e.t0=void 0===n;case 6:if(!e.t0){e.next=10;break}e.t2=void 0,e.next=11;break;case 10:e.t2=n[0];case 11:t.post=e.t2;case 12:case"end":return e.stop()}}),e)})))()}}),c=(n(463),n(89)),component=Object(c.a)(o,(function(){var t=this,e=t._self._c;return e("div",{staticClass:"max-w-3xl mx-auto min-h-screen my-12"},[t.post?e("div",[e("h1",{staticClass:"font-weight-bold"},[t._v(t._s(t.post.title))]),t._v(" "),e("nuxt-content",{attrs:{document:t.post}}),t._v(" "),e("div",{staticClass:"mt-8"},[e("nuxt-link",{staticClass:"text-decoration-none",attrs:{to:"/"}},[t._v("← Back to blog")])],1)],1):t._e()])}),[],!1,null,null,null);e.default=component.exports}}]);