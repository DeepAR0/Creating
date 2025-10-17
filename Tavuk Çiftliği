<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <!-- Mobil uyumluluk için kritik: Görüntü alanını cihaz genişliğine ayarlar -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tavuk Ciftligi Oyunu (Mobil Uyumlu)</title>
    <!-- Firebase ve Tailwind CSS yükle -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, doc, setDoc, onSnapshot, collection, query, orderBy, limit, serverTimestamp, runTransaction } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
        
        // Firebase global değişkenlerini ayarlama
        window.firebaseApp = null;
        window.db = null;
        window.auth = null;
        window.userId = null;
        window.appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;

        if (firebaseConfig) {
            window.firebaseApp = initializeApp(firebaseConfig);
            window.db = getFirestore(window.firebaseApp);
            window.auth = getAuth(window.firebaseApp);
            
            // Kullanıcı kimlik doğrulamasını başlat
            onAuthStateChanged(window.auth, async (user) => {
                if (user) {
                    window.userId = user.uid;
                } else {
                    // Otomatik oturum açma (Canvas ortamında özel token veya anonim)
                    try {
                        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                             await signInWithCustomToken(window.auth, __initial_auth_token);
                        } else {
                            await signInAnonymously(window.auth);
                        }
                    } catch (error) {
                        console.error("Firebase Auth hatası:", error);
                        window.userId = crypto.randomUUID(); // Anonim ID
                    }
                }
                if (window.userId) {
                    // Auth tamamlandıktan sonra skor tablosunu başlat
                    window.setupLeaderboardListener();
                }
            });
        }
    </script>
    <style>
        /* Ana font ve tema renkleri */
        :root {
            font-family: 'Inter', sans-serif;
        }
        body {
            background-color: #f7f3e8; 
        }
        .farm-container {
            background-color: #ffffff;
            border: 8px solid #854d0e; 
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
        }
        .section-header {
            border-bottom: 2px solid #a16207;
        }
        /* Dokunma hedeflerini büyütmek için buton stilleri */
        .button-sell-eggs {
            background-color: #10b981; 
            box-shadow: 0 4px #047857;
            padding: 1rem 1.5rem; /* Büyük dokunma hedefi */
        }
        .button-sell-eggs:active {
            box-shadow: 0 0 #047857;
            transform: translateY(4px);
        }
        .button-buy {
            background-color: #ef4444; 
            box-shadow: 0 4px #b91c1c;
            padding: 0.5rem 0.75rem; /* Mobil için uygun */
        }
        .button-buy:active {
            box-shadow: 0 0 #b91c1c;
            transform: translateY(4px);
        }
        .button-sell-chicken {
            background-color: #f59e0b; 
            box-shadow: 0 4px #d97706;
            margin-right: 8px;
            padding: 0.5rem 0.75rem; /* Mobil için uygun */
        }
        .button-sell-chicken:active {
            box-shadow: 0 0 #d97706;
            transform: translateY(4px);
        }
        .button-hatch {
            background-color: #3b82f6; 
            box-shadow: 0 4px #2563eb;
            padding: 1rem 1.5rem; /* Büyük dokunma hedefi */
        }
        .button-hatch:active {
            box-shadow: 0 0 #2563eb;
            transform: translateY(4px);
        }
        .button-disabled {
            opacity: 0.6;
            cursor: not-allowed;
            box-shadow: none !important;
            transform: none !important;
        }

        /* Mobil görünümde statü panelini 3 yerine 1 sütun yap */
        @media (max-width: 640px) {
            .status-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body class="flex items-center justify-center min-h-screen p-2 sm:p-4">

    <div class="farm-container w-full max-w-5xl p-4 md:p-10 rounded-2xl">
        <h1 class="text-3xl sm:text-4xl font-extrabold text-center text-yellow-700 mb-2 flex items-center justify-center gap-3">
            🐔 Tavuk Çiftliği Kralı
        </h1>
        <p class="text-center text-sm sm:text-base text-gray-500 mb-6 sm:mb-8">Yumurta üret, para kazan ve skor tablosunda zirveye oyna!</p>

        <!-- Durum Paneli (Mobil: Tek Sütun, Masaüstü: 3 Sütun) -->
        <div class="status-grid grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8 text-center">
            <div class="p-3 sm:p-4 bg-yellow-100 rounded-xl border border-yellow-300">
                <span class="text-xs font-semibold text-gray-500 block">PARA (TL)</span>
                <span id="moneyDisplay" class="text-2xl sm:text-3xl font-bold text-yellow-800">0.00</span>
            </div>
            <div class="p-3 sm:p-4 bg-white rounded-xl border border-gray-300">
                <span class="text-xs font-semibold text-gray-500 block">TOPLAM YUMURTA STOKU</span>
                <span id="eggCountDisplay" class="text-2xl sm:text-3xl font-bold text-gray-800">0</span>
            </div>
            <div class="p-3 sm:p-4 bg-red-100 rounded-xl border border-red-300">
                <span class="text-xs font-semibold text-gray-500 block">TOPLAM TAVUK</span>
                <span id="totalChickensDisplay" class="text-2xl sm:text-3xl font-bold text-red-700">0</span>
            </div>
        </div>

        <!-- Üretim İlerleme Detayları -->
        <div class="mb-6 sm:mb-8 p-4 bg-gray-100 rounded-xl border border-gray-300">
            <h2 class="text-xl font-bold text-gray-700 mb-3">🥚 Yumurta Üretim Detayları</h2>
            
            <div id="productionDetailsContainer" class="space-y-3">
                <p class="text-center text-gray-500" id="noChickenMessage">Henüz tavuğunuz yok. Hemen bir tane alın!</p>
                <!-- Detaylı üretim bilgileri buraya gelecek -->
            </div>

            <!-- Buff Durumu -->
            <p class="text-center text-sm mt-4 font-bold text-blue-800">
                Üretim Hızı Buff Durumu: <span id="buffStatusDisplay" class="text-gray-500 font-semibold">Pasif.</span>
            </p>
        </div>
        
        <!-- Civciv Çıkarma Merkezi -->
        <div class="p-4 sm:p-5 mb-6 sm:mb-8 bg-blue-50 rounded-xl border border-blue-300">
            <h2 class="section-header text-xl sm:text-2xl font-bold text-blue-700 pb-3 mb-4 flex justify-between items-center">
                 incubator Civciv Çıkarma Merkezi 
            </h2>
            <p class="text-gray-600 text-xs sm:text-sm mb-4">
                Belirtilen yumurta maliyetini karşılayarak yumurtaları kırın ve civciv çıkarın. Başarılı çıkarma, **24 saat boyunca 2 kat üretim hızı** sağlar!
            </p>

            <div class="flex flex-col lg:flex-row justify-between items-center gap-4">
                <!-- Mobil'de 2 sütun, Tablette 4 sütun -->
                <div id="hatchCostDisplay" class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-semibold w-full lg:w-auto p-2 bg-white rounded-lg border border-blue-200">
                    <!-- Maliyetler JS ile doldurulacak -->
                </div>
                
                <div class="flex flex-col w-full lg:w-1/3 items-center">
                    <button
                        id="hatchButton"
                        onclick="hatchEggs()"
                        class="w-full button-hatch text-white font-extrabold rounded-lg text-base sm:text-lg transition duration-100 uppercase"
                    >
                        Yumurtaları Kır & Civciv Çıkar
                    </button>
                    <p id="hatchMessage" class="text-center text-sm h-5 mt-1 text-gray-500"></p>
                </div>
            </div>
        </div>


        <!-- Ana İçerik: Mobil'de Dikey Yığın (col-span-5), Masaüstü/Tablet'te 2/3 oranında yan yana -->
        <div class="grid md:grid-cols-5 gap-6 sm:gap-8">
            
            <!-- 1. Yumurta Satış Paneli ve Skor Tablosu (md:col-span-2) -->
            <div class="md:col-span-2 p-4 sm:p-5 bg-green-50 rounded-xl border border-green-300">
                <h2 class="section-header text-xl sm:text-2xl font-bold text-green-700 pb-3 mb-4">💰 Satış Pazarı ve Skor</h2>
                <div class="space-y-4">
                    <p class="text-gray-600 font-bold text-sm sm:text-base">
                        Temel Yumurta Fiyatı: <span id="eggPriceDisplay" class="font-bold text-green-600">0.00 TL</span>
                    </p>
                    <p class="text-xs sm:text-sm text-gray-500">
                        Toplam Satış Değeri: <span id="maxSellDisplay" class="font-bold text-green-800">0.00 TL</span>
                    </p>
                    
                    <!-- Yumurta Stok Detayları -->
                    <div id="eggStockDetails" class="space-y-2 p-3 bg-white rounded-lg border border-gray-200 text-sm">
                        <!-- Yumurta Stoğu detayları buraya gelecek -->
                    </div>

                    <!-- Fiyat Yapısı Tablosu -->
                    <div id="priceStructureTable" class="mt-4">
                        <!-- Yumurta fiyat tablosu buraya gelecek -->
                    </div>

                    <button
                        id="sellEggsButton"
                        onclick="sellEggs()"
                        class="w-full button-sell-eggs text-white font-extrabold rounded-lg text-base sm:text-lg transition duration-100 uppercase mt-4"
                    >
                        TÜM YUMURTALARI SAT
                    </button>
                    <p id="sellMessage" class="text-center text-xs sm:text-sm text-gray-500 h-5"></p>
                </div>

                <!-- SKOR TABLOSU -->
                <h3 class="text-lg sm:text-xl font-bold text-yellow-700 pb-2 mt-6">🏆 En Çok Kazananlar</h3>
                <div id="leaderboard" class="bg-white rounded-lg p-3 border border-yellow-300 space-y-1 text-sm">
                    <p class="text-center text-gray-500" id="leaderboardStatus">Skor tablosu yükleniyor...</p>
                </div>
            </div>

            <!-- 2. Tavuk Dükkanı Paneli (md:col-span-3) -->
            <div class="md:col-span-3 p-4 sm:p-5 bg-red-50 rounded-xl border border-red-300">
                <h2 class="section-header text-xl sm:text-2xl font-bold text-red-700 pb-3 mb-4">🐣 Tavuk Dükkanı</h2>
                
                <div id="chickenShop" class="space-y-3 sm:space-y-4">
                    <!-- Tavuk Türleri JS ile doldurulacak -->
                </div>
            </div>

        </div>
        
        <button
            id="resetButton"
            onclick="resetGame()"
            class="mt-6 w-full bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 rounded-lg text-sm transition duration-150"
        >
            Oyunu Sıfırla
        </button>

    </div>

    <script type="module">
        // Firebase modüllerini import et
        import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, doc, setDoc, onSnapshot, collection, query, orderBy, limit, serverTimestamp, runTransaction } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

        // Global değişkenler (window'dan çekilir)
        const db = window.db;
        const auth = window.auth;
        let userId = window.userId;
        const appId = window.appId;

        // Firestore koleksiyon yolu
        const LEADERBOARD_PATH = `artifacts/${appId}/public/data/egg_sales_leaderboard`;

        // --------------- OYUN VERİLERİ VE AYARLARI ---------------

        const SECONDS_PER_STANDARD_EGG = 86400; // 1 günde 1 yumurta
        const BASE_PRODUCTION_RATE = 1 / SECONDS_PER_STANDARD_EGG;

        // Tavuk Türleri - valueMultiplier yumurta satış fiyatını belirler (Yeni, artırılmış çarpanlar)
        const CHICKEN_TYPES_CONSTANTS = [
            { id: 'standard', name: 'Standart Tavuk', cost: 50, production: BASE_PRODUCTION_RATE * 1, color: 'bg-yellow-200', icon: '🥚', eggsPerHour: 0.042, valueMultiplier: 1.0 },
            { id: 'healthy', name: 'Sağlıklı Tavuk', cost: 250, production: BASE_PRODUCTION_RATE * 6, color: 'bg-green-200', icon: '🥦', eggsPerHour: 0.25, valueMultiplier: 1.5 }, 
            { id: 'golden', name: 'Altın Tavuk', cost: 1200, production: BASE_PRODUCTION_RATE * 30, color: 'bg-orange-200', icon: '✨', eggsPerHour: 1.25, valueMultiplier: 2.5 }, 
            { id: 'super', name: 'Süper Tavuk', cost: 5000, production: BASE_PRODUCTION_RATE * 180, color: 'bg-purple-200', icon: '👑', eggsPerHour: 7.5, valueMultiplier: 5.0 }
        ];
        
        // Civciv Çıkarma Maliyeti: Her birinden belirli sayıda yumurta gerekir
        const HATCH_COST = [
            { id: 'standard', name: 'Standart', count: 10 },
            { id: 'healthy', name: 'Sağlıklı', count: 5 },
            { id: 'golden', name: 'Altın', count: 2 },
            { id: 'super', name: 'Süper', count: 1 }
        ];

        const HATCH_DURATION_MS = 24 * 60 * 60 * 1000; // 24 saat buff süresi (ms)

        // Başlangıç parası 100.00 TL
        const INITIAL_MONEY = 100.00; 
        const BASE_EGG_PRICE_IN_TL = 0.25; 

        let gameData = {
            money: INITIAL_MONEY,
            totalChickens: 0,
            baseEggPrice: BASE_EGG_PRICE_IN_TL, 
            productionInterval: 1000, 
            productionRate: 0,
            chickens: [],
            fractionalEggProduction: {}, 
            eggStockByTier: {},
            totalSalesRevenue: 0.00, 
            productionBuffEndTime: 0, // Üretim hızlandırma buff'ının biteceği zaman (timestamp)
        };

        let lastUpdateTime = Date.now();


        // --------------- FIRESTORE VE SKOR TABLOSU ---------------

        /**
         * Firestore'da kullanıcı satış rekorunu günceller.
         * @param {string} currentUserId Mevcut kullanıcı ID'si.
         * @param {number} revenue Bu satıştan elde edilen gelir.
         */
        async function saveSaleRecord(currentUserId, revenue) {
            if (!db || !currentUserId || revenue <= 0) return;

            const userRef = doc(db, LEADERBOARD_PATH, currentUserId);

            try {
                // Transaction kullanarak mevcut total_sales_revenue'yi güvenli bir şekilde artır
                await runTransaction(db, async (transaction) => {
                    const userDoc = await transaction.get(userRef);

                    let newTotal = revenue;
                    if (userDoc.exists()) {
                        const currentTotal = userDoc.data().total_sales_revenue || 0;
                        newTotal += currentTotal;
                    }
                    
                    transaction.set(userRef, {
                        userId: currentUserId,
                        total_sales_revenue: newTotal,
                        last_sale: serverTimestamp(),
                        // Eğer kullanıcı anonim değilse, is_anonymous'yi kaldır
                        is_anonymous: currentUserId.startsWith('anon') || currentUserId.length > 36
                    }, { merge: true });

                    gameData.totalSalesRevenue = newTotal; // Lokal veriyi de güncelle
                    updateUI();

                });
            } catch (error) {
                console.error("Satış kaydı transaksiyon hatası:", error);
            }
        }
        
        /** Skor tablosunu gerçek zamanlı dinler ve UI'da gösterir. */
        window.setupLeaderboardListener = function() {
            if (!db) return;
            
            const q = query(collection(db, LEADERBOARD_PATH), orderBy("total_sales_revenue", "desc"), limit(10));
            const leaderboardEl = document.getElementById('leaderboard');
            const leaderboardStatusEl = document.getElementById('leaderboardStatus');

            onSnapshot(q, (snapshot) => {
                let html = '';
                let rank = 1;
                let isCurrentUserInTop10 = false;

                snapshot.forEach((doc) => {
                    const data = doc.data();
                    const isCurrentUser = data.userId === userId;
                    
                    if (isCurrentUser) isCurrentUserInTop10 = true;

                    const userName = isCurrentUser ? "Siz" : data.userId.substring(0, 8) + '...';
                    const rowClass = isCurrentUser ? 'font-extrabold text-red-600 bg-yellow-100 rounded p-1' : 'text-gray-800';

                    // Skor tablosundaki parayı 2 ondalık basamakla göster
                    html += `
                        <div class="flex justify-between ${rowClass}">
                            <span>${rank}. ${userName}</span>
                            <span>${data.total_sales_revenue.toFixed(2)} TL</span>
                        </div>
                    `;
                    rank++;
                });

                if (html === '') {
                    leaderboardStatusEl.textContent = "Henüz satış kaydı yok. İlk satışı siz yapın!";
                    return;
                }

                leaderboardEl.innerHTML = html;
                
                if (!isCurrentUserInTop10) {
                     // Canvas talimatları tam ID'yi göstermeyi gerektiriyor. 
                     leaderboardEl.innerHTML += `<p class="mt-2 text-center text-xs text-gray-500">Kullanıcı ID'niz: ${userId}</p>`;
                }

            }, (error) => {
                console.error("Skor tablosu dinleme hatası:", error);
                leaderboardStatusEl.textContent = "Skor tablosu yüklenemedi.";
            });
        }
        
        // userId ayarlandıktan sonra skor tablosunu dinlemeye başlar
        if (window.userId) {
            window.setupLeaderboardListener();
        }

        // --------------- KAYDETME VE YÜKLEME ---------------

        function saveGame() {
            localStorage.setItem('chickenFarmGame', JSON.stringify(gameData));
        }

        function loadGame() {
            const savedData = localStorage.getItem('chickenFarmGame');
            if (savedData) {
                const loadedData = JSON.parse(savedData);
                // Gerekli alanların varlığını kontrol et ve varsayılan değerleri atla
                loadedData.chickens = loadedData.chickens || [];
                loadedData.fractionalEggProduction = loadedData.fractionalEggProduction || {};
                loadedData.eggStockByTier = loadedData.eggStockByTier || {};
                loadedData.totalSalesRevenue = loadedData.totalSalesRevenue || 0.00;
                loadedData.productionBuffEndTime = loadedData.productionBuffEndTime || 0;
                
                // Kayıtlı veriyi yükle
                Object.assign(gameData, loadedData);
                
                // Versiyon uyumluluğu kontrolü: Yeni tavuk tipleri ekle
                CHICKEN_TYPES_CONSTANTS.forEach(type => {
                    if (!gameData.chickens.find(c => c.id === type.id)) {
                         gameData.chickens.push({ 
                            id: type.id, 
                            count: 0, 
                            production: type.production, 
                            cost: type.cost 
                        });
                    }
                });
            } else {
                gameData.money = INITIAL_MONEY; // Yeni başlangıç parası
                gameData.baseEggPrice = BASE_EGG_PRICE_IN_TL; // Yeni temel fiyat
                gameData.chickens = CHICKEN_TYPES_CONSTANTS.map(type => ({ 
                    id: type.id, 
                    count: 0, 
                    production: type.production, 
                    cost: type.cost 
                }));
                // Başlangıçta 1 adet standart tavuk ve boş stok
                gameData.chickens[0].count = 1;
                gameData.fractionalEggProduction = {};
                gameData.eggStockByTier = {};
                gameData.productionBuffEndTime = 0;
            }

            // İlk yüklemede, tarayıcıda oluşturulan userId'yi al
            userId = window.userId || auth.currentUser?.uid || crypto.randomUUID();

            updateProductionRate();
            updateUI();
        }

        function resetGame() {
            document.getElementById('sellMessage').textContent = 'Oyun sıfırlanıyor...';

            localStorage.removeItem('chickenFarmGame');
            
            gameData = {
                money: INITIAL_MONEY,
                totalChickens: 0,
                baseEggPrice: BASE_EGG_PRICE_IN_TL,
                productionInterval: 1000,
                productionRate: 0,
                chickens: [],
                fractionalEggProduction: {},
                eggStockByTier: {},
                totalSalesRevenue: 0.00,
                productionBuffEndTime: 0,
            };

            gameData.chickens = CHICKEN_TYPES_CONSTANTS.map(type => ({ 
                id: type.id, 
                count: 0, 
                production: type.production, 
                cost: type.cost 
            }));
            gameData.chickens[0].count = 1;
            
            lastUpdateTime = Date.now();
            
            updateProductionRate();
            updateUI(); 
            document.getElementById('sellMessage').textContent = 'Oyun sıfırlandı. Yeni bir çiftlik kurdunuz!';
            saveGame();
        }


        // --------------- TEMEL OYUN MANTIĞI ---------------

        function updateProductionRate() {
            let totalRate = 0;
            let totalCount = 0;
            
            gameData.chickens.forEach(chicken => {
                const currentConstant = CHICKEN_TYPES_CONSTANTS.find(c => c.id === chicken.id);
                if (currentConstant) {
                    chicken.production = currentConstant.production;
                }
                
                totalRate += chicken.count * chicken.production;
                totalCount += chicken.count;
            });
            gameData.productionRate = totalRate;
            gameData.totalChickens = totalCount;
        }

        /** Tiered yumurta üretimi */
        function produceEggs() {
            if (gameData.totalChickens === 0) return;

            const timeFactor = gameData.productionInterval / 1000;
            
            // Buff kontrolü: 2x Üretim Hızlandırma
            let productionMultiplier = 1;
            if (Date.now() < gameData.productionBuffEndTime) {
                productionMultiplier = 2; // 2x hızlandırılmış zaman
            } else if (gameData.productionBuffEndTime > 0) {
                gameData.productionBuffEndTime = 0; // Buff süresi doldu
            }

            gameData.chickens.forEach(chicken => {
                if (chicken.count > 0) {
                    const chickenTypeConst = CHICKEN_TYPES_CONSTANTS.find(c => c.id === chicken.id);
                    if (!chickenTypeConst) return;

                    // Üretim hızı * Buff çarpanı
                    const eggsProducedThisTick = chicken.count * chickenTypeConst.production * timeFactor * productionMultiplier;
                    
                    // Fractional production'ı güncelle
                    gameData.fractionalEggProduction[chicken.id] = (gameData.fractionalEggProduction[chicken.id] || 0) + eggsProducedThisTick;
                    
                    const newIntegerEggs = Math.floor(gameData.fractionalEggProduction[chicken.id]);
                    
                    if (newIntegerEggs >= 1) {
                        gameData.eggStockByTier[chicken.id] = (gameData.eggStockByTier[chicken.id] || 0) + newIntegerEggs;
                        gameData.fractionalEggProduction[chicken.id] -= newIntegerEggs; 
                    }
                }
            });
            
            updateUI();
            saveGame();
        }
        
        /** Yumurtaları tier'larına göre farklı fiyatlardan satar. */
        function sellEggs() {
            let totalRevenue = 0;
            let totalEggsSold = 0;

            for (const [typeId, eggCount] of Object.entries(gameData.eggStockByTier)) {
                if (eggCount > 0) {
                    const typeConst = CHICKEN_TYPES_CONSTANTS.find(c => c.id === typeId);
                    if (!typeConst) continue;

                    // Tiered Price = BasePrice * Multiplier
                    const eggPrice = gameData.baseEggPrice * typeConst.valueMultiplier;
                    const revenue = eggCount * eggPrice;
                    
                    totalRevenue += revenue;
                    totalEggsSold += eggCount;
                    
                    // Stoğu sıfırla
                    gameData.eggStockByTier[typeId] = 0;
                }
            }

            if (totalEggsSold === 0) {
                document.getElementById('sellMessage').textContent = 'Satacak yumurtanız yok!';
                return;
            }

            gameData.money += totalRevenue;
            
            // Satış kaydını skor tablosuna kaydet
            if (db && userId && totalRevenue > 0) {
                saveSaleRecord(userId, totalRevenue);
            }

            // Toplam geliri 2 ondalık basamakla göster
            document.getElementById('sellMessage').textContent = `${totalEggsSold} yumurtadan ${totalRevenue.toFixed(2)} TL kazandınız!`;
            
            updateUI();
            saveGame();
        }
        
        /** Civciv Çıkarma (Hatchery) Fonksiyonu */
        window.hatchEggs = function() {
            let canHatch = true;
            const messageEl = document.getElementById('hatchMessage');
            messageEl.textContent = '';

            // 1. Maliyet Kontrolü
            HATCH_COST.forEach(costItem => {
                const stock = gameData.eggStockByTier[costItem.id] || 0;
                if (stock < costItem.count) {
                    canHatch = false;
                }
            });

            if (!canHatch) {
                messageEl.textContent = 'Civciv çıkarmak için yeterli yumurtanız yok!';
                return;
            }

            // Buff zaten aktifse izin verme (Buff butonu disabled olmalı ama tekrar kontrol ediyoruz)
            if (gameData.productionBuffEndTime > Date.now()) {
                messageEl.textContent = 'Üretim Buffı zaten aktif!';
                return;
            }

            // 2. Maliyeti Düşürme (Transaksiyonel silme)
            HATCH_COST.forEach(costItem => {
                gameData.eggStockByTier[costItem.id] -= costItem.count;
            });
            
            // 3. Buff'ı Uygulama
            gameData.productionBuffEndTime = Date.now() + HATCH_DURATION_MS;
            
            messageEl.textContent = '🐣 Civciv başarıyla çıktı! 24 saat boyunca x2 Üretim Hızı başladı!';
            
            // UI ve Kayıt Güncelleme
            updateUI();
            saveGame();
        }

        /** Tavuk satın alma işlemini gerçekleştirir. */
        function applyPurchase(typeId) {
            const chickenType = CHICKEN_TYPES_CONSTANTS.find(c => c.id === typeId);
            const savedChicken = gameData.chickens.find(c => c.id === typeId);
            
            if (!chickenType || !savedChicken) return false;

            const cost = chickenType.cost;
            
            if (gameData.money < cost) {
                document.getElementById('sellMessage').textContent = `${chickenType.name} almak için yeterli paranız yok! (${cost.toFixed(2)} TL gerekli)`;
                return false;
            }

            gameData.money -= cost;
            savedChicken.count++;
            
            updateProductionRate();
            updateUI();
            saveGame();
            
            document.getElementById('sellMessage').textContent = `${chickenType.name} başarıyla satın alındı!`;

            return true;
        }

        /** Tavuk satın alma işlemini başlatır (Doğrudan satın alma) */
        window.buyChicken = function(typeId) {
            applyPurchase(typeId);
        }
        
        window.sellChicken = function(typeId) {
            const chickenType = CHICKEN_TYPES_CONSTANTS.find(c => c.id === typeId);
            const savedChicken = gameData.chickens.find(c => c.id === typeId);
            
            if (!chickenType || !savedChicken) return;
            
            // Tavuk Satış Fiyatı = Maliyet / 2
            if (savedChicken.count > 0) {
                const sellPrice = chickenType.cost / 2;
                
                gameData.money += sellPrice;
                savedChicken.count--;
                
                updateProductionRate();
                updateUI();
                saveGame();

                // Satış fiyatını 2 ondalık basamakla göster
                document.getElementById('sellMessage').textContent = `${chickenType.name} satıldı. ${sellPrice.toFixed(2)} TL geri aldınız.`;
            } else {
                document.getElementById('sellMessage').textContent = `Satacak ${chickenType.name} tavuğunuz yok.`;
            }
        }


        // --------------- ARAYÜZ (UI) GÜNCELLEME ---------------

        function formatTime(totalSeconds) {
            totalSeconds = Math.max(0, Math.floor(totalSeconds));
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            const pad = (num) => num.toString().padStart(2, '0');
            
            if (hours > 0) {
                return `${pad(hours)}s ${pad(minutes)}d ${pad(seconds)}sn`;
            }
            return `${pad(minutes)}d ${pad(seconds)}sn`;
        }

        /** Her tavuk tipi için ayrı ayrı kalan üretim süresini hesaplar ve UI'ı günceller. */
        function animateTimeDisplay() {
            const now = Date.now();
            const delta = now - lastUpdateTime;
            lastUpdateTime = now;

            // Buff kontrolü
            const buffStatusEl = document.getElementById('buffStatusDisplay');
            const hatchButton = document.getElementById('hatchButton');
            
            // Hata kontrolü: Elementler yüklenmediyse işlemi sonlandır.
            if (!buffStatusEl || !hatchButton) {
                // DOM tam olarak yüklenene kadar beklemek için tekrar çağır
                requestAnimationFrame(animateTimeDisplay); 
                return;
            }

            let productionMultiplier = 1;
            
            if (gameData.productionBuffEndTime > now) {
                const remainingMs = gameData.productionBuffEndTime - now;
                const remainingSec = Math.ceil(remainingMs / 1000);
                buffStatusEl.innerHTML = `<span class="text-green-700 font-extrabold">AKTİF (x2 Üretim)!</span> Kalan Süre: ${formatTime(remainingSec)}`;
                buffStatusEl.classList.add('bg-green-100', 'p-2', 'rounded-md');
                hatchButton.disabled = true;
                hatchButton.classList.add('button-disabled');
                productionMultiplier = 2;
            } else {
                gameData.productionBuffEndTime = 0; // Süre dolduysa sıfırla
                buffStatusEl.textContent = 'Pasif. Yumurtaları kırarak civciv çıkarabilirsiniz.';
                buffStatusEl.classList.remove('bg-green-100', 'p-2', 'rounded-md');
                hatchButton.disabled = false;
                hatchButton.classList.remove('button-disabled');
            }
            
            // Detaylı Geri Sayım ve İlerleme Çubuğu Güncellemesi
            const detailsContainer = document.getElementById('productionDetailsContainer');
            if (!detailsContainer) { // Kontrol ekle
                requestAnimationFrame(animateTimeDisplay);
                return;
            }

            detailsContainer.innerHTML = '';
            
            let hasChickens = false;

            gameData.chickens.forEach(chicken => {
                const count = chicken.count || 0;
                if (count === 0) return;
                
                hasChickens = true;
                
                const chickenTypeConst = CHICKEN_TYPES_CONSTANTS.find(c => c.id === chicken.id);
                if (!chickenTypeConst) return;

                const currentRate = chickenTypeConst.production * count * productionMultiplier;
                const fractional = gameData.fractionalEggProduction[chicken.id] || 0;

                // Bir sonraki tam yumurtaya kalan kesir (örneğin 0.3'ten 1.0'a)
                const fractionalRemaining = 1 - (fractional % 1); 
                
                let timeRemainingSeconds = 0;
                let percentage = 0;

                if (currentRate > 0) {
                    timeRemainingSeconds = fractionalRemaining / currentRate;
                    percentage = (fractional % 1) * 100;
                } else {
                    timeRemainingSeconds = Infinity;
                    percentage = 0;
                }

                const timeText = timeRemainingSeconds === Infinity ? 'Hesaplanıyor...' : formatTime(timeRemainingSeconds);

                // UI elementi oluşturma veya güncelleme
                detailsContainer.innerHTML += `
                    <div class="p-3 bg-white rounded-lg border border-gray-200">
                        <div class="flex justify-between items-center mb-1">
                            <span class="font-semibold text-gray-800">${chickenTypeConst.icon} ${chickenTypeConst.name} (${count} adet)</span>
                            <span class="font-extrabold text-sm ${timeRemainingSeconds < 60 ? 'text-red-600' : 'text-green-600'}">
                                ${timeText}
                            </span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden">
                            <div 
                                class="h-3 bg-green-500 rounded-full transition-all duration-100 ease-linear" 
                                style="width: ${percentage.toFixed(2)}%"
                            ></div>
                        </div>
                        <p class="text-xs text-gray-500 text-right mt-1">
                            %${percentage.toFixed(2)} tamamlandı.
                        </p>
                    </div>
                `;
            });
            
            const noChickenMessageEl = document.getElementById('noChickenMessage');
            if (noChickenMessageEl) {
                noChickenMessageEl.classList.toggle('hidden', hasChickens);
            }

            requestAnimationFrame(animateTimeDisplay);
        }

        function initializeChickens() {
            const shopContainer = document.getElementById('chickenShop');
            shopContainer.innerHTML = '';
            
            CHICKEN_TYPES_CONSTANTS.forEach(type => { 
                const savedChicken = gameData.chickens.find(c => c.id === type.id);
                const count = savedChicken ? savedChicken.count : 0;
                
                // Yumurta Değeri Hesaplama
                const eggValue = gameData.baseEggPrice * type.valueMultiplier;
                
                const div = document.createElement('div');
                div.className = `flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl shadow-md ${type.color} border border-gray-200`;
                div.innerHTML = `
                    <div class="flex items-center w-full sm:w-auto mb-3 sm:mb-0">
                        <span class="text-3xl mr-3">${type.icon}</span>
                        <div class="flex-1">
                            <p class="font-bold text-lg text-gray-800">${type.name}</p>
                            <p class="text-xs sm:text-sm text-gray-600 mt-1">
                                Üretim: <span class="font-bold">${type.eggsPerHour.toFixed(3)} Yumurta/saat</span>
                                <!-- Yumurta değerini 2 ondalık basamakla göster -->
                                | Yumurta Değeri: <span class="font-bold text-green-700">${eggValue.toFixed(2)} TL</span>
                            </p>
                        </div>
                    </div>
                    
                    <div class="flex items-center space-x-2 w-full sm:w-auto justify-end">
                        <span id="${type.id}Count" class="text-xl font-extrabold text-gray-900 min-w-[30px] text-right">${count}</span>
                        
                        <button
                            id="sellBtn-${type.id}"
                            onclick="sellChicken('${type.id}')"
                            class="button-sell-chicken text-white font-bold rounded-lg text-xs sm:text-sm transition duration-100"
                        >
                            Sat (${(type.cost/2).toFixed(0)} TL)
                        </button>
                        
                        <button
                            id="buyBtn-${type.id}"
                            onclick="buyChicken('${type.id}')"
                            class="button-buy text-white font-bold rounded-lg text-xs sm:text-sm transition duration-100"
                        >
                            Al (${type.cost.toFixed(0)} TL)
                        </button>
                    </div>
                `;
                shopContainer.appendChild(div);
            });
        }
        
        /** Civciv Çıkarma Maliyetini UI'da gösterir. */
        function updateHatchCostUI() {
            const hatchCostEl = document.getElementById('hatchCostDisplay');
            let html = '';
            let canHatch = true;
            
            HATCH_COST.forEach(costItem => {
                const stock = gameData.eggStockByTier[costItem.id] || 0;
                const chickenType = CHICKEN_TYPES_CONSTANTS.find(c => c.id === costItem.id);
                
                const stockClass = stock >= costItem.count ? 'text-green-600' : 'text-red-600';
                if (stock < costItem.count) {
                    canHatch = false;
                }
                
                html += `
                    <div class="flex flex-col items-center p-1 border rounded-md">
                        <span class="text-gray-700">${costItem.name} Yumurta:</span>
                        <span class="${stockClass}">${costItem.count} (Stok: ${stock})</span>
                    </div>
                `;
            });
            hatchCostEl.innerHTML = html;
            
            // Hatch butonu durumunu güncelle
            const hatchButton = document.getElementById('hatchButton');
            const isBuffActive = gameData.productionBuffEndTime > Date.now();
            const shouldBeDisabled = !canHatch || isBuffActive;

            hatchButton.disabled = shouldBeDisabled;
            hatchButton.classList.toggle('button-disabled', shouldBeDisabled);
        }

        /** Tüm UI elementlerini günceller. */
        function updateUI() {
            let totalEggCount = 0;
            let totalSaleValue = 0;
            let eggDetailsHTML = '';

            // Yumurta stoku ve toplam satış değeri hesaplama
            for (const [typeId, eggCount] of Object.entries(gameData.eggStockByTier)) {
                if (eggCount > 0) {
                    const typeConst = CHICKEN_TYPES_CONSTANTS.find(c => c.id === typeId);
                    if (!typeConst) continue;

                    const price = gameData.baseEggPrice * typeConst.valueMultiplier;
                    const value = eggCount * price;

                    totalEggCount += eggCount;
                    totalSaleValue += value;

                    // Yumurta stok detaylarında değeri 2 ondalık basamakla göster
                    eggDetailsHTML += `
                        <div class="flex justify-between items-center">
                            <span class="font-semibold text-gray-700">${typeConst.name} Yumurta:</span>
                            <span class="text-red-600 font-bold">${eggCount} adet</span>
                            <span class="text-green-700 font-bold">${value.toFixed(2)} TL</span>
                        </div>
                    `;
                }
            }
            
            // 1. Durum Paneli Güncellemeleri
            // Para miktarını 2 ondalık basamakla göster
            document.getElementById('moneyDisplay').textContent = gameData.money.toFixed(2);
            document.getElementById('eggCountDisplay').textContent = totalEggCount;
            document.getElementById('totalChickensDisplay').textContent = gameData.totalChickens;
            
            // 2. Satış Paneli Güncellemeleri
            // Temel fiyatı 2 ondalık basamakla göster ve açıklamayı güncelle
            const basePriceDisplay = `${gameData.baseEggPrice.toFixed(2)} TL (25 krş Temel Fiyat)`;
            document.getElementById('eggPriceDisplay').textContent = basePriceDisplay;
            
            // Toplam satış değerini 2 ondalık basamakla göster
            document.getElementById('maxSellDisplay').textContent = totalSaleValue.toFixed(2) + ' TL';
            document.getElementById('eggStockDetails').innerHTML = totalEggCount > 0 ? eggDetailsHTML : '<p class="text-center text-gray-500">Stoğunuzda yumurta yok.</p>';

            // --- FİYAT YAPISI TABLOSU ---
            let priceTableHTML = `
                <h3 class="font-bold text-sm text-gray-700 mb-1">Yumurta Satış Değerleri:</h3>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg shadow-sm">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TÜR</th>
                                <th class="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ÇARPAN</th>
                                <th class="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">FİYAT (TL)</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
            `;

            CHICKEN_TYPES_CONSTANTS.forEach(type => {
                const eggPrice = gameData.baseEggPrice * type.valueMultiplier;
                priceTableHTML += `
                    <tr>
                        <td class="px-2 py-2 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">${type.name}</td>
                        <!-- Çarpanı 1 ondalık basamakla göster -->
                        <td class="px-2 py-2 whitespace-nowrap text-xs sm:text-sm text-center text-red-500 font-semibold">x${type.valueMultiplier.toFixed(1)}</td>
                        <!-- Tabloda fiyatı 2 ondalık basamakla göster -->
                        <td class="px-2 py-2 whitespace-nowrap text-xs sm:text-sm text-right font-bold text-green-700">${eggPrice.toFixed(2)}</td>
                    </tr>
                `;
            });
            
            priceTableHTML += `</tbody></table></div>`;
            document.getElementById('priceStructureTable').innerHTML = priceTableHTML;
            // --- FİYAT YAPISI TABLOSU SONU ---

            const sellEggsButton = document.getElementById('sellEggsButton');
            const canSellEggs = totalEggCount > 0;
            sellEggsButton.disabled = !canSellEggs;
            sellEggsButton.classList.toggle('button-disabled', !canSellEggs);

            // 3. Civciv Çıkarma Merkezi Güncellemesi
            updateHatchCostUI();

            // 4. Tavuk Dükkanı ve Sayım (Satın al/Sat butonlarını güncelle)
            gameData.chickens.forEach(chicken => {
                const countElement = document.getElementById(`${chicken.id}Count`);
                if (countElement) {
                    countElement.textContent = chicken.count;
                }

                const sellButton = document.getElementById(`sellBtn-${chicken.id}`);
                const canSellChicken = chicken.count > 0;
                if (sellButton) {
                    sellButton.disabled = !canSellChicken;
                    sellButton.classList.toggle('button-disabled', !canSellChicken);
                }
                
                // SATIN ALMA butonu kontrolü (Parası varsa aktif, yoksa pasif)
                const buyButton = document.getElementById(`buyBtn-${chicken.id}`);
                const chickenTypeConst = CHICKEN_TYPES_CONSTANTS.find(c => c.id === chicken.id);
                const canAfford = gameData.money >= chickenTypeConst.cost;

                if (buyButton) {
                    buyButton.disabled = !canAfford;
                    buyButton.classList.toggle('button-disabled', !canAfford);
                }
            });
            
            // Uyarı mesajını temizle (Sadece satın alma/satma işlemi sonrası mesajı kalır)
            const sellMessageEl = document.getElementById('sellMessage');
            if (sellMessageEl && sellMessageEl.textContent === 'Daha fazla tavuk almak için banka transferi ile para yatırmanız gerekebilir.') {
                 sellMessageEl.textContent = '';
            }
        }


        // --------------- BAŞLANGIÇ ---------------

        let gameLoop;

        window.onload = function() {
            // Firestore'dan gelen userId'yi beklerken bile oyunu yükle
            loadGame(); 
            initializeChickens(); 

            // Üretim döngüsünü başlat
            gameLoop = setInterval(produceEggs, gameData.productionInterval);
            
            // Geri sayım ve progress bar animasyonu için requestAnimationFrame kullan
            lastUpdateTime = Date.now();
            requestAnimationFrame(animateTimeDisplay);
            
            updateUI();
        };

        window.onbeforeunload = saveGame;

        // Global fonksiyonları window objesine ata
        window.sellEggs = sellEggs;
        window.resetGame = resetGame;

    </script>

</body>
</html>
