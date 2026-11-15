// Telefonda kalan veri deposu. Sayfa kodunun beklediği küçük veritabanı arayüzünü
// (collection/doc, add, update, set, delete, onSnapshot) tarayıcı hafızası üzerinde sağlar.
// Veri yapısı ileride Firebase'e taşınmaya hazır: koleksiyon -> { belgeKimliği: veri }.
// Fotoğraflar burada değil, ayrı bir depoda (IndexedDB) durur; bkz. index.html "Fotoğraflar".
(function(){
  var KEY = 'dugun-plani-v1';
  var data = null, listeners = [];

  function migrate(d, beforeKey){
    if(!window.MIGRATE) return d;
    var before = JSON.stringify(d);
    d = window.MIGRATE(d);
    if(JSON.stringify(d) !== before && beforeKey){
      // Geçişten önceki hali bir kez saklanır; bir sorun olursa geri dönülebilir.
      try { if(!localStorage.getItem(beforeKey)) localStorage.setItem(beforeKey, before); } catch(e){}
    }
    return d;
  }
  function load(){
    try { data = JSON.parse(localStorage.getItem(KEY)); } catch(e){ data = null; }
    if(!data || typeof data !== 'object') data = JSON.parse(JSON.stringify(window.SEED));
    data = migrate(data, KEY + '-surum1-yedek');
    save();
  }
  function save(){
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch(e){ alert('Kaydedilemedi: telefonun hafızası dolu olabilir.'); throw e; }
  }
  function newId(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
  function coll(name){ return data[name] || (data[name] = {}); }
  function snapFor(name){
    var c = coll(name);
    var docs = Object.keys(c).sort().map(function(id){ var v=c[id]; return {id:id, exists:true, data:function(){ return v; }}; });
    return {docs:docs, size:docs.length, empty:!docs.length};
  }
  function notify(name){
    listeners.forEach(function(l){ if(l.name === name) setTimeout(function(){ l.fn(l.doc ? docSnap(l.name, l.doc) : snapFor(name)); }, 0); });
  }
  function docSnap(name, id){ var v = coll(name)[id]; return {id:id, exists:!!v, data:function(){ return v; }}; }

  function docRef(name, id){
    return {
      id: id,
      get: function(){ return Promise.resolve(docSnap(name,id)); },
      set: function(v){ coll(name)[id] = JSON.parse(JSON.stringify(v)); save(); notify(name); return Promise.resolve(); },
      update: function(v){ var c=coll(name); if(!c[id]) return Promise.reject({code:'not_found'}); c[id] = Object.assign({}, c[id], JSON.parse(JSON.stringify(v))); save(); notify(name); return Promise.resolve(); },
      delete: function(){ delete coll(name)[id]; save(); notify(name); return Promise.resolve(); },
      onSnapshot: function(fn){ var l={name:name, doc:id, fn:fn}; listeners.push(l); setTimeout(function(){ fn(docSnap(name,id)); },0); return function(){ listeners.splice(listeners.indexOf(l),1); }; }
    };
  }

  load();
  try { if(navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch(e){}

  window.LocalDB = {
    collection: function(name){
      return {
        doc: function(id){ return docRef(name, id || newId()); },
        add: function(v){ var id = newId(); return docRef(name,id).set(v).then(function(){ return docRef(name,id); }); },
        onSnapshot: function(fn){ var l={name:name, fn:fn}; listeners.push(l); setTimeout(function(){ fn(snapFor(name)); },0); return function(){ listeners.splice(listeners.indexOf(l),1); }; }
      };
    },
    doc: function(path){ var p = path.split('/'); return docRef(p[0], p[1]); },
    exportJSON: function(){ return JSON.stringify({app:'dugun-plani', version:2, exportedAt:new Date().toISOString(), data:data}); },
    importJSON: function(text){
      var o = JSON.parse(text); var d = o && o.data;
      if(!d || typeof d !== 'object' || !d.events) throw new Error('Bu dosya bir plan yedeği değil.');
      try { localStorage.setItem(KEY + '-yukleme-oncesi', JSON.stringify(data)); } catch(e){}
      data = migrate(d, null); save();
      var names = {}; listeners.forEach(function(l){ names[l.name] = 1; }); Object.keys(data).forEach(function(n){ names[n] = 1; });
      Object.keys(names).forEach(notify);
    }
  };
})();
