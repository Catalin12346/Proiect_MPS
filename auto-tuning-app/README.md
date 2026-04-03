# 🏎️ Auto Tuning - Editor Binar ECU

Aplicație web profesională pentru tuning auto, dedicată manipulării fișierelor binare ECU (Engine Control Unit).

## ✨ Funcționalități

### 🔧 Editor Hex
- Vizualizare și editare byte-cu-byte a fișierelor binare
- Navigare pagină cu pagină prin fișier
- Evidențierea byte-ilor modificați (culoare portocalie)
- Salt rapid la orice offset (adresă hex)
- **Undo/Redo** complet (până la 100 de operații)
- Afișare ASCII alături de valorile hex
- Tooltip cu informații detaliate la hover

### 📊 Vizualizare Hărți ECU
- Vizualizare 2D color-coded a tabelelor de date (hărți de injecție, avans aprindere, etc.)
- Suport pentru date 8-bit și 16-bit (Little/Big Endian)
- Configurare flexibilă: offset, dimensiuni, multiplicator, unitate de măsură
- Gradient de culori Blue→Green→Red pentru valori min→max
- Click pe celulă pentru a naviga la offset-ul corespunzător în editorul hex

### 🔍 Căutare și Înlocuire
- Căutare pattern hex în tot fișierul
- Înlocuire în masă a pattern-urilor
- Click pe rezultat pentru navigare directă la offset

### 🔢 Calculator Checksum
- **SUM-8** - Sumă pe 8 biți
- **SUM-16** - Sumă pe 16 biți
- **SUM-32** - Sumă pe 32 biți
- **CRC-16 CCITT** - CRC pe 16 biți
- **CRC-32** - CRC pe 32 biți
- Calcul pe regiune personalizată (start - end offset)

### ⚖️ Comparare Fișiere Binare
- Încărcare a două fișiere pentru comparare
- Statistici detaliate: dimensiuni, diferențe, procent modificat
- Tabel cu toate diferențele (offset, valori originale vs modificate, delta)
- Grupare automată a diferențelor în blocuri

## 🚀 Cum se folosește

1. **Deschide aplicația** - Deschideți `index.html` într-un browser modern (Chrome, Firefox, Edge)
2. **Încarcă un fișier** - Apăsați „Încarcă Fișier" sau trageți un fișier .bin peste zona de drop
3. **Editare** - Click pe orice byte în editorul hex pentru a-l modifica
4. **Vizualizare hărți** - Mergeți la tab-ul „Vizualizare Hărți", configurați parametrii și apăsați „Încarcă Hartă"
5. **Salvare** - Apăsați „Salvează" pentru a descărca fișierul modificat

## ⌨️ Scurtături Tastatură

| Scurtătură | Acțiune |
|-----------|---------|
| `Ctrl+O` | Deschide fișier |
| `Ctrl+S` | Salvează fișier |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+G` | Salt la offset |

## 📁 Formate Acceptate

Aplicația funcționează cu orice fișier binar, dar este optimizată pentru:
- `.bin` - Fișiere binare ECU
- `.rom` - Fișiere ROM
- `.hex` - Fișiere Intel HEX
- `.ecu` - Fișiere ECU specifice
- `.ori` - Fișiere originale (backup)
- `.mod` - Fișiere modificate
- `.dat` - Fișiere de date

## 🛠️ Structura Proiectului

```
auto-tuning-app/
├── index.html              # Pagina principală
├── css/
│   └── styles.css          # Stiluri (temă dark profesională)
├── js/
│   ├── binary-utils.js     # Utilități pentru manipulare binară
│   ├── hex-editor.js       # Componenta editor hex
│   ├── map-viewer.js       # Vizualizarea hărților ECU
│   ├── checksum.js         # Algoritmi de checksum
│   ├── diff.js             # Comparare fișiere binare
│   └── app.js              # Logica principală a aplicației
└── README.md               # Documentație
```

## 🔧 Cerințe Tehnice

- **Browser modern** cu suport pentru:
  - ES6+ (JavaScript modern)
  - File API
  - Blob API
  - CSS Grid & Flexbox
- **Nu necesită server** - funcționează complet în browser
- **Nu necesită instalare** - deschideți direct `index.html`

## 📝 Note Tehnice

- Aplicația procesează datele **exclusiv în browser** - niciun fișier nu este trimis la vreun server
- Suportă fișiere de dimensiuni mari (testat cu fișiere până la 16 MB)
- Toate modificările sunt evidențiate vizual și pot fi anulate
- Checksumurile sunt calculate folosind algoritmi standard din industria auto
