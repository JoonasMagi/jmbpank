# JMB Pank

Minimaalne panga rakendus, mis võimaldab teha ülekandeid erinevate pankade vahel Keskpanga abil.

## Omadused

- Kontode haldus
- Kohalikud ülekanded
- Pankadevahelised ülekanded läbi Keskpanga
- JWT-põhine autentimine ülekannete jaoks
- Kasutajate haldus koos turvalise autentimisega
- SQLite andmebaas
- Swagger UI API dokumentatsioon

## Seadistamine

1. Klooni repo
```bash
git clone https://github.com/JoonasMagi/jmbpank.git
cd jmbpank
```

2. Installi sõltuvused
```bash
npm install
```

3. Loo .env fail
```bash
cp .env.example .env
```

4. Muuda .env failis olevad seadistused vastavalt vajadusele

5. Käivita server
```bash
npm start
```

Rakendus käivitub vaikimisi pordil 3000 ja API dokumentatsioon on saadaval aadressil http://localhost:3000/api/docs

## API endpointid

### Kasutajad
- `POST /api/users/register` - uue kasutaja registreerimine
- `POST /api/users/login` - kasutaja sisselogimine
- `GET /api/users/profile` - profiili kuvamine (autenditud)

### Kontod
- `GET /api/accounts` - kõikide kontode nimekiri
- `GET /api/accounts/:accountNumber` - konkreetse konto andmed
- `POST /api/accounts` - uue konto loomine

### Ülekanded
- `GET /api/transactions/account/:accountNumber` - konto ülekannete nimekiri
- `POST /api/transactions` - uue ülekande tegemine
- `POST /api/transactions/b2b` - sissetuleva pankadevahelise ülekande töötlemine
- `GET /api/transactions/jwks` - JWT võtmete komplekti kättesaamine

## Keskpanga spetsifikatsioonid

Antud rakendus järgib Keskpanga poolt nõutud standardeid rakenduste vaheliseks suhtluseks:
- Konto numbrid algavad panga prefiksiga
- Tehingud saadetakse JWT token-ina, mille allkirjastamiseks kasutatakse RSA võtmepaari
- Test režiim keskpanga suhtluse simuleerimiseks

Täpsem spetsifikatsioon: [Keskpank SPECIFICATIONS.md](https://github.com/henno/keskpank/blob/master/SPECIFICATIONS.md)

## Pankadevaheliste ülekannete probleemide lahendamine

Kui sul on probleeme pankadevaheliste ülekannetega, proovi järgmisi lahendusi:

1. **Testi erinevaid keskpanga URL-e**
   ```bash
   node test-central-bank.js
   ```
   See skript proovib ühenduda erinevate potentsiaalsete keskpanga URL-idega ja teavitab, milline neist töötab.

2. **Proovi erinevaid URL-e .env failis**
   Muuda oma .env failis CENTRAL_BANK_URL väärtust, proovides järgmisi variante:
   ```
   CENTRAL_BANK_URL=https://keskpank.henno.ee/api
   CENTRAL_BANK_URL=https://keskpank.henno.tech/api
   CENTRAL_BANK_URL=http://keskpank.henno.tech/api
   CENTRAL_BANK_URL=http://pank.henno.tech/api
   ```

3. **Lülita TEST_MODE välja**
   Veendu, et .env failis on TEST_MODE=false

4. **Kontrolli API võtit**
   Kui sul on keskpangas registreeritud pank, peaksid olema saanud API võtme, mis tuleb lisada .env faili.

5. **Kontrolli JWKS ja tehingute URL-e**
   Veendu, et sinu JWKS ja tehingute URL-id on avalikult ligipääsetavad:
   - JWKS URL: `https://joonasmagi.me/jwks.json`
   - Tehingute URL: `https://joonasmagi.me/api/transactions/b2b`

## Nginx seadistamine

Järgige neid samme, et seadistada Nginx veebiserverit JMB Panga rakenduse jaoks:

1. Kopeerige nginx.conf fail õigesse asukohta:
```bash
sudo cp nginx.conf /etc/nginx/sites-available/jmbpank.conf
```

2. Looge sümbolviide sites-enabled kausta:
```bash
sudo ln -s /etc/nginx/sites-available/jmbpank.conf /etc/nginx/sites-enabled/
```

3. Veenduge, et konfiguratsioon on korrektne:
```bash
sudo nginx -t
```

4. Taaskäivitage Nginx:
```bash
sudo systemctl restart nginx
```

5. Veenduge, et teie domeeni DNS seadistused viitavad õigele IP-aadressile.