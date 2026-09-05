// Old sign-in bookmarks use the same popup as every current entry point.
const params=new URLSearchParams(location.search),query=new URLSearchParams({signin:'1'});
try{const raw=params.get('return');if(raw){const url=new URL(raw,location.origin);if(url.origin===location.origin&&!url.pathname.endsWith('/login.html'))query.set('return',url.pathname+url.search+url.hash);}}catch(_e){}
location.replace('index.html?'+query.toString());
