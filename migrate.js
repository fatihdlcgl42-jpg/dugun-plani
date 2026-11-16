// Eski kayıtları yeni yapıya taşır. Hiçbir kullanıcı verisini silmez; sadece ekler ve düzeltir.
// Hem telefondaki veride hem de yüklenen eski yedeklerde çalışır.
window.MIGRATE = function(d){
  if(!d || typeof d !== 'object') return d;
  d.settings = d.settings || {};
  var meta = d.settings.meta || {};
  if((meta.schema || 1) < 2) v2(d);
  if((d.settings.meta.schema || 1) < 3){
    // Sürüm 3: "kim yapacak" isteğe bağlı. Hazır gelen işlerdeki kişi atamaları kaldırılır;
    // kullanıcının kendi eklediği işlerdeki seçim korunur.
    var tt = d.tasks || {};
    Object.keys(tt).forEach(function(id){ if(!tt[id].createdAt) tt[id].who = ''; });
    d.settings.meta.schema = 3;
  }
  if(d.settings.meta.schema < 4){
    // Sürüm 4: "Damat / Kız tarafı" yerine isimler.
    var M = {'Damat':'Fatih','Gelin':'Merve','Damat tarafı':"Fatih'in ailesi",'Kız tarafı':"Merve'nin ailesi",'Gelin tarafı':"Merve'nin ailesi"};
    var fix = function(v){ return (typeof v === 'string' && M[v]) ? M[v] : v; };
    var pp = d.settings.people;
    if(pp) Object.keys(pp).forEach(function(k){
      if(Array.isArray(pp[k])){ var out = []; pp[k].forEach(function(v){ v = fix(v); if(out.indexOf(v) < 0) out.push(v); }); pp[k] = out; }
    });
    var fields = {tasks:['who'], schedule:['who'], expenses:['paidBy'], payments:['paidBy'], ceyiz:['buyer'], guests:['side']};
    Object.keys(fields).forEach(function(c){
      var coll = d[c] || {};
      Object.keys(coll).forEach(function(id){ fields[c].forEach(function(f){ coll[id][f] = fix(coll[id][f]); }); });
    });
    var T = [['Damadın işyerinden',"Fatih'in işyerinden"],['Damat tarafının',"Fatih'in ailesinin"],['Kız tarafının',"Merve'nin ailesinin"]];
    var tk = d.tasks || {};
    Object.keys(tk).forEach(function(id){ if(tk[id].createdAt) return; T.forEach(function(r){ if(tk[id].title) tk[id].title = tk[id].title.split(r[0]).join(r[1]); }); });
    d.settings.meta.schema = 4;
  }
  if(d.settings.meta.schema < 5){
    // Sürüm 5: davetli taraflarına arkadaşlar eklendi (liste daha önce değiştirildiyse).
    var ps = d.settings.people;
    if(ps && Array.isArray(ps.sides)){
      ["Fatih'in arkadaşları","Merve'nin arkadaşları"].forEach(function(v){
        if(ps.sides.indexOf(v) < 0){ var i = ps.sides.indexOf('Ortak arkadaş'); if(i < 0) ps.sides.push(v); else ps.sides.splice(i, 0, v); }
      });
    }
    d.settings.meta.schema = 5;
  }
  if(d.settings.meta.schema < 6){
    // Sürüm 6: "damat / gelin / kız" ifadeleri isimlerle değişti; "arkadaşı" -> "arkadaşları".
    var TT = {"Gelinliği seç (dikim ya da kiralık)": "Merve'nin düğün elbisesini seç (dikim ya da kiralık)", "Damatlığı seç": "Fatih'in düğün takımını seç", "Gelin buketi ve yaka çiçeği": "Merve'nin buketi ve Fatih'in yaka çiçeği", "Gelin arabası ve süslemesi": "Düğün arabası ve süslemesi", "Günün akışını yaz: gelin alma, nikâh, ilk dans, takı": "Günün akışını yaz: Merve'yi evden alma, ilk dans, takı", "Gelinlik ve damatlığı teslim al": "Merve'nin elbisesini ve Fatih'in takımını teslim al", "Damat bohçasını hazırla": "Fatih'in bohçasını hazırla", "Kız bohçasını hazırla": "Merve'nin bohçasını hazırla", "Yeri belirle: kız evi, salon ya da restoran; hangi şehirde": "Yeri belirle: Merve'nin ailesinin evi, salon ya da restoran; hangi şehirde", "Damat tarafının getireceklerini konuş (kına, tepsi, hediyeler)": "Fatih'in ailesinin getireceklerini konuş (kına, tepsi, hediyeler)", "Damat tarafının kına ve hediyeleri getirmesi": "Fatih'in ailesinin kına ve hediyeleri getirmesi"};
    var tk6 = d.tasks || {};
    Object.keys(tk6).forEach(function(id){ if(tk6[id].title && TT[tk6[id].title]) tk6[id].title = TT[tk6[id].title]; });
    var A = {"Fatih'in arkadaşı":"Fatih'in arkadaşları","Merve'nin arkadaşı":"Merve'nin arkadaşları"};
    var p6 = d.settings.people;
    if(p6 && Array.isArray(p6.sides)){ var o6=[]; p6.sides.forEach(function(v){ v = A[v] || v; if(o6.indexOf(v) < 0) o6.push(v); }); p6.sides = o6; }
    var g6 = d.guests || {};
    Object.keys(g6).forEach(function(id){ if(A[g6[id].side]) g6[id].side = A[g6[id].side]; });
    d.settings.meta.schema = 6;
  }
  if(d.settings.meta.schema < 7){
    // Sürüm 7: eski "Harcamalar sekmesi" adı "Para" oldu.
    var T7 = {"Toplam bütçeyi belirle, Harcamalar sekmesine gir":"Toplam bütçeyi belirle, Para'ya gir","Bütçeyi konuş, Harcamalar sekmesine gir":"Bütçeyi konuş, Para'ya gir","Kalan ödemeleri planla (Harcamalar sekmesi)":"Kalan ödemeleri planla (Para → Ödemeler)"};
    var tk7 = d.tasks || {};
    Object.keys(tk7).forEach(function(id){ if(T7[tk7[id].title]) tk7[id].title = T7[tk7[id].title]; });
    d.settings.meta.schema = 7;
  }
  return d;
};
function v2(d){
  var meta = d.settings.meta || {};

  var ev = d.events = d.events || {};
  var t = d.tasks = d.tasks || {};

  // İsteme ve söz yapıldı
  if(ev.soz){
    if(ev.soz.name === 'Söz–Nişan') ev.soz.name = 'İsteme & Söz';
    ev.soz.done = true;
    ev.soz.order = 1;
  }
  if(!ev.nikah) ev.nikah = {
    name:'Nikâh', date:'', budget:0, order:2, deadline:'2027-01-18',
    deadlineNote:'Eş durumu (aile birliği) başvurusu için nikâhın bu tarihten önce kıyılmış olması gerekiyor. Tarih tahmini; MEB 2027 takvimini yayımlayınca kontrol edin.'
  };
  if(ev.kina && ev.kina.order === 2) ev.kina.order = 3;
  if(ev.dugun && ev.dugun.order === 3) ev.dugun.order = 4;
  if(!ev.ev) ev.ev = {name:'Ev & Çeyiz', date:'', budget:0, order:5, noPlan:true};

  // Nikâhla ilgili işler düğünden nikâha geçer
  ['dugun-1-4','dugun-2-5','dugun-3-1','dugun-5-1'].forEach(function(id){
    if(t[id] && t[id].event === 'dugun') t[id].event = 'nikah';
  });
  if(t['dugun-1-4'] && t['dugun-1-4'].title === 'Nikâh: belediye mi düğün salonunda mı, tarih için belediyeye danış')
    t['dugun-1-4'].title = 'Nikâh yerini seç (belediye nikâh salonu ya da başka yer), uygun günleri sor';

  var NEW = [
    ['nikah-1','Nikâh tarihini belirle (18 Ocak 2027\'den önce)','İkimiz',true,'Eş durumu başvurusu yarıyıl tatilinden önceki hafta açılabilir. 2026\'da başvuru 14 Ocak\'ta açılmıştı.'],
    ['nikah-2','Evlilik için sağlık raporu al (ikimiz de)','İkimiz',true,'Aile hekiminden alınır; belediyeye başvuruda istenir.'],
    ['nikah-3','Vesikalık fotoğrafları hazırla','İkimiz',false,'Kaç adet istendiğini belediyeye sor.'],
    ['nikah-4',"Fatih'in işyerinden görev yeri belgesi al (eş durumu için)",'Fatih',true,''],
    ['nikah-5','MEB yarıyıl mazeret yer değiştirme takvimini takip et','Merve',true,'2026\'da başvuru 14–19 Ocak, atama 30 Ocak\'tı. 2027 takvimi yayımlanınca tarihleri buraya yaz.'],
    ['nikah-6','Nikâhtan sonra evliliğin e-Devlet\'te göründüğünü kontrol et','İkimiz',true,'Başvurudan önce nüfus kaydına işlenmiş olmalı.'],
    ['nikah-7','Eş durumu başvurusunu MEBBİS\'ten yap','Merve',true,'']
  ];
  NEW.forEach(function(n, i){
    if(!t[n[0]]) t[n[0]] = {event:'nikah', title:n[1], who:n[2], important:n[3], note:n[4], porder:0, order:i+1, done:false, due:'', createdAt:0};
  });

  // Öne çıkan işler
  ['dugun-1-1','dugun-1-3','kina-1-1'].forEach(function(id){ if(t[id] && !t[id].done) t[id].important = true; });
  if(t['dugun-1-1'] && !t['dugun-1-1'].note)
    t['dugun-1-1'].note = 'Yarıyıl tatili 25 Ocak – 5 Şubat 2027: öğretmen ve okul çağında çocuğu olan misafirler katılabilsin.';

  // Ayar listelerine eksik seçenekleri ekle
  var p = d.settings.people;
  if(p){
    var add = {cats:['Ev eşyası','Resmi işlemler'], vtypes:['Mobilya','Beyaz eşya']};
    Object.keys(add).forEach(function(k){
      if(Array.isArray(p[k])) add[k].forEach(function(v){ if(p[k].indexOf(v) < 0) p[k].push(v); });
    });
  }

  meta.schema = 2;
  d.settings.meta = meta;
}
