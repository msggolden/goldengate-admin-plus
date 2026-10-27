# GoldenGate ADMIN plusz

Tampermonkey-kiegészítő a GoldenGate chat adminjainak és moderátorainak.

## Telepítés

Telepített Tampermonkey mellett nyisd meg a [szkript telepítési linkjét](https://raw.githubusercontent.com/msggolden/goldengate-admin-plus/main/goldengate-admin.user.js), és válaszd a telepítést vagy frissítést. Ezután frissítsd a chat oldalát.

Korábbi kézi telepítésnél egyszer ezt a változatot kell feltenni, hogy a frissítési címek bekerüljenek. Azonos névvel és névtérrel a meglévő szkript frissítését válaszd; ne fusson több példány egyszerre. A külön ablakpozíció-javító már nem szükséges.

## Verzió és frissítés

- Az aktuális verzió külön, rövid fájlban: [version.txt](version.txt).
- A Tampermonkey a [goldengate-admin.meta.js](goldengate-admin.meta.js) kis fejlécfájlból ellenőrizheti a verziót.
- Az új teljes kódot a fejléc `@downloadURL` címéről töltheti le. Az ellenőrzés és frissítés a Tampermonkey beállításaitól függ.
- A verziószám és a funkciók leírása a chat tetején lévő zöld **ADMIN plus** gombra kattintva is olvasható.

## Funkciók

- A kiválasztott felhasználó nevének megjelenítése a kezelőablakban.
- Egyperces gyors kirúgás előre megadott indokkal.
- „Kitiltom minden szobából” almenü: 1 perc teszt, 30 perc, 1, 5, 10 és 15 óra.
- Az aktuális szobalista beolvasása minden végrehajtáskor.
- Szobánkénti visszajelzés és összesítés a fogadott, illetve hibás kérésekről.
- A „Nem létező felhasználó!” ablak kiegészítése a kiválasztott felhasználó műveleteivel.
- A felhasználóablak helyzetének igazítása a teljes kerettel együtt.
- Gombbal megnyitható, X-szel bezárható funkcióleírás és verziószám.

## Jogosultságok és visszajelzés

A szkript a bejelentkezett fiók meglévő jogosultságaival dolgozik. A tiltás csak azokban a szobákban hajtható végre, ahol van hozzá jogosultságod; a szkript nem ad új jogosultságot.

Az **OK / fogadva** sikeres szerverválaszt jelent. A tiltás tényleges végrehajtását és a jogosultság szerveroldali elbírálását külön nem ellenőrzi.

Az éjfél és hajnal közötti szerver-újraindulás törölheti a tiltásokat; ezért azok a kiválasztott időtartam lejárta előtt is megszűnhetnek.

## 0.9.12

GitHubos terjesztés, külön verzió- és metaadatfájl, beállított telepítési és frissítési címek. A moderálási műveletek működése nem változott.
