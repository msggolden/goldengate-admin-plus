# GoldenGate ADMIN plusz

**Telepítési és használati útmutató a GoldenGate chat adminjainak és moderátorainak.**

Először a **Tampermonkey bővítményt**, utána az **ADMIN plusz szkriptet** kell telepítened. Mindkettőt abba a böngészőbe tedd, amelyikben a chatet használod.

**A leírás olvasásához és a szkript telepítéséhez nem kell GitHub-fiók.** A lap tetején látható fájllistával nem kell foglalkoznod; az alábbi lépéseket kövesd. Ez az útmutató számítógépes Chrome-hoz és Firefoxhoz készült.

## Hol kezdjem

- Chrome esetén: [1. Google Chrome](#1-google-chrome).
- Firefox esetén: [2. Mozilla Firefox](#2-mozilla-firefox).
- Ha a Tampermonkey már telepítve van és futtat szkripteket: [3. Az ADMIN plusz telepítése](#3-az-admin-plusz-telepítése).
- Ha elakadtál: [Segítség és gyakori kérdések](#segítség-és-gyakori-kérdések).

## 1 Google Chrome

### A Tampermonkey telepítése

1. **Chrome-ban** nyisd meg: [Tampermonkey a Chrome Webáruházban](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo).
2. Kattints a **Hozzáadás a Chrome-hoz / Add to Chrome** gombra.
3. A böngésző kérdésénél válaszd a **Bővítmény hozzáadása / Add extension** lehetőséget.
4. Várd meg a telepítés végét. Ha egy Tampermonkey tájékoztató oldal nyílik meg, azt bezárhatod, és visszatérhetsz ide.

Ha már **Eltávolítás a Chrome-ból / Remove from Chrome** gombot látsz, a bővítmény telepítve van. Ne távolítsd el; folytasd a beállítással.

### A szkriptek futtatásának engedélyezése

1. Kattints a böngésző felső **címsorába**, ahol a weboldal címe látható.
2. Másold be ezt a címet, majd nyomj Entert:

   ```text
   chrome://extensions
   ```

   Ezt a címet kézzel kell bemásolni; nem kattintható webes link.

3. Keresd meg a **Tampermonkey** bővítményt. A kapcsolója legyen **bekapcsolva**.
4. Kattints a **Részletek / Details** gombra.
5. Kapcsold be a **Felhasználói szkriptek engedélyezése / Allow user scripts** kapcsolót.
6. Ezután térj vissza ide, és folytasd a [3. résszel](#3-az-admin-plusz-telepítése).

**Régebbi Chrome esetén:** 138-nál régebbi verzióban a bővítmények oldalának jobb felső sarkában lévő **Fejlesztői mód / Developer mode** bekapcsolása szükséges. Újabb Chrome-ban a Tampermonkey saját **Allow user scripts** kapcsolóját keresd.

[Hivatalos Tampermonkey-súgó a Chrome futtatási engedélyéről](https://www.tampermonkey.net/faq.php?locale=en&q=Q209)

**Hol találom később a Tampermonkeyt?** A Chrome jobb felső sarkában kattints a **puzzle alakú Bővítmények ikonra**, majd a Tampermonkeyra. A rögzítés ikonnal kiteheted az eszköztárra is.

## 2 Mozilla Firefox

1. **Firefoxban** nyisd meg: [Tampermonkey a Firefox kiegészítők között](https://addons.mozilla.org/hu/firefox/addon/tampermonkey/).
2. Kattints a **Hozzáadás a Firefoxhoz / Add to Firefox** gombra.
3. A megjelenő ablakban válaszd a **Hozzáadás / Add** lehetőséget.
4. Várd meg a telepítés befejezését. Normál böngészőablakban nincs szükség a Chrome-nál említett fejlesztői beállításra.
5. Folytasd a [3. résszel](#3-az-admin-plusz-telepítése).

**Ha ellenőriznéd, hogy be van-e kapcsolva:** a Firefox **☰ menüjében** válaszd a **Kiegészítők és témák → Bővítmények** részt. A Tampermonkey kapcsolója legyen bekapcsolva.

A Tampermonkey menüjét a Firefox jobb felső részén lévő **Bővítmények** gombon keresztül is elérheted.

## 3 Az ADMIN plusz telepítése

**Ezek a lépések Chrome-ban és Firefoxban is ugyanazok. A Tampermonkey ekkor már legyen telepítve és bekapcsolva.**

1. Ugyanabban a böngészőben kattints ide: **[GoldenGate ADMIN plusz telepítése vagy frissítése](https://raw.githubusercontent.com/msggolden/goldengate-admin-plus/main/goldengate-admin.user.js)**.
2. A megnyíló **Tampermonkey telepítési ablakban** ellenőrizd a nevet: **GoldenGate ADMIN plus**.
3. Első alkalommal válaszd a **Telepítés / Install** gombot. Korábbi változat esetén a **Frissítés / Update** lehetőséget válaszd.
4. Nyisd meg a [GoldenGate chatet](https://chat.goldengate.hu/chat.php), és jelentkezz be a megszokott módon.
5. Ha a chat már nyitva volt, **frissítsd az oldalt az F5 billentyűvel vagy a böngésző újratöltés gombjával**.
6. A felső menüben, a **Segítség** után megjelenő **zöld ADMIN plus gomb** jelzi, hogy a szkript betöltődött.
7. Kattints az ADMIN plus gombra: megnyílik a funkciók leírása és a verziószám. Az ablakot a jobb felső **X** gombbal zárhatod be.

**Normál esetben nem kell ZIP-et letölteni vagy kódot másolgatni:** a fenti telepítési link és a Tampermonkey telepítési gombja elegendő.

## 4 Ha már volt korábbi változatod

- Korábbi kézi bemásolás után **egyszer a fenti GitHubos telepítési linkről frissítsd** a szkriptet, hogy a frissítési címek is bekerüljenek.
- Ugyanebből a szkriptből csak **egy példány** legyen bekapcsolva. A listát a Tampermonkey **Vezérlőpult / Dashboard** részében találod.
- A korábbi külön **GoldenGate – felhasználóablak pozíciójavítás** szkriptet kapcsold ki: a javítás már az ADMIN plusz része.
- Mentés vagy frissítés után töltsd újra a chatet.

## Segítség és gyakori kérdések

### A telepítési linkre csak programkód jelenik meg vagy egy fájl töltődik le

1. Ellenőrizd, hogy **ugyanebbe a böngészőbe** telepítetted-e a Tampermonkeyt, és be van-e kapcsolva.
2. Chrome-ban ellenőrizd a fent leírt **Allow user scripts** engedélyt is.
3. Ezután térj vissza ehhez az útmutatóhoz, és kattints újra a telepítési linkre.
4. Ha továbbra sem nyílik meg a telepítő, kövesd az alábbi kézi telepítést.

### Kézi telepítés ha nem jelenik meg a telepítési ablak

1. Nyisd meg a fenti **telepítési linket**. Ha a teljes programkód jelenik meg, jelöld ki **Ctrl+A**, majd másold ki **Ctrl+C** billentyűkkel.
2. Kattints a **Tampermonkey ikonjára**, és válaszd az **Új szkript létrehozása / Create a new script** lehetőséget.
3. Kattints a kódszerkesztőbe. Jelöld ki az egész alapértelmezett mintakódot **Ctrl+A** billentyűkkel, majd a **Ctrl+V** megnyomásával cseréld le a kimásolt teljes kódra. **Ne a mintakód alá illeszd be.**
4. Mentsd el **Ctrl+S** billentyűkkel, majd frissítsd a chatet.
5. A vezérlőpulton ellenőrizd, hogy csak egy ADMIN plusz példány legyen bekapcsolva.

### Nem látom a zöld ADMIN plus gombot

Ellenőrizd sorban:

- A [chat oldala](https://chat.goldengate.hu/chat.php) van megnyitva, és frissítetted a telepítés után?
- A Tampermonkey bővítmény be van kapcsolva?
- A Tampermonkey **Vezérlőpult / Dashboard** részében szerepel a **GoldenGate ADMIN plus**, és be van kapcsolva?
- Chrome-ban engedélyezted a **felhasználói szkriptek futtatását**?
- Ha a böngésző külön webhely-hozzáférést kér a Tampermonkeynak, megadtad azt a **chat.goldengate.hu** oldalhoz?
- Ugyanabban a böngészőben és böngészőprofilban használod a chatet, amelyikbe a kiegészítőt telepítetted?
- Normál ablakot használsz? Privát vagy inkognitóablakban a bővítmény futtatását külön engedélyezni kellhet. Először normál ablakban próbáld ki.

### A gomb megjelenik de nem tudok minden szobában tiltani

A szkript a bejelentkezett fiókod meglévő jogosultságaival dolgozik. A telepítése **nem ad admin- vagy moderátori jogosultságot**. A tiltás csak azokban a szobákban hajtható végre, ahol van hozzá jogosultságod. A jogosultságok érvényesítése a GoldenGate szerverének feladata.

### Kell GitHub fiók vagy külön belépés a letöltéshez

**Nem.** A leírás, a verziófájl és a telepítési link nyilvánosan elérhető. A GoldenGate chatbe a saját, megszokott fiókoddal kell belépned.

### A Teszt 1perc csak szimuláció

**Nem: a „Teszt - 1perc” valódi egyperces tiltási kérelmet küld az aktuális szobalista minden szobájára.** A teszt elnevezés a rövid időtartamra utal.

## Frissítések és verziószám

- Az aktuális kiadás külön, rövid fájlban is megnézhető: **[Aktuális verzió](https://raw.githubusercontent.com/msggolden/goldengate-admin-plus/main/version.txt)**.
- A chatben az **ADMIN plus** gombra kattintva a nálad futó verziószámot látod.
- A Tampermonkey a saját beállításai szerinti időközönként ellenőriz, **nem a chat minden megnyitásakor**. Az automatikus frissítés a Tampermonkey beállításaitól függ.
- Kézi frissítéshez nyisd meg újra a **telepítési linket**, és válaszd a frissítést. Utána töltsd újra a chatet.
- A [goldengate-admin.meta.js](goldengate-admin.meta.js) a Tampermonkey kis frissítésellenőrző fájlja. **Ezt és a version.txt fájlt nem kell külön telepíteni.**

## Mit tud a kiegészítő

- **Felhasználónév megjelenítése:** kiírja a kiválasztott felhasználó nevét a kezelőablakban, így könnyebb ellenőrizni, kin hajtod végre a műveletet.
- **Gyors egyperces kirúgás:** lecseréli az eredeti, indoklást kérő „Kirúgom” menüpontot. Az automatikus indok: „figyelmeztés-1perc mulva jöhetsz vissza”. A szerver sikeres visszajelzése után bezárja a kezelőablakot.
- **„Kitiltom minden szobából »” almenü:** 1 perc teszt, 30 perc, 1, 5, 10 és 15 óra közül választhatsz. Minden végrehajtáskor az aktuális szobalistát olvassa be, így az új szobákat is figyelembe veszi. Az indok: „Ismételt vagy súlyos szabálysértés, illetve korábbi szabályszegések következménye.”
- **Szobánkénti visszajelzés:** az almenüben megjeleníti az időtartamot, a fogadott és hibás kérések összesítését, valamint szobánként az „OK” vagy „Hiba” jelzést.
- **„Nem létező felhasználó” kezelése:** megőrzi az eredeti hibaüzenetet, alatta pedig elérhetővé teszi a kiválasztott felhasználó nevét, a privát chat indítását és a moderálási műveleteket.
- **A felhasználóablak elhelyezésének javítása:** a teljes keretet együtt igazítja a látható területre.
- **Működésjelző, leírás és verziószám:** a zöld ADMIN plus gomb megnyitja a funkciók leírását és a nálad futó verziószámot.

Az **OK / fogadva** sikeres szerverválaszt jelent. A szkript a tiltás tényleges végrehajtását és a jogosultság szerveroldali elbírálását külön nem ellenőrzi.

**Vegyétek figyelembe, hogy az éjfél és hajnal közötti szerver-újraindulás törölheti a tiltásokat, így azok a kiválasztott időtartam lejárta előtt is megszűnhetnek.**

## A 0.9.12 kiadásról

GitHubos terjesztés, külön verzió- és metaadatfájl, beállított telepítési és frissítési címek. Az útmutató bővítése önmagában nem változtatja meg a szkript verzióját vagy működését.

## Hivatalos segítség

- [Tampermonkey weboldal](https://www.tampermonkey.net/)
- [Chrome futtatási engedély beállítása](https://www.tampermonkey.net/faq.php?locale=en&q=Q209)
- [Tampermonkey a Firefox kiegészítők között](https://addons.mozilla.org/hu/firefox/addon/tampermonkey/)
