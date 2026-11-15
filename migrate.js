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
    ['nikah-4','Damadın işyerinden görev yeri belgesi al (eş durumu için)','Damat',true,''],
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
