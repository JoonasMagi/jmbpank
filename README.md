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

Rakendus käivitub vaikimisi pordil 3000 ja API dokumentatsioon on saadaval aadressil http://localhost:3000/api-docs

## API endpointid

### Kasutajad
- `POST /users/register` - uue kasutaja registreerimine
- `POST /users/login` - kasutaja sisselogimine
- `GET /users/profile` - profiili kuvamine (autenditud)

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

5. Looge või uuendage vajalikud SSL sertifikaadid Certbot abil (kui vajalik):
```bash
sudo certbot --nginx -d jmbpank.joonasmagi.me
```

6. Veenduge, et teie domeeni DNS seadistused viitavad õigele IP-aadressile.

### Nginx konfiguratsiooni seletus

Meie Nginx konfiguratsioon:
- Suunab kogu HTTP liikluse HTTPS-le
- Kasutab jmbpank.joonasmagi.me alamdomeeni
- Pakub optimeeritud puhverdamist ja päringu parameetreid
- Seadistab eraldi logi failid JMB panga rakenduse jaoks
- Edastab päringud Node.js rakendusele, mis töötab pordil 3000