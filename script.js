// ======================================
// DE GİDİ GOCA MİLAS DE
// Milas Köy Bulma Oyunu
// Bölüm 1
// ======================================
// -------------------------------
// HTML Elemanları
// -------------------------------

const puanYazi = document.getElementById("puan");
const soruYazi = document.getElementById("soru");
const mesaj = document.getElementById("mesaj");
const sureYazi = document.getElementById("sure");
const soruNoYazi = document.getElementById("soruNo");
const baslatBtn = document.getElementById("baslatBtn");
const yenidenBtn = document.getElementById("yenidenBtn");
const oyunSonu = document.getElementById("oyunSonu");
const finalPuan = document.getElementById("finalPuan");
const tekrarBtn = document.getElementById("tekrarBtn");

// -------------------------------
// Oyun Değişkenleri
// -------------------------------

let map;
let geojsonLayer;
let tumKoyler = [];
let aktifKoy = null;
let sorulmayanKoyler = [];
let puan = 0;
let soruNo = 1;
let oyunBasladi = false;
let kalanSure = 800;
let timer = null;
let dogruSayisi = 0;
let yanlisSayisi = 0;
let sonYanlisLayer = null; // Yanlış bilinen köyü hafızada tutmak için
let dogrulukYuzdesi = 0;

// -------------------------------
// Haritayı Oluştur
// -------------------------------

map = L.map("map", {

    zoomControl: true

}).setView([37.32,27.78],10);

// -------------------------------
// Uydu Haritası
// -------------------------------

L.tileLayer(

"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",

{

maxZoom:20,

attribution:"© Esri"

}

).addTo(map);

// -------------------------------
// Köy Stili
// -------------------------------

function normalStil(){

    return{

        color:"#ff0000",

        weight:2,

        fillColor:"#ff0000",

        fillOpacity:0.08

    };

}

// -------------------------------
// Hover Efekti
// -------------------------------

function hover(e){

    let layer=e.target;

    layer.setStyle({

        weight:4,

        color:"#00ffff",

        fillOpacity:0.25

    });

}

// -------------------------------
// Hover Çıkışı
// -------------------------------

function hoverBitis(e){

    geojsonLayer.resetStyle(e.target);

}

// ======================================
// BÖLÜM 2
// GeoJSON Yükleme ve Oyun Başlatma
// ======================================

// -------------------------------
// Köyleri Yükle
// -------------------------------

fetch("KOY.geojson")
    .then(response => response.json())
    .then(data => {

        geojsonLayer = L.geoJSON(data, {

            style: normalStil,

            onEachFeature: function (feature, layer) {

                // Köyü diziye ekle
                tumKoyler.push({
                    ad: feature.properties.AD,
                    layer: layer
                });

                // Fare üzerine gelince
                layer.on("mouseover", hover);

                // Fare çıkınca
                layer.on("mouseout", hoverBitis);

                // Tıklama
                layer.on("click", function () {

                    if (!oyunBasladi) return;

                    koyKontrol(feature, layer);

                });

            }

        }).addTo(map);

        map.fitBounds(geojsonLayer.getBounds());

        mesaj.innerHTML = "Başlat butonuna bas.";

    })
    .catch(function (err) {

        console.error(err);

        mesaj.innerHTML = "KOY.geojson yüklenemedi.";

    });


// -------------------------------
// Rastgele Köy Seç
// -------------------------------

function yeniSoru() {
    // --- YENİ EKLEME: Yeni soruya geçince önceki yanlış köyün stilini sıfırla ---
    if (sonYanlisLayer) {
        geojsonLayer.resetStyle(sonYanlisLayer);
        sonYanlisLayer = null;
    }
    // --------------------------------------------------------------------------
    if (sorulmayanKoyler.length === 0) {

        oyunBitir();
        return;

    }

    let rastgele =
        Math.floor(Math.random() * sorulmayanKoyler.length);

    aktifKoy = sorulmayanKoyler[rastgele];

    // Seçilen köyü listeden çıkar
    sorulmayanKoyler.splice(rastgele, 1);

    soruYazi.innerHTML =
        "📍 <b>" + aktifKoy.ad + "</b> köyünü bulun.";

    soruNoYazi.innerHTML = soruNo;

}
// -------------------------------
// Oyunu Başlat
// -------------------------------

function oyunuBaslat() {

    puan = 0;
    soruNo = 1;
    kalanSure = 800;
    dogruSayisi = 0;
    yanlisSayisi = 0;
    dogrulukYuzdesi = 0;

    oyunBasladi = true;

    // Tüm köyleri kopyala
sorulmayanKoyler = [...tumKoyler];

    puanYazi.innerHTML = puan;
    sureYazi.innerHTML = kalanSure;

    mesaj.innerHTML = "";

    baslatBtn.style.display = "none";
    yenidenBtn.style.display = "inline-block";

    yeniSoru();

    zamanlayici();

}


// -------------------------------
// Butonlar
// -------------------------------

baslatBtn.addEventListener("click", oyunuBaslat);

yenidenBtn.addEventListener("click", function () {

    location.reload();

});

tekrarBtn.addEventListener("click", function () {

    location.reload();

});

// ======================================
// BÖLÜM 3
// Oyun Mantığı
// ======================================

// -------------------------------
// Köy Kontrolü
// -------------------------------
function koyKontrol(feature, layer) {
    if (!aktifKoy) return;

    const secilenKoy = feature.properties.AD;

    if (secilenKoy === aktifKoy.ad) {
        // Doğru cevap
        puan += 10;
        dogruSayisi++;
        
        // Köy tekrar tıklanamasın
        layer.off("click");

        puanYazi.innerHTML = puan;
        mesaj.innerHTML = "✅ Doğru Cevap";

        // Önce Tooltip'i bağlıyoruz
        layer.bindTooltip("✔ Bulundu", {
            permanent: true,
            direction: "center",
            className: "bulunduEtiket"
        });

        // Sonra stili değiştiriyoruz
        layer.setStyle({
            color: "#00ff00",
            fillColor: "#00ff00",
            fillOpacity: 0.40,
            weight: 4
        });

        setTimeout(function () {
            layer.setStyle({
                color: "#00aa00",
                fillColor: "#00ff00",
                fillOpacity: 0.55,
                weight: 3
            });

            soruNo++;
            yeniSoru();
        }, 1000);

    } else {
        // Yanlış cevap
        mesaj.innerHTML = "❌ Yanlış Köy";
        yanlisSayisi++;

        // Eğer daha önce başka bir yanlış yapıldıysa onu temizle (üst üste binmesin diye)
        if (sonYanlisLayer) {
            geojsonLayer.resetStyle(sonYanlisLayer);
        }

        // Tıklanan yanlış köyü hafızaya alıyoruz
        sonYanlisLayer = layer;

        // Yanlış köyü çok belirgin yapıyoruz (Kıpkırmızı ve kalın çizgili)
        layer.setStyle({
            color: "#ff0000",      // Çizgi rengi net kırmızı
            fillColor: "#ff0000",  // İç dolgusu kırmızı
            fillOpacity: 0.70,     // İçini bayağı belirginleştiriyoruz (%70 görünürlük)
            weight: 6,             // Çizgi kalınlığı normalin 3 katı
            dashArray: "5, 5"      // Çizgileri kesik kesik yaparak dikkat çekmesini sağlıyoruz
        });

        // Fare üzerinden çekilince eski haline dönme efektini bu köy için GEÇİCİ olarak kapatıyoruz
        layer.off("mouseout", hoverBitis);

        // 1 saniye sonra bir sonraki soruya otomatik geçiş (mevcut mantığı koruyoruz)
        setTimeout(function () {
            soruNo++;
            yeniSoru();
        }, 1000);
    }
}

// -------------------------------
// Sayaç
// -------------------------------
function zamanlayici() {
    clearInterval(timer);
    timer = setInterval(function () {
        kalanSure--;
        sureYazi.innerHTML = kalanSure;

        if (kalanSure <= 0) {
            clearInterval(timer);
            oyunBitir();
        }
    }, 1000);
}

// -------------------------------
// Oyun Bitir
// -------------------------------
function oyunBitir() {
    oyunBasladi = false;
    clearInterval(timer);

    let toplam = dogruSayisi + yanlisSayisi;
    if (toplam > 0) {
        dogrulukYuzdesi = Math.round((dogruSayisi / toplam) * 100);
    } else {
        dogrulukYuzdesi = 0;
    }

    soruYazi.innerHTML = "🎉 Oyun Tamamlandı";
    finalPuan.innerHTML = puan;
    oyunSonu.classList.remove("gizli");

    oyunSonu.querySelector(".popup").innerHTML = `
        <h2>🏆 Oyun Bitti</h2>
        <h1>${puan} Puan</h1>
        <hr>
        <p>✅ Doğru : <b>${dogruSayisi}</b></p>
        <p>❌ Yanlış : <b>${yanlisSayisi}</b></p>
        <p>🎯 Başarı : <b>%${dogrulukYuzdesi}</b></p>
        <br>
        <button id="yenidenOyna">Tekrar Oyna</button>
    `;

    document.getElementById("yenidenOyna").onclick = function () {
        location.reload();
    };
}
