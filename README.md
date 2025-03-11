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
   - Veendu, et CENTRAL_BANK_URL=https://henno.cfd/central-bank
   - Muuda TEST_MODE=false

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

## Pankadevaheliste ülekannete seadistamine

Pankadevaheliste ülekannete tegemiseks on vaja:

1. **Õige keskpanga URL**
   Veendu, et sinu .env failis on õige keskpanga URL:
   ```
   CENTRAL_BANK_URL=https://henno.cfd/central-bank
   TEST_MODE=false
   ```

2. **Registreeri oma pank keskpangas**
   - Külasta keskpanga lehte: https://henno.cfd/central-bank
   - Registreeri oma pank, lisades:
     - Panga nimi: "JMB Pank"
     - Panga prefiks: "JMB"
     - JWKS URL: "https://joonasmagi.me/jwks.json"
     - Tehingute URL: "https://joonasmagi.me/api/transactions/b2b"

3. **Salvesta API võti**
   Pärast panga registreerimist saad API võtme, mis tuleb lisada .env faili:
   ```
   API_KEY=your_api_key_here
   ```

4. **Taaskäivita rakendus**
   ```bash
   npm start
   ```

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