import { durum, yeniler, TOPLAM, BASARIMLAR, GRUPLAR } from '/Users/vtredi/minihub/games/dragon/basarimlar.js';
let ok=0, kotu=0;
const t=(ad,sart,ek='')=>{ if(sart){ok++;console.log('OK  ',ad);} else {kotu++;console.log('FAIL',ad,ek);} };

t(`toplam rozet ${TOPLAM} (33 bekleniyor)`, TOPLAM===33, `-> ${TOPLAM}`);
t('rozet kimlikleri tekil', new Set(BASARIMLAR.map(b=>b.id)).size===TOPLAM);
t('hedefler artan sirada', GRUPLAR.every(g=>g.hedefler.every((h,i)=>i===0||h>g.hedefler[i-1])));

// bos oyuncu: hicbir rozet yok (unlock hedefi 1 ama sayac 0)
const bos={sayaclar:{merges:0,feeds:0,collects:0,chests:0,unlocks:0,maxEggLv:0,maxPackLv:0},dragons:[]};
t('yeni oyuncu 0 rozet', durum(bos).kazanilan.length===0, `-> ${durum(bos).kazanilan.length}`);

// baslangic oyuncusu: 1 ejderha var -> surue hedefi 2, henuz yok; turler hedefi 3, yok
const bas={...bos, dragons:[{look:{tur:'ember'}}]};
t('tek ejderhayla hala 0 rozet', durum(bas).kazanilan.length===0);

// gercekci bir oyuncu
const o={ sayaclar:{merges:120,feeds:15,collects:600,chests:5,unlocks:4,maxEggLv:5,maxPackLv:2},
          dragons:[{look:{tur:'ember'}},{look:{tur:'ocean'}},{look:{tur:'ocean'}},{look:{tur:'aqua'}}] };
const d=durum(o);
const bekle=['merge10','merge100','feed10','collect10','collect100','collect500',
             'chest5','unlock1','unlock4','egglv3','egglv5','packlv2','surue2','turler3'];
t('dogru rozetler kazanildi', JSON.stringify(d.kazanilan.sort())===JSON.stringify(bekle.sort()),
  `\n  bulunan: ${d.kazanilan.join(',')}\n  beklenen: ${bekle.join(',')}`);

const g=(id)=>d.gruplar.find(x=>x.id===id);
t('merge siradaki hedef 500', g('merge').sonraki===500, `-> ${g('merge').sonraki}`);
t('merge ilerleme 120/500', Math.abs(g('merge').ilerleme-0.24)<1e-9, `-> ${g('merge').ilerleme}`);
t('turler farkli sayiyor (4 ejderha, 3 tur)', g('turler').deger===3, `-> ${g('turler').deger}`);
t('collect hepsi bitmedi, sonraki 2000', g('collect').sonraki===2000);

// hepsi tamam olan oyuncu
const tam={ sayaclar:{merges:9999,feeds:9999,collects:9999,chests:9999,unlocks:9,maxEggLv:10,maxPackLv:4},
            dragons:Array.from({length:25},(_,i)=>({look:{tur:'t'+(i%11)}})) };
t('her sey bitince 33/33', durum(tam).kazanilan.length===33, `-> ${durum(tam).kazanilan.length}`);
t('bitince sonraki null', durum(tam).gruplar.every(x=>x.sonraki===null));
t('bitince ilerleme 1', durum(tam).gruplar.every(x=>x.ilerleme===1));

// yeniler()
t('yeniler: hic gosterilmediyse hepsi yeni', yeniler(o,[]).length===14);
t('yeniler: gosterilenler cikariliyor', yeniler(o,['merge10','feed10']).length===12);
t('yeniler: hepsi gosterildiyse bos', yeniler(o,d.kazanilan).length===0);

// bozuk veriye dayaniklilik
t('undefined oyuncu cokmuyor', durum(undefined).kazanilan.length===0);
t('eksik alanlar cokmuyor', durum({}).kazanilan.length===0);
t('negatif sayac cokmuyor', durum({sayaclar:{merges:-5}}).kazanilan.length===0);

console.log(`\n${ok} basarili, ${kotu} basarisiz`);
process.exit(kotu?1:0);
