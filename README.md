# JMB Pank

Minimaalne panga rakendus, mis võimaldab teha ülekandeid erinevate pankade vahel Keskpanga abil.

## Omadused

- Kontode haldus
- Kohalikud ülekanded
- Pankadevahelised ülekanded läbi Keskpanga
- JWT-põhine autentimine ülekannete jaoks
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

Rakendus käivitub vaikimisi pordil 3000 ja API dokumentatsioon on saadaval aadressil http://localhost:3000/api-docs

## API endpointid

### Kontod
- `GET /accounts` - kõikide kontode nimekiri
- `GET /accounts/:accountNumber` - konkreetse konto andmed
- `POST /accounts` - uue konto loomine

### Ülekanded
- `GET /transactions/account/:accountNumber` - konto ülekannete nimekiri
- `POST /transactions` - uue ülekande tegemine
- `POST /transactions/b2b` - sissetuleva pankadevahelise ülekande töötlemine
- `GET /transactions/jwks` - JWT võtmete komplekti kättesaamine

## Keskpanga spetsifikatsioonid

Antud rakendus järgib Keskpanga poolt nõutud standardeid rakenduste vaheliseks suhtluseks:
- Konto numbrid algavad panga prefiksiga
- Tehingud saadetakse JWT token-ina, mille allkirjastamiseks kasutatakse RSA võtmepaari
- Test režiim keskpanga suhtluse simuleerimiseks

Täpsem spetsifikatsioon: [Keskpank SPECIFICATIONS.md](https://github.com/henno/keskpank/blob/master/SPECIFICATIONS.md)