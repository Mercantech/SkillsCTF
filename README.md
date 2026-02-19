# Skills CTF 2026

Capture The Flag-platform til Skills 2026 med dark mode og neon orange tema. Bygget med HTML/CSS/JS på frontend, Node.js + PostgreSQL på backend — alt kører i Docker og Docker Compose.

## Design

- **Dark mode** med dyb baggrund og neon orange (#ff6600) som blikfang
- **Terminal/Hollywood**-stil: glitch-effekt på logo, scanlines, grid-baggrund, monospace (JetBrains Mono) og Orbitron til overskrifter
- Centrale **leaderboard** og 8 **CTF-opgaver** til nybegyndere (ca. 1–4 min per opgave)

## Kør med Docker

```bash
docker compose up --build
```

Åbn derefter [http://localhost:13000](http://localhost:13000).

- **Backend:** Node (Express) – host port **13000** (inden i containeren 3000)  
- **Database:** PostgreSQL 16 – host port **15432** (inden i containeren 5432; bruger `ctf`, database `skillsctf`)

Portene er valgt så deployment på en fælles server ikke kolliderer med andre tjenester (fx standard PostgreSQL på 5432). På serveren: åbn `http://<server>:13000`.

## Udvikling med Docker (auto-opdatering)

Når du ændrer i `backend/` eller `frontend/`, kan du bruge **Docker Compose Watch** – den kører på host og genstarter backend ved filændring (nodemon virker ofte ikke med volumes fra Windows til Linux):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml watch
```

- **Watch** overvåger `./backend` og `./frontend`; ved ændring **genstartes** backend-containeren, så den henter den nye kode fra de mountede mapper.
- Kræver Docker Compose 2.22+ (evt. 2.32+ for `restart`-action). Efter ændring: opdater browseren (F5) for frontend.

Du behøver ikke lukke eller manuelt genstarte containere.

## Udvikling uden Docker

1. Start PostgreSQL med bruger `ctf`, password `ctf_secret_2026`, database `skillsctf`.
2. I `backend/`:
   ```bash
   npm install
   DATABASE_URL=postgresql://ctf:ctf_secret_2026@localhost:5432/skillsctf node server.js
   ```
3. Backend serverer frontend fra `public/`. Kopiér `frontend/*` til `backend/public/` eller symlink, og åbn http://localhost:3000.

## Flow

1. **Leaderboard** – viser kun spillere der har trykket "Afslut & gem score". Sorteret efter point (højst først), derefter tid (hurtigst først).
2. **Terminal** – først **Indtast navn** → **Start**. Tiden starter ved Start. Løs opgaver og indsend flag. Når du er færdig: **Afslut & gem score** for at committe din score (point + tid) til leaderboard.

## Opgaver (CTF)

| Opgave        | Hint                                      | Sværhed |
|---------------|-------------------------------------------|---------|
| View Source   | Se kildekoden til siden (Ctrl+U / Inspect) | Let     |
| Base64        | Decode strengen (fx. base64decode.org)    | Let     |
| URL Parameter | Kald `/api/secret?key=flag`               | Let     |
| Hidden Div    | Inspect element / DOM                     | Let     |
| Console       | Åbn JavaScript-konsollen (F12)             | Let     |
| Cookie        | Tjek cookies for siden (DevTools)         | Let     |
| ROT13         | Decode med ROT13                          | Let     |
| HTTP Header   | Tjek respons-headers fra serveren         | Let     |

Flag-format: `SKILLS{...}`. Indsend via formularen med dit navn for at komme på leaderboard.

## Projektstruktur

```
SkillsCTF/
├── docker-compose.yml   # PostgreSQL + Node app
├── Dockerfile           # Build backend + kopier frontend til public/
├── backend/
│   ├── package.json
│   ├── server.js        # Express, API, static files
│   ├── db.js            # PostgreSQL pool + init
│   └── challenges.js    # Opgavedefinitioner + flag-check
└── frontend/
    ├── index.html
    ├── styles.css       # Dark + neon orange styling
    └── app.js           # Leaderboard, opgaver, indsend flag
```

## Licens

Til brug ved Skills 2026.
