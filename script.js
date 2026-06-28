// ======================================
// DE GİDİ GOCA MİLAS DE
// Milas Köy Bulma Oyunu (Gelişmiş İstatistik Sürümü)
// ======================================

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
const bgMusic = document.getElementById("bgMusic");

let map;
let geojsonLayer;
let tumKoyler = [];
let aktifKoy = null;
let sorulmayanKoyler = [];
let puan = 0;
let soruNo = 1;
let oyunBasladi = false;
let kalanSure = 900; // 15 dakika 00 saniye
let timer = null;
let dogruSayisi = 0;
let yanlisSayisi = 0;
let dogrulukYuzdesi = 0;

// --- DEĞİŞKENLER ---
let aktifKoyHakki = 3;       
let yanlisKoylerListesi = [];
let tiklamaKilitli = false; // Tıklama kilidi başlangıçta açık 

// --- İSTATİSTİK LİSTELERİ ---
let bilinenKoylerListesi = [];   // Doğru tahmin edilen köy isimleri
let bilinemeyenKoylerListesi = []; // Hakkı bitip geçilen köy isimleri

// --- WEB AUDIO API DEĞİŞKENLERİ ---
let audioCtx = null;
let source = null;
let filterNode = null;
let musicGainNode = null; 

// ⏱️ Saniyeyi Dakika:Saniye (00:00) Formatına Çeviren Yardımcı Fonksiyon
function sureFormatla(saniye) {
    let dk = Math.floor(saniye / 60);
    let sn = saniye % 60;
    
    // Saniyeler tek haneliyse başına 0 koysun (Örn: 15:05 olsun, 15:5 değil)
    if (sn < 10) {
        sn = "0" + sn;
    }
    return dk + ":" + sn;
}

// Sesi işlemek ve bası/tizi bozabilmek için filtre katmanı oluşturuyoruz
function sesSisteminiKur() {
    if (audioCtx) return; 
    
    // Tarayıcı uyumluluğu ile AudioContext oluşturuluyor
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    if (!bgMusic) return; // HTML tarafında bgMusic yoksa hata vermemesi için koruma
    
    source = audioCtx.createMediaElementSource(bgMusic);
    
    musicGainNode = audioCtx.createGain();
    musicGainNode.gain.setValueAtTime(1.0, audioCtx.currentTime);
    
    filterNode = audioCtx.createBiquadFilter();
    filterNode.type = "lowpass";
    filterNode.frequency.setValueAtTime(20000, audioCtx.currentTime);

    source.connect(musicGainNode);
    musicGainNode.connect(filterNode);
    filterNode.connect(audioCtx.destination);
}

// RETRO DOĞRU CEVAP SES EFEKTİ ÜRETİCİSİ
function playRetroWinSound() {
    if (!audioCtx) return;

    if (musicGainNode) {
        musicGainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
    }

    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = "triangle"; 
    
    osc.frequency.setValueAtTime(523.25, t);       
    osc.frequency.setValueAtTime(659.25, t + 0.08); 
    osc.frequency.setValueAtTime(783.99, t + 0.16); 
    osc.frequency.setValueAtTime(1046.50, t + 0.24);
    
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.setValueAtTime(0.08, t + 0.24);
    gain.gain.linearRampToValueAtTime(0.001, t + 0.45);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(t);
    osc.stop(t + 0.45);

    setTimeout(() => {
        if (musicGainNode) {
            musicGainNode.gain.linearRampToValueAtTime(1.0, audioCtx.currentTime + 0.15);
        }
    }, 450);
}

// Haritayı Oluştur
map = L.map("map", { zoomControl: true }).setView([37.32, 27.78], 10);

// Uydu Haritası
L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 20,
    attribution: "© Esri"
}).addTo(map);

function normalStil() {
    return { color: "#ff0000", weight: 2, fillColor: "#ff0000", fillOpacity: 0.08 };
}

function hover(e) {
    if (!oyunBasladi) return;
    let layer = e.target;
    if (layer.dogruBilindi) return; 
    if (yanlisKoylerListesi.includes(layer)) return;
    
    layer.setStyle({ weight: 4, color: "#00ffff", fillOpacity: 0.25 });
}

function hoverBitis(e) {
    if (!oyunBasladi) return;
    let layer = e.target;
    if (layer.dogruBilindi) return; 
    if (yanlisKoylerListesi.includes(layer)) return;
    
    geojsonLayer.resetStyle(layer);
}

// GeoJSON Yükleme
fetch("KOY.geojson")
    .then(response => response.json())
    .then(data => {
        geojsonLayer = L.geoJSON(data, {
            style: normalStil,
            onEachFeature: function (feature, layer) {
                tumKoyler.push({ ad: feature.properties.AD, layer: layer });
                layer.on("mouseover", hover);
                layer.on("mouseout", hoverBitis);
                layer.on("click", function () {
                    if (!oyunBasladi) return;
                    koyKontrol(feature, layer);
                });
            }
        }).addTo(map);
        map.fitBounds(geojsonLayer.getBounds());
        if (mesaj) mesaj.innerHTML = ""; // Girişte alt panele gereksiz yazı yazılmasın
    })
    .catch(err => {
        console.error(err);
        if (soruYazi) soruYazi.innerHTML = "❌ KOY.geojson yüklenemedi!";
    });

function yeniSoru() {
    yanlisKoylerListesi.forEach(layer => {
        geojsonLayer.resetStyle(layer);
        layer.on("mouseout", hoverBitis);
    });
    yanlisKoylerListesi = []; 

    aktifKoyHakki = 3;

    if (sorulmayanKoyler.length === 0) {
        oyunBitir();
        return;
    }

    let rastgele = Math.floor(Math.random() * sorulmayanKoyler.length);
    aktifKoy = sorulmayanKoyler[rastgele];
    sorulmayanKoyler.splice(rastgele, 1);

    soruYazi.innerHTML = "📍 <b>" + aktifKoy.ad + "</b> köyünü bulun.
