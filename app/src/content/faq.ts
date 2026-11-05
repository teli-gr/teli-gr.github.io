/* "Τι κάνω αν…" — checked against AADE's myCAR guide (Nov 2024) and Greek press, Nov 2026.
   The questions and answers live in each language file (src/i18n); the sources are shared here. */
/* Official AADE entry points (checked 5 Nov 2026 on aade.gr/mycar and aade.gr/teli-kykloforias-horis-kodikoys-taxisnet). */
export const AADE = {
  mycar: "https://www1.aade.gr/saadeapps3/myCAR",                       // myCAR login (TAXISnet)
  noCodes: "https://www1.aade.gr/myaade/telh-kykloforias-without-sso",   // notice with AFM + plate, no login
};
/* Electric cars, for the "before you buy" card. Checked 5 Nov 2026 on kinoumeilektrika3.gov.gr (grant €3,000, deadline
   31/12/2026 or earlier if the budget runs out) and electrokinisi.yme.gov.gr (10,151 public charging points on 5/11/2026).
   The grant line hides itself after `grantUntil`; the extras are written out in each language file (newCar.ev.tip). */
export const EV = {
  grantUrl: "https://kinoumeilektrika3.gov.gr/",
  mapUrl: "https://electrokinisi.yme.gov.gr/public/ChargingPoints/",
  grant: 3000,
  grantUntil: "2026-12-31",
  points: 10000, // shown as "more than 10,000"
};
export const FAQ_URLS = {
  aadeAmea: "https://www.aade.gr/exypiretisi-enimerosi/hristikoi-odigoi/hristikos-odigos-gia-ta-basika-forologika-dikaiomata-ton-amea/teli-kykloforias",
  aadeScam: "https://www.aade.gr/sites/default/files/2026-02/dt_02.02.2026.pdf",
  aadeNoCodes: "https://www.aade.gr/teli-kykloforias-horis-kodikoys-taxisnet",
  gocar: "https://www.gocar.gr/news/feed/52456,Telh_Kykloforias__Poios_prepei_plhrwsei_.html",
  larissanet: "https://www.larissanet.gr/2026/11/02/teli-kykloforias-2027-anartithikan-ta-eidopoiitiria-sto-mycar/",
  aadeGuide: "https://www.aade.gr/sites/default/files/2024-11/odigies_my%20CAR%2011_24.pdf",
  gocarAade: "https://www.gocar.gr/news/feed/52456,Telh_Kykloforias__Poios_prepei_plhrwsei_.html",
} as const;
