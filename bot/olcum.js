/* OLCUM — "oyuncu geri geliyor mu" sorusunun cevabi.
 *
 * NEDEN VAR: 25 Ekim 2026 itibariyla kodun hicbir yerinde olay kaydi yoktu.
 * players tablosunda yalnizca created_at (kayit) ve updated_at (son islem)
 * duruyordu; bu ikisiyle "3. gun geldi, 4. gun gelmedi, 7. gun dondu"
 * sorusu CEVAPLANAMIYOR. Yeni bir ozelligin ise yarayip yaramadigini
 * olcemeden eklemek, karanlikta atis yapmak demek.
 *
 * NE TUTUYOR: oyuncu basina, oyunu actigi HER GUN icin tek bir satir.
 * Baska hicbir sey. Hangi oyunu oynadigi, ne kadar kaldigi, ne harcadigi
 * tutulmuyor - "geri dondu mu" sorusu icin gun yetiyor.
 *
 * NEREYE YAZILIYOR: yalnizca /api/sync'e, yani uygulama her acildiginda
 * bir kez. Her API cagrisina yazmak gunde binlerce gereksiz yazma olurdu;
 * oturum basina tek yazma hem yeterli hem ucuz. INSERT OR IGNORE oldugu
 * icin ayni gun tekrar acmak yeni satir uretmiyor.
 *
 * GIZLILIK: Telegram kullanici kimligi disinda kisisel veri yok, veri
 * hicbir dis servise gitmiyor, kendi D1 veritabanimizda duruyor.
 *
 * KAPATMA: OLCUM_ACIK = false yapmak yazmayi da okumayi da durdurur.
 * Tablo yerinde kalir, veri kaybolmaz.
 */

export const OLCUM_ACIK = true;

/* Gun siniri UTC. Yerel saat kullanmak, oyuncunun saat diliminde gece
   yarisi gecince ayni oturumun iki guna bolunmesine yol acardi. */
export const gunAdi = (ms) => new Date(ms).toISOString().slice(0, 10);

/* Oyuncunun bugun aktif oldugunu isaretler. Ayni gun tekrar cagrilmasi
   zararsiz ve sonucu degistirmiyor.
   Olcum HICBIR ZAMAN oyunu bozmamali: yazma basarisiz olursa sessizce
   gecilir, cagiran taraf bundan etkilenmez. */
export async function gunuIsaretle(env, playerId, now = Date.now()) {
  if (!OLCUM_ACIK) return;
  try {
    await env.DB.prepare(
      'INSERT OR IGNORE INTO gun_aktif (player_id, gun) VALUES (?, ?)',
    ).bind(String(playerId), gunAdi(now)).run();
  } catch {
    /* Tablo henuz kurulmamis olabilir (schema.sql calistirilmadan once).
       Olcum yoksa oyun yine calisir; sessiz gecmek dogru davranis. */
  }
}

/* GERI DONUS ORANI.
 *
 * Tanim: belirli bir gun KAYIT OLAN oyunculardan kaci, kayittan N gun
 * sonra oyunu tekrar acti.
 *
 * D1 (birinci gun) oyunun ilk izlenimini olcer: oyuncu ertesi gun geri
 * geldi mi. D7 (yedinci gun) aliskanlik olusup olusmadigini olcer.
 *
 * Bir gun, ancak uzerinden N gun GECTIYSE hesaplanabilir: dun kaydolan
 * birinin 7. gun donup donmedigi henuz bilinmiyor. O yuzden sorgu
 * yalnizca olgunlasmis gunleri dondurur.
 */
export async function geriDonus(env, n, gunSayisi = 14) {
  if (!OLCUM_ACIK) return { kapali: true };
  const gunMs = 86400000;
  const simdi = Date.now();
  const satirlar = [];

  for (let i = n + 1; i <= n + gunSayisi; i++) {
    const kayitGunu = gunAdi(simdi - i * gunMs);
    const donusGunu = gunAdi(simdi - (i - n) * gunMs);

    const r = await env.DB.prepare(`
      SELECT
        COUNT(*) AS kayit,
        SUM(CASE WHEN EXISTS (
          SELECT 1 FROM gun_aktif g WHERE g.player_id = p.id AND g.gun = ?
        ) THEN 1 ELSE 0 END) AS donen
      FROM players p
      WHERE date(p.created_at / 1000, 'unixepoch') = ?
    `).bind(donusGunu, kayitGunu).first();

    const kayit = Number(r?.kayit || 0);
    if (!kayit) continue;
    const donen = Number(r?.donen || 0);
    satirlar.push({
      kayitGunu, kayit, donen,
      oran: Math.round((donen / kayit) * 1000) / 10,
    });
  }

  const kayitTop = satirlar.reduce((t, s) => t + s.kayit, 0);
  const donenTop = satirlar.reduce((t, s) => t + s.donen, 0);
  return {
    gun: n,
    gunler: satirlar,
    toplam: {
      kayit: kayitTop,
      donen: donenTop,
      oran: kayitTop ? Math.round((donenTop / kayitTop) * 1000) / 10 : null,
    },
  };
}

/* Gunluk aktif oyuncu (DAU) — son `gunSayisi` gun. */
export async function gunlukAktif(env, gunSayisi = 14) {
  if (!OLCUM_ACIK) return { kapali: true };
  const r = await env.DB.prepare(`
    SELECT gun, COUNT(*) AS oyuncu
    FROM gun_aktif
    WHERE gun >= date('now', ?)
    GROUP BY gun
    ORDER BY gun DESC
  `).bind(`-${gunSayisi} days`).all();
  return (r?.results || []).map((x) => ({ gun: x.gun, oyuncu: Number(x.oyuncu) }));
}

/* Sahip ekranina giden ozet. */
export async function ozet(env) {
  if (!OLCUM_ACIK) return { kapali: true };
  const [d1, d7, dau] = await Promise.all([
    geriDonus(env, 1),
    geriDonus(env, 7),
    gunlukAktif(env),
  ]);
  const toplamOyuncu = await env.DB.prepare('SELECT COUNT(*) AS n FROM players').first();
  const olcumBasladi = await env.DB.prepare('SELECT MIN(gun) AS ilk FROM gun_aktif').first();
  return {
    acik: true,
    toplamOyuncu: Number(toplamOyuncu?.n || 0),
    olcumBasladi: olcumBasladi?.ilk || null,
    d1, d7, dau,
  };
}
