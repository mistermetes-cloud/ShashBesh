# ShashBesh — oyun kuralları

DRAFT_REVIEW_REQUIRED. Ana dili Türkçe olan bağımsız bir editör tarafından doğrulanmadı. Rusça kaynak ve sahibin GAME UPDATE 06 onayı esas alınır. Diğer açık yorumlar onaylanmış sayılmaz.

## Tahta ve amaç

2–4 oyuncu, kişi başına beş taş. Beş yuva hücresini en uzak noktadan başlayarak bitişik biçimde dolduran ilk oyuncu kazanır. Dış yol 48 hücreden oluşur: 1→2→…→48→1. Hareket artan numaralara doğrudur. Başlangıçlar P1=1, P2=13, P3=25, P4=37. Her yuva ortak dış başlangıç hücresini ve dört iç hücreyi içerir: P1 için 1, Д1.2, Д1.3, Д1.4, Д1.5. Diğer oyuncuların yuvaları da aynı yapıdadır. Toplam 64 fiziksel hücre vardır. Köşeler 7, 19, 31, 43; kesin yerleşimi CSV belirler. Renkler P1 siyah, P2 kırmızı, P3 mavi, P4 sarıdır.

## Başlangıç ve sıra

Her oyuncu bir zar atar. En yüksek atan başlar; en yüksek değerde eşitlik varsa yalnızca eşit oyuncular tekrar atar. Sıra saat yönünde ilerler. Diğerleri aktif oyuncunun tüm ek atışlarını bitirmesini bekler.

## Zarlar ve hamleler

İki bağımsız altı yüzlü zar atılır. a–b, a ve b değerlerinde iki ayrı hamle verir. Her çift n–n dört ayrı n hamlesi ve ek atış verir. 6–6 dört altıdır; iki veya üç değildir. 6–5 ya da 5–6, altı ve beş hamlelerinin ardından ek atış verir. Art arda ek atış sayısı sınırsızdır. Her atış sonrakinden önce tamamen oynanıp kaydedilir; değerler başka atışa taşınamaz.

Zorunlu köşe sıçramaları ve tüm geçerli devamlar dikkate alınarak mümkün olan en yüksek hamle değeri toplamı kullanılmalıdır. 6+3 kullanılabiliyorsa üçü engelleyen bir altı hamlesi seçilemez. Yalnızca beş veya üç kullanılabiliyorsa beş kullanılır. Aynı en yüksek toplamı veren seçenekler arasında oyuncu karar verir.

## Giriş, engeller ve taş alma

Yedek taş bir altı hamlesiyle kendi başlangıcına girer; altı hücre ilerlemez. Başlangıçta kendi taşı varsa giriş yasaktır; rakip varsa alınır. Bir hücrede tek taş bulunur. Kendi taşınızın üzerinden geçemez, sıçrayamaz veya üstüne gelemezsiniz. Rakiplerin üzerinden geçilebilir.

Taş alma hamlesini seçmek isteğe bağlıdır. Bir rakibi alma olanağı başka bir geçerli hamleyi yasaklamaz. Ancak seçilen hamle rakibin üstünde biterse rakip otomatik olarak yedeğe döner ve yol ilerlemesi sıfırlanır. Çiftler, bloklar, taş yığınları veya belirtilmemiş güvenli hücreler yoktur.

## Zorunlu köşe sıçraması

Köşe döngüsü: 31→43→7→19→31. Köşede duran bir taşla, kullanılmamış 1 varsa ve sıçrama geçerliyse önce bu 1 ile sıçramak zorunludur. Bu 1 başka taşa normal hamle olarak harcanamaz. Birden fazla geçerli köşe varsa kurallara ve en yüksek toplama uyan seçenekler korunur.

Köşeye varma davranışı korunur: 40'tan 3–1 ile önce 40→41→42→43 hareketi üçü kullanır; sonra 43'ten 7'ye sıçrama ayrı 1'i kullanır. Sıçrama ücretsiz değildir. 1–2 ile önce sıçrama yapılır, ardından oyuncu kalan 2 ile istediği geçerli hamleyi seçer; 2 otomatik harcanmaz ve aynı taşı sürdürmek zorunlu değildir. Kalan 1'ler yeni geçerli köşe sıçramaları doğurursa öncelik yeniden uygulanır.

Sıçrama gerçek yol ilerlemesini 12 artırır ama yalnızca bir 1 tüketir. Kendi taşları yaklaşma yolunu ve sıçramanın tüm 12 hücresini engeller. Aradaki rakipler yerinde kalır; yalnızca varış hücresindeki rakip alınır. Geçersiz sıçrama zorlanmaz; olağan geçerli hamleler değerlendirilir. Kullanılabilir 1 yoksa köşeye varmak tek başına öncelik doğurmaz. Yuva girişini sıçrayarak geçme için mevcut `jumpEntry: skip` yorumu korunur. Başka açık sorular çözülmüş sayılmaz.

## Yuva ve bitiş

Dış tur tamamlandıktan sonra kendi girişine gelen taş yuvaya döner; isteyerek yeni tura başlayamaz. Zorunlu sıçrama ek tur doğurabilir. Dört iç yuva hücresi korunur; rakipler giremez veya taş alamaz. Birden fazla hareketli taş yuvada bulunabilir ama birbirinin üzerinden geçemez ve aynı hücreyi paylaşamaz.

Tam zar değeri gerekir: son hücre veya bitiş aşılamaz. Büyük gelen değer başka bir taşla kullanılabilir. Taşlar en uzak uçtan başlayarak kalıcı biçimde sabitlenir: Д1.5, Д1.4, Д1.3, Д1.2, ardından tam tur sonrası ortak başlangıç hücresi. Diğer oyuncular için de aynı sıra geçerlidir. Beş yeri doldurmak oyunu anında bitirir. Zorunlu sıçrama yokken 1–1 ile Д1.3'teki A ve Д1.2'deki B sırasıyla A→Д1.4, B→Д1.3, A→Д1.5, B→Д1.4 oynayabilir.

Hiç geçerli hamle kalmadığında atış mevcut Core kurallarıyla tamamlanır; ek atış hakkı varsa aynı oyuncuda kalır. Fiziksel masadan düşen zar modellenmez. Kayıttaki özet zinciri yerel bir bütünlük denetimidir; bahis veya blokzincir anlamına gelmez.
